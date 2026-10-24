# Data schema

The source of truth is UTF-8 Markdown with YAML frontmatter and unmodified attachment files. There is no external database, server, or account requirement.

## Colony cards

`Colonies/<id>.md` requires `id` equal to its filename and a nonempty `species`. Optional properties: `name`, `founded_on`, `acquired_on`, `origin`, `formicarium`, and `initial_workers`. Dates are local calendar dates in `YYYY-MM-DD` form. `initial_workers` is the worker population **at the start of observations**; N, `"~N"`, `"?"`, or blank. An unknown baseline is never inferred from the first record. Custom properties and free Markdown are allowed.

AntJournal contains the actual public colony cards. Fill optional facts only when known and intended for publication. The separate vault-template cards are empty examples; they never supply missing facts for real observations.

## Observations

The canonical path is `Journal/<colony_id>/YYYY-MM-DD.md`. YAML date must match the filename, and colony_id must match the folder and an existing valid card. One colony/date pair has one record. Dates are not timestamps and are not shifted across time zones.

| Property | Meaning and accepted values |
| --- | --- |
| date, colony_id | Required local date and stable colony ID |
| workers, queens, eggs, larvae, pupae | Required living count; nonnegative integer N, `"~N"`, or `"?"` |
| worker_deaths | Required deaths found since the previous observation; same count format |
| feed_syrup, feed_protein, feed_seeds | Required explicit YAML booleans true/false |
| watered | Required explicit YAML boolean true/false |
| condition | Required normal, attention, or critical; no automatic diagnosis |
| temperature_c, humidity_pct | Optional nonnegative N, N.N, `"~N.N"`, or `"?"`; humidity 0-100 |
| feed_notes, water_notes, notes | Optional free text |

Both `42` and `"42"` are accepted and retain their original representation. Approximation uses `~` without a space. Decimal strings use a point. Negative values, nonfinite values, fractional counts, and exponent notation in strings are rejected. Version 1 also rejects negative temperature. Numbers must fit JavaScript's safe range. Zero is a real measurement; `?` is explicitly unknown; an empty required field is an error.

## Derived projections

Core owns `_metric_<source-field>` for all eight numeric source fields. Valid exact/approximate values produce numbers for Tracker. Unknown, missing, or invalid values remove their stale projections. Identity conflicts and duplicate pairs invalidate all projections in that record. A valid field may remain usable when an unrelated property is invalid.

The `_metric_` prefix is reserved. Approximation is always recoverable from the source field; no `_approx_` cache is required. Core patches only owned projection entries and does not reserialize user YAML or alter Markdown, comments, quotes, or photo embeds.

## Statistics

- Living individuals across all stages = workers + queens + eggs + larvae + pupae. This is not an adult-ant count.
- Cumulative deaths = interval worker_deaths summed since observations began, including the first record.
- Produced workers = current workers + cumulative deaths - initial_workers. Never sum sequential worker population counts.
- Optional workers + cumulative deaths includes the initial population and is labelled separately.

Any unknown term makes a composite unknown. After unknown deaths, later cumulative totals remain incomplete; a separate subtotal of known intervals may be shown. Any approximate term makes the result approximate. Negative production remains visible and produces a warning. These estimates assume no worker transfers or unrecorded deaths and concern the observation period, not the colony's entire biological lifetime.

Date filtering happens after accumulation over the full history. Feeding counts only explicit true values, separately per category. Frequency is events / completed observation fields, not a claim about unobserved days. Overview measurements each retain their own last-known date.
