import { v4 as uuidv4 } from 'uuid';
import { db } from '../db/init.js';
import { shouldGenerateImage } from '../utils/imageGen.js';

// =====================
// PROMPT BUILDER
// =====================
function buildPrompt(config) {
  const {
    mata_pelajaran, bab, materi, jenis_soal, jumlah, tingkat_kesulitan,
    jumlah_opsi, generate_pembahasan, kelas, jenjang, bahasa = 'Indonesia'
  } = config;

  const jenisLabel = {
    pg: 'Pilihan Ganda (PG)',
    pgk: 'Pilihan Ganda Kompleks (PGK) - bisa lebih dari satu jawaban benar',
    essay: 'Essay / Uraian',
    isian: 'Isian Singkat',
    benar_salah: 'Benar / Salah',
    menjodohkan: 'Menjodohkan'
  };

  const difficultyDesc = {
    mudah: 'tingkat mudah (C1-C2 Taksonomi Bloom)',
    sedang: 'tingkat sedang (C3-C4 Taksonomi Bloom)',
    sulit: 'tingkat sulit (C5-C6 Taksonomi Bloom)'
  };

  const konteks = [
    jenjang && `Jenjang: ${jenjang}`,
    kelas && `Kelas: ${kelas}`,
    `Mata Pelajaran: ${mata_pelajaran}`,
    `BAB: ${bab}`,
    `Materi/Subbab: ${materi}`,
  ].filter(Boolean).join('\n');

  let formatPetunjuk = '';
  if (jenis_soal === 'pg' || jenis_soal === 'pgk') {
    formatPetunjuk = `Setiap soal harus memiliki ${jumlah_opsi || 4} opsi jawaban berlabel A, B, C${jumlah_opsi >= 4 ? ', D' : ''}${jumlah_opsi >= 5 ? ', E' : ''}.`;
    if (jenis_soal === 'pgk') formatPetunjuk += ' PGK bisa memiliki 1-3 jawaban benar.';
    else formatPetunjuk += ' Hanya 1 jawaban yang benar.';
  } else if (jenis_soal === 'benar_salah') {
    formatPetunjuk = 'Setiap soal adalah pernyataan, jawaban hanya "Benar" atau "Salah".';
  } else if (jenis_soal === 'menjodohkan') {
    formatPetunjuk = `Buat ${jumlah} pasang item (kolom A dan kolom B) yang harus dijodohkan.`;
  }

  return `Kamu adalah guru berpengalaman yang ahli membuat soal berkualitas tinggi.

KONTEKS SOAL:
${konteks}

TUGAS:
Buat ${jumlah} soal jenis ${jenisLabel[jenis_soal] || jenis_soal} dengan ${difficultyDesc[tingkat_kesulitan] || 'tingkat sedang'}.
${formatPetunjuk}
${generate_pembahasan ? 'Sertakan pembahasan singkat dan jelas untuk setiap soal.' : 'Jangan sertakan pembahasan.'}

ATURAN PENTING:
- Soal harus kontekstual, relevan, dan tidak ambigu
- Bahasa yang digunakan: Bahasa ${bahasa}
- Hindari soal yang trivial atau terlalu mudah ditebak
- Untuk PG/PGK: pastikan semua pengecoh (distraktor) masuk akal
- Variasikan bentuk pertanyaan agar tidak monoton


FORMAT OUTPUT (wajib JSON murni, tidak ada teks di luar JSON):
{
  "soal": [
    {
      "pertanyaan": "teks pertanyaan",
      "jenis": "${jenis_soal}",
      "tingkat_kesulitan": "${tingkat_kesulitan}",
      ${jenis_soal === 'pg' || jenis_soal === 'pgk' ? `"opsi": [{"label": "A", "teks": "...", "is_benar": false}],` : ''}
      ${jenis_soal === 'benar_salah' ? `"opsi": [{"label": "Benar", "teks": "Benar", "is_benar": true}, {"label": "Salah", "teks": "Salah", "is_benar": false}],` : ''}
      ${jenis_soal === 'isian' || jenis_soal === 'essay' ? `"kunci_jawaban": "jawaban yang benar",` : ''}
      ${generate_pembahasan ? `"pembahasan": "penjelasan jawaban",` : `"pembahasan": null,`}
      "need_image": true atau false,
      "image_prompt": "deskripsi gambar dalam bahasa Inggris jika need_image true, kosong jika false"
    }
  ]
}`;
}

// =====================
// GENERATE CONTROLLER
// =====================
export const generateController = {
  async generate(req, res) {
    const {
      bank_soal_id, bab, materi, jenis_soal, jumlah = 5,
      tingkat_kesulitan = 'sedang', jumlah_opsi = 4,
      generate_pembahasan = false, model_id, mata_pelajaran,
      kelas, jenjang
    } = req.body;

    if (!bank_soal_id || !bab || !materi || !jenis_soal || !model_id) {
      return res.status(400).json({ message: 'Field bank_soal_id, bab, materi, jenis_soal, model_id wajib diisi' });
    }

    const bank = db.prepare('SELECT * FROM bank_soal WHERE id = ? AND user_id = ?').get(bank_soal_id, req.user.id);
    if (!bank) return res.status(404).json({ message: 'Bank soal tidak ditemukan' });

    const modelConfig = db.prepare('SELECT * FROM ai_models WHERE id = ? AND user_id = ?').get(model_id, req.user.id);
    if (!modelConfig) return res.status(404).json({ message: 'Model AI tidak ditemukan' });

    const apiKeyConfig = db.prepare("SELECT value FROM app_config WHERE user_id = ? AND key = 'openrouter_api_key'").get(req.user.id);
    if (!apiKeyConfig) return res.status(400).json({ message: 'API Key OpenRouter belum dikonfigurasi' });

    const historyId = uuidv4();
    db.prepare(`
      INSERT INTO generate_history (id, user_id, bank_soal_id, model_id, model_name, total_soal_diminta, status, config_snapshot)
      VALUES (?, ?, ?, ?, ?, ?, 'processing', ?)
    `).run(historyId, req.user.id, bank_soal_id, model_id, modelConfig.name, jumlah,
      JSON.stringify({ bab, materi, jenis_soal, jumlah, tingkat_kesulitan }));

    const resolvedMapel = mata_pelajaran || bank.mata_pelajaran;
    const prompt = buildPrompt({
      mata_pelajaran: resolvedMapel,
      bab, materi, jenis_soal, jumlah, tingkat_kesulitan, jumlah_opsi,
      generate_pembahasan, kelas: kelas || bank.kelas, jenjang: jenjang || bank.jenjang
    });

    // Setup SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const sendEvent = (event, data) => {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };

    const startTime = Date.now();

    try {
      sendEvent('status', { message: 'Menghubungi AI...' });

      const aiResponse = await fetch(`${process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1'}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKeyConfig.value}`,
          'HTTP-Referer': 'https://sekulkit.app',
          'X-Title': 'SekulKit'
        },
        body: JSON.stringify({
          model: modelConfig.model_id,
          max_tokens: modelConfig.max_tokens || 4096,
          temperature: modelConfig.temperature || 0.7,
          stream: true,
          messages: [{ role: 'user', content: prompt }]
        })
      });

      if (!aiResponse.ok) {
        const errText = await aiResponse.text();
        throw new Error(`OpenRouter error: ${aiResponse.status} - ${errText}`);
      }

      sendEvent('status', { message: 'Menerima respons AI...' });

      let fullContent = '';
      const reader = aiResponse.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim();
            if (data === '[DONE]') continue;
            try {
              const parsed = JSON.parse(data);
              const delta = parsed.choices?.[0]?.delta?.content || '';
              fullContent += delta;
              if (delta) sendEvent('token', { delta });
            } catch {}
          }
        }
      }

      sendEvent('status', { message: 'Memproses soal...' });

      // Parse JSON
      let parsedSoal;
      try {
        const jsonMatch = fullContent.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error('Tidak ada JSON ditemukan');
        parsedSoal = JSON.parse(jsonMatch[0]);
      } catch {
        throw new Error('Gagal parse respons AI. Coba lagi atau gunakan model lain.');
      }

      if (!parsedSoal.soal || !Array.isArray(parsedSoal.soal)) {
        throw new Error('Format respons AI tidak valid');
      }

      // Gambar tidak di‑generate lagi – hanya menyimpan deskripsi untuk referensi user.

      // Simpan soal + generate gambar secara paralel
      const insertSoal = db.prepare(`
        INSERT INTO soal (id, bank_soal_id, user_id, bab, materi, jenis, pertanyaan, tingkat_kesulitan, pembahasan, tags, nomor_urut, image_url, image_prompt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      const insertOpsi = db.prepare(`
        INSERT INTO opsi_jawaban (id, soal_id, label, teks, is_benar, urutan) VALUES (?, ?, ?, ?, ?, ?)
      `);
      

      const maxNomor = db.prepare('SELECT MAX(nomor_urut) as m FROM soal WHERE bank_soal_id = ?').get(bank_soal_id).m || 0;
      const savedSoals = [];
      const imageJobs = [];

      // Simpan semua soal dulu ke DB
      db.transaction(() => {
        parsedSoal.soal.forEach((s, idx) => {
          const soalId = uuidv4();
          const needImg = shouldGenerateImage(s);

          insertSoal.run(
            soalId, bank_soal_id, req.user.id, bab, materi, jenis_soal,
            s.pertanyaan, tingkat_kesulitan, s.pembahasan || null,
            '[]', maxNomor + idx + 1,
            null, // image_url — diisi nanti
            needImg ? s.image_prompt : null
          );

          const opsiList = s.opsi || [];
          opsiList.forEach((o, i) => {
            insertOpsi.run(uuidv4(), soalId, o.label, o.teks, o.is_benar ? 1 : 0, i);
          });
          if (s.kunci_jawaban) {
            insertOpsi.run(uuidv4(), soalId, 'Kunci', s.kunci_jawaban, 1, 0);
          }

          if (needImg) {
            imageJobs.push({ soalId, imagePrompt: s.image_prompt });
          }

          const opsi = db.prepare('SELECT * FROM opsi_jawaban WHERE soal_id = ? ORDER BY urutan').all(soalId);
          savedSoals.push({
            id: soalId,
            pertanyaan: s.pertanyaan,
            jenis: jenis_soal,
            opsi,
            need_image: needImg,
            image_prompt: needImg ? s.image_prompt : null,
            image_url: null
          });
        });
      })();

// Image generation disabled – use placeholder image. The image_prompt is kept for user reference.
        // No async image jobs are executed.

      // Update total soal bank
      const totalSoal = db.prepare('SELECT COUNT(*) as c FROM soal WHERE bank_soal_id = ?').get(bank_soal_id).c;
      db.prepare("UPDATE bank_soal SET total_soal = ?, updated_at = datetime('now') WHERE id = ?").run(totalSoal, bank_soal_id);

      const duration = Date.now() - startTime;
      db.prepare(`UPDATE generate_history SET status='done', total_soal_berhasil=?, duration_ms=? WHERE id=?`)
        .run(savedSoals.length, duration, historyId);

      sendEvent('done', {
        message: `${savedSoals.length} soal berhasil dibuat`,
        soal: savedSoals,
        history_id: historyId,
        duration_ms: duration
      });

    } catch (err) {
      console.error('Generate error:', err);
      db.prepare("UPDATE generate_history SET status='failed', error_message=? WHERE id=?").run(err.message, historyId);
      sendEvent('error', { message: err.message || 'Terjadi kesalahan saat generate soal' });
    } finally {
      res.end();
    }
  },

  getHistory(req, res) {
    const history = db.prepare(`
      SELECT h.*, b.nama as bank_nama FROM generate_history h
      LEFT JOIN bank_soal b ON b.id = h.bank_soal_id
      WHERE h.user_id = ? ORDER BY h.created_at DESC LIMIT 50
    `).all(req.user.id);
    res.json({ data: history });
  },

  deleteHistory(req, res) {
    const { id } = req.params;
    const row = db.prepare('SELECT id FROM generate_history WHERE id = ? AND user_id = ?').get(id, req.user.id);
    if (!row) return res.status(404).json({ message: 'Riwayat tidak ditemukan' });
    db.prepare('DELETE FROM generate_history WHERE id = ?').run(id);
    res.json({ message: 'Riwayat dihapus' });
  },

  bulkDeleteHistory(req, res) {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: 'ids harus berupa array dan tidak kosong' });
    }
    // Only delete rows owned by this user
    const placeholders = ids.map(() => '?').join(',');
    const deleted = db.prepare(
      `DELETE FROM generate_history WHERE id IN (${placeholders}) AND user_id = ?`
    ).run(...ids, req.user.id);
    res.json({ message: `${deleted.changes} riwayat dihapus` });
  }
};
