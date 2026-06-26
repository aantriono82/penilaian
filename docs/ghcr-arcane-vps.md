# GHCR untuk Arcane Docker VPS

Dokumen ini untuk deploy image Docker dari GitHub Container Registry ke VPS Anda.

## Kenapa GHCR masuk akal untuk repo ini

Karena aplikasi ini punya:

- backend Node terpisah
- frontend container terpisah
- SQLite yang butuh volume persisten
- target deploy berupa Docker VPS

maka GHCR cocok sebagai registry image resmi untuk:

- `backend`
- `frontend`

Yang tetap tidak masuk ke image:

- file database SQLite
- file upload / storage
- secret `.env`

Semua itu tetap harus tinggal di VPS lewat volume dan env file.

## Image yang akan dipublish

Workflow akan publish:

- `ghcr.io/aantriono82/penilaian-backend`
- `ghcr.io/aantriono82/penilaian-frontend`

Tag yang dipakai:

- `latest` untuk `main`
- nama branch
- nama tag git, mis. `v1.0.0`
- `sha-...`

## Workflow GitHub

File workflow:

- [.github/workflows/ghcr.yml](../.github/workflows/ghcr.yml)

Trigger:

- push ke `main`
- push tag `v*`
- manual run

## Syarat GitHub Repository

Di repo GitHub:

1. buka **Settings**
2. buka **Actions > General**
3. pastikan workflow punya izin **Read and write permissions** untuk package, atau biarkan workflow memakai blok `permissions` seperti yang sudah dibuat

Kalau package GHCR nanti ingin ditarik dari VPS tanpa image public, siapkan juga **Personal Access Token** GitHub di VPS dengan scope minimal:

- `read:packages`

## Deploy di VPS

File yang dipakai:

- [docker-compose.ghcr.yml](../docker-compose.ghcr.yml)

Langkah umum di VPS:

```bash
docker login ghcr.io -u GITHUB_USERNAME
docker compose -f docker-compose.ghcr.yml pull
docker compose -f docker-compose.ghcr.yml up -d
```

## File `.env` backend di VPS

Buat file:

```txt
backend/.env
```

Contoh minimal:

```env
PORT=3002
JWT_SECRET=ganti_dengan_string_acak_panjang_dan_kuat
JWT_EXPIRES_IN=7d
NODE_ENV=production
FRONTEND_URL=https://domain-frontend-anda.com
DB_PATH=/app/data/atiga-asesmen.db
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
OPENROUTER_HTTP_REFERER=https://domain-frontend-anda.com
OPENROUTER_X_TITLE=Atiga Asesmen
```

## Volume yang harus persisten

Yang wajib persisten:

- `/app/data`

Karena di situlah SQLite disimpan.

Kalau volume hilang, data aplikasi ikut hilang.

## Rekomendasi release

Untuk produksi, jangan hanya andalkan `latest`.

Pola yang lebih rapi:

1. merge ke `main`
2. workflow publish image
3. buat tag release, mis. `v1.0.0`
4. deploy image bertag itu di VPS

Contoh:

```yaml
image: ghcr.io/aantriono82/penilaian-backend:v1.0.0
```

dan:

```yaml
image: ghcr.io/aantriono82/penilaian-frontend:v1.0.0
```

Ini lebih aman untuk rollback.

## Catatan operasional

- SQLite cocok untuk beban ringan sampai menengah, tapi tetap sensitif terhadap disk dan backup
- backup file database secara terjadwal
- jangan taruh `.env` ke image
- jangan menyimpan database di layer container
- pastikan reverse proxy / firewall mengizinkan port web yang Anda pakai

