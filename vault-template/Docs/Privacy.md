# Public archive and publication safety

## Intended public content

AntJournal is the public archive: real English observations, colony cards, original photos/videos, navigation, dashboards, schemas, and portable Obsidian defaults. The owner accepts responsibility for the published text, media, and embedded EXIF/GPS or other metadata. These records are eligible for Git and are not rejected merely because they describe actual colonies.

Readers can start at Archive.md without installing Obsidian. Standard Markdown links and relative photo embeds work in the repository. Interactive charts, filters, automatic validation, and typed field controls require the local Obsidian setup.

The separate vault-template remains an empty reusable starter with blank colony facts. Synthetic observations belong only in isolated tests and the ignored test vault, never in the actual archive.

## Local and excluded content

Keep credentials, private keys, environment files, machine paths, workspace/search state, plugin binaries, unreviewed plugin settings, deleted notes, logs, calendar/task exports, dependency/build output, and local backups out of public Git. The ignore rules allow only named portable Obsidian settings. Calendar Hub and Metadata Menu defaults are reviewed exceptions; newly added settings files remain excluded.

The .private directory and ant-journal-plugin/test-vault stay ignored. Original Russian source material and local backups may remain there; they are not part of the public English archive. Do not zip the entire working directory for distribution: ignored files still exist on disk.

## Read-only checks

From the repository root:

```powershell
git status --short
git diff --cached --name-status
cd ant-journal-plugin
pnpm run check
pnpm test
pnpm run validate -- ../AntJournal
pnpm run archive:render
pnpm run check:public
```

The publication checker reads staged blob contents, Git-visible working candidates (including untracked archive files), and reachable history. It never stages, unstages, commits, pushes, pulls, rewrites history, or changes Git configuration. `node scripts/public-check.mjs --working-only` checks working candidates alone.

It rejects secret-like material, local absolute paths, email addresses in text, untranslated Cyrillic text, forbidden runtime paths, unexpected binaries outside the authorized archive media folder, and modified fixture bytes. Findings include scope, path, and rule code, never the matched value. Original image/video bytes and their LFS pointers under AntJournal/Attachments are accepted without inspecting embedded metadata. New textual attachments are still scanned.

A passing scan is a bounded preventive check. The owner reviews the meaning of prose, image contents, media metadata, and the author identity intended for commits. Public observations can contain identifying information by design. LFS does not hide it.

## Optional enforcement and exposed secrets

The supplied pre-commit/pre-push hooks run the same audit; the pre-push hook also preserves LFS upload behavior. Installing them with `pnpm run safety:install-hooks` is a separate optional maintainer action that writes local Git configuration. It refuses to replace a custom hooksPath. Hook installation is not part of the read-only verification workflow.

Ignore rules do not remove existing indexed files. Review the existing index separately before a later authorized publication. This workflow does not alter it. A clean working file does not clean an older staged version or historical blob.

If credentials were already exposed, revoke/rotate them first. Removing the newest copy does not erase history or other copies. Coordinate cleanup separately; see [GitHub's sensitive-data removal guide](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository).
