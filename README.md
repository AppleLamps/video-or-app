# Video-Or: AI Video Analysis Web App

Production-ready Next.js 14 app (App Router) for uploading videos or providing URLs and getting detailed AI analysis via OpenRouter using `google/gemini-2.5-flash-lite`.

Key features:

- Upload local video files (mp4/mov/webm/mpeg) or provide a video URL (e.g. YouTube).
- Optional "Focus Prompt" for targeted analysis (e.g. "analyze body language", "extract coaching insights").
- Backend API route encodes local uploads as base64 data URLs for OpenRouter.
- Uses `input_video` messages format per OpenRouter docs.
- Designed for Vercel deployment with `OPENROUTER_API_KEY` env var.

## Stack

- Next.js 14+ (App Router, TypeScript, Route Handlers)
- Tailwind CSS for quick UI styling
- Deployed on Vercel

## Environment Variable

Set on Vercel:

- `OPENROUTER_API_KEY`: Your OpenRouter API key.

## File Overview

- [`video-or-app/next.config.mjs`](video-or-app/next.config.mjs)
- [`video-or-app/tailwind.config.ts`](video-or-app/tailwind.config.ts)
- [`video-or-app/postcss.config.mjs`](video-or-app/postcss.config.mjs)
- [`video-or-app/tsconfig.json`](video-or-app/tsconfig.json)
- [`video-or-app/package.json`](video-or-app/package.json)
- [`video-or-app/app/layout.tsx`](video-or-app/app/layout.tsx)
- [`video-or-app/app/page.tsx`](video-or-app/app/page.tsx)
- [`video-or-app/app/api/analyze-video/route.ts`](video-or-app/app/api/analyze-video/route.ts)
- [`video-or-app/app/globals.css`](video-or-app/app/globals.css)

## OpenRouter Integration Summary

Endpoint:

- `POST https://openrouter.ai/api/v1/chat/completions`

Model:

- `google/gemini-2.5-flash-lite`

Request shape (conceptual):

- For URL input:
  - `content: [{ type: "text", text: userPromptWithFocus }, { type: "input_video", video_url: { url: userVideoUrl } }]`

- For uploaded file:
  - API route reads file buffer, encodes base64:
    - `data:video/mp4;base64,<base64>`
  - `content: [{ type: "text", text: userPromptWithFocus }, { type: "input_video", video_url: { url: dataUrl } }]`

The included implementation:

- Validates input.
- Supports either URL or file (file prioritized if both passed).
- Returns a concise + detailed analysis block.

## Usage

1. `cd video-or-app`
2. `npm install`
3. Create `.env.local` with:
   - `OPENROUTER_API_KEY=your_api_key_here`
4. `npm run dev`
5. Deploy to Vercel:
   - Set `OPENROUTER_API_KEY` in Vercel Project Settings > Environment Variables.
   - `vercel` or connect repo and deploy.
