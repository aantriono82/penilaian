import Database from 'better-sqlite3';
import { mkdirSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, '../../.env') });
const DB_PATH = process.env.DB_PATH || './data/atiga-asesmen.db';

mkdirSync(dirname(DB_PATH), { recursive: true });

export const db = new Database(DB_PATH);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function initDB() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'guru' CHECK(role IN ('admin', 'guru')),
      is_active INTEGER NOT NULL DEFAULT 1,
      lembaga TEXT,
      avatar_url TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS app_config (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      key TEXT NOT NULL,
      value TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(user_id, key)
    );

    CREATE TABLE IF NOT EXISTS ai_models (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      model_id TEXT NOT NULL,
      provider TEXT NOT NULL DEFAULT 'openrouter',
      is_default INTEGER NOT NULL DEFAULT 0,
      max_tokens INTEGER NOT NULL DEFAULT 4096,
      temperature REAL NOT NULL DEFAULT 0.7,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS prompt_templates (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      jenis_soal TEXT NOT NULL,
      template TEXT NOT NULL,
      is_default INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS bank_soal (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      nama TEXT NOT NULL,
      mata_pelajaran TEXT NOT NULL,
      jenjang TEXT,
      kelas TEXT,
      semester TEXT,
      tahun_ajaran TEXT,
      deskripsi TEXT,
      tags TEXT DEFAULT '[]',
      total_soal INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS stimulus (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      bank_soal_id TEXT NOT NULL,
      judul TEXT,
      konten TEXT NOT NULL,
      tipe_sumber TEXT NOT NULL CHECK(tipe_sumber IN ('generated','uploaded')),
      nama_file_asli TEXT,
      created_by TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (bank_soal_id) REFERENCES bank_soal(id) ON DELETE CASCADE,
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS soal (
      id TEXT PRIMARY KEY,
      bank_soal_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      stimulus_id INTEGER,
      bab TEXT NOT NULL,
      materi TEXT NOT NULL,
      jenis TEXT NOT NULL CHECK(jenis IN ('pg', 'pgk', 'essay', 'isian', 'benar_salah', 'menjodohkan')),
      stimulus_type TEXT NOT NULL DEFAULT 'none' CHECK(stimulus_type IN ('none', 'text', 'image', 'table', 'diagram', 'graph')),
      stimulus_content TEXT,
      pertanyaan TEXT NOT NULL,
      tingkat_kesulitan TEXT NOT NULL DEFAULT 'sedang' CHECK(tingkat_kesulitan IN ('mudah', 'sedang', 'sulit')),
      skor INTEGER NOT NULL DEFAULT 10,
      pembahasan TEXT,
      tags TEXT DEFAULT '[]',
      nomor_urut INTEGER,
      is_verified INTEGER NOT NULL DEFAULT 0,
      image_url TEXT,
      image_prompt TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (bank_soal_id) REFERENCES bank_soal(id) ON DELETE CASCADE,
      FOREIGN KEY (stimulus_id) REFERENCES stimulus(id) ON DELETE SET NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS opsi_jawaban (
      id TEXT PRIMARY KEY,
      soal_id TEXT NOT NULL,
      label TEXT NOT NULL,
      teks TEXT NOT NULL,
      is_benar INTEGER NOT NULL DEFAULT 0,
      urutan INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (soal_id) REFERENCES soal(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS generate_history (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      bank_soal_id TEXT NOT NULL,
      model_id TEXT NOT NULL,
      model_name TEXT NOT NULL,
      prompt_tokens INTEGER DEFAULT 0,
      completion_tokens INTEGER DEFAULT 0,
      total_soal_diminta INTEGER NOT NULL,
      total_soal_berhasil INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'processing', 'done', 'failed')),
      error_message TEXT,
      config_snapshot TEXT,
      duration_ms INTEGER,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (bank_soal_id) REFERENCES bank_soal(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS export_layouts (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'ujian' CHECK(type IN ('ujian', 'uts', 'uas', 'kuis', 'pr', 'custom')),
      config TEXT NOT NULL DEFAULT '{}',
      is_default INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_bank_soal_user ON bank_soal(user_id);
    CREATE INDEX IF NOT EXISTS idx_soal_bank ON soal(bank_soal_id);
    CREATE INDEX IF NOT EXISTS idx_soal_user ON soal(user_id);
    CREATE INDEX IF NOT EXISTS idx_soal_jenis ON soal(jenis);
    CREATE INDEX IF NOT EXISTS idx_stimulus_bank ON stimulus(bank_soal_id);
    CREATE INDEX IF NOT EXISTS idx_generate_history_user ON generate_history(user_id);
    CREATE INDEX IF NOT EXISTS idx_opsi_soal ON opsi_jawaban(soal_id);
  `);

  // Migration: tambah kolom image jika belum ada (untuk DB yang sudah ada)
  try {
    db.exec(`ALTER TABLE soal ADD COLUMN image_url TEXT`);
    console.log('✅ Migration: added image_url column');
  } catch {}
  try {
    db.exec(`ALTER TABLE soal ADD COLUMN image_prompt TEXT`);
    console.log('✅ Migration: added image_prompt column');
  } catch {}
  try {
    db.exec(`ALTER TABLE soal ADD COLUMN stimulus_type TEXT NOT NULL DEFAULT 'none' CHECK(stimulus_type IN ('none', 'text', 'image', 'table', 'diagram', 'graph'))`);
    console.log('✅ Migration: added stimulus_type column');
  } catch {}
  try {
    db.exec(`ALTER TABLE soal ADD COLUMN stimulus_content TEXT`);
    console.log('✅ Migration: added stimulus_content column');
  } catch {}
  try {
    db.exec(`ALTER TABLE soal ADD COLUMN stimulus_id INTEGER`);
    console.log('✅ Migration: added stimulus_id column');
  } catch {}

  try {
    db.exec(`CREATE INDEX IF NOT EXISTS idx_soal_stimulus ON soal(stimulus_id)`);
    console.log('✅ Index: idx_soal_stimulus ready');
  } catch {}

  // Create uploaded_files table for file upload tracking
  db.exec(`
    CREATE TABLE IF NOT EXISTS uploaded_files (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      filename TEXT NOT NULL,
      original_name TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      size INTEGER NOT NULL,
      storage_provider TEXT NOT NULL DEFAULT 'local',
      storage_key TEXT,
      url TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_uploaded_files_user ON uploaded_files(user_id);
  `);
  try {
    db.exec(`ALTER TABLE uploaded_files ADD COLUMN storage_provider TEXT NOT NULL DEFAULT 'local'`);
    console.log('✅ Migration: added uploaded_files.storage_provider column');
  } catch {}
  try {
    db.exec(`ALTER TABLE uploaded_files ADD COLUMN storage_key TEXT`);
    console.log('✅ Migration: added uploaded_files.storage_key column');
  } catch {}

  console.log('✅ Database schema initialized');
}

initDB();
