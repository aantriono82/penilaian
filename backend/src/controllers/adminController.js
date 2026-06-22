import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import { db } from '../db/init.js';

export const adminController = {
  getUsers(req, res) {
    const users = db.prepare(`
      SELECT u.id, u.name, u.email, u.role, u.is_active, u.lembaga, u.created_at,
        (SELECT COUNT(*) FROM bank_soal b WHERE b.user_id = u.id) as total_bank,
        (SELECT COUNT(*) FROM soal s WHERE s.user_id = u.id) as total_soal
      FROM users u ORDER BY u.created_at DESC
    `).all();
    res.json({ data: users });
  },

  createUser(req, res) {
    const { name, email, password, role = 'guru', lembaga } = req.body;
    if (!name || !email || !password) return res.status(400).json({ message: 'Data tidak lengkap' });

    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) return res.status(409).json({ message: 'Email sudah terdaftar' });

    const id = uuidv4();
    const hash = bcrypt.hashSync(password, 12);
    db.prepare('INSERT INTO users (id, name, email, password_hash, role, lembaga) VALUES (?, ?, ?, ?, ?, ?)')
      .run(id, name, email, hash, role, lembaga);

    res.status(201).json({ data: db.prepare('SELECT id, name, email, role, lembaga FROM users WHERE id = ?').get(id) });
  },

  toggleUserStatus(req, res) {
    const user = db.prepare('SELECT id, is_active FROM users WHERE id = ?').get(req.params.id);
    if (!user) return res.status(404).json({ message: 'User tidak ditemukan' });
    if (req.params.id === req.user.id) return res.status(400).json({ message: 'Tidak bisa menonaktifkan diri sendiri' });

    db.prepare('UPDATE users SET is_active = ? WHERE id = ?').run(user.is_active ? 0 : 1, req.params.id);
    res.json({ message: `User ${user.is_active ? 'dinonaktifkan' : 'diaktifkan'}` });
  },

  resetPassword(req, res) {
    const { new_password } = req.body;
    if (!new_password || new_password.length < 6) return res.status(400).json({ message: 'Password minimal 6 karakter' });
    const hash = bcrypt.hashSync(new_password, 12);
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, req.params.id);
    res.json({ message: 'Password berhasil direset' });
  },

  getStats(req, res) {
    const stats = {
      total_users: db.prepare('SELECT COUNT(*) as c FROM users').get().c,
      total_bank_soal: db.prepare('SELECT COUNT(*) as c FROM bank_soal').get().c,
      total_soal: db.prepare('SELECT COUNT(*) as c FROM soal').get().c,
      total_generate: db.prepare('SELECT COUNT(*) as c FROM generate_history').get().c,
      by_jenis: db.prepare('SELECT jenis, COUNT(*) as count FROM soal GROUP BY jenis').all(),
      recent_activity: db.prepare(`
        SELECT h.created_at, u.name, b.nama as bank_nama, h.total_soal_berhasil, h.status
        FROM generate_history h
        JOIN users u ON u.id = h.user_id
        JOIN bank_soal b ON b.id = h.bank_soal_id
        ORDER BY h.created_at DESC LIMIT 10
      `).all()
    };
    res.json({ data: stats });
  }
};
