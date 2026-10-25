# Ant Journal website

An Astro static website generated directly from the real AntJournal vault. The website has no database, account system, or separate authored copy of the notes. Existing journal validation/statistics and chart geometry are shared with the Obsidian core.

## Local setup

Use Node.js 24.15+ (the build was checked with 24.22.1), npm, pnpm 11.25.0 for the existing core project, and ffmpeg on PATH for video posters. Ensure the checkout contains original LFS media rather than pointer files.

From the repository root:

```powershell
cd ant-journal-plugin
pnpm install --frozen-lockfile
cd ../website
npm ci --ignore-scripts
npm run dev
```

The terminal prints the local preview URL. Keep it running while editing the vault in Obsidian. Added, edited, renamed, and deleted observations, colony cards, pages, and referenced media refresh automatically. No archive-render command is needed for this website. Ctrl+C stops the preview.

```powershell
npm test
npm run check
npm run build
npm run preview
```

The build writes only ignored .generated, .cache, .astro, and dist directories. It validates source fields, renders HTML and media, checks local links and repository prefixes, rejects unresolved LFS pointers, compares original media hashes, and enforces a size budget. It never updates the Git index, commits, pushes, or rewrites source observations. Astro telemetry is disabled by the local command wrapper.

## Authoring

Keep using the existing observation YAML and paths: Journal/<id>/YYYY-MM-DD.md and Colonies/<id>.md. Both ordinary Markdown links and Obsidian wikilinks/image/video embeds work. New English information pages under Pages/**/*.md are automatically included in the Pages menu; a title is derived from H1 or filename, with an optional YAML title override. Source dates remain calendar strings.

The site computes all metrics from canonical source properties, ignoring stale _metric_* projections. Missing dates do not create measurements, unknown values break lines, estimates keep their markers, and date filtering follows full-history cumulative calculations. Feeding counts, frequencies among observed records, and event dates follow the selected chart range. Invalid identities/YAML/required values block a new build; measurement warnings remain visible without changing facts.

Images get responsive viewing copies; GIF originals remain animated. Supported MP4/WebM videos get posters and native controls without autoplay. HEIC or other unsupported previews retain original downloads. Raw HTML passes through an allowlist sanitizer. Note transclusion (![[another-note]]) is explicitly rejected; use a link instead. Missing/ambiguous links and colliding page routes fail with file-specific diagnostics.

General page moves update the menu and generated URL; old URLs need an explicit redirect if permanent aliases are required. The existing Home.md and Archive.md are linked to generated views and do not control the site's indexes. Docs appear in a separate guide. Templates, schemas, configuration, unreferenced attachments, test vaults, and local backups are not published as site content.

## GitHub Pages

One-time repository setup: in Settings → Pages, choose GitHub Actions as the build source. Keep the repository public as intended. The supplied ../.github/workflows/pages.yml builds on pushes and pull requests; deployment is limited to the repository's default branch and requires all checks to pass. A manual workflow run on that branch is also supported.

After the owner adds the prepared files and performs their normal commit/push, the workflow downloads LFS objects, installs locked dependencies, verifies the current publication snapshot, tests the core and website, builds a Pages artifact, and deploys it. The workflow does not create a generated branch or modify repository content. No personal token is needed. Production base paths come from configure-pages, supporting both project sites and domain-root sites.

The local implementation has not been deployed remotely. A real hosted LFS/video playback smoke test remains necessary after the owner activates Pages. An unsuccessful build leaves the previous deployed artifact in place. The workflow checks current content; it does not claim a historical audit from its shallow checkout. The separate existing full publication command can inspect reachable history.

## Media size and configuration

Only referenced original media and generated previews enter dist. Sources and their original bytes stay unchanged. Processing outputs are cached by source SHA-256 and a processing-profile hash. Old unreferenced generated files are pruned after a successful refresh; invalid source content leaves the last valid preview snapshot intact.

The default build budget is 900 MiB, with an early warning at 750 MiB, below the published Pages limit. Exceeding it fails explicitly; no older media is silently omitted. Storage remains local to the site artifact until a separate storage decision is needed.

| Environment variable | Purpose |
| --- | --- |
| SITE_URL | Public origin; configured automatically in the Pages workflow |
| SITE_BASE | Repository prefix, e.g. /Ant-Journal; empty for the domain root |
| REPOSITORY_URL | GitHub source link in the footer |
| SITE_MAX_BYTES | Positive site size budget in bytes |
| FFMPEG_PATH | Optional ffmpeg executable location |
| JOURNAL_VAULT | Alternate vault for isolated tests |
| JOURNAL_GENERATED_DIR / JOURNAL_ASTRO_CACHE | Separate generated/cache directories for isolated development servers |

The original Human Use License and LLM policy remain accessible on the website. Third-party package notices are distributed separately; dependency licenses are not replaced by the project license. See the repository's AI_POLICY.md and THIRD_PARTY_NOTICES.md.
