# WeedICider — Futuristic AI farming dashboard (React + Tailwind + Framer Motion)

Premium glassmorphism dashboard UI. The hero uses `public/hero-cinematic.png`.

## Setup

```bash
npm install
npm run dev
```

Open the URL Vite prints (usually `http://127.0.0.1:5173`).

## Backend model server

The React app proxies `/api` to Flask on `http://127.0.0.1:5004`. Start the trained YOLO backend in a second terminal:

```bash
python3 -m venv .venv
.venv/bin/python -m pip install -r requirements.txt
.venv/bin/python app.py
```

The backend loads `Combined_Dataset_Yolov8_best.pt` first, then falls back to `detect/train2/weights/best.pt` or `detect/train/weights/best.pt`. Detection output returns an annotated image, crop/weed boxes, counts, confidence, crop ratio, weed ratio, history, stats, recommendations, and crop-health data.

## Hero image

- Expected path: `public/hero-cinematic.png`
- Keep this as a real image file, not a symlink, so hosted builds can serve it reliably.

HUD overlays are drawn in React on top.

## Build

```bash
npm run build
npm run preview
```

## Note

If `npm install` fails with **ENOSPC**, free disk space and retry.
