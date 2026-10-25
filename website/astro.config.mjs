import {defineConfig} from 'astro/config';
import {fileURLToPath} from 'node:url';
process.env.JOURNAL_WEBSITE_ROOT=fileURLToPath(new URL('.',import.meta.url));
const base='/'+(process.env.SITE_BASE??'').split('/').filter(Boolean).join('/');
export default defineConfig({
  site:process.env.SITE_URL||'https://kiritomc03.github.io',base:base==='/'?'/':base,
  output:'static',trailingSlash:'always',publicDir:process.env.JOURNAL_GENERATED_DIR?process.env.JOURNAL_GENERATED_DIR+'/public':'./.generated/public',
  cacheDir:process.env.JOURNAL_ASTRO_CACHE??'./.astro',
  devToolbar:{enabled:false},
  vite:{server:{watch:{ignored:['**/staging-public/**','**/.cache/**']},fs:{allow:[fileURLToPath(new URL('../',import.meta.url))]}}},
});
