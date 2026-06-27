import { v4 as uuidv4 } from 'uuid';
import { db } from '../db/init.js';

export const bankSoalController = {
  getAll(req, res) {
    const { search, mapel, jenjang } = req.query;
    let query = `
      SELECT b.*, u.name as creator_name,
        (SELECT COUNT(*) FROM soal s WHERE s.bank_soal_id = b.id) as total_soal_actual,
        (SELECT COUNT(*) FROM soal s WHERE s.bank_soal_id = b.id AND s.stimulus_content IS NOT NULL AND TRIM(s.stimulus_content) != '') as total_stimulus
      FROM bank_soal b
      JOIN users u ON u.id = b.user_id
      WHERE b.user_id = ?
    `;
    const params = [req.user.id];

    if (search) {
      const keyword = `%${search}%`;
      query += ' AND (b.nama LIKE ? OR b.mata_pelajaran LIKE ? OR b.kelas LIKE ? OR b.deskripsi LIKE ? OR b.tags LIKE ?)';
      params.push(keyword, keyword, keyword, keyword, keyword);
    }
    if (mapel) { query += ' AND b.mata_pelajaran = ?'; params.push(mapel); }
    if (jenjang) { query += ' AND b.jenjang = ?'; params.push(jenjang); }

    query += ' ORDER BY b.updated_at DESC';
    const banks = db.prepare(query).all(...params);
    res.json({ data: banks });
  },

  getOne(req, res) {
    const bank = db.prepare(`
      SELECT b.*, u.name as creator_name FROM bank_soal b
      JOIN users u ON u.id = b.user_id
      WHERE b.id = ? AND b.user_id = ?
    `).get(req.params.id, req.user.id);
    if (!bank) return res.status(404).json({ message: 'Bank soal tidak ditemukan' });
    res.json({ data: bank });
  },

  create(req, res) {
    const { nama, mata_pelajaran, jenjang, kelas, semester, tahun_ajaran, deskripsi, tags } = req.body;
    if (!nama || !mata_pelajaran) {
      return res.status(400).json({ message: 'Nama dan mata pelajaran wajib diisi' });
    }
    const id = uuidv4();
    db.prepare(`
      INSERT INTO bank_soal (id, user_id, nama, mata_pelajaran, jenjang, kelas, semester, tahun_ajaran, deskripsi, tags)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, req.user.id, nama, mata_pelajaran, jenjang, kelas, semester, tahun_ajaran, deskripsi, JSON.stringify(tags || []));

    const bank = db.prepare('SELECT * FROM bank_soal WHERE id = ?').get(id);
    res.status(201).json({ data: bank });
  },

  update(req, res) {
    const bank = db.prepare('SELECT id FROM bank_soal WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
    if (!bank) return res.status(404).json({ message: 'Bank soal tidak ditemukan' });

    const { nama, mata_pelajaran, jenjang, kelas, semester, tahun_ajaran, deskripsi, tags } = req.body;
    db.prepare(`
      UPDATE bank_soal SET nama=?, mata_pelajaran=?, jenjang=?, kelas=?, semester=?,
      tahun_ajaran=?, deskripsi=?, tags=?, updated_at=datetime('now') WHERE id=?
    `).run(nama, mata_pelajaran, jenjang, kelas, semester, tahun_ajaran, deskripsi,
      JSON.stringify(tags || []), req.params.id);

    res.json({ data: db.prepare('SELECT * FROM bank_soal WHERE id = ?').get(req.params.id) });
  },

  delete(req, res) {
    const bank = db.prepare('SELECT id FROM bank_soal WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
    if (!bank) return res.status(404).json({ message: 'Bank soal tidak ditemukan' });
    db.prepare('DELETE FROM bank_soal WHERE id = ?').run(req.params.id);
    res.json({ message: 'Bank soal dihapus' });
  },

  duplicate(req, res) {
    const original = db.prepare('SELECT * FROM bank_soal WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
    if (!original) return res.status(404).json({ message: 'Bank soal tidak ditemukan' });

    const newId = uuidv4();
    db.prepare(`
      INSERT INTO bank_soal (id, user_id, nama, mata_pelajaran, jenjang, kelas, semester, tahun_ajaran, deskripsi, tags)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(newId, req.user.id, `${original.nama} (Copy)`, original.mata_pelajaran, original.jenjang,
      original.kelas, original.semester, original.tahun_ajaran, original.deskripsi, original.tags);

    // Duplicate soal juga
    const soals = db.prepare('SELECT * FROM soal WHERE bank_soal_id = ?').all(original.id);
    const insertSoal = db.prepare(`
      INSERT INTO soal (id, bank_soal_id, user_id, bab, materi, jenis, stimulus_type, stimulus_content, pertanyaan, tingkat_kesulitan, skor, pembahasan, tags, nomor_urut, image_url, image_prompt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const insertOpsi = db.prepare(`
      INSERT INTO opsi_jawaban (id, soal_id, label, teks, is_benar, urutan) VALUES (?, ?, ?, ?, ?, ?)
    `);

    const dupMany = db.transaction(() => {
      for (const s of soals) {
        const newSoalId = uuidv4();
        insertSoal.run(
          newSoalId, newId, req.user.id, s.bab, s.materi, s.jenis,
          s.stimulus_type || 'none', s.stimulus_content || null,
          s.pertanyaan, s.tingkat_kesulitan, s.skor, s.pembahasan, s.tags,
          s.nomor_urut, s.image_url || null, s.image_prompt || null
        );
        const opsi = db.prepare('SELECT * FROM opsi_jawaban WHERE soal_id = ?').all(s.id);
        for (const o of opsi) {
          insertOpsi.run(uuidv4(), newSoalId, o.label, o.teks, o.is_benar, o.urutan);
        }
      }
    });
    dupMany();

    res.status(201).json({ data: db.prepare('SELECT * FROM bank_soal WHERE id = ?').get(newId) });
  }
};
