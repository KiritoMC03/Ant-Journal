import type {Measurement,Row} from '../../../ant-journal-plugin/src/model';
export interface Asset {source:string;original:string;src:string;kind:'image'|'video'|'file';width?:number;height?:number;srcset?:string;poster?:string;bytes:number}
export interface Entry {path:string;route:string;date:string;colonyId:string;title:string;excerpt:string;search:string;html:string;media:Asset[];values:Record<string,Measurement>;data:Record<string,unknown>}
export interface Colony {id:string;species:string;name:string;route:string;html:string;data:Record<string,unknown>;baseline:Measurement;rows:Row[];cover?:Asset;latest:Record<string,{value:Measurement;date:string}>;entries:Entry[]}
export interface Page {route:string;title:string;kind:'home'|'archive'|'calendar'|'compare'|'colony'|'entry'|'page'|'guide'|'legal';source?:string;html?:string;colonyId?:string;date?:string}
export interface Snapshot {version:string;pages:Page[];colonies:Colony[];entries:Entry[];warnings:{path:string;field:string;message:string}[];media:Asset[];base:string}
