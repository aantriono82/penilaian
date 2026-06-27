import { v4 as uuidv4 } from 'uuid';
import { db } from '../db/init.js';
import fs from 'fs';
import { deleteStoredFile, storeUploadedFile } from '../utils/storage.js';

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

      const { filename, url, storageProvider, storageKey } = await storeUploadedFile({
        tempPath: file.path,
        mimeType: file.mimetype,
        originalName: file.originalname
      });

      // Log to database
      const id = uuidv4();
      db.prepare(`
        INSERT INTO uploaded_files (id, user_id, filename, original_name, mime_type, size, storage_provider, storage_key, url)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(id, req.user.id, filename, file.originalname, file.mimetype, file.size, storageProvider, storageKey, url);

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

  async deleteImage(req, res) {
    try {
      const { id } = req.params;

      const file = db.prepare('SELECT * FROM uploaded_files WHERE id = ? AND user_id = ?')
        .get(id, req.user.id);

      if (!file) {
        return res.status(404).json({ message: 'File tidak ditemukan' });
      }

      await deleteStoredFile(file);

      db.prepare('DELETE FROM uploaded_files WHERE id = ?').run(id);
      res.json({ message: 'File dihapus' });
    } catch (err) {
      res.status(500).json({ message: 'Gagal menghapus file: ' + err.message });
    }
  },

  getUserFiles(req, res) {
    const files = db.prepare(`
      SELECT * FROM uploaded_files WHERE user_id = ? ORDER BY created_at DESC LIMIT 100
    `).all(req.user.id);

    res.json({ data: files });
  }
};
