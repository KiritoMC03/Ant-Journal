# Validation and recovery

The desktop-only `ant-journal-core` plugin uses public Obsidian APIs. Markdown changes, creation, deletion, and renaming inside Journal/Colonies trigger validation after a 650 ms debounce. Enabling core rebuilds the journal. Saving notes is never blocked.

Commands in the palette:

- **Ant Journal: Validate current observation**
- **Ant Journal: Validate entire journal**
- **Ant Journal: Recalculate metrics**

Click the Journal status bar item or checklist ribbon icon to open a report. Each item contains a file link, field name, and explanation. Links open the note rather than a precise YAML position.

Errors include missing required properties, quoted booleans, invalid counts/ranges/status, invalid dates, missing colony cards, filename/folder conflicts, duplicate colony/date pairs, malformed YAML, and I/O failures. Duplicate records are excluded until manually consolidated into one canonical file.

Warnings cover explicit `?`, unknown baseline, and negative production over the entire history or a neighboring interval. Dashboards explain incomplete death history. These are data-quality messages, not care recommendations.

## Write safety

Core reads the raw file rather than a potentially delayed metadata cache. It uses atomic `Vault.process` and checks fresh contents before changing owned projections. Its own write event may cause another validation pass; idempotent comparison prevents another unchanged write. Source properties, ordering, formatting, and body text remain untouched.

Malformed YAML is not modified because safe field locations cannot be established. Tracker may retain an old Obsidian cache until syntax is repaired and metrics are recalculated. A flow-style YAML root `{...}` can be read for core statistics but requires conversion to a block mapping before projection updates; the template already uses that form.

Core refreshes its tables/SVG and Tracker blocks in the same dashboard through public MarkdownRenderer. Standalone Tracker blocks without a neighboring ant-journal block may require reopening the note or switching reading mode. Full scans after debounce favor correctness for a personal-size vault; incremental indexing is a possible future optimization.
