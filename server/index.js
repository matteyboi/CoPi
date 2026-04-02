// @ts-nocheck
const express = require('express');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT || 8787);
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

app.use(express.json({ limit: '1mb' }));

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
    if (context.lessonFocus) lines.push(`Lesson focus: ${context.lessonFocus}`);
    if (context.lessonType) lines.push(`Lesson type: ${context.lessonType}`);
    if (context.lessonStatus) lines.push(`Lesson status: ${context.lessonStatus}`);
    if (Array.isArray(context.objectives) && context.objectives.length) {
      lines.push(`Lesson objectives: ${context.objectives.join(' | ')}`);
    }
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

async function createOpenAIResponse(payload) {
  return fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify(payload),
  });
}

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
    const response = await createOpenAIResponse({
      model: OPENAI_MODEL,
      input: [{ role: 'system', content: systemPrompt }, ...recentMessages],
      temperature: 0.6,
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

app.post('/api/chat/title', async (req, res) => {
  const { messages = [], context = {} } = req.body || {};

  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'messages is required' });
  }

  const recentMessages = buildRecentMessages(messages).slice(0, 4);
  const systemPrompt = [
    'You create short conversation titles for a flight-training AI chat.',
    'Return only a concise title, 2 to 5 words, with no quotes and no punctuation at the end.',
    'Prefer the main student goal or topic.',
    buildSystemPrompt(context),
  ].join('\n');

  if (!OPENAI_API_KEY) {
    const fallback = recentMessages.find((message) => message.role === 'user')?.content || 'Conversation';
    return res.json({
      title: String(fallback).split(/[?.!]/)[0].trim().split(/\s+/).slice(0, 6).join(' ') || 'Conversation',
      source: 'fallback',
    });
  }

  try {
    const response = await createOpenAIResponse({
      model: OPENAI_MODEL,
      input: [{ role: 'system', content: systemPrompt }, ...recentMessages],
      temperature: 0.3,
    });

    if (!response.ok) {
      const apiError = await response.text();
      return res.status(502).json({ error: `OpenAI request failed: ${apiError}` });
    }

    const data = await response.json();
    const title = data.output_text?.trim() || 'Conversation';
    return res.json({ title, source: 'openai' });
  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown server error',
    });
  }
});

app.post('/api/briefing', async (req, res) => {
  const { student, stage, recentDays = [], plannedSessions = [] } = req.body ?? {};

  const daysText = recentDays
    .map((day, idx) => {
      const taskLines = day.tasks
        .map((t) => `  - ${t.title}${t.rating != null ? ` (rated ${t.rating}/5)` : ''}`)
        .join('\n');
      const noteLine = day.note ? `  Instructor note: "${day.note}"` : '';
      return `Lesson ${idx + 1} (${day.date}):\n${taskLines}${noteLine ? '\n' + noteLine : ''}`;
    })
    .join('\n\n');

  const plannedText = plannedSessions.map((s) => `  - ${s.title} (${s.stageTitle})`).join('\n');

  const prompt = `You are CoPi, an AI flight training coach. A student pilot named ${student || 'the student'} is in the "${stage}" stage of Private Pilot training. Analyze their recent lesson data and generate a coaching briefing.

Recent lessons (most recent first):
${daysText || '(none)'}

Upcoming planned sessions:
${plannedText || '(none)'}

Return ONLY valid JSON (no markdown fences, no extra text) with this exact structure:
{
  "strengths": ["concise strength 1", "concise strength 2"],
  "focusAreas": [
    { "skill": "Skill name", "fix": "Specific 2-3 sentence actionable technique correction." }
  ],
  "upNext": [
    { "title": "Session title", "tip": "One sentence prep tip for this session." }
  ]
}
Rules:
- strengths: tasks rated 4 or 5 stars. Be specific about the maneuver or skill.
- focusAreas: tasks rated 1-3 or mentioned negatively in notes. Give concrete technique-level guidance (specific control inputs, scan patterns, power settings), not generic advice. Maximum 3 items.
- upNext: one entry per planned session (maximum 3), with a practical prep tip.
- If there are no strengths, return an empty array. Same for focusAreas and upNext.`;

  if (!OPENAI_API_KEY) {
    return res.json({
      briefing: {
        strengths: ['API key not configured — connect OpenAI to enable coaching briefings.'],
        focusAreas: [],
        upNext: plannedSessions.slice(0, 3).map((s) => ({
          title: s.title,
          tip: 'Review lesson objectives before flying.',
        })),
      },
      source: 'fallback',
    });
  }

  try {
    const response = await createOpenAIResponse({
      model: 'gpt-4o-mini',
      input: prompt,
      temperature: 0.4,
    });

    if (!response.ok) {
      const apiError = await response.text();
      return res.status(502).json({ error: `OpenAI request failed: ${apiError}` });
    }

    const data = await response.json();
    let text = data.output_text ?? '';
    text = text.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();
    const briefing = JSON.parse(text);
    res.json({ briefing, source: 'openai' });
  } catch (error) {
    console.error('[/api/briefing] error:', error?.message ?? error);
    res.status(500).json({ error: 'Failed to generate briefing.' });
  }
});

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
    const upstream = await createOpenAIResponse({
      model: OPENAI_MODEL,
      input: [{ role: 'system', content: systemPrompt }, ...recentMessages],
      temperature: 0.6,
      stream: true,
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

app.listen(PORT, () => {
  console.log(`CoPi API listening on http://localhost:${PORT}`);
});
