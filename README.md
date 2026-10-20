# qclenja-UWI

---

# QCLens

Levey-Jennings QC web app for the clinical laboratory (single-file HTML app).

- `index.html` is the built app. Open it in a browser, or publish it as a static page.
- Source is split into `p*.js` / `p*.html` parts. Run `bash build.sh` to rebuild `index.html`.
- `test.js` checks the Westgard rule engine (`node test.js`).
- Data and user accounts are stored in the browser (localStorage). Save a backup file regularly from Setup.

## Live site

GitHub Pages serves `index.html` from the root of `main` (Settings → Pages → Deploy from a branch → `main` / `(root)`).
