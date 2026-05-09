# Beatly 🎵

Free music streaming PWA — built by students.

Stream millions of songs, podcasts, lyrics, equalizer, sleep timer, and more. No login required.

## Tech stack
- React 18 + Vite + TypeScript
- Tailwind CSS + shadcn/ui
- Supabase (database + edge functions for music API)
- PWA installable on mobile & desktop

## Local dev

```bash
bun install
bun run dev
```

## Build

```bash
bun run build
```

Then deploy the `dist/` folder to any static host (Vercel, Netlify, Cloudflare Pages, GitHub Pages).

## Environment variables

Create `.env`:

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_PUBLISHABLE_KEY=...
VITE_SUPABASE_PROJECT_ID=...
```

## Community

Join us on Telegram: https://telegram.me/scholarversepro_network
