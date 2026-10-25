import {mkdir,readFile,writeFile,copyFile,stat} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {resolve,extname} from 'node:path';
import sharp from 'sharp';
import {escape} from './config';
import type {Asset} from './types';

export function rejectPointer(bytes:Buffer,path:string) {
  if(bytes.subarray(0,100).toString().startsWith('version https://git-lfs.github.com/spec/v1'))throw Error(`Missing LFS object: ${path}. Download LFS originals before building.`);
}
export function mediaRenderer(asset:Asset,alt:string):string {
  const original=`<a class="original" href="${escape(asset.original)}" download>Download original</a>`;
  if(asset.kind==='video')return `<figure class="media"><video controls playsinline preload="none"${asset.poster?` poster="${escape(asset.poster)}"`:''} src="${escape(asset.src)}"><a href="${escape(asset.original)}">Download video</a></video><figcaption>${escape(alt)} ${original}</figcaption></figure>`;
  if(asset.kind==='file')return `<p><a href="${escape(asset.original)}" download>${escape(alt||asset.source.split('/').at(-1))}</a></p>`;
  return `<figure class="media"><a href="${escape(asset.src)}" data-gallery="true"><img src="${escape(asset.src)}"${asset.srcset?` srcset="${escape(asset.srcset)}" sizes="(max-width: 720px) 100vw, 900px"`:''} width="${asset.width}" height="${asset.height}" alt="${escape(alt)}" loading="lazy" decoding="async"></a><figcaption>${escape(alt)} ${original}</figcaption></figure>`;
}
export class MediaStore {
  pending=new Map<string,Promise<Asset>>();
  constructor(public vault:string,public output:string,public cache:string,public toUrl:(route:string)=>string){}
  get(source:string):Promise<Asset> {
    if(!this.pending.has(source))this.pending.set(source,this.prepare(source));
    return this.pending.get(source)!;
  }
  async prepare(source:string):Promise<Asset> {
    const path=resolve(this.vault,source),bytes=await readFile(path);rejectPointer(bytes,source);
    const hash=createHash('sha256').update(bytes).digest('hex'),ext=extname(source).toLowerCase();
    const profile=createHash('sha256').update('webp:84;widths:480,960,1600;autoOrient;poster:960:first-frame:v1').digest('hex').slice(0,8);
    const dir=resolve(this.cache,hash,profile);await mkdir(dir,{recursive:true});await mkdir(this.output,{recursive:true});
    const original=`${hash}${ext}`,originalUrl=this.toUrl('media/'+original);
    await copyFile(path,resolve(this.output,original));
    const asset:Asset={source,original:originalUrl,src:originalUrl,kind:'file',bytes:bytes.length};
    if(['.mp4','.webm','.mov','.m4v','.mkv','.avi'].includes(ext)) {
      asset.kind=['.mp4','.webm','.m4v'].includes(ext)?'video':'file';
      if(asset.kind==='video') {
        const poster=`${hash}-${profile}-poster.jpg`,cached=resolve(dir,poster);
        try {await stat(cached);}catch {
          const result=spawnSync(process.env.FFMPEG_PATH??'ffmpeg',['-nostdin','-loglevel','error','-y','-i',path,'-frames:v','1','-vf','scale=960:-2',cached],{timeout:25000,windowsHide:true,stdio:'pipe'});
          if(result.error||result.status!==0)throw Error(`Could not generate video poster for ${source}. Install ffmpeg or set FFMPEG_PATH.`);
        }
        await copyFile(cached,resolve(this.output,poster));asset.poster=this.toUrl('media/'+poster);
      }
    } else if(/\.(?:jpe?g|png|webp|avif|gif|tiff?|heic|heif|bmp)$/i.test(ext)) {
      try {
        const metadata=await sharp(bytes).autoOrient().metadata();
        const rotated=metadata.autoOrient??metadata;
        const width=rotated.width??metadata.width??1,height=rotated.height??metadata.height??1;
        if(ext==='.gif'){asset.kind='image';asset.width=width;asset.height=metadata.pageHeight??height;return asset;}
        const sizes=[...new Set([480,960,1600].map(w=>Math.min(w,width)))];
        const variants: {width:number;url:string}[]=[];
        for(const size of sizes) {
          const filename=`${hash}-${profile}-${size}.webp`,cached=resolve(dir,filename);
          try {await stat(cached);}catch {await sharp(bytes).autoOrient().resize({width:size,withoutEnlargement:true}).webp({quality:84}).toFile(cached);}
          await copyFile(cached,resolve(this.output,filename));variants.push({width:size,url:this.toUrl('media/'+filename)});
        }
        const largest=variants.at(-1)!;
        asset.kind='image';asset.src=largest.url;asset.srcset=variants.map(v=>`${v.url} ${v.width}w`).join(', ');asset.width=largest.width;asset.height=Math.round(height*largest.width/width);
      } catch(error) {
        if(!['.heic','.heif'].includes(ext))throw error;
        console.warn(`Preview unavailable for ${source}; the original download remains available.`);
      }
    }
    await writeFile(resolve(dir,'source.json'),JSON.stringify({source,hash,bytes:bytes.length}));
    return asset;
  }
}
