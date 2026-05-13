# WeedICider — Futuristic AI farming dashboard (React + Tailwind + Framer Motion)

Premium glassmorphism dashboard UI. The hero uses your cinematic farming artwork from `public/hero-cinematic.png`.

## Setup

```bash
cd dashboard-ui
npm install
npm run dev
```

Open the URL Vite prints (usually `http://127.0.0.1:5173`).

## Hero image

- Expected path: `public/hero-cinematic.png`
- This repo uses a **symlink** to your uploaded asset so the full-quality file is not duplicated.
- If the symlink breaks on another machine, copy your PNG to:

  `dashboard-ui/public/hero-cinematic.png`

The hero uses **`object-contain`** so the **entire illustration** stays visible on desktop; HUD overlays are drawn in React on top.

## Build

```bash
npm run build
npm run preview
```

## Note

If `npm install` fails with **ENOSPC**, free disk space and retry.
