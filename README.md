# Cibu — Focus, with a little company

Productivity game berbasis Pomodoro. Cibu (karakter 2D resmi dari character sheet) hidup di **Greeny Garden**, dunia 2.5D dengan parallax, cahaya, partikel, dan kamera. Timer adalah HUD di atas dunia itu.

Arsitektur lengkap (15 bagian): **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)**

## Menjalankan

```bash
npm install
npm run dev          # http://localhost:3000
npm run build && npm start
```

Tips pengujian:
- `?hour=21` — paksa jam dunia (pagi/siang/sore/malam) untuk melihat suasana.
- `?debug` — expose `window.__cibu` (Phaser.Game) dan `window.__cibuStore` (Zustand).
- Spasi = mulai / jeda / lanjut. Esc = tutup panel.

## Struktur

```
src/core/        logic murni: pomodoro, care, progression, cibuBrain (state → ekspresi/pose)
src/store/       Zustand store (persist localStorage) — dibaca React & Phaser
src/game/        Phaser: BootScene, WorldScene, CibuActor, atmosphere, textures
src/components/  React UI: TopBar, FocusHud, ControlDock, CareDock, RewardCard, Sheets
public/assets/   sprite Cibu (hasil pipeline) + layer dunia (SVG)
tools/asset-pipeline/  slice + upscale character sheet (tanpa redraw)
supabase/migrations/   skema Phase 6 dengan RLS
```

## Asset pipeline

```bash
pip install numpy scipy pillow
curl -L -o tools/asset-pipeline/models/realesr-animevideov3.pth \
  https://github.com/xinntao/Real-ESRGAN/releases/download/v0.2.5.0/realesr-animevideov3.pth
npm run assets:slice     # potong 88 sprite dari reference sheet → build/slices
npm run assets:upscale   # 4× super-resolution → public/assets/cibu + manifest.json
```

Posisi tiap sprite ada di `tools/asset-pipeline/sheet_map.json`. Untuk kualitas production, ganti sheet dengan export resolusi tinggi dari file desain asli (lihat spesifikasi di ARCHITECTURE §9).

## Deploy

Vercel: import repo → framework Next.js → deploy. Tidak perlu env untuk mode lokal (guest).
Phase 6: set `NEXT_PUBLIC_SUPABASE_URL` dan `NEXT_PUBLIC_SUPABASE_ANON_KEY`, lalu `supabase db push`.

## Preview statis

`npm run preview:build` → `dist-preview/` (komponen yang sama, tanpa server Next) — bisa di-host di mana saja.
