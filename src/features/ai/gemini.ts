// src/features/ai/gemini.ts
// Shared Google Gemini client — server-only.
// Import this only from Server Actions or Route Handlers, never from 'use client' files.
import 'server-only';
import { GoogleGenerativeAI } from '@google/generative-ai';

if (!process.env.GEMINI_API_KEY) {
  // Warn loudly at startup — won't crash build but AI features will return errors.
  console.warn('[gemini] GEMINI_API_KEY is not set — AI features will be disabled.');
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY ?? '');

/** Default model — gemini-2.0-flash is fast & cheap for structured JSON output */
export const geminiFlash = genAI.getGenerativeModel({
  model: 'gemini-2.0-flash',
  generationConfig: {
    temperature:      0.7,
    topP:             0.9,
    maxOutputTokens:  8192,
  },
});

/** Pro model for richer explanations (chatbot, report drafts) */
export const geminiPro = genAI.getGenerativeModel({
  model: 'gemini-2.0-flash',
  generationConfig: {
    temperature:      0.9,
    topP:             0.95,
    maxOutputTokens:  4096,
  },
});
