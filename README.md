# LinkedIn Profile Score / Analyzer

A lightweight, static **HTML/CSS/JS** app that scores a LinkedIn profile (headline, about, experience, skills) and gives instant suggestions. No backend; everything runs in the browser.

## Features
- LinkedIn-style blue & white theme
- Scoring out of 100 with a progress meter
- Per-section breakdown (Headline / About / Experience / Skills)
- Actionable suggestions
- Demo data button for quick testing
- Local save + JSON export

## Run locally
Open `index.html` in any browser.

## Deploy to GitHub Pages
1. Create/Use your repo (e.g. `LinkedIn-Profile-Score`).
2. Upload `index.html`, `style.css`, `app.js`, and `logo.png`.
3. In repo **Settings → Pages**:
   - Source: `main` branch
   - Folder: `/ (root)`
4. After publish, your site will be live at `https://<username>.github.io/LinkedIn-Profile-Score/`

## Customize
- Scoring rules in `app.js` inside the `analyze()` function.
- Colors in `style.css` (`--blue`, etc.).
- Replace `logo.png` with your own.

> Note: This tool is for guidance only and not affiliated with LinkedIn.
