# Ant Journal

A public archive of ant colony observations and original photographs, with an offline Obsidian workspace for validation, calendars, charts, and typed Metadata Menu controls. The source of truth is plain English Markdown with YAML properties.

[View as website](https://kiritomc03.github.io/Ant-Journal/)

## License

Original code, journal text, and media use the [Ant Journal Human Use License 1.0](LICENSE): royalty-free human use, including commercial use, modification, and redistribution, subject to preserving the license and its LLM-use prohibition in copies and adaptations. [LLM access, AI-assisted editing, and model training](AI_POLICY.md) are not licensed. Third-party material retains [its own terms](THIRD_PARTY_NOTICES.md). This is a custom source-available license, not an OSI-approved open-source license.

A public license cannot technically block access or override mandatory legal exceptions or separate hosting agreements. Read the [licensing and hosting limits](docs/Licensing.md), including the GitHub-specific AI-training grant, before publication.

## Read the archive

Start with the [observation archive](AntJournal/Archive.md): browse the monthly calendar, choose a colony, and open dated entries with their photographs. No Obsidian installation or account is needed to read the Markdown in a public repository. Interactive charts and editing controls run locally in Obsidian.

- [Acanthomyrmex glabfemoralis — ag-01](AntJournal/Colonies/ag-01.md)
- [Camponotus japonicus — cj-01](AntJournal/Colonies/cj-01.md)
- [Camponotus nicobarensis — cn-01](AntJournal/Colonies/cn-01.md)

`AntJournal/` contains the real public journal. `vault-template/` is a separate reusable starter with no observations. Synthetic test records stay in tests and the ignored test vault. Counts, uncertainties, and missing baselines are preserved; observations are never invented to fill gaps.

## Open in Obsidian

Install desktop Obsidian, Node.js 22+, and pnpm 11.25.0. From the repository root:

```powershell
cd ant-journal-plugin
pnpm install --frozen-lockfile
pnpm run init:vault
pnpm run build
pnpm run install:plugin
pnpm run setup:community
```

Open AntJournal as a vault and review/enable its local plugins. Initialization preserves existing records. [Setup](docs/Setup.md), [Usage](docs/Usage.md), and [typed field controls](docs/Fields.md) describe the workflow. Journal content is intended for publication; keep credentials, device state, and local backups outside it.

## Verify and refresh

```powershell
cd ant-journal-plugin
pnpm run check
pnpm test
pnpm run validate -- ../AntJournal
pnpm run archive:render
pnpm run build
pnpm run check:public
```

The static archive index is refreshed explicitly after edits. Calendar Hub and charts refresh inside Obsidian after saving. [Data schema](docs/DataSchema.md), [Validation](docs/Validation.md), and [Acceptance](docs/Acceptance.md) explain calculations, error handling, and verification limits. [Notifications](docs/Notifications.md) covers optional independent feeding reminders.

The [Astro website](website/README.md) generates pages, navigation, calendar, charts, search, and media previews directly from AntJournal. Run npm run dev in website for a watched local preview. The prepared GitHub Pages workflow rebuilds after the owner's push; [setup and publication instructions](docs/GitHubPages.md) explain the one-time Pages setting. The website does not require manually refreshing Archive.md.

## Publication policy

The owner is responsible for the journal's text, photographs, and embedded media metadata. Original media stays unchanged and uses [Git LFS rules](docs/Git.md). The [publication check](docs/Privacy.md) reads working candidates, the existing index, and reachable history; it does not stage, commit, push, pull, or rewrite Git state. Its pattern scan cannot establish that arbitrary content is anonymous.

Only portable Obsidian configuration is eligible for Git. Local backups, credentials, workspace state, installed plugin bundles, and synthetic runtime vaults are excluded. [SECURITY](SECURITY.md) describes the remaining safety boundary.
