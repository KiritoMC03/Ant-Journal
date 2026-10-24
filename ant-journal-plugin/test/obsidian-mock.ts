export class Component { addChild(){} removeChild(){} }
export class ItemView extends Component {}
export class MarkdownRenderChild extends Component {}
export class WorkspaceLeaf {}
export class TFile { static [Symbol.hasInstance](value:unknown) {return !!(value as {__testFile?:boolean})?.__testFile;} }
export class Notice { constructor(_text:string){} }
export class Plugin extends Component {
  app: unknown;
  constructor(app:unknown){super();this.app=app;}
  addStatusBarItem(){return {addClass(){},setText(){}};}
  registerDomEvent(){} registerView(){} registerMarkdownCodeBlockProcessor(){} addCommand(){} addRibbonIcon(){} registerEvent(){}
}
export const MarkdownRenderer={render:async()=>{}};
export const parseYaml=()=>({});
