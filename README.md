# Penyola website

Public site for the Penyola iOS app, served by GitHub Pages from the root of `main`:
https://ericning2023.github.io/penyola/

- `index.html` home · `support.html` support + FAQ (App Store Support URL is the site root)
- `privacy.html` (App Store Privacy Policy URL) · `terms.html` · `credits.html`

The HTML files are generated. Edit `build.py` (home and support copy) or `assets/site.css`, then run:

    python3 build.py            # reads ../penyola-release by default

Privacy, terms and credits take their text from the legal files the app bundles
(`penyola-release/app/engine/iphone/Maps/ScenicResources/legal/`), so rebuild whenever those change.
The support email comes from `penyola-release/release-config.json`.

This repository replaces the output of `penyola-release/tools/build_site.py`
(`penyola-artifacts/site/`). Do not push from that older checkout, or the site reverts to the plain version.

Fonts: Manrope, SIL Open Font License 1.1 (`assets/fonts/OFL.txt`).
