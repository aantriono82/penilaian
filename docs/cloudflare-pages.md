# Deploy Frontend ke Cloudflare Pages

Dokumen ini khusus untuk frontend di folder `frontend/`. Backend Express tetap harus dideploy terpisah.

## Ringkasan Arsitektur

- `frontend` -> Cloudflare Pages
- `backend` -> layanan Node terpisah
- `frontend` mengakses backend lewat `VITE_API_URL`

Contoh:

- Frontend: `https://penilaian.pages.dev`
- Backend: `https://api.penilaian.domainanda.com`
- `VITE_API_URL=https://api.penilaian.domainanda.com/api`

## Konfigurasi yang Direkomendasikan

Saat membuat project baru di Cloudflare Pages:

- **Production branch**: `main`
- **Framework preset**: `Vue` atau `Vite`
- **Root directory**: `frontend`
- **Build command**: `npm ci && npm run build`
- **Build output directory**: `dist`
- **Node.js version**: `20`

## Environment Variables Pages

Minimal isi:

```env
VITE_API_URL=https://api.penilaian.domainanda.com/api
```

Catatan:

- Jangan biarkan default `/api` kalau backend tidak diproxy dari domain Pages yang sama.
- Nilai `VITE_API_URL` harus menyertakan suffix `/api` karena frontend memang memanggil endpoint seperti `/auth/login`, `/bank-soal`, `/generate`, dan lain-lain lewat base URL itu.

## Opsi Domain

Ada dua pola yang masuk akal:

1. **Paling sederhana**
   - Pages di domain publik
   - backend di subdomain lain
   - `VITE_API_URL` langsung ke backend

2. **Satu domain utama dengan reverse proxy**
   - frontend di `https://app.domainanda.com`
   - backend di `https://api.domainanda.com`
   - tetap pakai `VITE_API_URL=https://api.domainanda.com/api`

Untuk repo ini, opsi 1 biasanya paling cepat.

## Konfigurasi Backend yang Harus Cocok

Di backend, set:

```env
FRONTEND_URL=https://penilaian.pages.dev
```

Atau kalau sudah pakai custom domain:

```env
FRONTEND_URL=https://app.domainanda.com
```

Ini penting karena backend sekarang memakai:

- `cors({ origin: process.env.FRONTEND_URL || '*', credentials: true })`

Jadi origin frontend produksi harus persis sama dengan domain frontend yang dipakai user.

## Build dan Routing

Frontend ini adalah aplikasi Vue Router SPA. Cloudflare Pages perlu fallback ke `index.html`.

Buat file `frontend/public/_redirects` dengan isi:

```txt
/*    /index.html   200
```

Tanpa file ini, refresh di route seperti `/login`, `/generate`, `/bank-soal/123`, atau `/export/:id` bisa gagal dengan 404 di level edge.

## Checklist Uji Setelah Deploy

Setelah Pages selesai build:

1. buka halaman utama
2. buka route langsung seperti `/login`
3. login/register
4. pastikan request ke backend sukses
5. buka halaman generate
6. pastikan SSE generate tetap jalan
7. buka export preview dan cek render matematika

## Catatan Penting

- Cloudflare Pages hanya untuk frontend statis. Backend Express di repo ini tidak bisa dijalankan langsung di Pages.
- Fitur upload gambar, auth, SQLite, dan SSE tetap bergantung ke backend terpisah.

