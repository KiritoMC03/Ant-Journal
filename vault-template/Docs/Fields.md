# Typed controls with Metadata Menu

[Metadata Menu](https://github.com/mdelobelle/metadatamenu) 0.8.12 is configured using folder-mapped file classes. See its [field documentation](https://mdelobelle.github.io/metadatamenu/fields/).

After installing, reload Obsidian and enable Metadata Menu in Community plugins if necessary. Open an observation and use its Metadata Menu button beside the tab/properties, the **Open this note's fields modal** command, or **Field Options** in the context menu. Select fields also support editor suggestions.

| Property | Configured control |
| --- | --- |
| date | Date picker; YYYY-MM-DD, plain text rather than a wiki-link |
| colony_id | Select from Config/ColonyIds.md |
| condition | Select: normal, attention, critical |
| feed_syrup, feed_protein, feed_seeds, watered | Boolean controls; native Obsidian checkbox properties |
| Counts, temperature, humidity | Input, preserving N / ~N / ? |
| feed_notes, water_notes, notes | Text Input |

A Number control cannot represent `~N` or `?`, so source measurements deliberately remain Input. Core checks their numeric rules. Derived `_metric_*` properties have native Number types and are omitted from Metadata Menu controls. Colony founded/acquired dates use Date; permanent information and baseline use Input.

An empty or invalid Boolean may visually resemble false. Explicitly select and save true or false. The validator still rejects missing values and strings such as `"false"`. Opening a menu never fills defaults or repairs observations automatically. Changing date or colony does not rename the note; maintain canonical filename/folder identity.

`FileClasses/Observation.md` applies to Journal/** and `FileClasses/Colony.md` to Colonies/** through filesPaths. Existing records need no extra fileClass property. The calendar scans Journal only, excluding schemas and choices.

For a new colony, add its ID as a plain line in Config/ColonyIds.md, or run `pnpm run setup:metadata` from the plugin directory. The command recreates this derived list from valid cards and creates missing configuration, preserving existing schemas, settings, property-type choices, and observations. Additional strictly numeric custom properties may use Number with bounds and a step. Dataview is not required for the supplied controls.
