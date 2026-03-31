const express = require('express');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT || 8787);
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'copi-chat-api' });
});

app.post('/api/chat', async (req, res) => {
  const { messages = [], context = {} } = req.body || {};

  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'messages is required' });
  }

  const recentMessages = messages.slice(-10).map((message) => ({
    role: message.role === 'assistant' ? 'assistant' : 'user',
    content: String(message.content || ''),
  }));

  const systemPrompt = [
    'You are CoPi, an encouraging flight training assistant for student pilots.',
    'Keep responses concise, practical, and safety-minded.',
    `Student: ${context.student || 'Unknown student'}`,
    `Selected rating: ${context.rating || 'Private Pilot'}`,
    `Current lesson: ${context.lessonTitle || 'Not selected'}`,
  ].join('\n');

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

app.listen(PORT, () => {
  console.log(`CoPi API listening on http://localhost:${PORT}`);
});
