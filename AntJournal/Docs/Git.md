# Git LFS and the public archive

AntJournal observations, colony cards, and original media are intended for public Git. The owner is responsible for their text, imagery, and metadata. The separate vault-template remains empty.

The repository's .gitattributes applies Git LFS to raster images (including GIF and uppercase camera extensions) and common video formats. Markdown, TypeScript, and text SVG remain normal Git files. LFS is storage, not privacy or encryption: public LFS objects may be accessible to readers.

Install Git LFS before a later authorized operation that adds media to Git. Existing Git content is not retroactively converted merely by editing .gitattributes. The publication preparation and archive renderer do not alter the index or convert staged objects.

## Inspect without changing Git

From the repository root:

```powershell
git status --short
git diff --stat
git diff --cached --name-status
git check-attr filter diff merge -- AntJournal/Attachments/example.JPG
git lfs ls-files
```

These commands inspect state. LFS listings cover indexed media, so new untracked photos will not appear there until a maintainer explicitly adds them later. When cloning with Git LFS installed, originals are normally fetched during checkout; a clone containing only pointer text needs the corresponding LFS objects before offline photo viewing.

Original archive media under AntJournal/Attachments is accepted by the publication checker. Known synthetic fixture files have separately pinned hashes. Unexpected binaries elsewhere still require review. No image is resized, stripped, compressed, or converted by the journal tooling.

Workspace state, installed plugins, credentials, private backups, and generated test vaults remain ignored. Ignore rules do not change the current index. See [Publication policy](Privacy.md) before a later authorized commit or push, and review Git author metadata separately.
