# ant-journal-core

Desktop-only Obsidian plugin (minimum 1.7.2). The English UI is named **Ant Journal**. Runtime code works offline and never reads or writes attachment bytes.

`src/model.ts` defines values; `src/markdown.ts` parses YAML and patches owned projections; `src/journal.ts` validates identity/statistics; `src/main.ts` uses the public Obsidian API for events, reports, and dynamic blocks. Scripts initialize a public journal vault, build/install the plugin, download pinned community releases, configure Metadata Menu, generate synthetic smoke fixtures, render a clean public template, and audit publication safety.

```powershell
pnpm install --frozen-lockfile
pnpm run check
pnpm test
pnpm run build
pnpm run install:plugin
pnpm run template:render
pnpm run archive:render
pnpm run check:public
```

The build uses esbuild; tests run through Node/tsx; tsc checks types. Python is not needed. Direct versions are pinned in package.json and transitives in pnpm-lock.yaml.

Supported Markdown block configurations:

````markdown
```ant-journal
view: recent
```

```ant-journal
view: overview
```

```ant-journal
view: colony
colony: cn-01
```
````

The overview discovers valid colony cards. Colony views provide source/calculated series, date filtering, feeding events, and the measurement table. Shipped dashboards also include Tracker; updates use public MarkdownRenderer, not internal vendor APIs.

Metadata Menu setup is `pnpm run setup:metadata`; it creates missing folder-mapped schemas and refreshes the separate colony ID list while preserving user settings and observations. [Fields](../docs/Fields.md) explains type choices.

AntJournal is the real public archive; never use its observations as mutable test fixtures. The generated test-vault, dependency/build/test output, installed plugins, and private backups are ignored. The archive renderer reads real notes and writes only a static Markdown index. The publication check reads working files, staged blobs, and reachable history without changing Git state. [Privacy](../docs/Privacy.md) explains scope and limitations.
