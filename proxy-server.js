/**
 * Simple Proxy Server for HuggingFace API
 * Bypasses CORS restrictions by forwarding requests from the frontend
 * 
 * Run: node proxy-server.js
 */

import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';

const app = express();
const PORT = 3001;

// Enable CORS for all origins (you can restrict this in production)
app.use(cors());
app.use(express.json());

// HuggingFace Router API endpoint (NEW as of 2025)
const HF_MODEL = 'moonshotai/Kimi-K2-Thinking:novita';
const HF_API_URL = 'https://router.huggingface.co/v1/chat/completions';

// Proxy endpoint
app.post('/api/huggingface/router', async (req, res) => {
  try {
    console.log('[Proxy] Received request for Kimi-K2-Thinking');
    
    // Get API key from environment variable (NEVER hardcode API keys!)
    const apiKey = process.env.HF_TOKEN || process.env.VITE_HUGGINGFACE_API_KEY;
    
    if (!apiKey) {
      console.error('[Proxy] No API key found in environment variables');
      return res.status(500).json({ error: 'API key not configured' });
    }
    
    // Format messages into prompt
    // Format messages into a conversation format
    const messages = req.body.messages || [];
    
    // Build a conversational prompt
    let prompt = '';
    messages.forEach(m => {
      if (m.role === 'system') {
        prompt += `System: ${m.content}\n\n`;
      } else if (m.role === 'user') {
        prompt += `User: ${m.content}\n\n`;
      } else if (m.role === 'assistant') {
        prompt += `Assistant: ${m.content}\n\n`;
      }
    });
    
    prompt += 'Assistant:'; // Prompt for the model to continue
    
    console.log('[Proxy] Forwarding to HuggingFace Router API...');
    
    // Forward request to HuggingFace Router API (NEW endpoint)
    const response = await fetch(HF_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'x-use-cache': 'false',
      },
      body: JSON.stringify({
        model: HF_MODEL,
        messages: messages,
        max_tokens: 512,
        temperature: 0.7,
        top_p: 0.95,
        stream: false,
      }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Proxy] HuggingFace error:', errorText);
      return res.status(response.status).json({ error: errorText });
    }
    
    const data = await response.json();
    console.log('[Proxy] ✅ Success! Sending response back to frontend');
    
    // HuggingFace Router returns OpenAI-compatible format
    // Just forward the response as-is
    res.json(data);
    
  } catch (error) {
    console.error('[Proxy] Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Proxy server is running' });
});

app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║  🚀 HuggingFace Proxy Server Running!                     ║
║                                                            ║
║  Port: ${PORT}                                              ║
║  Endpoint: http://localhost:${PORT}/api/huggingface/router  ║
║  Model: moonshotai/Kimi-K2-Thinking                       ║
║                                                            ║
║  ✅ Ready to proxy requests to HuggingFace API            ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
  `);
});
