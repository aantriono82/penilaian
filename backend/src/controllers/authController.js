import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../db/init.js';

function generateToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

export const authController = {
  async register(req, res) {
    try {
      const { name, email, password, lembaga } = req.body;
      if (!name || !email || !password) {
        return res.status(400).json({ message: 'Name, email, dan password wajib diisi' });
      }

      const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
      if (existing) return res.status(409).json({ message: 'Email sudah terdaftar' });

      // Cek apakah ini user pertama (jadikan admin)
      const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get();
      const role = userCount.count === 0 ? 'admin' : 'guru';

      const passwordHash = await bcrypt.hash(password, 12);
      const id = uuidv4();

      db.prepare(`
        INSERT INTO users (id, name, email, password_hash, role, lembaga)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(id, name, email, passwordHash, role, lembaga || null);

      const user = db.prepare('SELECT id, name, email, role, lembaga FROM users WHERE id = ?').get(id);
      const token = generateToken(user);

      res.status(201).json({ token, user });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Gagal register' });
    }
  },

  async login(req, res) {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ message: 'Email dan password wajib diisi' });
      }

      const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
      if (!user) return res.status(401).json({ message: 'Email atau password salah' });
      if (!user.is_active) return res.status(401).json({ message: 'Akun dinonaktifkan' });

      const valid = await bcrypt.compare(password, user.password_hash);
      if (!valid) return res.status(401).json({ message: 'Email atau password salah' });

      const token = generateToken(user);
      const { password_hash, ...userSafe } = user;

      res.json({ token, user: userSafe });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Gagal login' });
    }
  },

  async me(req, res) {
    res.json({ user: req.user });
  },

  async updateProfile(req, res) {
    try {
      const { name, lembaga } = req.body;
      db.prepare(`
        UPDATE users SET name = ?, lembaga = ?, updated_at = datetime('now') WHERE id = ?
      `).run(name || req.user.name, lembaga || null, req.user.id);

      const updated = db.prepare('SELECT id, name, email, role, lembaga FROM users WHERE id = ?').get(req.user.id);
      res.json({ user: updated });
    } catch (err) {
      res.status(500).json({ message: 'Gagal update profil' });
    }
  },

  async changePassword(req, res) {
    try {
      const { oldPassword, newPassword } = req.body;
      const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
      const valid = await bcrypt.compare(oldPassword, user.password_hash);
      if (!valid) return res.status(400).json({ message: 'Password lama salah' });

      const hash = await bcrypt.hash(newPassword, 12);
      db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, req.user.id);
      res.json({ message: 'Password berhasil diubah' });
    } catch (err) {
      res.status(500).json({ message: 'Gagal ubah password' });
    }
  }
};
