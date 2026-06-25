# 🍽 Meal Plan Generator

Randomize a weekly breakfast / lunch / dinner plan from your own recipe collection,
fine-tune it by drag & drop, and print an A4 consolidated shopping list. Recipes live in
a Google Sheet you edit straight from your phone or iPad.

**Live page:** https://francoishideyoshi.github.io/meal-plan-generator/

---

## What's here

| File | What it is |
|---|---|
| `index.html` | The web app — self-contained, hosted on GitHub Pages. |
| `recipes.json` | 553 recipes baked from the spreadsheet (web app's offline data + fallback). |
| `Meal_Generator.xlsx` | The source spreadsheet, with a **Soup** column. |
| `history/Code.gs` | Optional Apps Script that syncs the cooldown across machines. |
| `history/SETUP.md` | Beginner setup for the cross-machine history. |
| `build_recipes.py` | Rebuilds `recipes.json` + soup tags from the xlsx. |

---

## The web app

Open the page and you get:

1. **Cuisine controls** — per meal, set how many **Asian / Chinese / Western** dishes you want
   (any number — two dinners, three lunches, whatever), plus a **🥣 Soup** toggle per meal that
   adds one soup of any cuisine.
2. **🎲 Randomize** — builds a plan. It's *deliberately less random*: any recipe you confirmed in
   the **last 4 weeks** is skipped until it cools down. If a cuisine pool runs dry it falls back to
   the stalest picks.
3. **Drag & drop** — open **📚 Full recipe list**, search/filter, and drag any dish onto a meal.
   Drag dishes between meals, hit **×** to remove. Fully customizable.
4. **🔒 Confirm** — asks for a password, then **commits** the week to the 4-week history and builds
   the shopping list.
5. **🛒 Shopping list** — every ingredient across the week's dishes, **consolidated**: if two recipes
   use carrot you get `Carrot ×2`.
6. **Print** — the page is **A4 landscape**; `Ctrl/Cmd-P` gives a clean printout (controls/library hidden).

### The Confirm password
The page is public, so this is light protection, not real security. A **SHA-256 hash** of the
password is stored in `index.html`; the typed password is hashed in-browser and compared.
To change it, run `printf '%s' 'YOUR_NEW_PASSWORD' | shasum -a 256` and paste the result into
`const PASSWORD_HASH = "...";` near the top of `index.html`.

---

## Editing recipes — straight in Google Sheets

You add and edit recipes by editing the Google Sheet directly (the **Google Sheets app** on your
phone / iPad works great). No bot, no commands — just type into the `All Recipes` tab.

- **Soup is automatic:** any recipe whose **name** contains `soup`, `湯`, or `汤` is treated as a soup
  by the web app on load — you don't have to touch the `Soup` column.
- Columns that matter: `Recipe`, `Ingredients` (comma-separated), `Meal Type`
  (Breakfast/Lunch/Dinner, comma-separate if multiple), `Cuisine` (Asian/Chinese/Western), `Link`.

### Go live off your Google Sheet
Out of the box the app reads the bundled `recipes.json`. To make it read your sheet live (so edits
appear automatically):

1. <https://sheets.google.com> → **Blank** → **File → Import → Upload** → `Meal_Generator.xlsx` →
   **Replace spreadsheet**.
2. Grab the **Sheet ID** from the URL: `docs.google.com/spreadsheets/d/`**`<THIS>`**`/edit`.
3. **File → Share → Publish to web → Publish** (so the page can read it).
4. In `index.html` set `const SHEET_ID = "<THIS>";` and push.

The app now shows live data and reflects every edit you make in the sheet.

---

## Cross-machine cooldown (optional)

By default the 4-week no-repeat memory is stored **per browser** (localStorage) — fine on one device.
To share it across laptop / iPad / phone, store it in a **History** tab of the same Google Sheet via a
small Apps Script write endpoint (your password guards writes). Full beginner steps:
[`history/SETUP.md`](history/SETUP.md).

> Why not store it in this GitHub repo? A public page can't write to the repo without exposing a
> write token to everyone. The Google Sheet route keeps the secret server-side, so it's safe.

---

## Soup tagging
A recipe counts as a **soup** when its name contains `soup`, `湯`, or `汤` (72 of 553). It's an
*extra* tag — the recipe keeps its Breakfast/Lunch/Dinner type. Stored in the `Soup` column of
`Meal_Generator.xlsx` and as `isSoup` in `recipes.json`, and re-derived from the name at load time.

## Regenerate `recipes.json` from the spreadsheet
```bash
python3 build_recipes.py
```
