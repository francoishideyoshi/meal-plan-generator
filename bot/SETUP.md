# Telegram bot — step-by-step setup (for total beginners)

This bot lets you add and edit recipes from Telegram. It writes straight into your
Google Sheet, so the web app updates automatically.

**Why Google Apps Script (not TeleBotHost)?** It's free, needs no extra account, and
lives *inside* your Google Sheet — so the bot, the web app, and the sheet all share one
copy of the data. TeleBotHost would need a separate database and a sync step. Apps Script wins.

Total time: ~15 minutes. You don't need to know any code — just copy & paste.

---

## Part A — Put your recipes in Google Sheets (one time)

1. Go to <https://sheets.google.com> → **Blank** → name it e.g. *Meal Generator*.
2. **File → Import → Upload** → choose `Meal_Generator.xlsx` from this repo.
3. In the popup pick **Replace spreadsheet** → **Import data**. You now have the
   `Generator`, `All Recipes`, `Read Me` tabs.
4. Look at the web address. It looks like:
   `https://docs.google.com/spreadsheets/d/`**`1AbC...xyz`**`/edit`
   The bold middle part is your **Sheet ID** — copy it, you'll need it twice.

### Make the web app read this live sheet (optional but recommended)
- Open `index.html`, find `const SHEET_ID = "";` near the top, and paste your ID:
  `const SHEET_ID = "1AbC...xyz";`
- In Google Sheets: **File → Share → Publish to web → Publish** (so the page can read it).
- Commit/push `index.html`. The web app now shows live data and reflects bot edits.

---

## Part B — Create the Telegram bot

1. In Telegram, search **@BotFather** → open it → send `/newbot`.
2. Give it a name (e.g. *My Meal Bot*) and a username ending in `bot` (e.g. `my_meal_xyz_bot`).
3. BotFather replies with a **token** like `1234567:AAH...`. Copy it. Keep it secret.

---

## Part C — Install the bot script

1. Open your Google Sheet → menu **Extensions → Apps Script**.
2. Delete whatever is in `Code.gs`, then open this repo's `bot/Code.gs`, **copy everything**,
   and paste it in.
3. At the top, fill in:
   - `var BOT_TOKEN = 'PASTE_YOUR_BOT_TOKEN_HERE';` → paste your BotFather token.
   - (Optional, recommended) lock it to you: send `/start` to your bot first won't show your id,
     so instead message **@userinfobot** in Telegram to get your numeric id, then set
     `var ALLOWED_CHAT_IDS = [123456789];`. Leave `[]` to let anyone use it.
4. Click **Save** (💾).

---

## Part D — Deploy it as a web app (this is the webhook)

1. Top-right **Deploy → New deployment**.
2. Click the gear ⚙️ next to "Select type" → **Web app**.
3. Set:
   - **Execute as:** *Me*
   - **Who has access:** *Anyone*  ← required so Telegram can reach it.
4. **Deploy** → approve the permissions (pick your Google account → Advanced → Allow).
5. It shows a **Web app URL**. You don't need to copy it — the next step grabs it automatically.

---

## Part E — Connect Telegram to the script (one click)

1. Back in the Apps Script editor, find the function dropdown (top toolbar, says a function name).
2. Choose **`setWebhook`** → click **Run**.
3. Open **Executions** (left sidebar, clock icon) or **View → Logs** — you should see
   `{"ok":true,"result":true,"description":"Webhook was set"}`.

Done! Open your bot in Telegram and send `/start`.

> Re-deploy note: if you later edit `Code.gs`, do **Deploy → Manage deployments → ✏️ Edit →
> Version: New version → Deploy**, then run `setWebhook` again.

---

## Using the bot

- `/newdish` — adds a recipe. Either answer the 6 questions one by one, **or** paste a filled
  template in one message:
  ```
  Name: Tomato Egg
  Ingredients: Tomato, Egg, Spring Onion
  Meal: Lunch
  Cuisine: Chinese
  Confidence: High
  Link: https://...
  ```
- `/editdish Tomato Egg` — pick a field number, send the new value.
- `/find tofu` — search by name or ingredient.
- `/list` — recipe count + latest additions.
- `/cancel` — stop the current action.

Soup is auto-tagged: any recipe whose **name** contains "soup", "湯", or "汤" gets the Soup flag.

---

## Troubleshooting

| Problem | Fix |
|---|---|
| Bot doesn't reply | Re-run `setWebhook`. Confirm "Who has access = Anyone" in the deployment. |
| "Not authorised" | Your chat id isn't in `ALLOWED_CHAT_IDS`. Add it, or set it back to `[]`. |
| Edits don't show on the web app | Did you **Publish to web** and set `SHEET_ID` in `index.html`? |
| Wrong token | Re-check `BOT_TOKEN`, save, re-deploy (new version), re-run `setWebhook`. |
