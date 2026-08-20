# GBP Category Builder

A tool for generating Google Business Profile (GBP) categories for dealership Sales, Service, and Parts departments. Supports Claude (Anthropic), OpenAI, and Gemini — users supply their own API key in the UI.

## File structure

```
index.html                    ← frontend (the entire UI)
netlify.toml                  ← Netlify build + function config
package.json                  ← pins Node ≥20 for the function runtime
netlify/
  functions/
    generate.js               ← backend proxy (hardcoded models, calls AI providers)
README.md
```

## Deploy to Netlify via GitHub

1. **Create a GitHub repo** and push all files maintaining the folder structure above.

2. **In Netlify:** Add new site → Import an existing project → GitHub → select the repo.

3. **Build settings** (Netlify should auto-detect from `netlify.toml`, but confirm):
   - Build command: *(leave blank)*
   - Publish directory: `.`
   - Functions directory: `netlify/functions`

4. **Deploy.** No environment variables needed — users provide their own API key in the app.

## Current models (hardcoded in `netlify/functions/generate.js`)

| Provider | Model |
|----------|-------|
| Claude (Anthropic) | `claude-sonnet-4-6` |
| OpenAI | `gpt-5.5` |
| Gemini | `gemini-3.1-pro-preview` |

To update a model, edit the `MODELS` object at the top of `generate.js`, commit, and push — Netlify redeploys automatically.

## API keys

Users enter their own API key for whichever provider they choose. Keys are saved to browser `localStorage` (per provider) and sent only to the `/.netlify/functions/generate` backend endpoint — never to any third party directly from the browser.

- Anthropic: https://console.anthropic.com
- OpenAI: https://platform.openai.com/api-keys
- Gemini: https://aistudio.google.com/apikey
