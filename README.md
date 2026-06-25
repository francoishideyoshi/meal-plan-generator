# 🍽 Meal Plan Generator

Randomize a weekly breakfast / lunch / dinner plan from your own recipe collection,
fine-tune it by drag & drop, and print an A4 consolidated shopping list. Recipes live in
a Google Sheet that an included Telegram bot can edit on the go.

**Live page:** _enable GitHub Pages (Settings → Pages → Branch `main` → `/root`), then it's at_
`https://<your-username>.github.io/meal-plan-generator/`

---

## What's here

| File | What it is |
|---|---|
| `index.html` | The web app — self-contained, hosted on GitHub Pages. |
| `recipes.json` | 553 recipes baked from the spreadsheet (web app's offline data + fallback). |
| `Meal_Generator.xlsx` | The source spreadsheet, now with a **Soup** column. |
| `bot/Code.gs` | Telegram bot (Google Apps Script) that edits the sheet. |
| `bot/SETUP.md` | Beginner step-by-step bot + Google Sheet setup. |

---

## The web app

Open the page and you get:

1. **Cuisine controls** — per meal, set how many **Asian / Chinese / Western** dishes you want
   (any number — two dinners, three lunches, whatever), plus a **🥣 Soup** toggle per meal that
   adds one soup of any cuisine. Same idea as the spreadsheet's Generator tab, but with multiple
   dishes per meal.
2. **🎲 Randomize** — builds a plan. It's *deliberately less random*: any recipe you confirmed in
   the **last 4 weeks** is skipped until it cools down (tracked in your browser's `localStorage`).
   If a cuisine pool runs dry it falls back to the stalest picks.
3. **Drag & drop** — open **📚 Full recipe list**, search/filter, and drag any dish onto a meal.
   Drag dishes between meals, hit **×** to remove. Fully customizable.
4. **🔒 Confirm** — asks for a password (see below), then **commits** the week to the 4-week history
   and builds the shopping list.
5. **🛒 Shopping list** — every ingredient across the week's dishes, **consolidated**: if two recipes
   use carrot you get `Carrot ×2`.
6. **Print** — the page is **A4 landscape**; `Ctrl/Cmd-P` gives a clean printout (controls/library hidden).

### The Confirm password
The page is public, so this is light protection, not real security. A **SHA-256 hash** of the
password is stored in `index.html`; the typed password is hashed in-browser and compared.

- **Default password:** `mealplan2026`
- **To change it:** run
  ```bash
  printf '%s' 'YOUR_NEW_PASSWORD' | shasum -a 256
  ```
  and paste the result into `const PASSWORD_HASH = "...";` near the top of `index.html`.

### Live data vs bundled data
Out of the box the app reads the bundled `recipes.json`. To make it read your Google Sheet live
(so bot edits appear automatically), set `const SHEET_ID = "..."` in `index.html` and publish the
sheet — see [`bot/SETUP.md`](bot/SETUP.md) Part A.

---

## The Telegram bot

Add and edit recipes from your phone with `/newdish`, `/editdish`, `/find`, `/list`.
It runs free on **Google Apps Script**, bound to the same Google Sheet, so edits flow straight
through to the web app. Full beginner setup: [`bot/SETUP.md`](bot/SETUP.md).

---

## Soup tagging
A recipe counts as a **soup** when its name contains `soup`, `湯`, or `汤` (72 of 553). It's an
*extra* tag — the recipe keeps its Breakfast/Lunch/Dinner type. Stored in the new `Soup` column of
`Meal_Generator.xlsx` and as `isSoup` in `recipes.json`; the bot re-tags automatically on add/rename.

---

## Regenerate `recipes.json` from the spreadsheet
```bash
python3 build_recipes.py    # see script below / in repo
```
