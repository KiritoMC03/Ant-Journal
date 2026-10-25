import type {Loader} from 'astro/loaders';
import {buildSnapshot} from './lib/snapshot';
import {vaultRoot} from './lib/config';
import {relative} from 'node:path';
export function journalLoader():Loader {
  return {name:'ant-journal-vault',load:async({store,watcher,logger})=>{
    const refresh=async()=>{
      const snapshot=await buildSnapshot();store.clear();
      for(const page of snapshot.pages)store.set({id:page.route||'home',data:page as unknown as Record<string,unknown>});
    };
    await refresh();
    if(watcher) {
      watcher.add(vaultRoot);
      let timer:ReturnType<typeof setTimeout>,running=false,again=false;
      const update=async()=>{
        if(running){again=true;return;}running=true;
        try{await refresh();logger.info('Vault snapshot refreshed.');}catch(error){logger.error(String(error));}
        finally{running=false;if(again){again=false;void update();}}
      };
      const changed=(path:string)=>{
        const local=relative(vaultRoot,path).replaceAll('\\','/');
        if(local.startsWith('..')||local.split('/').some(p=>p.startsWith('.'))||/^(?:Templates|Config|FileClasses)\//.test(local))return;
        clearTimeout(timer);timer=setTimeout(update,350);
      };
      watcher.on('add',changed).on('change',changed).on('unlink',changed);
      watcher.once('close',()=>{clearTimeout(timer);watcher.off('add',changed).off('change',changed).off('unlink',changed);});
    }
  }};
}
