import {posix} from 'node:path';
import {unified} from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkRehype from 'remark-rehype';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize,{defaultSchema} from 'rehype-sanitize';
import rehypeStringify from 'rehype-stringify';
import {escape,slug} from './config';
import {MediaStore,mediaRenderer} from './media';
import type {Asset} from './types';

type Node={type:string;value?:string;url?:string;alt?:string;depth?:number;data?:Record<string,unknown>;children?:Node[]};
const words=(node:Node):string=>node.value??node.children?.map(words).join('')??'';
export function makeResolver(files:string[],routes:Map<string,string>,toUrl:(route:string)=>string,repositoryUrl:string) {
  const known=new Set(files),basenames=new Map<string,string[]>();
  for(const path of files){const name=posix.basename(path);basenames.set(name,[...(basenames.get(name)??[]),path]);}
  return (source:string,input:string):{url:string;asset?:string}=>{
    if(/^(?:https?:|mailto:|tel:)/i.test(input))return {url:input};
    if(input.startsWith('#'))return {url:'#'+slug(decodeURIComponent(input.slice(1)))};
    if(/^[a-z][a-z0-9+.-]*:/i.test(input)||input.startsWith('//'))throw Error(`${source}: unsupported link protocol in ${input}`);
    const [raw,fragment]=input.split('#'),target=decodeURIComponent(raw).replaceAll('\\','/');
    const candidates=[posix.normalize(posix.join(posix.dirname(source),target)),target.replace(/^\//,'')];
    let path=candidates.find(c=>known.has(c)||routes.has(c));
    if(!path&&!posix.extname(target))path=candidates.map(c=>c+'.md').find(c=>known.has(c)||routes.has(c));
    if(!path&&!target.includes('/')) {
      const choices=basenames.get(target)??basenames.get(target+'.md')??[];
      if(choices.length>1)throw Error(`${source}: ambiguous target ${input}: ${choices.join(', ')}`);
      path=choices[0];
    }
    if(!path)throw Error(`${source}: missing target ${input}`);
    if(routes.has(path))return {url:toUrl(routes.get(path)!)+(fragment?'#'+slug(fragment):'')};
    if(path.startsWith('Attachments/'))return {url:'',asset:path};
    return {url:repositoryUrl+'/blob/HEAD/AntJournal/'+path.split('/').map(encodeURIComponent).join('/')};
  };
}
export async function renderMarkdown(body:string,source:string,resolve:ReturnType<typeof makeResolver>,media:MediaStore) {
  const assets:Asset[]=[];
  let summary='';
  const transform=()=>async(tree:Node)=>{
    if(tree.children?.[0]?.type==='heading'&&tree.children[0].depth===1)tree.children.shift();
    const headingIds=new Map<string,number>();
    async function target(input:string,label:string,embed:boolean):Promise<Node> {
      const result=resolve(source,input);
      if(result.asset) {
        const asset=await media.get(result.asset);if(!assets.some(a=>a.source===asset.source))assets.push(asset);
        return embed?{type:'html',value:mediaRenderer(asset,label||input.split('/').at(-1)!)}:{type:'link',url:asset.original,children:[{type:'text',value:label||input}]};
      }
      if(embed)throw Error(`${source}: note transclusion is not supported: ${input}. Use a note link.`);
      return {type:'link',url:result.url,data:{resolved:true},children:[{type:'text',value:label||input}]};
    }
    async function visit(node:Node):Promise<void> {
      if(node.type==='image'&&node.url) {
        if(/^https?:/i.test(node.url))return;
        Object.assign(node,await target(node.url,node.alt??'',true));delete node.url;delete node.alt;
      } else if(node.type==='link'&&node.url&&!node.data?.resolved) {
        const result=resolve(source,node.url);
        node.url=result.asset?(await media.get(result.asset)).original:result.url;
      }
      if(node.type==='heading') {
        const id=slug(words(node))||'section',n=headingIds.get(id)??0;headingIds.set(id,n+1);
        node.data={hProperties:{id:n?`${id}-${n}`:id}};
      }
      if(node.children) {
        const children:Node[]=[];
        for(const child of node.children) {
          if(child.type==='text'&&child.value?.includes('[[')) {
            let offset=0;for(const match of child.value.matchAll(/(!?)\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g)) {
              if(match.index!>offset)children.push({type:'text',value:child.value.slice(offset,match.index)});
              children.push(await target(match[2],/^\d+(?:x\d+)?$/.test(match[3]??'')?'':match[3]??'',!!match[1]));offset=match.index!+match[0].length;
            }
            if(offset<child.value.length)children.push({type:'text',value:child.value.slice(offset)});
          } else children.push(child);
        }
        node.children=children;
        for(const child of children)await visit(child);
      }
    }
    await visit(tree);
    summary=(tree.children??[]).filter(node=>node.type==='paragraph'&&node.children?.some(child=>child.type==='text'&&/[\p{L}\p{N}]/u.test(child.value??''))).slice(0,2).map(words).join(' ').replace(/\s+/g,' ').trim();
  };
  const schema={...defaultSchema,clobberPrefix:'',tagNames:[...defaultSchema.tagNames!,'video','source','figure','figcaption'],attributes:{...defaultSchema.attributes,'*':[...(defaultSchema.attributes?.['*']??[]),'className','id'],a:[...(defaultSchema.attributes?.a??[]),'dataGallery','download'],img:[...(defaultSchema.attributes?.img??[]),'srcSet','sizes','loading','decoding','width','height'],video:['src','poster','controls','playsInline','preload'],source:['src','type']}};
  const result=await unified().use(remarkParse).use(remarkGfm).use(transform as any).use(remarkRehype,{allowDangerousHtml:true}).use(rehypeRaw).use(rehypeSanitize,schema).use(rehypeStringify).process(body);
  const search=body.replace(/<!--[^]*?-->/g,'').replace(/!?\[\[[^\]]+\]\]/g,'').replace(/!?\[([^\]]*)\]\([^)]+\)/g,'$1').replace(/[#*`>]/g,'').replace(/\s+/g,' ').trim();
  return {html:String(result),media:assets,search,excerpt:(summary||search).slice(0,220)};
}
