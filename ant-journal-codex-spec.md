# Ant Journal implementation specification

Version 1.2. Target: desktop Obsidian on Windows. First-party UI and documentation: English.

This public technical specification describes an English public archive of real ant colony observations, with local Obsidian editing and analysis. The owner takes responsibility for journal text and original photographs. Synthetic measurements are restricted to isolated tests, never the main archive.

## Architecture and publication boundary

Use plain UTF-8 Markdown with YAML frontmatter and original attachments as the source of truth. No external database, web service, account system, mobile app, daemon, photo conversion, or automatic cloud synchronization is required.

Make AntJournal observations, colony cards, original media, navigation, and portable configuration eligible for public Git alongside code, documentation, tests, and an empty reusable vault-template. Keep the synthetic test vault, credentials, machine paths, workspace state, installed plugins, and local backups excluded. Provide a static Markdown archive/calendar index and standard relative links/photo embeds for readers without Obsidian. Audit staged blobs, working candidates, and reachable history using read-only Git operations. LFS is storage, not privacy. Never stage, unstage, commit, push, pull, or change Git configuration as part of this work.

## Data and layout

The starter has example cards cn-01 / Camponotus nicobarensis, cj-01 / Camponotus japonicus, and ag-01 / Acanthomyrmex glabfemoralis. ID is stable and independent of species/name. Add colonies through cards and folders without recompiling.

Vault layout: Home.md; Archive.md; Colonies/<id>.md; Journal/<id>/YYYY-MM-DD.md; Dashboards/Overview.md and per-colony dashboards; Templates/Observation.md; Attachments/; Docs/; FileClasses/; Config/ColonyIds.md; .obsidian/. Development lives in the sibling ant-journal-plugin TypeScript project. Install manifest.json, main.js, styles.css, LICENSE, and AI_POLICY.md for core.

Cards require id and species. Optional name, founded_on, acquired_on, origin, formicarium, initial_workers, and custom information remain blank unless known. initial_workers is the baseline at the start of observations, not an inferred first-record population.

One canonical observation exists per (colony_id, date). YAML identity must match its path and a valid card. Dates are local calendar days, not modification timestamps. Missing observations never mean zero. Extend a date's existing note instead of creating another.

Required fields: date, colony_id, workers, queens, eggs, larvae, pupae, worker_deaths, feed_syrup, feed_protein, feed_seeds, watered, condition. Counts accept nonnegative integer N, string N, ~N, or ?. Booleans must be explicit true/false, not strings or missing defaults. condition is normal/attention/critical. Optional temperature_c and humidity_pct accept nonnegative decimals and ~ estimates or ?; humidity is 0-100. feed_notes, water_notes, notes, custom properties, and arbitrary Markdown are allowed.

The template leaves unobserved properties blank. Metadata Menu provides Date, Select, Boolean, and Input controls. Mixed N/~N/? measurements remain Input; derived projections are numeric. Types and lists are folder-mapped without rewriting existing observations. A new colony's ID list can be refreshed from valid cards.

## Core validation and projections

Implement a small desktop-only plugin. Preserve original values, quotes, comments, text, and image embeds. Patch only owned _metric_* fields; do not serialize user YAML wholesale. Clear stale projections for unknown/missing/invalid values. Approximation remains in canonical source values. Use atomic fresh-content updates, a debounce, and idempotent comparisons; metadata-cache delays must not override source data.

Provide automatic validation plus commands for current observation, entire journal, and metric recalculation. Errors identify file, field, and cause with file links. Check required fields, formats, humidity range, real dates, valid colony, path identity, and duplicate pairs. Unknown values, missing baseline, and negative production estimates produce warnings. Malformed YAML is preserved without cache writes. No editor replacement or custom calendar is required.

## Statistics and visualization

Per colony, show workers, eggs, larvae, pupae, interval worker deaths, total living individuals across all stages (including queens), cumulative worker deaths, estimated produced workers, environment measurements, and separate syrup/protein/seed event counts, dates, and frequency for a selected period.

produced_workers = current workers + cumulative deaths - initial_workers. Do not sum daily populations. Unknown baseline or a missing term means unknown production. Unknown interval deaths make later cumulative results incomplete. Approximate terms make approximate results. Keep negative results visible and warn. Assumptions: no transfers/removals and no unrecorded deaths; the result concerns the observation period, not the colony's full life.

Optionally display workers + cumulative deaths, explicitly including baseline. Accumulate full history before filtering a period. Compare last-known measurements with their own dates. Count only true feeding flags; unobserved days are not false.

Prefer Tracker for direct numeric _metric_* series with per-colony folders and YYYY-MM-DD filename dates. Use fillGap false, showLine true, showPoint true, ignoreZeroValue false; no missing-day penalties or implied observations. Core renders calculated SVG series with connecting lines and point markers, breaking lines at unknown values, plus tables. All views update after saving/recalculation. Home includes colony links and three latest records.

## Calendar, attachments, notifications

Configure Calendar Hub to scan only Journal recursively. Multiple colony files on one day remain individually selectable. Exclude cards, templates, dashboards, configuration, and documentation. Use filename dates, disable creation-date fallback, and document the empty-day Daily Note creation prompt.

Store original images in Attachments and embed them with relative standard Markdown links for public readers. Never compress or convert automatically. Preserve unsupported HEIC originals and explain preview limits.

Provide manual independent Google Tasks/Calendar instructions for feeding categories only. The owner chooses intervals/time; no biologically invented schedule. iPhone alerts do not require Obsidian. Feeding facts are recorded manually and do not synchronize with reminders. Future API configuration may use stable colony IDs without changing observations; credentials must remain private.

## Tests and acceptance

Test parsing, unknown/zero semantics, required booleans, range/date/path/ID errors, duplicates, N/~N projections, idempotence, source preservation, concurrent edits, debounce, week-long observation gaps, baseline arithmetic, incomplete deaths, negative estimates, separate feeding, new colonies, reload recovery, attachment hashes, and Metadata Menu configuration in isolated vaults.

Desktop smoke scenarios: three files on one date in Calendar Hub, opening each independently, graphs using exact/approximate/zero values without missing-day points, saved count changes updating charts, automatic precise validation errors, calculated metrics and incomplete-history warnings, and ordinary Markdown/photo access with core disabled. Document only actually completed UI checks; phone delivery and unsupported media preview require separate manual acceptance.

Reproduce builds, plugin installation, public-template generation, and publication checks on Windows without editing generated bundles. Preserve source observation values and original attachment bytes. Permit the real public archive while excluding secrets, runtime state, and local backups. Supply usage, schema, validation, typed-control, notification, privacy/LFS instructions, verification evidence, and known limits.

## Licensing

Original project material is source-available under the Ant Journal Human Use License 1.0: royalty-free human reuse, including commercial use, with preservation of notices and a prohibition on LLM access, processing, modification, and training. Carry these terms into distributed copies, forks, and adaptations, while preserving separately licensed third-party components. Include LICENSE and AI_POLICY.md in exported vaults and plugin bundles. Do not claim technical access blocking, OSI approval, or priority over mandatory legal exceptions, earlier grants, or separate hosting agreements. See docs/Licensing.md for the checked hosting limits.
