# Atiga Asesmen — AI Question Generator

Aplikasi berbasis web untuk generate soal ujian menggunakan AI (OpenRouter), berbasis Vue 3 + Express + SQLite.

---

## ✨ Fitur Utama

- 🤖 **Generate soal dengan AI** via OpenRouter (banyak model gratis)
- 📚 **6 jenis soal**: Pilihan Ganda, PGK, Benar/Salah, Isian Singkat, Essay, Menjodohkan
- 🌊 **Streaming real-time** — lihat soal dibuat token per token
- 💾 **Simpan ke database** SQLite — tidak perlu server database eksternal
- ✏️ **Edit soal** secara manual setelah generate
- 🧩 **Stimulus per soal**: teks, gambar, tabel, diagram, dan grafik
- 📤 **Export ke DOCX** (Microsoft Word) dan PDF via print browser
- 👥 **Multi-user** dengan role Admin & Guru
- 🔧 **Konfigurasi fleksibel**: tambah/hapus model AI, custom prompt template
- 📊 **Dashboard & statistik** penggunaan
- 🔄 **Duplikat bank soal** dengan sekali klik
- 🏷️ **Filter & pagination** soal

---

## 🚀 Cara Menjalankan

### Prasyarat
- Node.js v18+ atau Bun
- npm

### 1. Clone & Install

```bash
git clone <repo-url>
cd atiga-asesmen
npm run install:all
```

### 2. Setup Backend

```bash
cd backend
cp .env.example .env
# Edit .env — minimal isi JWT_SECRET
```

Isi `.env`:
```
PORT=3003
JWT_SECRET=isi_dengan_string_acak_panjang_minimal_32_karakter
JWT_EXPIRES_IN=7d
DB_PATH=./data/atiga-asesmen.db
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
OPENROUTER_HTTP_REFERER=http://localhost:5173
OPENROUTER_X_TITLE=Atiga Asesmen
FILE_STORAGE_DRIVER=local
```

Opsional untuk penyimpanan aset stimulus via RustFS (S3-compatible):
```env
FILE_STORAGE_DRIVER=rustfs
RUSTFS_ENDPOINT=http://localhost:9000
RUSTFS_REGION=auto
RUSTFS_ACCESS_KEY_ID=your-access-key
RUSTFS_SECRET_ACCESS_KEY=your-secret-key
RUSTFS_BUCKET=atiga-stimuli
RUSTFS_PUBLIC_BASE_URL=http://localhost:9000/atiga-stimuli
```

Opsional untuk frontend dev, jika backend Anda jalan di host/port lain:
```env
VITE_DEV_API_TARGET=http://localhost:3002
```

### 3. Jalankan Development

```bash
# Di root folder — jalankan backend + frontend sekaligus
npm run dev
```

Atau manual:
```bash
# Terminal 1
npm run dev:backend   # http://localhost:3002

# Terminal 2
npm run dev:frontend  # http://localhost:5173
```

### 4. Akses Aplikasi

Buka `http://localhost:5173`

**User pertama yang register otomatis menjadi Admin.**

---

## ⚙️ Setup Awal di Aplikasi

1. **Register** akun pertama (otomatis admin)
2. **Konfigurasi** → masukkan **OpenRouter API Key** (gratis di openrouter.ai/keys)
3. **Konfigurasi** → tambah model AI (klik "Muat Daftar Model" untuk browse)
4. **Generate Soal** → buat bank soal, isi data, pilih model, klik Generate!

Catatan: generator AI mendukung stimulus `text`, `image`, `table`, `diagram`, dan `graph`. Untuk stimulus visual, output disimpan sebagai HTML yang dapat dirender langsung, dan diagram/grafik inline SVG akan ikut diproses saat export DOCX.

---

## 🌐 Deploy ke VPS / Hosting

Untuk deployment yang lebih rapi per-platform, lihat juga:

- [Panduan Cloudflare Pages](docs/cloudflare-pages.md)
- [Checklist Deploy Backend](docs/backend-deploy-checklist.md)
- [Panduan GHCR untuk Arcane Docker VPS](docs/ghcr-arcane-vps.md)

### Build Frontend

```bash
npm run build
# Output: frontend/dist/
```

### Setup dengan PM2

```bash
npm install -g pm2
cd backend
pm2 start src/index.js --name atiga-asesmen-api
```

### Nginx Config (contoh)

```nginx
server {
    listen 80;
    server_name domain-anda.com;

    # Frontend static
    location / {
        root /path/to/atiga-asesmen/frontend/dist;
        try_files $uri $uri/ /index.html;
    }

    # Backend API proxy
    location /api {
        proxy_pass http://localhost:3002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        # Penting untuk SSE streaming
        proxy_buffering off;
        proxy_read_timeout 300s;
    }
}
```

### Environment Production

```env
PORT=3002
JWT_SECRET=GANTI_DENGAN_RANDOM_STRING_YANG_SANGAT_KUAT
NODE_ENV=production
FRONTEND_URL=https://domain-anda.com
DB_PATH=/var/data/atiga-asesmen.db
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
OPENROUTER_HTTP_REFERER=https://domain-anda.com
OPENROUTER_X_TITLE=Atiga Asesmen
```

---

## 📁 Struktur Project

```
atiga-asesmen/
├── backend/
│   ├── src/
│   │   ├── controllers/     # Logic handler
│   │   │   ├── authController.js
│   │   │   ├── bankSoalController.js
│   │   │   ├── soalController.js
│   │   │   ├── generateController.js  # AI + SSE streaming
│   │   │   ├── configController.js
│   │   │   └── adminController.js
│   │   ├── db/
│   │   │   └── init.js       # Schema SQLite
│   │   ├── middleware/
│   │   │   └── auth.js       # JWT middleware
│   │   ├── routes/
│   │   │   └── index.js      # Semua routes
│   │   └── index.js          # Express entry point
│   ├── .env.example
│   └── package.json
│
└── frontend/
    ├── src/
    │   ├── views/
    │   │   ├── LoginView.vue
    │   │   ├── RegisterView.vue
    │   │   ├── DashboardView.vue
    │   │   ├── BankSoalView.vue
    │   │   ├── BankSoalDetailView.vue
    │   │   ├── GenerateView.vue        # Core: AI generate + SSE
    │   │   ├── SoalEditView.vue
    │   │   ├── ExportView.vue          # Export DOCX + PDF preview
    │   │   ├── ConfigView.vue          # API key, model AI, templates
    │   │   ├── HistoryView.vue
    │   │   ├── AdminView.vue
    │   │   └── ProfileView.vue
    │   ├── components/layout/
    │   │   └── AppLayout.vue           # Sidebar + topbar
    │   ├── stores/
    │   │   ├── auth.js                 # Pinia auth store
    │   │   └── bankSoal.js
    │   ├── router/index.js
    │   └── utils/api.js                # Axios instance
    └── package.json
```

---

## 🔗 API Endpoints

| Method | Path | Deskripsi |
|--------|------|-----------|
| POST | /api/auth/register | Register user |
| POST | /api/auth/login | Login |
| GET | /api/bank-soal | List bank soal |
| POST | /api/bank-soal | Buat bank soal |
| GET | /api/bank-soal/:id/soal | List soal di bank |
| POST | /api/generate | **Generate soal AI (SSE streaming)** |
| GET | /api/config/models | List model AI |
| GET | /api/admin/users | Admin: list user |

---

## 📝 Jenis Soal yang Didukung

| Kode | Nama | Deskripsi |
|------|------|-----------|
| `pg` | Pilihan Ganda | 1 jawaban benar, 3-5 opsi |
| `pgk` | PG Kompleks | Bisa >1 jawaban benar |
| `benar_salah` | Benar/Salah | Pernyataan B/S |
| `isian` | Isian Singkat | Jawab singkat dengan kunci |
| `essay` | Essay/Uraian | Jawaban panjang |
| `menjodohkan` | Menjodohkan | Pasangkan kolom A-B |

---

## 🛟 Troubleshooting

**Generate gagal / respons AI tidak valid?**
- Coba model yang berbeda (beberapa model gratis kadang tidak stabil)
- Kurangi jumlah soal per generate (maksimal 10-15 untuk kualitas terbaik)
- Pastikan API key OpenRouter masih valid

**SSE streaming tidak muncul di Nginx?**
- Pastikan konfigurasi `proxy_buffering off` sudah ada
- Tambahkan header: `proxy_set_header X-Accel-Buffering no`

**Database error?**
- Pastikan folder `backend/data/` ada dan writable
- Cek permission file: `chmod 755 backend/data`

---

## 🔄 CI

Repo ini sekarang punya workflow GitHub Actions di [.github/workflows/ci.yml](.github/workflows/ci.yml) dengan dua job:

- build frontend (`frontend/npm run build`)
- smoke test backend (`npm ci`, `node --check`, lalu cek `GET /health`)
