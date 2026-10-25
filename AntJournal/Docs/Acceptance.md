# Verification and known limits

All fabricated measurements are restricted to test fixtures and the ignored synthetic test vault. The real AntJournal archive contains owner-authored observations and original photographs. The reusable vault-template contains zero observations and blank optional colony facts.

Automated coverage includes N/~N/? parsing, zero and missing values, ranges, required booleans, real dates, identity/path checks, duplicates, baseline/production arithmetic, incomplete death history, separate feeding categories, text-preserving idempotent projection writes, BOM/CRLF, Unicode preservation, debounce, concurrent edits inside Vault.process, reload recovery, attachment byte preservation, and Metadata Menu configuration.

Publication tests cover public observations/media, forbidden runtime paths, secret redaction, local paths, unexpected binaries, fixture hashes/LFS pointers, staged-versus-working discrepancies, and unsafe historical revisions. Staged/history tests inject read results instead of mutating a Git repository. Archive tests cover multiple colonies on one date, estimates, unknown/zero counts, gaps, month order, empty colonies, invalid source rejection, escaped labels, and source/photo preservation. Test vaults are isolated from the real archive.

The actual public journal receives a read-only CLI validation audit. A missing initial-worker baseline is reported as a warning; it is never filled by guessing. Integrity checks compare observation YAML and original media hashes before/after translation. They confirm unchanged measurement data in both observations and unchanged bytes in all four original photos. Newly entered owner facts in the ag-01 colony card are retained. Git is only read; existing staged versions are checked separately.

Earlier Windows UI smoke testing on Obsidian 1.14.5, Calendar Hub 0.2.3, Tracker 1.19.0, and core 1.0.0 confirmed three separate synthetic notes on one date, filename-based dates without intermediate zero points, automatic chart refresh after a saved count change, calculated production, and field-specific automatic errors. This evidence applies to that tested revision. The English 1.1.0 interface and current public archive have not received another full desktop UI pass.

Metadata Menu configuration is tested automatically, including preservation on repeated setup. A complete final UI pass of its Date/Select/Boolean controls remains unverified. Independent reminder delivery on a phone and unsupported-media previews require manual acceptance.

Known limits: malformed YAML can leave Tracker's old metadata cache until repair; flow YAML requires block form for projection updates; Calendar Hub can offer a noncanonical Daily Note on empty dates; Tracker approximation is explained through source/table values; worker transfers are outside the production model. Interactive charts and controls require Obsidian. The static archive calendar and Markdown entries are readable directly in a repository.

Run the current test/build commands in [Setup](Setup.md) and read [Publication policy](Privacy.md) before a later authorized publication. The scanner's pattern coverage does not prove arbitrary public prose or photographs are anonymous.

## Results for this revision

All **75 tests passed**, TypeScript checking passed, and the core bundle built successfully. The real journal audit found **3 colonies, 2 observations, 0 errors, and 0 warnings** after the owner supplied additional colony information, including the initial-worker baseline. The static archive index was generated, and **114 relative links** across vaults/documentation resolved locally.

The working-file publication scan reviewed **125 files with 0 findings**. The full audit also inspected **122 indexed files and 0 reachable commits**; it reported **6 NON_ENGLISH_FIRST_PARTY_TEXT findings in older indexed versions** of three colony cards, two Metadata Menu class files, and the October 23 observation. Their current working versions are English. The index is not synchronized or repaired during this read-only workflow. Rerun the full audit after any later authorized index update.

In this Windows sandbox, pnpm attempted to register its project in a restricted global store. Verification therefore ran the installed local tools directly: node node_modules/typescript/bin/tsc --noEmit; node --import tsx --test test/*.test.ts; and the corresponding node build, archive, validation, and publication scripts. No dependency installation or Git write was needed for these checks.

## Website implementation verification — 2026-10-25

The sibling website project shares the core parser, measurements, statistics, feeding logic, and chart geometry. Its isolated automated suite covers source-value calculations with stale caches, discovery after edits/renames/deletions, new colonies, invalid identities, route collisions, Markdown/wikilink resolution, responsive image output, sanitization, unknown/zero/approximate chart values, multi-colony calendars, unresolved LFS pointers, prefix normalization, preservation of the last valid snapshot, and pruning of obsolete generated media.

A watched isolated development vault passed actual HTTP add/edit/rename/delete route checks and a changed-measurement chart-data check without restarting its server. Synthetic records stayed outside AntJournal.

Browser checks covered the real calendar's three separate October 25 colony links, colony filtering, full-text observation search, production calculations after narrowing dates, feeding counts within the selected period, a photo viewer with arrow-key navigation, and playback of an original MP4 (loaded successfully with no media error). Light/dark layouts and a 390-pixel viewport were inspected; document scroll width equalled client width after the mobile overflow fix. Compiled production JavaScript was checked as well as the dev preview.

The root-site and /Ant-Journal/ builds passed internal-link checks and original-media SHA-256 comparisons. The generated site contains 28 content routes plus 404 and 11 original media files, approximately 60 MiB. A configurable budget fails the build instead of silently omitting media. The current source journal has two model warnings about cj-01 production/death estimates; these remain unchanged.

Remote Pages activation, its Actions run, and hosted LFS/video delivery are not yet verified. The prepared workflow publishes only after the owner enables Actions-based Pages and supplies a normal push to the default branch. No source Git write or remote deployment was performed by this implementation task.
