# Public observation archive

AntJournal is the actual public archive, including real observation notes, colony cards, and original photographs. The owner accepts responsibility for their text and media. It is eligible for Git; private backups, credentials, installed plugin bundles, per-device state, and the synthetic test vault remain excluded.

First-party UI, documentation, templates, note headings, colony cards, and Metadata Menu descriptions are English. Original source measurements, YAML representations, uncertainty, and photo bytes are preserved. Two Cyrillic lookalike letters in an otherwise English observation were corrected. No observations or biological facts were added.

Archive.md provides a static Markdown calendar, colony list, and dated entry table. Observation notes use relative Markdown photo embeds and navigation so repository readers do not need Obsidian. Refresh the index with `pnpm run archive:render`; source observations and attachments are not rewritten by that command. Interactive charts still require the local Obsidian plugins.

The publication checker allows actual journal records and original archive media while retaining checks for secrets, local paths, email addresses, untranslated Cyrillic text, unexpected binaries elsewhere, runtime state, and modified fixtures. Original media metadata is not scanned or stripped. The empty reusable vault-template is still generated independently of the real journal.

Git operations during this revision are read-only. No stage/unstage commands are run. Existing indexed versions can differ from working files and must pass their own audit before later publication. Verification tests inject Git read responses for staged/history scenarios and do not create commits or modify Git indexes. Optional hook installation is documented but is not performed.

Verification results are recorded in [Acceptance](Acceptance.md). Earlier desktop UI checks apply to their tested revision; no new desktop UI pass is claimed for these archive/documentation changes. No commit, push, pull, remote publication, or history rewrite is performed.

## Line charts

Tracker dashboards and their generator now use showLine: true with showPoint: true and fillGap: false. Core ant-journal SVG charts connect consecutive known measurements with straight lines behind the point markers. Unknown values break the line; isolated values remain points. Missing dates do not generate measurements. Approximate values retain hollow markers. The rebuilt plugin must be reloaded in Obsidian to apply the new renderer.

Line-chart verification: all 79 automated tests passed, TypeScript checking passed, and the bundle was built and installed into the main and synthetic test vaults. Tracker configurations, zero/approximate points, irregular dates, unknown-value breaks, isolated points, and incomplete calculated series are covered. No new desktop UI verification is claimed. A separate working-file publication check flagged Cyrillic text in Journal/cj-01/2026-09-15.md; that observation was outside this chart-only edit.
