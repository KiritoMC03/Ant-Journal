# Observation archive

Public field notes and original photographs. Read every entry directly in Markdown; Obsidian is optional.

[Home](Home.md) | [Data model](Docs/DataSchema.md)

## Reading the records

Dates are local observation dates. `~` marks an estimate; `?` means unknown. A day without a record has no observation. Reported conditions describe the keeper's assessment. No synthetic observations are included.

## Colonies

| Colony | Species | Records | Observation dates |
| --- | --- | ---: | --- |
| [ag-01](Colonies/ag-01.md) | Acanthomyrmex glabfemoralis | 2 | 2026-10-23 to 2026-10-24 |
| [cj-01](Colonies/cj-01.md) | Camponotus japonicus | 0 | No observations yet |
| [cn-01](Colonies/cn-01.md) | Camponotus nicobarensis | 0 | No observations yet |

## 2026-10

### Calendar

| Monday | Tuesday | Wednesday | Thursday | Friday | Saturday | Sunday |
| --- | --- | --- | --- | --- | --- | --- |
|  |  |  | 1 | 2 | 3 | 4 |
| 5 | 6 | 7 | 8 | 9 | 10 | 11 |
| 12 | 13 | 14 | 15 | 16 | 17 | 18 |
| 19 | 20 | 21 | 22 | 23<br>[ag-01](Journal/ag-01/2026-10-23.md) | 24<br>[ag-01](Journal/ag-01/2026-10-24.md) | 25 |
| 26 | 27 | 28 | 29 | 30 | 31 |  |

### Entries

| Date | Colony | Workers | Eggs | Larvae | Pupae | Interval worker deaths | Condition |
| --- | --- | ---: | ---: | ---: | ---: | ---: | --- |
| [2026-10-24](Journal/ag-01/2026-10-24.md) | [ag-01](Colonies/ag-01.md) | ~50 | ~15 | ~5 | ~0 | 2 | normal |
| [2026-10-23](Journal/ag-01/2026-10-23.md) | [ag-01](Colonies/ag-01.md) | ~50 | ~15 | ~5 | ~0 | ~0 | attention |

## About this index

Generated from the real colony cards and observation files. Photographs are embedded in the individual entries. For interactive charts, date filters, validation, and typed editing controls, open this folder in Obsidian and follow [Setup](Docs/Setup.md).

Refresh after editing observations: run `pnpm run archive:render` from the sibling `ant-journal-plugin` folder. This only rewrites Archive.md; it does not change observations, images, or Git state.
