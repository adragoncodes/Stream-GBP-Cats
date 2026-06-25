# GBP Category Builder

A single-page tool for generating Google Business Profile (GBP) categories for dealership Sales, Service, and Parts departments — built for multi-rooftop dealer groups managing local SEO.

## What it does

1. Choose a department: **Sales**, **Service**, or **Parts**.
2. Choose an AI provider: **Claude**, **OpenAI**, or **Gemini** — each with its own API key field and editable model name (defaults to the current flagship: `claude-sonnet-4-6`, `gpt-5.5`, `gemini-3.1-pro-preview`).
3. Enter the dealership's **OEM/brand** (e.g. Chevrolet, Ram, Toyota).
4. Optionally describe **focus areas** (e.g. heavy-duty trucks, EV inventory, certified collision repair).
5. Click **Generate categories** — the tool calls the selected provider's API and returns 10 GBP-ready category names, each with a description under 300 characters.
6. Copy individual categories or export the full list as a CSV.

## Setup

This is a static site — no build step, no backend, no `npm install` required.

### Get API keys
- **Claude**: [console.anthropic.com](https://console.anthropic.com)
- **OpenAI**: [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
- **Gemini**: [aistudio.google.com/apikey](https://aistudio.google.com/apikey)

Each key is entered directly in the app and stored only in your browser's `localStorage`, keyed per provider — keys are sent straight from your browser to that provider's API and never touch any third-party server.

> A note on cost: each generation uses a small number of tokens — a fraction of a cent regardless of provider.

> A note on OpenAI specifically: some organizations have CORS restrictions on direct browser calls to `api.openai.com`. If you get a network/CORS error with OpenAI selected, switch to Claude or Gemini (both support direct browser calls), or move the call into a Netlify Function (see below).

## Deploy to Netlify via GitHub

1. Create a new GitHub repo and push these files (`index.html`, `README.md`) to it.
2. In Netlify: **Add new site → Import an existing project → GitHub** → select the repo.
3. Build settings: leave the **build command blank** and set the **publish directory** to `.` (the repo root) — there's nothing to build.
4. Deploy. Netlify will serve `index.html` directly.

That's it — no environment variables needed, since each user supplies their own API key in the app.

## Notes / customization

- Default models are `claude-sonnet-4-6` (Claude), `gpt-5.5` (OpenAI), and `gemini-3.1-pro-preview` (Gemini). Each is editable in the Model field, so you can point at a newer release as providers update their lineups without touching code.
- Categories deliberately mix Google's actual GBP taxonomy (e.g. "Auto Repair Shop", "Truck Parts Supplier") with locally-relevant naming dealers commonly target (e.g. "Chevrolet Sales", "New Ram 1500 Dealer").
- If you'd rather not have each user paste their own key, you can move the Anthropic call into a Netlify Function and store the key as a Netlify environment variable — ask if you want that version built out.
