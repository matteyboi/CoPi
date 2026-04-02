// @ts-nocheck
const express = require('express');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT || 8787);
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

app.use(express.json({ limit: '1mb' }));

// ── Shared helpers ──────────────────────────────────────────────────────────
function buildRecentMessages(messages) {
  return messages.slice(-10).map((m) => ({
    role: m.role === 'assistant' ? 'assistant' : 'user',
    content: String(m.content || ''),
  }));
}

function buildSystemPrompt(context) {
  const lines = [
    `Student: ${context.student || 'Unknown student'}`,
    `Selected rating: ${context.rating || 'Private Pilot'}`,
  ];
  if (context.copiMode === 'oral-exam') {
    lines.push('Mode: Oral exam mode. Ask one question at a time, wait for the student answer, then give brief feedback and ask the next question.');
  }
  if (context.useLessonContext) {
    lines.push(`Current lesson: ${context.lessonTitle || 'Not selected'}`);
    if (context.lessonFocus)   lines.push(`Lesson focus: ${context.lessonFocus}`);
    if (context.lessonType)    lines.push(`Lesson type: ${context.lessonType}`);
    if (context.lessonStatus)  lines.push(`Lesson status: ${context.lessonStatus}`);
    if (Array.isArray(context.objectives) && context.objectives.length)
      lines.push(`Lesson objectives: ${context.objectives.join(' | ')}`);
    if (context.checklistProgress) lines.push(`Checklist progress: ${context.checklistProgress}`);
    if (context.notes) lines.push(`Student notes: ${String(context.notes).slice(0, 600)}`);
  } else {
    lines.push('Current lesson context: disabled by user (general coaching mode).');
  }
  return [
    'You are CoPi, an encouraging flight training assistant for student pilots.',
    'Keep responses concise, practical, and safety-minded.',
    ...lines,
  ].join('\n');
}
// ────────────────────────────────────────────────────────────────────────────

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'copi-chat-api',
    aiConfigured: Boolean(OPENAI_API_KEY),
    model: OPENAI_MODEL,
  });
});

app.post('/api/chat', async (req, res) => {
  const { messages = [], context = {} } = req.body || {};

  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'messages is required' });
  }

  const recentMessages = buildRecentMessages(messages);
  const systemPrompt = buildSystemPrompt(context);

  if (!OPENAI_API_KEY) {
    return res.json({
      reply:
        'CoPi backend is connected, but no OPENAI_API_KEY is set yet. Add it to .env to enable live AI responses.',
      source: 'fallback',
    });
  }

  try {
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        input: [
          { role: 'system', content: systemPrompt },
          ...recentMessages,
        ],
        temperature: 0.6,
      }),
    });

    if (!response.ok) {
      const apiError = await response.text();
      return res.status(502).json({ error: `OpenAI request failed: ${apiError}` });
    }

    const data = await response.json();
    const reply = data.output_text?.trim() || 'I could not generate a response right now.';

    return res.json({ reply, source: 'openai' });
  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown server error',
    });
  }
});

// ── Streaming endpoint ──────────────────────────────────────────────────────
app.post('/api/chat/stream', async (req, res) => {
  const { messages = [], context = {} } = req.body || {};

  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'messages is required' });
  }

  const recentMessages = buildRecentMessages(messages);
  const systemPrompt = buildSystemPrompt(context);

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  if (!OPENAI_API_KEY) {
    const fallback = 'CoPi backend is connected, but no OPENAI_API_KEY is set yet. Add it to .env to enable live AI responses.';
    res.write(`data: ${JSON.stringify({ delta: fallback })}\n\n`);
    res.write('data: [DONE]\n\n');
    return res.end();
  }

  try {
    const upstream = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        input: [{ role: 'system', content: systemPrompt }, ...recentMessages],
        temperature: 0.6,
        stream: true,
      }),
    });

    if (!upstream.ok) {
      const apiError = await upstream.text();
      res.write(`data: ${JSON.stringify({ error: `OpenAI request failed: ${apiError}` })}\n\n`);
      res.write('data: [DONE]\n\n');
      return res.end();
    }

    const reader = upstream.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    outer: while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop();

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const payload = line.slice(6).trim();
        if (payload === '[DONE]') break outer;
        try {
          const parsed = JSON.parse(payload);
          if (parsed.type === 'response.output_text.delta' && parsed.delta) {
            res.write(`data: ${JSON.stringify({ delta: parsed.delta })}\n\n`);
          }
        } catch {}
      }
    }

    res.write('data: [DONE]\n\n');
    res.end();
  } catch (error) {
    res.write(`data: ${JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown server error' })}\n\n`);
    res.write('data: [DONE]\n\n');
    res.end();
  }
});
// ────────────────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`CoPi API listening on http://localhost:${PORT}`);
});
