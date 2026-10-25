# Publication safety

AntJournal is an intentionally public observation diary, including colony information and original media. Its owner takes responsibility for the text, photographs, and their embedded metadata. An empty reusable starter is provided separately in vault-template.

Credentials, machine paths, device/runtime state, installed plugin bundles, generated test vaults, and local backups remain excluded. Read [Publication policy](docs/Privacy.md) and [Git LFS](docs/Git.md).

Run `pnpm run check:public` from ant-journal-plugin to inspect working candidates, staged blobs, and reachable commits. This read-only tool prints finding codes and file paths without matched secret values. Optional local hooks use the same checker; installing hooks changes local Git configuration and is a separate maintainer action.

The check allows journal observations and original images/videos in AntJournal/Attachments. It does not scan binary metadata or prove that prose/media contains no identifying information. Review content you intend to disclose. LFS stores large files; it provides no confidentiality.

Use minimal synthetic reproductions for bugs; avoid credentials and local logs in public reports. If a credential is exposed, revoke it and follow the hosting provider's removal process. No automatic publication or history rewrite is performed.

[License and LLM policy](AI_POLICY.md) set conditions for covered first-party material. They do not implement access control or override rights separately granted to a hosting provider. Review [Licensing](docs/Licensing.md) before public hosting.
