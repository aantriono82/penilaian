# Checklist Deploy Backend

Checklist ini untuk backend Express di folder `backend/`.

## 1. Pilih target deploy

Target yang cocok:

- Render
- Railway
- Fly.io
- VPS dengan PM2 atau Docker
- Google Cloud Run

Target yang kurang cocok untuk backend ini tanpa refactor besar:

- Cloudflare Pages
- serverless yang tidak nyaman untuk SQLite lokal + SSE lama

## 2. Pastikan storage SQLite jelas

Backend memakai SQLite lokal. Itu berarti Anda harus memutuskan:

- file database disimpan di disk persisten, atau
- migrasi ke database lain

Kalau tetap SQLite, pastikan platform deploy mendukung:

- persistent volume / disk
- path writable

Contoh env:

```env
DB_PATH=/var/data/atiga-asesmen.db
```

Kalau platform tidak punya disk persisten, data user, bank soal, dan hasil generate akan hilang saat restart/redeploy.

## 3. Set environment variables produksi

Minimal:

```env
PORT=3002
JWT_SECRET=ganti_dengan_string_acak_panjang_dan_kuat
JWT_EXPIRES_IN=7d
NODE_ENV=production
FRONTEND_URL=https://penilaian.pages.dev
DB_PATH=/var/data/atiga-asesmen.db
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
OPENROUTER_HTTP_REFERER=https://penilaian.pages.dev
OPENROUTER_X_TITLE=Atiga Asesmen
```

Kalau frontend sudah pakai custom domain, ganti:

```env
FRONTEND_URL=https://app.domainanda.com
OPENROUTER_HTTP_REFERER=https://app.domainanda.com
```

## 4. Verifikasi CORS

Backend saat ini mengunci origin ke `FRONTEND_URL`.

Pastikan nilai `FRONTEND_URL`:

- memakai `https`
- tanpa trailing slash
- persis sama dengan origin frontend

Contoh benar:

- `https://penilaian.pages.dev`
- `https://app.domainanda.com`

Contoh yang berisiko gagal:

- `https://penilaian.pages.dev/`
- `http://penilaian.pages.dev`

## 5. Verifikasi endpoint health

Backend punya endpoint:

```txt
GET /health
```

Pastikan ini bisa diakses publik setelah deploy. Endpoint ini cocok dipakai untuk:

- health check platform
- smoke test CI/CD
- debug cepat

## 6. Pastikan SSE tidak dibuffer

Generate soal memakai SSE streaming.

Kalau backend ada di belakang reverse proxy atau load balancer, pastikan:

- buffering dimatikan
- timeout cukup panjang

Khusus Nginx:

```nginx
proxy_buffering off;
proxy_read_timeout 300s;
proxy_set_header X-Accel-Buffering no;
```

Tanpa ini, fitur streaming generate bisa terlihat macet atau baru muncul di akhir.

## 7. Pastikan direktori upload writable

Backend menyajikan file upload dari storage lokal.

Pastikan direktori data bisa ditulis oleh proses Node:

- database SQLite
- file upload / storage

Kalau pakai container, mount volume ke lokasi yang konsisten.

## 8. Cek proses start

Command start backend saat ini:

```bash
npm start
```

yang menjalankan:

```bash
node src/index.js
```

Jadi di platform deploy:

- **Root / working directory**: `backend`
- **Install command**: `npm ci`
- **Start command**: `npm start`

## 9. Uji alur setelah deploy

Minimal uji:

1. `GET /health`
2. register user baru
3. login
4. simpan API key OpenRouter
5. buat bank soal
6. generate 1-2 soal
7. pastikan streaming tampil
8. buka detail soal
9. export DOCX
10. cek file Word hasil export

## 10. Rekomendasi operasional

Yang layak ditambahkan setelah deploy dasar stabil:

- backup file SQLite terjadwal
- rotasi log
- monitoring uptime
- HTTPS custom domain untuk backend
- staging environment terpisah

