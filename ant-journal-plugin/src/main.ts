import { Component, ItemView, MarkdownRenderChild, MarkdownRenderer, Notice, Plugin, TFile, WorkspaceLeaf, parseYaml } from 'obsidian';
import { auditVault, feeding, series, statistics, type Audit } from './journal';
import { syncMetrics, readMarkdown } from './markdown';
import { NUMBER_FIELDS, display, issue, validDate, type Issue, type Measurement, type NumberField, type Row, type Source } from './model';
import { chartLinePath } from './chart';

const VALIDATION_VIEW = 'ant-journal-validation';
const LABELS: Record<string,string> = { workers:'Workers', queens:'Queens', eggs:'Eggs', larvae:'Larvae', pupae:'Pupae', worker_deaths:'Deaths since previous observation', temperature_c:'Temperature C', humidity_pct:'Humidity %', feed_syrup:'Syrup', feed_protein:'Protein', feed_seeds:'Seeds', living:'Living individuals across all stages', cumulativeDeaths:'Cumulative deaths', produced:'Workers produced during observations', totalEverObserved:'Workers + deaths (includes baseline)' };

export default class AntJournalPlugin extends Plugin {
  audit: Audit = auditVault([]);
  private blocks = new Set<JournalBlock>();
  private timer?: number;
  private running = false;
  private dirty = false;
  private disposed = false;
  private waiters: (()=>void)[] = [];
  private status!: HTMLElement;

  async onload() {
    this.status = this.addStatusBarItem();
    this.status.addClass('ant-status');
    this.registerDomEvent(this.status, 'click', () => { void this.openValidation(); });
    this.registerView(VALIDATION_VIEW, leaf => new ValidationView(leaf, this));
    this.registerMarkdownCodeBlockProcessor('ant-journal', (source, element, context) => {
      const child = new JournalBlock(element, this, source, context.sourcePath);
      context.addChild(child);
    });
    this.addCommand({ id:'validate-current', name:'Validate current observation', callback: () => { void this.validateCurrent(); } });
    this.addCommand({ id:'validate-all', name:'Validate entire journal', callback: () => { void this.validateAll(); } });
    this.addCommand({ id:'recalculate', name:'Recalculate metrics', callback: () => { void this.validateAll(true); } });
    this.addRibbonIcon('list-checks', 'Ant Journal validation', () => { void this.openValidation(); });
    const changed = (path: string) => { if (/^(Journal|Colonies)\//.test(path)) this.schedule(); };
    this.registerEvent(this.app.vault.on('modify', file => changed(file.path)));
    this.registerEvent(this.app.vault.on('create', file => changed(file.path)));
    this.registerEvent(this.app.vault.on('delete', file => changed(file.path)));
    this.registerEvent(this.app.vault.on('rename', (file, old) => { changed(file.path); changed(old); }));
    this.app.workspace.onLayoutReady(() => { this.schedule(0); });
  }
  onunload() { this.disposed = true; if (this.timer !== undefined) window.clearTimeout(this.timer); this.blocks.clear(); }
  subscribe(block: JournalBlock) { this.blocks.add(block); }
  unsubscribe(block: JournalBlock) { this.blocks.delete(block); }
  private schedule(delay = 650) {
    if (this.disposed) return;
    if (this.timer !== undefined) window.clearTimeout(this.timer);
    this.timer = window.setTimeout(() => { this.timer = undefined; void this.refresh().catch(e => new Notice(`Journal: ${String(e)}`)); }, delay);
  }
  async refresh(): Promise<void> {
    this.dirty = true;
    if (this.running) return new Promise<void>(resolve => this.waiters.push(resolve));
    this.running = true;
    try {
      do {
        this.dirty = false;
        const files = this.app.vault.getMarkdownFiles().filter(f => /^(Journal|Colonies)\//.test(f.path));
        const ioIssues: Issue[] = [];
        const sources: Source[] = [];
        for (const file of files) {
          try { sources.push({ path:file.path, text:await this.app.vault.read(file) }); }
          catch (e) { ioIssues.push(issue(file.path, 'IO', `Cannot read file: ${String(e)}`)); }
        }
        let audit = auditVault(sources);
        for (const source of sources.filter(s => s.path.startsWith('Journal/'))) {
          const desired = audit.projections.get(source.path) ?? {};
          const preview = syncMetrics(source.text, desired);
          if (preview.error && !readMarkdown(source.text).error) ioIssues.push(issue(source.path,'_metric_*',preview.error));
          if (preview.text === source.text || this.disposed) continue;
          const file = this.app.vault.getAbstractFileByPath(source.path);
          if (!(file instanceof TFile)) continue;
          try {
            // Atomic read-modify-write through the public API; validate fresh contents again.
            const result = await this.app.vault.process(file, current => {
              const latest = sources.map(s => s.path === source.path ? { ...s, text:current } : s);
              const projected = auditVault(latest).projections.get(source.path) ?? {};
              return syncMetrics(current, projected).text;
            });
            source.text = result;
          } catch (e) { ioIssues.push(issue(source.path,'IO',`Cannot update metrics: ${String(e)}. Run Recalculate metrics.`)); }
        }
        audit = auditVault(sources);
        audit.issues.push(...ioIssues);
        this.audit = audit;
        this.status.setText(`Journal: ${audit.issues.filter(i=>i.severity==='error').length} errors / ${audit.issues.filter(i=>i.severity==='warning').length} warnings`);
        for (const block of this.blocks) block.update();
        for (const leaf of this.app.workspace.getLeavesOfType(VALIDATION_VIEW)) (leaf.view as ValidationView).render();
      } while (this.dirty && !this.disposed);
    } finally { this.running = false; for(const resolve of this.waiters.splice(0)) resolve(); }
  }
  async validateAll(recalculate = false) {
    await this.refresh();
    await this.openValidation();
    new Notice(`${recalculate ? 'Metrics recalculated' : 'Validation complete'}: ${this.audit.observations.length} observations, ${this.audit.issues.length} messages.`);
  }
  async validateCurrent() {
    const file = this.app.workspace.getActiveFile();
    if (!file || !file.path.startsWith('Journal/')) { new Notice('Open an observation in Journal/<id>/YYYY-MM-DD.md.'); return; }
    await this.refresh();
    await this.openValidation(file.path);
  }
  async openValidation(path?: string) {
    let leaf = this.app.workspace.getLeavesOfType(VALIDATION_VIEW)[0];
    if (!leaf) { leaf = this.app.workspace.getRightLeaf(false)!; await leaf.setViewState({ type:VALIDATION_VIEW, active:true }); }
    (leaf.view as ValidationView).filter = path ?? '';
    (leaf.view as ValidationView).render();
    await this.app.workspace.revealLeaf(leaf);
  }
  link(parent: HTMLElement, path: string, label: string) {
    const link = parent.createEl('a', { text:label, href:path, cls:'internal-link' });
    link.addEventListener('click', e => { e.preventDefault(); void this.app.workspace.openLinkText(path, '', true); });
    return link;
  }
}

class ValidationView extends ItemView {
  filter = '';
  constructor(leaf: WorkspaceLeaf, private plugin: AntJournalPlugin) { super(leaf); }
  getViewType() { return VALIDATION_VIEW; }
  getDisplayText() { return 'Journal validation'; }
  getIcon() { return 'list-checks'; }
  async onOpen() { this.render(); }
  render() {
    const root = this.contentEl;
    root.empty(); root.addClass('ant-journal');
    root.createEl('h3', {text:'Journal validation'});
    if (this.filter) {
      root.createEl('p',{text:this.filter});
      const all = root.createEl('button',{text:'Show entire journal'});
      all.onclick = () => { this.filter = ''; this.render(); };
    }
    const issues = this.plugin.audit.issues.filter(i => !this.filter || i.path === this.filter);
    if (!issues.length) root.createEl('p', {text:'No errors or warnings.'});
    for (const entry of issues) {
      const item = root.createDiv({cls:`ant-issue ant-${entry.severity}`});
      item.createEl('strong',{text:`${entry.severity === 'error' ? 'Error' : 'Warning'} · ${entry.field}`});
      this.plugin.link(item, entry.path, entry.path);
      item.createEl('p',{text:entry.message});
    }
    root.createEl('p',{text:'Validation runs automatically after a 650 ms pause. Markdown is saved independently of validation errors.'});
  }
}

class JournalBlock extends MarkdownRenderChild {
  private selected = '';
  private start = '';
  private end = '';
  private config: Record<string,unknown> = {};
  private frame?: number;
  private version = 0;
  private trackerComponent?: Component;
  constructor(element: HTMLElement, private plugin: AntJournalPlugin, private source: string, private sourcePath: string) { super(element); }
  onload() {
    try { this.config = parseYaml(this.source) ?? {}; }
    catch { this.containerEl.setText('Invalid ant-journal block: expected YAML view: recent / overview / colony.'); return; }
    this.selected = typeof this.config.colony === 'string' ? this.config.colony : '';
    this.plugin.subscribe(this);
    this.update();
  }
  onunload() { this.plugin.unsubscribe(this); if(this.frame !== undefined) window.clearTimeout(this.frame); if(this.trackerComponent) this.removeChild(this.trackerComponent); }
  update() {
    if (this.frame !== undefined) window.clearTimeout(this.frame);
    this.frame = window.setTimeout(() => { this.frame = undefined; this.render(); this.refreshTrackers(); }, 100);
  }
  private table(root: HTMLElement, headings: string[]) {
    const scroll = root.createDiv({cls:'ant-table-scroll'});
    const table = scroll.createEl('table');
    const header = table.createEl('thead').createEl('tr');
    for (const text of headings) header.createEl('th',{text});
    return table.createEl('tbody');
  }
  private render() {
    this.version++;
    const root = this.containerEl;
    root.empty(); root.addClass('ant-journal');
    const { colonies, observations } = this.plugin.audit;
    if (this.config.view === 'recent') {
      const recent = [...observations].sort((a,b) => b.date.localeCompare(a.date) || a.colonyId.localeCompare(b.colonyId)).slice(0,3);
      if (!recent.length) root.createEl('p',{text:'No observations yet. Follow the usage guide to create your first record.'});
      for (const o of recent) { const p = root.createEl('p'); this.plugin.link(p,o.path,`${o.date} · ${o.colonyId}`); }
      return;
    }
    if (!['colony','overview'].includes(String(this.config.view))) { root.createEl('p',{text:'Set view: recent, overview, or colony.'}); return; }
    const controls = root.createDiv({cls:'ant-controls'});
    const select = controls.createEl('select', {attr:{'aria-label':'Colony'}});
    if (this.config.view === 'overview') select.createEl('option',{value:'',text:'All colonies'});
    for (const c of colonies) select.createEl('option',{value:c.id,text:`${c.id} · ${c.name || c.species}`});
    select.value = this.selected;
    select.onchange = () => { this.selected = select.value; this.render(); };
    if (this.config.view === 'overview' && !this.selected) {
      const tbody = this.table(root,['Colony','Latest observation',...NUMBER_FIELDS.map(k=>LABELS[k])]);
      for (const c of colonies) {
        const own = observations.filter(o=>o.colonyId===c.id);
        const tr = tbody.createEl('tr'); this.plugin.link(tr.createEl('td'),c.path,c.name || c.species);
        tr.createEl('td',{text:own.at(-1)?.date ?? 'no observations'});
        for (const field of NUMBER_FIELDS) {
          const latest = [...own].reverse().find(o=>o.values[field].kind==='known');
          const cell = tr.createEl('td');
          if (latest) this.plugin.link(cell,latest.path,`${display(latest.values[field])} · ${latest.date}`);
          else cell.setText('no measurement');
        }
      }
      root.createEl('p',{text:'Latest known values are shown with their own measurement dates. A later ? does not erase a previous measurement; check the latest observation column.'});
      return;
    }
    const colony = colonies.find(c=>c.id===this.selected);
    if (!colony) { root.createEl('p',{text:'Select an existing colony. To add one, create Colonies/<id>.md.'}); return; }
    const own = observations.filter(o=>o.colonyId===colony.id);
    if (!own.length) { root.createEl('p',{text:'No observations for this colony yet. Missing values are not replaced with zero.'}); return; }
    const periods = root.createDiv({cls:'ant-controls'});
    for (const [label,key] of [['From','start'],['To','end']] as const) {
      const wrapper = periods.createEl('label',{text:label+' '});
      const input = wrapper.createEl('input',{type:'date', attr:{'aria-label':label==='From'?'Period start':'Period end'}});
      input.value = this[key];
      input.onchange = () => { this[key] = input.value; this.render(); };
    }
    const start = this.start || own[0].date, end = this.end || own.at(-1)!.date;
    if (!validDate(start) || !validDate(end) || start>end) { root.createEl('p',{text:'Choose a valid period: start must not follow end.'}); return; }
    // Accumulate over the full history BEFORE applying the date filter.
    const rows = statistics(own,colony.baseline).filter(r=>r.observation.date>=start && r.observation.date<=end);
    if (!rows.length) { root.createEl('p',{text:'No observations in the selected period.'}); return; }
    const latest = rows.at(-1)!;
    root.createEl('p',{text:`Latest observation in period: ${latest.observation.date}. Baseline: ${display(colony.baseline)}.`});
    const cards = root.createDiv({cls:'ant-cards'});
    for (const key of ['living','cumulativeDeaths','produced','totalEverObserved'] as const) {
      const card = cards.createDiv({cls:'ant-card'});
      card.createEl('strong',{text:display(latest[key])});
      card.createEl('span',{text:LABELS[key]});
    }
    if (latest.cumulativeDeaths.kind !== 'known') root.createEl('p',{cls:'ant-warning',text:`Death history is incomplete. Sum of known intervals only: ${latest.knownDeathsSubtotal}; the full total and production are unknown.`});
    if (colony.baseline.kind!=='known') root.createEl('p',{cls:'ant-warning',text:'Baseline unknown: worker production cannot be determined.'});
    if (latest.produced.kind==='known' && latest.produced.value<0) root.createEl('p',{cls:'ant-warning',text:'The production estimate is negative. Check source data, the baseline, and transfers.'});
    root.createEl('p',{text:'Produced = current workers + deaths since observations began - baseline. This is an observation-period estimate assuming no transfers or unrecorded deaths. Approximate inputs produce a ~result. ? means unknown or incomplete.'});
    for (const key of ['living','cumulativeDeaths','produced','totalEverObserved'] as const) this.chart(root, rows, key);
    // Additional colonies receive source series without code or dashboard changes.
    if (this.config.view === 'overview' || this.config.colony !== this.selected) for (const key of NUMBER_FIELDS) this.chart(root,rows,key);
    root.createEl('h4',{text:'Feeding in the selected period'});
    const feeds = this.table(root,['Food','Events','Frequency among completed observations','Dates']);
    for (const f of feeding(own,start,end)) {
      const tr = feeds.createEl('tr');
      tr.createEl('td',{text:LABELS[f.field]});
      tr.createEl('td',{text:`${f.count}${f.complete ? '' : ' (incomplete data)'}`});
      tr.createEl('td',{text:`${f.count} / ${f.known}; observations in total ${f.observations}`});
      tr.createEl('td',{text:f.dates.join(', ') || 'no recorded events'});
    }
    root.createEl('p',{text:'Frequency = observations with true / observations with a completed field. Unobserved days do not mean no feeding. Events count dates, not food mass.'});
    root.createEl('h4',{text:'Source values and calculations'});
    const tbody = this.table(root,['Date',...NUMBER_FIELDS.map(k=>LABELS[k]),'All stages','Deaths total','Produced']);
    for (const row of rows) {
      const tr = tbody.createEl('tr'); this.plugin.link(tr.createEl('td'),row.observation.path,row.observation.date);
      for (const field of NUMBER_FIELDS) tr.createEl('td',{text:display(row.observation.values[field])});
      for (const key of ['living','cumulativeDeaths','produced'] as const) tr.createEl('td',{text:display(row[key])});
    }
    const count = this.plugin.audit.issues.filter(i=>i.path.startsWith(`Journal/${colony.id}/`)).length;
    if (count) { const button = root.createEl('button',{text:`Errors / warnings: ${count}`}); button.onclick=()=>{ void this.plugin.openValidation(); }; }
  }
  private chart(root: HTMLElement, rows: Row[], key: Parameters<typeof series>[1]) {
    const all = series(rows,key), points = all.filter((p): p is typeof p & {value:number} => p.value!==null);
    const figure = root.createEl('figure',{cls:'ant-chart'});
    figure.createEl('figcaption',{text:LABELS[key]});
    if (!points.length) { figure.createEl('p',{text:'No complete data for this chart.'}); return; }
    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns,'svg');
    svg.setAttribute('viewBox','0 0 660 210'); svg.setAttribute('role','img'); svg.setAttribute('aria-label', LABELS[key]);
    figure.appendChild(svg);
    const dates = all.map(p=>Date.parse(p.date+'T00:00:00Z'));
    const minX = Math.min(...dates), maxX = Math.max(...dates), minY = Math.min(0,...points.map(p=>p.value)), maxY = Math.max(1,...points.map(p=>p.value));
    const projectX = (date: string) => 45+(Date.parse(date+'T00:00:00Z')-minX)/(maxX-minX || 1)*590;
    const projectY = (value: number) => 170-(value-minY)/(maxY-minY)*140;
    const text = (x: number,y: number,value: string) => { const t=document.createElementNS(ns,'text'); t.setAttribute('x',String(x)); t.setAttribute('y',String(y)); t.textContent=value; svg.appendChild(t); };
    text(2,18,String(maxY)); text(2,168,String(minY)); text(45,202,all[0].date); text(535,202,all.at(-1)!.date);
    const line = document.createElementNS(ns,'path'); line.setAttribute('d','M 44 24 V 172 H 642'); line.setAttribute('class','ant-axis'); svg.appendChild(line);
    const path = chartLinePath(all,projectX,projectY);
    if (path) {
      const curve = document.createElementNS(ns,'path');
      curve.setAttribute('d',path); curve.setAttribute('class','ant-line'); curve.setAttribute('aria-hidden','true');
      svg.appendChild(curve);
    }
    for (const p of points) {
      const x=projectX(p.date), y=projectY(p.value);
      const circle = document.createElementNS(ns,'circle'); circle.setAttribute('cx',String(x)); circle.setAttribute('cy',String(y)); circle.setAttribute('r','5'); circle.setAttribute('class',p.approximate?'ant-point ant-approx':'ant-point'); circle.setAttribute('tabindex','0');
      const label=`${p.date}: ${p.approximate?'~':''}${p.value}`;
      circle.setAttribute('aria-label',label); const title=document.createElementNS(ns,'title'); title.textContent=label; circle.appendChild(title);
      circle.addEventListener('click',()=>{ void this.plugin.app.workspace.openLinkText(p.path,'',true); });
      circle.addEventListener('keydown',e=>{ if(e.key==='Enter') void this.plugin.app.workspace.openLinkText(p.path,'',true); });
      svg.appendChild(circle);
    }
    figure.createEl('small',{text:'Filled: exact; hollow: approximate (~). Lines connect observed values and break at unknown values. Missing days add no measurements. Select a point to open its record.'});
  }
  private refreshTrackers() {
    // Use public MarkdownRenderer rather than Tracker internals.
    // Refresh only this document's Tracker containers; preserve source Markdown.
    const host = this.containerEl.closest('.markdown-preview-view, .markdown-source-view');
    if (!host) return;
    const version = this.version;
    void this.renderTrackerBlocks(host,version);
  }
  private async renderTrackerBlocks(host: Element, version: number) {
    const file=this.plugin.app.vault.getAbstractFileByPath(this.sourcePath);
    if (!(file instanceof TFile)) return;
    const text=await this.plugin.app.vault.read(file);
    if(version!==this.version) return;
    const blocks=[...text.matchAll(/^```tracker\s*\r?\n([\s\S]*?)^```/gm)].map(m=>m[1]);
    const containers=Array.from(host.querySelectorAll<HTMLElement>('.block-language-tracker'));
    if(this.trackerComponent) this.removeChild(this.trackerComponent);
    const renderComponent=new Component();
    this.trackerComponent=renderComponent; this.addChild(renderComponent);
    for(let i=0;i<Math.min(blocks.length,containers.length);i++) {
      const container=containers[i];
      // Render off-DOM, then replace contents without recursively rediscovering new containers.
      const temporary=document.createElement('div');
      try { await MarkdownRenderer.render(this.plugin.app,'```tracker\n'+blocks[i]+'```',temporary,this.sourcePath,renderComponent); }
      catch { continue; }
      if(version!==this.version || !container.isConnected) return;
      const rendered=temporary.querySelector('.block-language-tracker');
      if(rendered) container.replaceChildren(...Array.from(rendered.childNodes));
    }
  }
}
