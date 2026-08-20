// netlify/functions/generate.js
//
// Backend proxy for the GBP Category Builder.
// - Model names are hardcoded here (source of truth). Update this file
//   when providers ship new flagships — the frontend only displays them.
// - The user's API key is passed per-request from the browser, forwarded
//   directly to the provider, and never stored or logged.

const MODELS = {
  anthropic: 'claude-sonnet-4-6',
  openai:    'gpt-5.5',
  gemini:    'gemini-3.1-pro-preview'
};

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return respond(204, {});
  }
  if (event.httpMethod !== 'POST') {
    return respond(405, { error: 'Method not allowed. Use POST.' });
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch (e) {
    return respond(400, { error: 'Invalid JSON body.' });
  }

  const { provider, apiKey, department, oem, focus } = body;

  if (!provider || !MODELS[provider]) {
    return respond(400, { error: `Unknown provider. Use one of: ${Object.keys(MODELS).join(', ')}` });
  }
  if (!apiKey || !apiKey.trim()) {
    return respond(400, { error: 'Missing API key.' });
  }
  if (!department || !oem) {
    return respond(400, { error: 'Missing department or OEM.' });
  }

  const model  = MODELS[provider];
  const prompt = buildPrompt(department, oem, (focus || '').trim());

  try {
    let rawText;
    if (provider === 'anthropic') rawText = await callAnthropic(apiKey, model, prompt);
    else if (provider === 'openai') rawText = await callOpenAI(apiKey, model, prompt);
    else if (provider === 'gemini') rawText = await callGemini(apiKey, model, prompt);

    const parsed     = extractJson(rawText);
    const categories = parsed.categories || [];
    if (!categories.length) return respond(502, { error: 'Model returned no categories. Try again.' });

    return respond(200, { provider, model, categories });
  } catch (err) {
    return respond(502, { error: err.message || 'Generation failed.' });
  }
};

// ─── PROMPT ──────────────────────────────────────────────────────────────────

function buildPrompt(dept, oem, focus) {
  return `You are a Google Business Profile expert writing category descriptions for a ${oem} dealership's ${dept} department.

Generate exactly 10 GBP categories. For each category, write a description that reads like real dealership marketing copy — the kind of short, punchy blurb a customer would actually see on a Google Business listing. It should describe what the dealership offers in that category, feel natural and compelling, and be packed with relevant keywords for that specific category.

CORRECT style example (for a "New Toyota Dealer" category):
"Fox Toyota offers the latest Toyota models with exceptional service and great deals. Visit us in Auburn, NY to find your perfect new Toyota today!"

WRONG style (do NOT write SEO rationale — this is banned):
"This category helps local customers find Toyota new car inventory through search intent signals."

Rules:
- Mix Google's GBP primary/secondary category taxonomy names (e.g. "Car Dealer", "Auto Repair Shop", "Truck Parts Supplier", "Oil Change Service") with specific, realistic names (e.g. "${oem} ${dept}", "New ${oem} Truck Dealer", "Certified ${oem} Service").
- All 10 categories must be relevant to the ${dept} department specifically.
- Every description MUST be under 300 characters — count carefully, this is a hard limit.
- Descriptions should feel like marketing copy: include the OEM name, relevant service/product keywords, action phrases ("shop now", "schedule today", "visit us", "certified technicians"), and local intent signals ("near you", "in [area]" if area is known).${focus ? `\n- Weave in these focus areas naturally: ${focus}.` : ''}
- Do NOT mention SEO, search rankings, algorithms, or search intent anywhere in descriptions.
- Avoid duplicate or near-duplicate categories.

Respond with ONLY valid JSON — no markdown fences, no commentary:
{"categories":[{"name":"...","description":"..."}, ... exactly 10 items]}`;
}

// ─── PROVIDER CALLS ──────────────────────────────────────────────────────────

async function callAnthropic(apiKey, model, prompt) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({ model, max_tokens: 2000, messages: [{ role: 'user', content: prompt }] })
  });
  if (!res.ok) throw new Error(await fmtError('Anthropic', res));
  const data = await res.json();
  const block = (data.content || []).find(c => c.type === 'text');
  if (!block) throw new Error('No text returned from Claude.');
  return block.text;
}

async function callOpenAI(apiKey, model, prompt) {
  const res = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({ model, input: prompt })
  });
  if (!res.ok) throw new Error(await fmtError('OpenAI', res));
  const data = await res.json();
  if (typeof data.output_text === 'string' && data.output_text.length) return data.output_text;
  const msg = (data.output || []).find(o => o.type === 'message');
  const part = msg?.content?.find(c => c.type === 'output_text');
  if (!part) throw new Error('No text returned from OpenAI.');
  return part.text;
}

async function callGemini(apiKey, model, prompt) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    }
  );
  if (!res.ok) throw new Error(await fmtError('Gemini', res));
  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.map(p => p.text || '').join('');
  if (!text) throw new Error('No text returned from Gemini.');
  return text;
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────

async function fmtError(label, res) {
  const raw = await res.text();
  let detail = raw;
  try { detail = JSON.parse(raw).error?.message || raw; } catch (_) {}
  return `${label} API error (${res.status}): ${detail}`;
}

function extractJson(text) {
  let t = (text || '').trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '');
  const start = t.indexOf('{');
  const end   = t.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error('No JSON object found in model response.');
  return JSON.parse(t.slice(start, end + 1));
}
