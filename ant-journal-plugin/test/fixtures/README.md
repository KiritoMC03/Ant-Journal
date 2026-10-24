# Synthetic test assets

These assets are not personal observation data. They are never copied into the real journal automatically; smoke preparation copies them only into its ignored test vault.

- `test-photo.png` and `test-photo.jpg`: generated 640 x 320 images labelled ANT JOURNAL - TEST FIXTURE; no user photo or identifying EXIF was supplied.
- `test-original.heic`: the published [libheif example](https://github.com/strukturag/libheif/blob/master/examples/example.heic), downloaded without transcoding. It is used to test original-byte preservation; Obsidian HEIC preview is not assumed. [Upstream license and project information](https://github.com/strukturag/libheif).

Original SHA-256 values are recorded in hashes.json and independently pinned in the publication checker. Do not replace these files with personal media or update the allowlist without reviewing provenance and metadata. Original real media is allowed separately under AntJournal/Attachments. Other unexpected binary files are rejected by the publication check.
