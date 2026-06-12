import { sb } from "../extractor/lib";
const UA="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";
const V1="https://anamaya.com";
const TYPES=["pages","posts","retreat","ytt","accommodations","guest_yoga_teacher","news_coverage"];
function pathOf(link:string){try{return new URL(link).pathname;}catch{return link;}}
async function liveUrls(t:string){
  const out:{path:string,modified:string,link:string}[]=[];
  for(let page=1;page<=20;page++){
    const r=await fetch(`${V1}/wp-json/wp/v2/${t}?per_page=100&page=${page}&orderby=modified&order=desc&_fields=link,modified`,{headers:{"user-agent":UA}}).catch(()=>null);
    if(!r||!r.ok)break;
    const arr=await r.json() as any[];
    if(!arr.length)break;
    for(const x of arr) out.push({path:pathOf(x.link),modified:x.modified,link:x.link});
    if(arr.length<100)break;
  }
  return out;
}
async function main(){
  const c=sb();
  // all v1 url_paths in inventory
  const inv=new Set<string>();
  let from=0;
  while(true){
    const {data}=await c.from("url_inventory").select("url_path").eq("source_site","v1").range(from,from+999);
    if(!data?.length)break;
    for(const r of data){inv.add(r.url_path);inv.add(r.url_path.replace(/\/$/,""));}
    if(data.length<1000)break;from+=1000;
  }
  let totalMissing=0;
  for(const t of TYPES){
    const live=await liveUrls(t);
    const missing=live.filter(u=>!inv.has(u.path)&&!inv.has(u.path.replace(/\/$/,"")));
    if(missing.length){
      console.log(`\n### ${t}: ${missing.length} MISSING of ${live.length} live`);
      for(const m of missing.sort((a,b)=>b.modified.localeCompare(a.modified))) console.log(`  ${m.modified}  ${m.path}`);
    } else {
      console.log(`${t}: 0 missing of ${live.length} live`);
    }
    totalMissing+=missing.length;
  }
  console.log(`\nTOTAL MISSING (live but not in inventory): ${totalMissing}`);
}
main().then(()=>process.exit(0)).catch(e=>{console.error(e);process.exit(1)});
