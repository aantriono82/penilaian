# SoalGen — AI Question Generator

Aplikasi berbasis web untuk generate soal ujian menggunakan AI (OpenRouter), berbasis Vue 3 + Express + SQLite.

---

## ✨ Fitur Utama

- 🤖 **Generate soal dengan AI** via OpenRouter (banyak model gratis)
- 📚 **6 jenis soal**: Pilihan Ganda, PGK, Benar/Salah, Isian Singkat, Essay, Menjodohkan
- 🌊 **Streaming real-time** — lihat soal dibuat token per token
- 💾 **Simpan ke database** SQLite — tidak perlu server database eksternal
- ✏️ **Edit soal** secara manual setelah generate
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
cd soal-generator
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
PORT=3001
JWT_SECRET=isi_dengan_string_acak_panjang_minimal_32_karakter
JWT_EXPIRES_IN=7d
DB_PATH=./data/soalgen.db
NODE_ENV=development
```

### 3. Jalankan Development

```bash
# Di root folder — jalankan backend + frontend sekaligus
npm run dev
```

Atau manual:
```bash
# Terminal 1
npm run dev:backend   # http://localhost:3001

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

---

## 🌐 Deploy ke VPS / Hosting

### Build Frontend

```bash
npm run build
# Output: frontend/dist/
```

### Setup dengan PM2

```bash
npm install -g pm2
cd backend
pm2 start src/index.js --name soalgen-api
```

### Nginx Config (contoh)

```nginx
server {
    listen 80;
    server_name domain-anda.com;

    # Frontend static
    location / {
        root /path/to/soal-generator/frontend/dist;
        try_files $uri $uri/ /index.html;
    }

    # Backend API proxy
    location /api {
        proxy_pass http://localhost:3001;
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
PORT=3001
JWT_SECRET=GANTI_DENGAN_RANDOM_STRING_YANG_SANGAT_KUAT
NODE_ENV=production
FRONTEND_URL=https://domain-anda.com
DB_PATH=/var/data/soalgen.db
```

---

## 📁 Struktur Project

```
soal-generator/
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
