# Cross-machine cooldown history — setup (beginner-friendly)

This makes the **4-week no-repeat** memory follow you across machines (laptop, iPad,
phone) instead of living in one browser. It stores a tiny log in a **History** tab of
your Google Sheet. Your password protects writes.

Prereq: you've already done [Linking the Google Sheet](../README.md#go-live-off-your-google-sheet)
(imported the xlsx, set `SHEET_ID`, published to web). ~10 minutes.

---

## 1. Add the history script
1. Open your Google Sheet → **Extensions → Apps Script**.
2. Add a file: top-left **＋ → Script**, name it `History`. (Or paste into the existing `Code.gs`.)
3. Open this repo's `history/Code.gs`, copy everything, paste it in.
4. Set `PASSWORD_HASH` to the **same hash you put in `index.html`**. Get it with:
   ```bash
   printf '%s' 'YOUR_PASSWORD' | shasum -a 256
   ```
   Paste the long hex string. **Save** (💾).

## 2. Create the History tab
1. In the function dropdown (top toolbar) pick **`setupHistoryTab`** → **Run**.
2. Approve permissions if asked. A new **History** tab appears with `Week | RecipeID`.

## 3. Deploy it as a web app
1. **Deploy → New deployment** → gear ⚙️ → **Web app**.
2. **Execute as:** *Me*  ·  **Who has access:** *Anyone*.
3. **Deploy** → approve → copy the **Web app URL** (ends in `/exec`).

## 4. Point the page at it
1. Open `index.html`, find `const HISTORY_API = "";` and paste the `/exec` URL:
   `const HISTORY_API = "https://script.google.com/macros/s/AKfy.../exec";`
2. Make sure the **History** tab is covered by your publish: **File → Share → Publish to web**
   → choose *Entire document* (or add the History sheet) → **Publish**.
3. Commit & push `index.html`.

Done. Now when you **Confirm** (with your password), the week's dishes are logged to the
sheet; any machine that opens the page reads that log and honours the 4-week cooldown.
The status line under the Randomize button shows **"synced to Google Sheet"** when it's on.

---

## How it works (plain English)
- **Reading** history is free and needs no login — the page just downloads the published
  History tab as a CSV.
- **Writing** only happens on Confirm. The page sends your typed password to the script;
  the script hashes it and checks it before writing. The page itself never carries a key
  that could let a stranger edit your sheet.

## Troubleshooting
| Problem | Fix |
|---|---|
| Status still says "this device only" | `HISTORY_API` is empty — paste the `/exec` URL and push. |
| Cooldown not shared across machines | History tab not published. Re-do **Publish to web** as *Entire document*. |
| Nothing gets written | Wrong `PASSWORD_HASH` in the script, or deployment access isn't *Anyone*. Re-deploy a **new version** after edits. |
| Edited the script, no effect | **Deploy → Manage deployments → ✏️ → Version: New version → Deploy**. |
