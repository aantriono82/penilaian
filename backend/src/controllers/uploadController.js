import { v4 as uuidv4 } from 'uuid';
import { db } from '../db/init.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STORAGE_DIR = path.join(__dirname, '../../data/storage');

// Pastikan folder storage ada
fs.mkdirSync(STORAGE_DIR, { recursive: true });

const ALLOWED_TYPES = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/gif': '.gif',
  'image/webp': '.webp',
  'image/svg+xml': '.svg'
};

const MAX_SIZE = 5 * 1024 * 1024; // 5MB

export const uploadController = {
  async uploadImage(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'Tidak ada file yang diunggah' });
      }

      const file = req.file;

      // Validate file type
      if (!ALLOWED_TYPES[file.mimetype]) {
        // Hapus file yang tidak valid
        fs.unlinkSync(file.path);
        return res.status(400).json({
          message: `Tipe file tidak didukung. Gunakan: JPG, PNG, GIF, WebP, atau SVG`
        });
      }

      // Validate file size
      if (file.size > MAX_SIZE) {
        fs.unlinkSync(file.path);
        return res.status(400).json({
          message: `Ukuran file maksimal ${MAX_SIZE / 1024 / 1024}MB`
        });
      }

      // Generate unique filename
      const ext = ALLOWED_TYPES[file.mimetype];
      const filename = `${uuidv4()}${ext}`;
      const filepath = path.join(STORAGE_DIR, filename);

      // Move file to storage
      fs.renameSync(file.path, filepath);

      // Generate URL
      const url = `/api/uploads/${filename}`;

      // Log to database
      const id = uuidv4();
      db.prepare(`
        INSERT INTO uploaded_files (id, user_id, filename, original_name, mime_type, size, url)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(id, req.user.id, filename, file.originalname, file.mimetype, file.size, url);

      res.json({
        data: {
          id,
          url,
          filename,
          originalName: file.originalname,
          mimeType: file.mimetype,
          size: file.size
        }
      });
    } catch (err) {
      console.error('Upload error:', err);
      // Cleanup if file exists
      if (req.file?.path && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      res.status(500).json({ message: 'Gagal mengunggah file: ' + err.message });
    }
  },

  deleteImage(req, res) {
    const { id } = req.params;

    const file = db.prepare('SELECT * FROM uploaded_files WHERE id = ? AND user_id = ?')
      .get(id, req.user.id);

    if (!file) {
      return res.status(404).json({ message: 'File tidak ditemukan' });
    }

    // Delete from filesystem
    const filepath = path.join(STORAGE_DIR, file.filename);
    if (fs.existsSync(filepath)) {
      fs.unlinkSync(filepath);
    }

    // Delete from database
    db.prepare('DELETE FROM uploaded_files WHERE id = ?').run(id);

    res.json({ message: 'File dihapus' });
  },

  getUserFiles(req, res) {
    const files = db.prepare(`
      SELECT * FROM uploaded_files WHERE user_id = ? ORDER BY created_at DESC LIMIT 100
    `).all(req.user.id);

    res.json({ data: files });
  }
};
