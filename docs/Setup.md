# Setup and reproducible builds

The public repository contains the real `AntJournal` observation archive, source code, documentation, known synthetic fixtures, and an empty reusable `vault-template`. Readers can use `AntJournal/Archive.md` without Obsidian. Maintainers edit the public AntJournal vault; only portable configuration is eligible for Git. No local account path is required.

Prerequisites: desktop Obsidian (minimum 1.7.2; previously tested on 1.14.5), Node.js 22+, and pnpm 11.25.0. From the repository root:

```powershell
cd ant-journal-plugin
pnpm install --frozen-lockfile
pnpm run init:vault
pnpm run build
pnpm run install:plugin
pnpm run setup:community
pnpm run setup:metadata
pnpm run check
pnpm test
```

Open the generated AntJournal folder as a vault. Review Obsidian's trust prompt yourself and enable the four community plugins. The setup does not bypass Restricted Mode or change global security settings. `init:vault` preserves existing files; inspect its optional target argument before using a nondefault directory. The plugin install copies main.js, manifest.json, styles.css, LICENSE, and AI_POLICY.md. The bundle preserves the third-party yaml notice.

| Component | Pinned version |
| --- | --- |
| Ant Journal core | 1.1.0 |
| Calendar Hub | 0.2.3 |
| Tracker | 1.19.0 |
| Metadata Menu | 0.8.12 |
| Obsidian API types | 1.14.4 |

Third-party releases come from official repositories listed in scripts/community.mjs. The downloader verifies manifest ID/version, retains available upstream licenses, and records SHA-256. Those hashes document the download, not an independent publisher signature. Community binaries and per-device runtime state are not public source assets.

## Calendar Hub

[Official plugin](https://community.obsidian.md/plugins/calendar-hub). Settings: scan all folders enabled, included subtree `Journal`, filename format YYYY-MM-DD, frontmatter matching disabled, creation-date fallback disabled, week numbers disabled, Monday week start, English locale. Several colony records on one date remain separate entries. Other folders are excluded.

Daily Notes is enabled for date-format compatibility. Create observation files manually inside a colony folder. Calendar Hub 0.2.3 may offer to create a Daily Note on an empty date; cancel it, because Journal/YYYY-MM-DD.md is not a canonical observation path.

## Charts and controls

[Tracker parameters](https://github.com/pyrochlore/obsidian-tracker/blob/master/docs/InputParameters.md): frontmatter `_metric_*`, one Journal/<id> folder, YYYY-MM-DD filename X dates, ignoreZeroValue false, showPoint true, showLine true, fillGap false. Straight lines connect available measurements; gap filling remains disabled and missing days add no measurements. Core provides calculated rows, SVG series, feeding summaries, and date/colony filters. [Fields](Fields.md) explains Metadata Menu.

Run `pnpm run smoke:prepare` to generate an ignored synthetic test vault after installing plugins locally. Run `pnpm run validate -- ../AntJournal` for a read-only CLI audit. Run `pnpm run template:render` to refresh the clean public template from generators and docs without reading or modifying real observations. Run `pnpm run archive:render` to refresh the public Markdown calendar/index from the real AntJournal records; it writes only Archive.md and fails on validation errors. Before publication, follow [Privacy](Privacy.md) and run `pnpm run check:public`.
