# Third-party material

The Ant Journal Human Use License applies only to material whose holders distribute it under that license. It does not impose new LLM restrictions on third-party works already licensed under other terms. A copy or fork must preserve both the project's license and the applicable third-party notices.

| Material | License and scope |
| --- | --- |
| `yaml` 2.9.1 | ISC. The build embeds the dependency's complete original copyright and permission notice in main.js. Keep that notice when redistributing a bundle. The authoritative text is supplied with the dependency as `yaml/LICENSE`. |
| `ant-journal-plugin/test/fixtures/test-original.heic` | External unmodified libheif example image. Excluded from the custom project license. Its source is [examples/example.heic](https://github.com/strukturag/libheif/blob/master/examples/example.heic); the examples directory supplies [COPYING](https://github.com/strukturag/libheif/blob/master/examples/COPYING). A copy of that notice is retained in [LICENSES/libheif-examples-MIT.txt](LICENSES/libheif-examples-MIT.txt). No additional restriction or claim of ownership is imposed on this upstream asset. |
| Obsidian and community plugins | Separately installed dependencies with their own licenses and terms. Their installed bundles are excluded from the public source tree. The community downloader preserves available upstream license notices. |
| Build and test dependencies | Remain under the licenses distributed with each pinned package. They are not relicensed by this repository. |

The locally generated PNG/JPEG test fixtures are original project assets, subject to the project license only to the extent protectable rights exist. They are not actual observation photographs.

For downstream distributions, preserve notices from the dependency versions actually included. The project license cannot supply rights that a third-party author has not granted.

The website adds Astro, Vite, sharp, unified/remark/rehype, and their locked dependencies under their supplied licenses. Those dependencies are not relicensed by the custom project license. The built website includes their available complete license notices in third-party-notices.txt alongside the original project license and upstream libheif example notice. ffmpeg is used as a separately installed build tool for video posters and is not distributed in the website artifact.
