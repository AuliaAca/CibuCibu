# Cibu — Product & Technical Architecture

> **"Focus, with a little company."**
> Productivity game berbasis Pomodoro. Cibu (karakter 2D resmi) hidup di dunia 2.5D; timer adalah bagian dari dunia itu.

Dokumen ini adalah rencana sebelum coding, dan sekaligus peta dari kode yang sudah ada di repo ini. Setiap bagian menunjuk ke file yang mengimplementasikannya.

---

## 0. Keputusan utama (ringkas)

| Keputusan | Pilihan | Alasan |
|---|---|---|
| App shell & UI | **Next.js 16 + React 19 + TypeScript** | Routing, SSR untuk shell/SEO, deploy Vercel tanpa konfigurasi. |
| Scene / dunia | **Phaser 3.90**, *hanya* untuk satu canvas `WorldScene` | Kamera (zoom/pan/lerp), particle emitter, tween, scale manager, input di canvas. Menulis ulang ini di CSS/DOM = lebih banyak kode dan lebih lambat. Phaser di-*lazy-load* (`next/dynamic`, `ssr:false`) sehingga UI muncul lebih dulu. |
| Kenapa bukan Phaser 4 | Phaser 3.90 | API stabil & terdokumentasi luas. Migrasi ke v4 terisolasi di folder `src/game/`. |
| UI biasa (HUD, sheet, tombol) | **React + Tailwind v4** | Aksesibel (fokus keyboard, screen reader), mudah diubah, bukan digambar di canvas. |
| State | **Zustand** (+ `persist`) | Satu store dibaca React *dan* Phaser (via `subscribe`), tanpa provider. |
| Logic inti | **TypeScript murni di `src/core/`** | Timer, care, XP, resolver ekspresi Cibu bisa dites tanpa browser. |
| Backend | **Tidak perlu FastAPI.** Supabase (Postgres + Auth + RLS) langsung dari client; Next.js Route Handler hanya bila perlu logic server (mis. validasi reward). | Satu deploy (Vercel), lebih sedikit infrastruktur. |
| Persistence MVP | `localStorage` via Zustand `persist` | Bisa dipakai tanpa login hari ini. Phase 6 menambah sync Supabase di belakang interface yang sama. |
| Font | Nunito (self-hosted via `@fontsource-variable`) | Rounded, hangat, tidak kekanak-kanakan; tidak tergantung Google Fonts saat build. |

---

## 1. Product architecture

```
┌────────────────────────────── Browser ──────────────────────────────┐
│                                                                      │
│  React UI layer (src/components)                                     │
│   TopBar · FocusHud · ControlDock · CareDock · RewardSheet · Sheets  │
│        │  reads/writes                        ▲ UI events            │
│        ▼                                      │                      │
│  Game State (src/store/useCibu.ts — Zustand, persisted)              │
│   session · care · progress · inventory · settings · reaction queue  │
│        │  subscribe()                         ▲ interaction events   │
│        ▼                                      │ (tap Cibu, tap prop) │
│  Game Scene (src/game — Phaser, 1 canvas)                            │
│   WorldScene: parallax layers · lighting · particles · camera        │
│   CibuActor: sprite pool · motion profile · speech bubble            │
│        ▲                                                             │
│  Pure logic (src/core) — dipakai store & scene                       │
│   pomodoro · care · progression · cibuBrain (state resolver)         │
│                                                                      │
└───────────────┬──────────────────────────────────────────────────────┘
                │ Phase 6: sync adapter (subscribe store → upsert Supabase)
                ▼
        Supabase: Auth · Postgres (RLS) · (opsional) Edge/Route Handler
```

Aturan pemisahan:
- **React tidak menyentuh Phaser object.** Ia hanya menulis ke store.
- **Phaser tidak merender UI teks penting** (timer, tombol). Ia hanya merender dunia & Cibu (termasuk speech bubble yang "menempel" di Cibu).
- **Komunikasi dua arah lewat store + event bus kecil** (`src/game/bridge.ts`) untuk event sesaat (mis. "Cibu di-tap", "prop di-tap").

## 2. User flow

```
Buka app
 └─ Dunia fade-in, kamera "settle" ke Cibu, Cibu menyapa (idle)
     ├─ [Mulai Fokus] ───────────────► FOCUS START
     │     kamera zoom-in pelan, dunia meredup, lampu hangat di Cibu,
     │     Cibu: "Heh, fokus dong" → pose fokus (laptop/buku)
     │        ├─ Pause  → Cibu santai, "Oke, tarik napas dulu" → Resume
     │        ├─ Selesaikan lebih awal → XP parsial, Cibu tetap supportive
     │        ├─ Skip → "Gapapa, next time kita gas lagi"
     │        └─ timer habis → SESSION COMPLETE
     │              kamera zoom-out, confetti, Cibu celebrate
     │              Reward sheet: +XP, +snack, progress level, unlock (jika ada)
     │                 ├─ [Istirahat] → BREAK (Cibu duduk/tidur/dance)
     │                 │     Care: kasih makan · mandiin · elus
     │                 │     break habis → Cibu "Udah timer loh!" → kembali ke FOCUS
     │                 └─ [Lanjut Fokus] → FOCUS START
     ├─ Tap Cibu → reaksi lucu (poke)
     ├─ Care dock → kasih makan / mandiin / tidur siang
     ├─ Lemari (Wardrobe) → pakai outfit yang sudah terbuka
     └─ Jurnal → statistik hari ini, streak, achievements
```

## 3. Game loop

```
FOCUS ─► CIBU REACTS ─► PROGRESS ─► REWARD ─► CARE ─► BACK TO FOCUS
  │          │              │          │         │
  │          │              │          │         └ Snack dipakai → hunger/mood naik
  │          │              │          └ XP, snack (1/sesi), minuman (tiap 4 sesi), unlock outfit per level
  │          │              └ menit fokus, sesi, streak harian, level
  │          └ ekspresi & pose dari reference sheet sesuai state
  └ Pomodoro 25/5 (bisa diubah), berbasis timestamp (tahan reload & tab tidur)
```

Prinsip anti-adiktif:
- Tidak ada loot box, tidak ada random reward, tidak ada timer "klaim sebelum hilang".
- Stat care **tidak pernah turun ke 0** (lantai 15%). Cibu tidak sakit/mati; ia hanya terlihat lapar/ngantuk — cukup untuk memberi rasa peduli, tidak untuk menghukum.
- Reward proporsional dengan menit fokus. Sesi yang dihentikan lebih awal tetap dihitung menitnya.

## 4. Page structure

MVP adalah **satu layar hidup** (`/`) — bukan banyak halaman. Semua fitur sekunder adalah *sheet* di atas dunia, sehingga dunia tidak pernah hilang.

| Route | Isi |
|---|---|
| `/` | World canvas + HUD + dock + sheets (Wardrobe, Jurnal, Settings, Reward) |
| `/login` *(Phase 6)* | Magic-link Supabase |
| `/api/*` *(Phase 6, opsional)* | Route handler untuk validasi reward / webhook |

Layout responsif (bukan sekadar mengecil):

| Viewport | Layout |
|---|---|
| Desktop ≥1024 | Dunia full-bleed. TopBar mengambang. Timer besar di atas-tengah. Dock kontrol bawah-tengah. Care dock vertikal di kanan. Sheet muncul sebagai panel samping kanan. |
| Tablet 640–1023 | Sama, care dock menjadi baris di bawah dock kontrol. Sheet = panel bawah setengah layar. |
| Mobile <640 portrait | Cibu di tengah (sedikit lebih besar relatif ke lebar). Timer di atas. Kontrol besar di bawah (target sentuh ≥44px). Care dock horizontal di atas kontrol. Sheet = bottom sheet. Parallax memakai gerak jari (drag) alih-alih mouse. |

## 5. Component structure

```
src/app/
  layout.tsx            metadata, viewport, font, theme-color
  page.tsx              <CibuApp/>
  globals.css           Tailwind v4 theme tokens (palet Cibu)
src/components/
  CibuApp.tsx           root client component: dunia (Phaser via next/dynamic, ssr:false) + overlay UI + ticker
  Loader.tsx            first paint (server-rendered): Cibu berjalan + progress load dunia
  hud/TopBar.tsx        level ring + XP, CareMeters (4 meter), tombol Jurnal/Lemari/Pengaturan
  hud/FocusHud.tsx      timer, progress bar sesi, titik siklus pomodoro
  hud/ControlDock.tsx   Mulai / Jeda / Lanjut / Selesai / Skip, pilihan durasi
  hud/CareDock.tsx      Snack · Minum · Mandi · Tidur (dengan jumlah item)
  RewardCard.tsx        ringkasan reward setelah celebrate (XP count-up, level bar, unlock)
  Toasts.tsx            achievement / info toast
  sheets/Sheet.tsx      bottom-sheet (mobile) / side-panel (desktop)
  sheets/Sheets.tsx     Jurnal · Lemari · Pengaturan
  ui/icons.tsx, ui/Sprite.tsx
src/hooks/
  useTicker.ts          tick 250ms → store.tick(); judul tab; shortcut Spasi/Esc
src/preview/            entry build statis (esbuild) — komponen yang sama tanpa server Next
```

## 6. Game scene structure

```
src/game/
  PhaserGame.tsx        membuat/menghancurkan Phaser.Game; resolusi = CSS px × DPR (maks 2), zoom 1/DPR
  bridge.ts             event emitter tipe-aman (scene → React)
  assets.ts             manifest sprite Cibu + layer dunia, helper URL
  scenes/BootScene.ts   preload sprite & svg, generate texture partikel (canvas)
  scenes/WorldScene.ts  orkestrasi: layer, cahaya, partikel, kamera, sinkron store
  world/view.ts         peta design space 1600×900 → layar (landscape cover, portrait angkat Cibu)
  world/atmosphere.ts   langit, tint, matahari/bulan, kunang-kunang menurut jam lokal
  world/textures.ts     tekstur prosedural: partikel, glow, vignette, ray, bayangan
  (WorldScene.ts)       layer Greeny Garden, lighting, emitter, kamera dolly 2.5D per shot
  cibu/CibuActor.ts     bayangan + 2 sprite (crossfade) + motion profile + reaksi
  cibu/SpeechBubble.ts
```

Susunan kedalaman (depth) Greeny Garden:

| Depth | Layer | Parallax | Gerak |
|---|---|---|---|
| 0 | Langit (gradien, berubah menurut jam lokal) | 0 | — |
| 5 | Matahari/bulan + awan | 0.05 | drift |
| 10 | Bukit jauh (atmospheric haze) | 0.1 | — |
| 20 | Bukit dekat + pepohonan belakang | 0.2 | sway sangat halus |
| 30 | Pohon utama kiri/kanan | 0.35 | sway |
| 40 | Tanah/padang + jalan setapak | 0.45 | — |
| 50 | **Area Cibu**: tikar piknik, prop (tanaman, lampu, jam, buku) | 0.5 | prop interaktif |
| 55 | **Cibu** | 0.5 | motion profile |
| 60 | Partikel ambient (pollen, kunang-kunang) | 0.6 | — |
| 70 | Rumput & bunga depan | 0.8 | sway per helai |
| 80 | Daun blur di sudut (depth of field) | 1.1 | sway |
| 90 | Lighting overlay (vignette, glow) | — | tween menurut state |

## 7. Character state system

Resolver murni: `src/core/cibuBrain.ts`

```
resolve(context) → CibuPresentation { state, sprite, motion, bubble?, fx? }

context = { phase: idle|focus|paused|break|complete,
            progress 0..1, care{hunger,energy,mood,hygiene},
            transient reaction? (dari event), time }
```

Prioritas: **reaksi sesaat** (poke, makan, unlock, skip…) > **fase sesi** > **kebutuhan care** > **idle berdasarkan mood**.

| State | Sprite (dari reference sheet) | Motion | Bubble contoh |
|---|---|---|---|
| idle (mood tinggi) | proud, aesthetic, spirited, love, cool | napas normal, lihat sekeliling, sesekali lompat | — |
| idle (normal) | smirk, smug, thinking, crosseyed | napas, lirik kiri-kanan | — |
| focus_start | heh → fokuslah / nodistract | pop-in, kamera zoom | "Heh, fokus dong" |
| focusing | serius, study, maximal, okefine, focus (rotasi tiap ±3 menit) | napas pelan, micro-bob | "Oke fine, gw temenin" (sekali) |
| almost (≥80%) | bentar, tinggaldikit, almostthere, semangatdikit | napas lebih cepat | "Tinggal dikit!" |
| paused | thinking → lazy (jika >2 menit) | napas pelan | "Oke, tarik napas dulu" |
| skipped / ended early | pout → thumbsup | — | "Gapapa, next time kita gas lagi" |
| complete | yeay, proudofyou, gokil, bestie, youdidit | lompat + confetti | "YEAY! LO KEREN!" |
| break | sit, sleep, dance, aesthetic | santai, napas dalam | "Istirahat dulu~" |
| break_over | timer | nudge | "Udah timer loh!" |
| hungry (<35) | pout, frown + thought bubble snack | napas lemah | "Laper…" |
| sleepy (<30) | sleepy, lazy | napas lambat, kepala turun | "Ngantuk…" |
| dirty (<30) | annoyed + partikel debu | — | — |
| eating | love / touched | squash-stretch mengunyah | "Makasih!" |
| poked | tongue, genz, crosseyed, smug, shocked (acak) | squash + hop | — |
| poked saat fokus | donotdisturb | — | "Jangan ganggu!" |
| buka menu saat fokus | nodistract | — | "Jangan distrack!" |
| milestone / unlock | finally, omg, touched | lompat + sparkle + kamera | "Akhirnya!" |

### Aturan ekspresi (revisi 29 Sep)

Cibu **tersenyum, lucu, imut secara default**. Ekspresi marah/kesal dari sheet hanya dipakai saat Cibu **diganggu** (di-tap saat fokus, membuka menu selain Musik saat fokus). Set ekspresi ada di `src/core/cibuBrain.ts`: `SMILE`, `CUTE`, `FOCUS_FACES`, `DISTURBED`.

### Makan (revisi 29 Sep)

Tombol **Snack** membuka menu 3 pilihan sehat: Salad Sayur, Wortel Manis (sayur), Stroberi (buah). Makanan selalu tersedia (Cibu tidak pernah "dikunci lapar"); saat kenyang ≥92% Cibu menolak dengan manis. Makanan terbang ke Cibu, lalu Cibu bilang *"Nyam! Makasih yaa ><"* → *"Aku suka banget {buah/sayur} ini, badanku jadi sehat!"*. Minuman tetap jadi reward (+1 tiap sesi selesai).

### Framing Cibu vs HUD (revisi 29 Sep)

React mengukur area yang tertutup HUD (`data-inset="top|bottom|right"`, `useHudInsets`) → store `insets` → `computeView()` memposisikan dan (jika perlu) mengecilkan dunia supaya Cibu selalu berdiri di ruang kosong di antara timer, tombol, dan rail Rawat. Perubahan framing di-*glide* (lerp), dan zoom kamera berporos di kaki Cibu sehingga ia membesar ke atas, tidak ke tombol. Speech bubble pindah ke samping bila akan tertutup timer.

### Suara & musik (revisi 29 Sep)

- **Suara mulai fokus** (`src/lib/sound.ts`): ritual "tarik napas" (noise yang mengembang) + motif khas: *Kalimba Cibu* (diakhiri glide "boop"), *Singing bowl*, *Tok-tok marimba*. Semua disintesis, tanpa file.
- **Suara latar** (`src/lib/soundscape.ts`): Hujan, Brown noise, Hutan — generatif, tanpa lirik, otomatis saat fokus. Opsi eksperimental "denyut fokus" (modulasi amplitudo ±14 Hz), dengan catatan jujur bahwa ini bukan teknologi Brain.fm.
- **Brain.fm × Dr. Justin Sung**: Brain.fm tidak punya API publik → dibuka di tab baru; link ke video study-with-me Justin Sung (50-10 dan 42-6) dan tombol untuk memakai ritme itu. Ritme 42/6 dan 50/10 juga ada di pilihan durasi utama.
- **Spotify**: embed resmi (playlist/album/lagu, termasuk album Brain.fm *Music for Focus*), atau tempel link sendiri. Tanpa login Spotify di browser, embed hanya memutar cuplikan 30 detik. Integrasi penuh (Web Playback SDK) butuh akun Premium + OAuth — Phase 6.

### Revisi 29 Sep (2)

- **Jeda = Cibu tarik napas sendiri.** Beat `breathe: "in" | "out"` membuat tubuh Cibu mengembang/mengempis pelan + partikel "fuuu" dari mulut; selama jeda Cibu bernapas lambat seperti meditasi, jadi user bisa ikut bernapas.
- **Semangat dari Cibu saat fokus** (`motivation()` di `cibuBrain.ts`, dijadwalkan `WorldScene.maybeCheer`): kata-kata manis tiap 3/6/10 menit (Pengaturan: Mati/Jarang/Sedang/Sering) + di ¼, ½, ¾ sesi, dengan ekspresi paling gemesin. Tanpa suara, tidak pernah memotong reaksi lain.
- **Langit ikut lokasi** (`src/lib/sun.ts`): matahari terbit/terbenam dihitung dari lokasi perangkat (jika diizinkan) atau diperkirakan dari zona waktu; keyframe malam → fajar → siang → senja mengikuti waktu matahari asli. Cibu menyapa saat matahari terbit/terbenam.
- **Kegiatan Cibu** (`src/game/world/activities.ts`): jalan-jalan, nyiram tanaman (tanaman tumbuh), kejar kupu-kupu, baca buku, senam pagi, lihat bintang jatuh (malam). Dipilih sesuai waktu, hanya saat santai/istirahat, langsung batal saat sesi mulai atau user berinteraksi.
- **Lemari Cewek/Cowok** (`src/core/wardrobe.ts` + `wardrobe.json`): Cewek — Imut, Cute, Baddie, Princess; Cowok — Clean, Cool, Keren, Baju Rumah. 22 outfit, 1 cewek + 1 cowok terbuka tiap level. Dua jenis: *combo* resmi dari sheet, dan *layer* aksesori yang menempel di semua ekspresi. Posisi layer dihitung dari kotak tubuh Cibu per sprite (`tools/asset-pipeline/body_anchors.py`); topi resmi yang di sheet digambar menempel di kepala dibersihkan otomatis (`layer_items.py`). Aksesori baru (tiara, mahkota, kacamata hati, kacamata bulat, dasi kupu, kalung mutiara, topi tidur, jepit bintang) digambar dalam gaya sheet.

### Revisi 30 Sep

- **Bubble lebih santai dibaca:** durasi tiap beat = maks(durasi × 1,35, waktu baca ±15 karakter/detik + 1,7 dtk) (`beatMs` di `cibuBrain.ts`); animasi muncul/hilang bubble dilambatkan; kegiatan Cibu diberi jeda 1,45×.
- **Mulai fokus:** Cibu lompat tinggi dua kali (senang banget) → kata semangat → "Oke, mode belajar: ON!" → mode belajar.
- **Mode belajar yang happy:** wajah belajar senyum (kacamata + pensil, dll.), laptop & buku muncul di samping Cibu, anggukan kecil seperti sedang membaca; motivasi rutin ditambah kalimat "masa depan tertata rapi" yang ramah.
- **Selesai sebelum waktunya:** Cibu sedih (nangis-drama lucu) + "Padahal tinggal N menit lagi", lalu tetap suportif.
- **Sesi selesai:** "YAYYY! Kamu udah nyelesaiin sesi dengan baik!" → kartu pilihan *Stretching bareng aku* (Napas bareng · Mewarnai gemes) atau *Stretching ala kamu* (info anti-doomscrolling, rujukan Kang & Kurtzberg 2019, Journal of Behavioral Addictions).
- **Napas bareng** (`components/break/BreathCoach.tsx`): 4 dtk tarik · 3 dtk tahan · 6 dtk hembus × 5, Cibu mengembang/mengempis persis mengikuti panduan (beat `exact`).
- **Mewarnai gemes** (`components/break/ColoringStudio.tsx`): 3 halaman (Es Krim, Rumah Jamur, Cupcake), roda warna 12 hue, tint/shade, harmoni warna (komplementer, analog, triadik, split) dengan penjelasan singkat, Cibu memuji hasil warnamu.

### Revisi 30 Sep (2) — Cibu ikut belajar

- `src/game/world/study.ts` (**StudyDesk**): saat fokus Cibu duduk di balik laptop dan **mengetik** (badan memantul kecil per ketukan, huruf-huruf pastel melayang dari keyboard, cahaya layar di wajahnya), lalu **menulis catatan** (memegang pensil & notes, sedikit bergoyang), lalu **membaca buku** (mengangguk pelan). Rotasi 70s/45s/45s; tiap ganti kegiatan kadang ia bilang kalimat pendek ("Ketik-ketik dulu~ tak tik tuk!").
- Props belajar menghadap Cibu: kita melihat **punggung laptop** (bertempel stiker), **sampul buku yang terbuka ke arah Cibu**, dan **bagian belakang papan catatan**. Sesekali Cibu **membalik catatannya** untuk ditunjukkan ke user ("Nih, catatanku! Rapi kan?") lalu lanjut menulis. Aset: `public/assets/world/study/*.svg`.
- Urutan mulai fokus: (1) "Yeay! Kita mulai belajar!" lompat tinggi + confetti → (2) "Pelan-pelan, pasti bisa!" dengan wajah menyemangati → (3) "Mode belajar: ON!" pakai kacamata → (4) cue `desk`: laptop muncul dengan kilau. Beat punya `cue` untuk momen seperti ini (`CibuActor` → `WorldScene`).
- Posisi props dijaga di bawah dagu Cibu (≈70 unit di atas kaki) supaya wajahnya selalu terlihat.
- Wajah selama belajar selalu yang happy (`studyPresentation()` di `cibuBrain.ts`).
- Motivasi pertama muncul ±75 detik setelah mulai, lalu tiap 4 menit (Sedang) + di ¼, ½, ¾ sesi; props belajar tetap di tempat saat Cibu menyemangati.

### Revisi 30 Sep (3) — Lemari Baddie & Princess dirapikan

- **Baddie**: "Heart Shades" diganti **Cat-Eye Glam** (kacamata cat-eye hitam dengan ujung emas + kalung rantai emas berliontin hati). **Baddie Night** sekarang cukup **bandana hitam bertotol** + kacamata hitam — simpel, tanpa syal yang mencuat.
- **Princess**: rok & syal diganti **selendang (sash)** satin yang melingkar di badan: Tiara Putri = selendang pink + bros bunga + tiara; Ratu Kecil = selendang biru royal + medali emas + mahkota.
- Item baru bisa ditandai `clip: true` di `wardrobe.json` → digambar lalu **dipotong mengikuti siluet Cibu**, jadi tidak ada bagian yang keluar dari tubuhnya. Phaser: `CibuActor.clipTexture()` mem-bake item ke canvas seukuran sprite lalu `destination-in` dengan alpha sprite (di-cache per ekspresi). React: `CibuDressed` memakai sprite sebagai `mask-image`.
- Aset: `public/assets/wear-extra/{cat-eye,gold-chain,bandana,sash-pink}.svg`. ID outfit tetap sama, jadi outfit yang sudah dipakai user tidak hilang.

### Revisi 30 Sep (4) — Baju cowok dibuat ulang & princess dibedakan

- **Masalah lama**: topi cowok hasil potongan sheet (`layer/cap`, `layer/beanie`, `layer/headband`) bolong di bagian yang tadinya tertutup kepala; 5 outfit cowok berupa gambar pose duduk (combo) sehingga hilang begitu Cibu ganti ekspresi.
- **Sekarang semua outfit cowok = layer utuh** yang mengikuti setiap ekspresi, digambar ulang oleh `tools/wear/draw_wear.py` (SVG gaya sheet: outline gelap, gradasi, highlight):
  - Clean: Rapi Kalem (dasi kupu + kacamata bulat), Sporty Clean (bandana olahraga putih-biru).
  - Cool: Cool Newsboy (topi newsboy abu + kacamata hitam), DJ Cibu (headphone + kacamata), Streetwear (topi hitam bintang + tas selempang).
  - Keren: Topi Merah, Topi Peach (bucket hat), Beanie Navy.
  - Baju Rumah: Piyama Tidur (atasan piyama bintang + topi tidur), Sweater Cozy (sweater rajut krem + beanie biru), Santai Rumah (kaos garis + beanie sage).
- **Princess dibedakan**: Tiara Putri = selendang pita pink sederhana + pita kecil + tiara (manis, tidak mewah). Ratu Kecil = **jubah ratu** beludru merah bermotif damask, kerah bulu ermine, pinggiran & kalung emas, kancing permata + mahkota (mewah).
- **Masker badan** (`tools/asset-pipeline/body_masks.py` → `public/assets/cibu/mask/*.png`, `manifest.sprites[k].mask`): hanya badan oranye Cibu (lubang mata/mulut ditutup), tanpa kartu kuning/kilau. Semua item `clip` (baju, selendang, tas, bandana olahraga) dipotong dengan masker ini + dibatasi body box → tidak ada yang keluar dari tubuh. Phaser memuat masker secara lazy (`CibuActor.maskSource`), React memakai `mask-image`.

### Revisi 30 Sep (5) — Tanpa kacamata, bubble konsisten, ritual belajar

- **Baddie tanpa kacamata**: Leather Glam (dulu Cat-Eye Glam) = jaket kulit hitam dengan kerah & stud perak di atas atasan pink + kalung rantai emas. Baddie Night = atasan payet ungu dengan rantai perak + bandana. Keduanya `clip` → pas di badan.
- **Cowok**: Cool Newsboy & DJ Cibu tanpa kacamata. DJ memakai headphone baru (`acc/headphones`) yang ramping: busur memeluk kepala, earcup di sisi — tidak menutupi wajah.
- **Bubble chat selalu di atas kepala** (`SpeechBubble.follow`): tidak pernah pindah ke samping. `computeView` menyisakan ruang ±84 px (2 baris) di bawah timer (`insets.bubble`), dan tinggi topi ikut dihitung (`CibuActor.headScreen`). Kalimat panjang berhenti tepat di bawah timer, tidak masuk ke bawahnya.
- **Jeda**: sebelum aba-aba napas Cibu memberi kalimat pembuka ("Oke, kita jeda sebentar ya~" → "Selagi jeda, yuk rileksin badan. Ikutin aku ya!") baru tarik–hembus.
- **Ritual belajar** (`world/study.ts`), diatur oleh progres sesi, bukan timer tetap:
  1. Setelah "Mode belajar: ON!" → "Siapin buku sama laptop dulu ya~": Cibu berjalan ke tumpukan buku+laptop di tepi tikar, membawanya kembali, menaruh buku di samping, meletakkan laptop di depan, lalu **membuka layar** (engsel) → mulai mengetik.
  2. **½ waktu fokus** (`READ_AT = 0.5`): "Udah setengah jalan! Gantian baca buku yuk~" → laptop ditutup & digeser ke samping, buku pindah ke depan lalu dibuka.
  3. **85%** (`WRITE_AT`): buku ditutup, Cibu merangkum di catatan dan sesekali menunjukkannya.
  Reload di tengah sesi langsung ke posisi yang benar (`snapTo`). Aset: `study/laptop-closed.svg`, `study/book-closed.svg`.
- **Kupu-kupu & burung** saat belajar (`world/flyers.ts`): 3 kupu-kupu berputar pelan di samping/atas Cibu (tidak melewati wajah), dan tiap 9–16 detik kawanan 2–4 burung kecil melintas di langit. Hanya siang hari; malam hari diganti kunang-kunang.

### Revisi 1 Okt — Baddie aksesori saja & wajah murung dihapus

- Baddie tanpa baju: **Gold Glam** = headband berstud perak + kalung rantai emas; **Baddie Night** = bandana + kalung rantai perak. Jaket & atasan payet dihapus.
- Sprite `almost/tinggaldikit` (mulut turun, terkesan cemas) dihapus dari semua pool/baris; diganti wajah senang (`complete/youdidit`, `proudofyou`, `almost/semangatdikit`, `complete/yeay`). Pool lapar/kotor memakai `pout`/`sad`.

### Revisi 1 Okt (2) — Napas bareng di bangku + kotak oranye

- **Bangku** (`world/seat.ts`, `props/stool.svg`): saat break "Napas bareng" dimulai, Cibu berjalan mengambil bangku, membawanya, menaruhnya di tengah tikar, lalu duduk (`pose/sit`, `cibu.seat.v` mengangkat badan). Flag store `seated` (tidak dipersist) memicu coach; `Seat.leave()` berdiri & menyingkirkan bangku saat break berakhir.
- **BreathCoach**: kartu kaca buram (`backdrop-blur`) kompak, bukan lagi panel gelap, sehingga dunia di belakang tetap terlihat blur. Kotak box-breathing 4-4-4-4 berwarna **oranye** (`#E8620A` / titik `#FF8A3D`); tiap sisi kotak = satu fase (Inhale, Hold, Exhale, Hold).
- Cibu **mempraktikkan** tiap fase via `react("coach", {phase})`: mengembang saat tarik, tetap saat tahan, mengempis saat hembus, rileks saat rest.

## 8. Animation system

Tiga lapis animasi, semuanya *procedural* di atas artwork statis resmi (tidak redraw):

1. **Motion profile Cibu** (`CibuActor.update`) — setiap frame:
   - *breathing*: `scaleY = 1 + A·sin(ωt)`, `scaleX = 1 − A/2·sin(ωt)` (volume terjaga). A dan ω dari state + energy (energy rendah → ω lebih lambat).
   - *look around*: offset x & tilt kecil secara acak tiap 3–7 detik.
   - *hop / walk*: tween posisi pendek dengan squash saat mendarat.
   - *expression swap*: crossfade 2 sprite + "pop" (0.94 → 1.04 → 1.0, 260ms).
2. **Environment** — sway tanaman (rotasi berporos di pangkal, fase acak), awan drift, perubahan cahaya menurut state & jam.
3. **Kamera** (`SHOTS` di `WorldScene`) — preset shot per mode dengan easing `Sine.InOut`, durasi 900–1600ms, zoom maks 1.18; parallax dari pointer/drag dengan lerp 0.06 (tidak agresif).

Setiap motion punya fungsi: feedback (pop saat ganti ekspresi), orientation (kamera ke Cibu saat fokus), emotional response (napas & ekspresi), progression (glow bar & confetti), discovery (reveal saat unlock).

`prefers-reduced-motion`: kamera statis, parallax off, partikel dikurangi 70%, napas tetap (halus).

## 9. Asset structure

```
tools/asset-pipeline/
  reference/cibu_character_sheet.png   sumber resmi (character bible)
  sheet_map.json                       nama → posisi di sheet (88 sprite)
  slice_sheet.py                       potong + alpha matte (tanpa redraw)
  upscale.py                           4× Real-ESRGAN anime (NumPy, tanpa torch)
public/assets/cibu/
  manifest.json                        {key: file, w, h, anchor, label}
  expression/*.webp  (25)   focus_start/*.webp (5)   focusing/*.webp (5)
  almost/*.webp (4)          complete/*.webp (5)      pose/*.webp (6)
  outfit/*.webp (10)         wear/*.webp (16)         prop/*.webp (12)
public/assets/world/greeny/*.svg       layer dunia (vector, mudah diganti painted art)
```

**Kondisi asset saat ini & batasannya.** Reference sheet adalah screenshot 1098×688, jadi tiap sprite hanya ±70px. Pipeline memotongnya secara otomatis dan melakukan super-resolution 4× dengan model anime — hasilnya tajam untuk ukuran tampil ±220–300px, tetapi tetap merupakan *upscale*.

**Untuk production, siapkan asset dari file desain asli dengan spesifikasi ini:**

| Kebutuhan | Spesifikasi |
|---|---|
| Resolusi | Tinggi karakter 768px (@1x tampil 256px → aman untuk 3× DPR) |
| Format | PNG 32-bit per frame → dikonversi pipeline ke WebP/AVIF + atlas |
| Anchor | Titik tengah kaki di baseline yang sama untuk semua frame (penting agar swap ekspresi tidak "melompat") |
| Layer terpisah | `body` · `face` (mata, mulut, pipi) · `folder` (tab kuning belakang) · `arm_L/arm_R` · `fx` (?, !, zzz, sparkle) |
| Mata | Frame mata: open / half / closed → memungkinkan **blink** sungguhan |
| Mulut | 3–4 frame → reaksi bicara/makan |
| Outfit | Tiap item dengan anchor slot: `head`, `face`, `neck`, `body`, `waist`, `hand` + urutan layer (belakang/depan tubuh) |
| Pose | Pose badan sebagai rig terpisah (sit, sleep, walk ×4 frame, jump ×3, dance ×4) |

Bila layer tersedia, `CibuActor` beralih dari "1 sprite per ekspresi" ke **komposisi layer** (body + face + outfit slots) — interface-nya sudah dipisah (`setExpression`, `setPose`, `setOutfit`). Alternatif lanjutan: rig Spine/Rive untuk animasi tulang; tetap berupa artwork 2D yang sama.

## 10. State management

Satu store Zustand (`src/store/useCibu.ts`), dipersist ke `localStorage` (versi + migrasi):

```ts
{
  session:  { phase, kind: 'focus'|'break', durationMs, startedAt, pausedAt, pausedMs,
              cycleIndex, lastOutcome },
  care:     { hunger, energy, mood, hygiene, updatedAt },          // 0..100
  progress: { xp, level, totalFocusMin, sessions, streak, lastFocusDay,
              daily: { [yyyy-mm-dd]: minutes } , achievements: string[] },
  inventory:{ snack, drink, outfits: string[], equipped: string|null },
  settings: { focusMin, breakMin, longBreakMin, sound, reducedMotion },
  reaction: { id, kind, at } | null                                // transient untuk Cibu
  ui:       { sheet: null|'reward'|'wardrobe'|'journal'|'settings', lastReward }
}
```

- Timer **berbasis timestamp** (`startedAt`, `pausedMs`) — tidak menghitung detik manual; tahan throttle tab & reload.
- Care decay dihitung *lazy* dari `updatedAt` saat tick (bukan interval terpisah).
- Phaser membaca store via `useCibu.subscribe` di `WorldScene` → tidak ada re-render React per frame.
- Selector React sempit per komponen (timer re-render 4×/detik hanya di `FocusHud`).

## 11. Database structure (Phase 6 — Supabase/Postgres)

File: `supabase/migrations/0001_init.sql` (sudah ditulis: tabel, RLS, view `daily_focus`, trigger baris default saat sign-up).

```
profiles          id (=auth.users.id) · display_name · created_at
cibu_state        user_id PK · hunger · energy · mood · hygiene · equipped_outfit · updated_at
progress          user_id PK · xp · level · total_focus_min · sessions · streak · last_focus_day
focus_sessions    id · user_id · kind · planned_min · actual_min · outcome(completed|ended|skipped)
                  · started_at · ended_at        ← sumber kebenaran statistik
inventory         user_id · item_key · qty      (PK user_id,item_key)
unlocks           user_id · unlock_key · unlocked_at
achievements      user_id · achievement_key · achieved_at
settings          user_id PK · focus_min · break_min · long_break_min · sound · reduced_motion
```

Semua tabel: RLS `user_id = auth.uid()`. Statistik harian = view `daily_focus` agregasi dari `focus_sessions`.

## 12. Recommended tech stack (final)

| Layer | Pakai | Tidak pakai (dan kenapa) |
|---|---|---|
| Framework | Next.js 16 App Router, React 19, TS | — |
| Scene | Phaser 3.90 (1 scene, lazy) | Three.js (Cibu harus tetap 2D), PixiJS (perlu merakit kamera/tween sendiri) |
| State | Zustand 5 + persist | Redux (berlebihan) |
| Styling | Tailwind v4 | CSS-in-JS runtime |
| Backend | Supabase (Auth, Postgres, RLS) + Next Route Handler bila perlu | FastAPI / server terpisah — tidak ada kebutuhan yang tak bisa dipenuhi Supabase + Next |
| Hosting | Vercel | Railway/Render/Fly — tidak dibutuhkan tanpa backend terpisah |
| Analytics (Phase 6) | Vercel Analytics atau PostHog (event: session_start/complete/skip, care_action) | — |
| Error | Sentry (Next SDK) | — |
| Sound (Phase 5) | Web Audio API (chime disintesis, tanpa file) | Howler (belum perlu) |

## 13. MVP scope

**Masuk MVP (sudah diimplementasikan di repo ini):**
- Greeny Garden 2.5D: 8 layer parallax, sway, awan, langit menurut jam lokal, cahaya & vignette menurut state, partikel (pollen/kunang-kunang/daun/confetti/sparkle).
- Cibu: 88 sprite resmi, state machine lengkap tabel §7, motion profile, speech bubble, poke.
- Pomodoro: 25/5 (+ long break tiap 4 sesi), pilihan durasi, pause/resume/selesai/skip, tahan reload, judul tab menampilkan sisa waktu, chime.
- Reward: XP per menit, level, snack/minuman, unlock outfit per level, reward sheet.
- Care: 4 stat dengan konsekuensi visual; kasih makan, mandiin, tidur siang, elus.
- Wardrobe (10 outfit resmi dari sheet), Jurnal (hari ini, total, streak, 7 hari terakhir, achievements).
- Responsif desktop/tablet/mobile; `prefers-reduced-motion`.

**Belum MVP:** login & sync, world lain (Sunny Beach, Candy Land, Cloudy Town, Space Station — sudah tampil sebagai "terkunci" di Jurnal), layering aksesori per item, blink sungguhan (butuh layer mata), analytics.

## 14. Deployment architecture

```
GitHub ──push──► Vercel (build: next build)
                  ├─ Static: /_next/*, /assets/* (immutable cache, WebP)
                  ├─ Edge/Node: app shell (RSC) + /api/* (Phase 6)
                  └─ env: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY
Supabase ─ Auth (magic link) · Postgres (RLS) · migrations via supabase CLI
```

- Asset `public/assets/**` di-serve dengan cache 7 hari + `stale-while-revalidate` (lihat `next.config.ts`); naik ke `immutable` setelah pipeline menghasilkan nama file ber-hash.
- Phaser dipecah ke chunk sendiri (dynamic import) → First Load JS halaman kecil.
- Tanpa env Supabase, app berjalan penuh dalam mode lokal (guest).

## 15. Step-by-step implementation plan

Setiap langkah menghasilkan sesuatu yang bisa dijalankan (`npm run dev`).

| # | Langkah | Output yang bisa dijalankan | Status |
|---|---|---|---|
| 1 | Asset pipeline: slice + upscale reference sheet | `public/assets/cibu/**` + manifest | ✅ |
| 2 | Scaffold Next + Tailwind + Zustand + Phaser lazy canvas | Layar dunia kosong yang resize | ✅ |
| 3 | Core logic `src/core/*` (timer, care, XP, brain) | Logic murni | ✅ |
| 4 | Greeny Garden layers + parallax + sway + sky | Dunia hidup tanpa UI | ✅ |
| 5 | CibuActor + resolver + bubble | Cibu idle & poke | ✅ |
| 6 | Pomodoro HUD + dock + ticker | **Core loop jalan**: fokus → reaksi → selesai | ✅ |
| 7 | Reward sheet + XP/level + confetti + kamera | Loop lengkap dengan reward | ✅ |
| 8 | Care dock + konsekuensi visual | CARE di dalam loop | ✅ |
| 9 | Wardrobe + Jurnal + Settings | Progression terlihat | ✅ |
| 10 | Responsif + reduced motion + chime | Siap diuji di HP | ✅ |
| 11 | Supabase: migrasi, auth magic link, repository adapter sync | Login & multi-device | Phase 6 |
| 12 | Analytics, Sentry, error boundary di canvas | Observability | Phase 6 |
| 13 | Asset production (layered, blink, outfit slots) | Cibu dengan blink & layering | Butuh file desain asli |
| 14 | World 2 (Sunny Beach) + reveal transition | World unlock | Phase 4 lanjutan |
