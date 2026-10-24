# Using Ant Journal

[Home](../AntJournal/Home.md) | [Typed controls](Fields.md) | [Data model](DataSchema.md) | [Public repository safety](Privacy.md)

## Create an observation

1. Open the **AntJournal public archive vault**, not the reusable `vault-template` directory. In Obsidian, create `Journal/<colony-id>/YYYY-MM-DD.md` for the actual local observation date.
2. Run **Templates: Insert template** and select `Observation`. The Templates folder is `Templates`. Insert the template into an empty note.
3. Set `date` to the filename date and `colony_id` to the folder ID. Fill every required count with N, `"~N"`, or `"?"`. Explicitly choose true/false for each feeding category and water. Choose `normal`, `attention`, or `critical` for condition.
4. Add English free text and original photo embeds. For repository readers use standard relative Markdown, for example `![Colony photograph](../../Attachments/unique-filename.jpg)` from a canonical observation. Obsidian saves automatically. After a 650 ms pause, core validates the note and updates its `_metric_*` projections.
5. Open **Calendar Hub: Open calendar view**, then a colony dashboard or `Dashboards/Overview`.

There is one note per colony and date. Extend that note during the day. `worker_deaths` means the total found since the previous observation, not an increment to the number already entered today. In the first record, count from the beginning of the observation period. Missing days are not zero counts or proof of no feeding.

## Typed editing

Metadata Menu provides a date picker, Select lists for colony and condition, and Boolean controls. Native Obsidian properties also provide checkboxes. Counts, temperature, and humidity remain Input fields because they accept exact values, `~` estimates, and `?`. See [Fields](Fields.md). A visually unchecked empty Boolean is still unfilled: explicitly save true or false and check the validator.

## Fix an error

Click the Journal status bar item, or run **Ant Journal: Validate current observation** / **Validate entire journal**. Messages identify the file, field, and cause; links open the file. Correct the source property. Do not edit `_metric_*`: **Recalculate metrics** rebuilds them. Repair YAML syntax before trusting previously cached Tracker output.

## Add a colony

Create `Colonies/<id>.md` with matching `id` and a nonempty `species`, then create `Journal/<id>/`. IDs use lowercase Latin letters, digits, and hyphens. Optional `name` can change; the stable ID must not. The validator, calendar, and overview filter discover new colonies without recompilation. To refresh Metadata Menu choices, add the ID to `Config/ColonyIds.md` or run `pnpm run setup:metadata` from the plugin project. Copy a dashboard and replace its `colony:` and Tracker `folder:` if you want a dedicated page.

## Photos and offline use

Paste or attach originals into `Attachments/` and embed them from a canonical observation as `![Colony photograph](../../Attachments/unique-filename.jpg)`. A useful naming pattern is `<id>_<date>_<sequence>.<extension>`. Avoid replacing an existing attachment on a name conflict. The plugin never compresses, resizes, or transcodes images. JPEG/PNG usually display; HEIC preview depends on the OS and Electron. Preserve an unsupported original and prepare a separate viewing copy yourself if needed.

Markdown, YAML, links, and original attachments remain accessible with plugins disabled. Re-enable core and recalculate projections after editing without it. The journal works offline; independent Google notifications require a phone/account and appropriate connectivity. Backups remain the owner's responsibility.
