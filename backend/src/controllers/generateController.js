import { v4 as uuidv4 } from 'uuid';
import { db } from '../db/init.js';
import { shouldGenerateImage } from '../utils/imageGen.js';
import { normalizeStimulus } from '../utils/stimulus.js';

const VALID_JENIS = ['pg', 'pgk', 'essay', 'isian', 'benar_salah', 'menjodohkan'];
const VALID_GENERATE_STIMULUS_TYPES = ['text', 'image', 'table', 'diagram', 'graph'];

function normalizeJenisSoalList(jenisSoal, jumlah, jenisSoalList = []) {
  if (Array.isArray(jenisSoalList) && jenisSoalList.length > 0) {
    return jenisSoalList
      .map(item => ({
        jenis: item?.jenis,
        jumlah: Number(item?.jumlah || 0)
      }))
      .filter(item => VALID_JENIS.includes(item.jenis) && item.jumlah > 0);
  }

  if (VALID_JENIS.includes(jenisSoal)) {
    return [{ jenis: jenisSoal, jumlah: Number(jumlah || 0) || 1 }];
  }

  return [];
}

// =====================
// PROMPT BUILDER
// =====================
function buildPrompt(config) {
  const {
    mata_pelajaran, bab, materi, jenis_soal_list, jumlah, tingkat_kesulitan,
    jumlah_opsi, generate_pembahasan, kelas, jenjang, bahasa = 'Indonesia',
    stimulus_policy = 'optional', stimulus_types = [], stimulus_instruction = '',
    shared_stimulus = null
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

  const komposisi = jenis_soal_list
    .map(item => `- ${jenisLabel[item.jenis] || item.jenis}: ${item.jumlah} soal`)
    .join('\n');

  const formatPetunjuk = [
    jenis_soal_list.some(item => item.jenis === 'pg') &&
      `- Untuk PG: setiap soal wajib memiliki ${jumlah_opsi || 4} opsi jawaban berlabel A, B, C${jumlah_opsi >= 4 ? ', D' : ''}${jumlah_opsi >= 5 ? ', E' : ''} dan tepat 1 jawaban benar.`,
    jenis_soal_list.some(item => item.jenis === 'pgk') &&
      `- Untuk PGK: setiap soal wajib memiliki ${jumlah_opsi || 4} opsi jawaban berlabel A, B, C${jumlah_opsi >= 4 ? ', D' : ''}${jumlah_opsi >= 5 ? ', E' : ''} dan boleh memiliki 1-3 jawaban benar.`,
    jenis_soal_list.some(item => item.jenis === 'benar_salah') &&
      '- Untuk Benar/Salah: setiap soal berupa pernyataan dan opsi wajib hanya "Benar" dan "Salah".',
    jenis_soal_list.some(item => item.jenis === 'isian') &&
      '- Untuk Isian: berikan kunci_jawaban singkat, spesifik, dan langsung.',
    jenis_soal_list.some(item => item.jenis === 'essay') &&
      '- Untuk Essay: berikan kunci_jawaban dalam bentuk poin jawaban inti atau rubrik ringkas.',
    jenis_soal_list.some(item => item.jenis === 'menjodohkan') &&
      '- Untuk Menjodohkan: tulis pasangan item langsung di pertanyaan dengan format kolom/pasangan yang jelas, lalu isi kunci_jawaban dengan pasangan yang benar.'
  ].filter(Boolean).join('\n');

  const stimulusTypeLabels = {
    text: 'stimulus teks/wacana',
    image: 'stimulus gambar/ilustrasi',
    table: 'stimulus tabel',
    diagram: 'stimulus diagram',
    graph: 'stimulus grafik'
  };
  const preferredStimulus = stimulus_types
    .filter(type => VALID_GENERATE_STIMULUS_TYPES.includes(type))
    .map(type => stimulusTypeLabels[type] || type);
  const stimulusRule = stimulus_policy === 'required'
    ? `Setiap soal wajib memiliki stimulus. Gunakan hanya tipe stimulus berikut bila relevan: ${preferredStimulus.join(' dan ') || 'stimulus teks, gambar, tabel, diagram, atau grafik'}.`
    : stimulus_policy === 'optional'
      ? `Bila membantu kualitas soal, kamu boleh menambahkan stimulus. Prioritaskan ${preferredStimulus.join(' atau ') || 'stimulus teks, gambar, tabel, diagram, atau grafik'}.`
      : 'Jangan gunakan stimulus kecuali benar-benar diperlukan oleh struktur soal.';
  const stimulusInstructionBlock = stimulus_instruction
    ? `Arahan stimulus tambahan: ${stimulus_instruction}`
    : null;
  const sharedStimulusBlock = shared_stimulus
    ? `\nSTIMULUS BERSAMA YANG WAJIB DIPAKAI SEMUA SOAL:\n${shared_stimulus}\n\nSemua soal di bawah harus merujuk pada stimulus bersama ini. Jangan membuat stimulus baru yang berbeda untuk masing-masing soal.`
    : '';
  const stimulusFormatGuide = `
ATURAN STIMULUS:
- Field "stimulus_type" wajib salah satu dari: none, ${VALID_GENERATE_STIMULUS_TYPES.join(', ')}
- "stimulus_content" wajib berupa HTML valid dan self-contained, tanpa markdown dan tanpa code fence
- Untuk text: gunakan <p>, <ul>, <ol>, <strong>, <em>
- Untuk table: gunakan <table>, <thead>, <tbody>, <tr>, <th>, <td>
- Untuk image, diagram, atau graph: gunakan HTML visual yang bisa langsung dirender, utamakan <figure> dengan inline <svg>; boleh memakai <img> hanya jika URL gambar publiknya benar-benar stabil
- Untuk graph: sertakan label sumbu/legenda singkat bila relevan
- Bila tidak ada stimulus, isi "stimulus_type" = "none" dan "stimulus_content" = ""`;

  return `Kamu adalah guru berpengalaman yang ahli membuat soal berkualitas tinggi.

KONTEKS SOAL:
${konteks}

TUGAS:
Buat total ${jumlah} soal dengan komposisi jenis berikut:
${komposisi}

Semua soal harus menggunakan ${difficultyDesc[tingkat_kesulitan] || 'tingkat sedang'}.
${formatPetunjuk}
${stimulusRule}
${sharedStimulusBlock}
${stimulusInstructionBlock || ''}
${stimulusFormatGuide}
${generate_pembahasan ? 'Sertakan pembahasan singkat dan jelas untuk setiap soal.' : 'Jangan sertakan pembahasan.'}

ATURAN PENTING:
- Soal harus kontekstual, relevan, dan tidak ambigu
- Bahasa yang digunakan: Bahasa ${bahasa}
- Hindari soal yang trivial atau terlalu mudah ditebak
- Pastikan jumlah soal per jenis persis mengikuti komposisi yang diminta
- Untuk PG/PGK: pastikan semua pengecoh (distraktor) masuk akal
- Variasikan bentuk pertanyaan agar tidak monoton
- Field "jenis" pada setiap item wajib salah satu dari: ${VALID_JENIS.join(', ')}


FORMAT OUTPUT (wajib JSON murni, tidak ada teks di luar JSON):
{
  "soal": [
    {
      "pertanyaan": "teks pertanyaan",
      "jenis": "pg | pgk | benar_salah | isian | essay | menjodohkan",
      "stimulus_type": "none | text | image | table | diagram | graph",
      "stimulus_content": "HTML stimulus opsional. Untuk gambar/diagram/grafik, gunakan HTML visual self-contained yang bisa dirender langsung, terutama inline <svg>.",
      "tingkat_kesulitan": "${tingkat_kesulitan}",
      "opsi": [{"label": "A", "teks": "...", "is_benar": false}] atau [] jika tidak relevan,
      "kunci_jawaban": "isi untuk isian/essay/menjodohkan, null jika tidak relevan",
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
      bank_soal_id, bab, materi, jenis_soal, jenis_soal_list, jumlah = 5,
      tingkat_kesulitan = 'sedang', jumlah_opsi = 4,
      generate_pembahasan = false, model_id, mata_pelajaran,
      kelas, jenjang, stimulus_policy = 'optional', stimulus_types = [], stimulus_instruction = '',
      stimulusId
    } = req.body;

    const normalizedJenisList = normalizeJenisSoalList(jenis_soal, jumlah, jenis_soal_list);
    const totalJumlah = normalizedJenisList.reduce((sum, item) => sum + item.jumlah, 0);

    if (!bank_soal_id || !bab || !materi || normalizedJenisList.length === 0 || !model_id) {
      return res.status(400).json({ message: 'Field bank_soal_id, bab, materi, jenis soal, model_id wajib diisi' });
    }

    const bank = db.prepare('SELECT * FROM bank_soal WHERE id = ? AND user_id = ?').get(bank_soal_id, req.user.id);
    if (!bank) return res.status(404).json({ message: 'Bank soal tidak ditemukan' });

    const modelConfig = db.prepare('SELECT * FROM ai_models WHERE id = ? AND user_id = ?').get(model_id, req.user.id);
    if (!modelConfig) return res.status(404).json({ message: 'Model AI tidak ditemukan' });

    const apiKeyConfig = db.prepare("SELECT value FROM app_config WHERE user_id = ? AND key = 'openrouter_api_key'").get(req.user.id);
    if (!apiKeyConfig) return res.status(400).json({ message: 'API Key OpenRouter belum dikonfigurasi' });

    let sharedStimulus = null;
    if (stimulusId) {
      sharedStimulus = db.prepare(`
        SELECT s.* FROM stimulus s
        INNER JOIN bank_soal b ON b.id = s.bank_soal_id
        WHERE s.id = ? AND s.bank_soal_id = ? AND b.user_id = ?
      `).get(stimulusId, bank_soal_id, req.user.id);

      if (!sharedStimulus) {
        return res.status(404).json({ message: 'Stimulus tidak ditemukan' });
      }
    }

    const historyId = uuidv4();
    db.prepare(`
      INSERT INTO generate_history (id, user_id, bank_soal_id, model_id, model_name, total_soal_diminta, status, config_snapshot)
      VALUES (?, ?, ?, ?, ?, ?, 'processing', ?)
    `).run(historyId, req.user.id, bank_soal_id, model_id, modelConfig.name, totalJumlah,
      JSON.stringify({ bab, materi, jenis_soal, jenis_soal_list: normalizedJenisList, jumlah: totalJumlah, tingkat_kesulitan }));

    const resolvedMapel = mata_pelajaran || bank.mata_pelajaran;
    const prompt = buildPrompt({
      mata_pelajaran: resolvedMapel,
      bab, materi, jenis_soal_list: normalizedJenisList, jumlah: totalJumlah, tingkat_kesulitan, jumlah_opsi,
      generate_pembahasan, kelas: kelas || bank.kelas, jenjang: jenjang || bank.jenjang,
      stimulus_policy: ['none', 'optional', 'required'].includes(stimulus_policy) ? stimulus_policy : 'optional',
      stimulus_types: Array.isArray(stimulus_types) ? stimulus_types.filter(type => VALID_GENERATE_STIMULUS_TYPES.includes(type)) : [],
      stimulus_instruction: typeof stimulus_instruction === 'string' ? stimulus_instruction.trim() : '',
      shared_stimulus: sharedStimulus?.konten || null
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

      const openRouterBaseUrl = process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1';
      const openRouterReferer = process.env.OPENROUTER_HTTP_REFERER || process.env.FRONTEND_URL || 'http://localhost:5173';
      const openRouterTitle = process.env.OPENROUTER_X_TITLE || 'Atiga Asesmen';

      const aiResponse = await fetch(`${openRouterBaseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKeyConfig.value}`,
          'HTTP-Referer': openRouterReferer,
          'X-Title': openRouterTitle
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

      if (parsedSoal.soal.length !== totalJumlah) {
        throw new Error('Jumlah soal hasil AI tidak sesuai permintaan. Coba generate ulang.');
      }

      const actualJenisCount = parsedSoal.soal.reduce((acc, item) => {
        if (VALID_JENIS.includes(item?.jenis)) {
          acc[item.jenis] = (acc[item.jenis] || 0) + 1;
        }
        return acc;
      }, {});

      for (const item of normalizedJenisList) {
        if ((actualJenisCount[item.jenis] || 0) !== item.jumlah) {
          throw new Error(`Komposisi soal ${item.jenis} tidak sesuai permintaan. Coba generate ulang.`);
        }
      }

      // Gambar tidak di‑generate lagi – hanya menyimpan deskripsi untuk referensi user.

      // Simpan soal + generate gambar secara paralel
      const insertSoal = db.prepare(`
        INSERT INTO soal (id, bank_soal_id, user_id, stimulus_id, bab, materi, jenis, stimulus_type, stimulus_content, pertanyaan, tingkat_kesulitan, pembahasan, tags, nomor_urut, image_url, image_prompt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      const insertOpsi = db.prepare(`
        INSERT INTO opsi_jawaban (id, soal_id, label, teks, is_benar, urutan) VALUES (?, ?, ?, ?, ?, ?)
      `);
      

      const maxNomor = db.prepare('SELECT MAX(nomor_urut) as m FROM soal WHERE bank_soal_id = ?').get(bank_soal_id).m || 0;
      const savedSoals = [];
      const stimulusWarnings = [];
      const imageJobs = [];

      // Simpan semua soal dulu ke DB
      db.transaction(() => {
        parsedSoal.soal.forEach((s, idx) => {
          if (!VALID_JENIS.includes(s.jenis)) {
            throw new Error(`Jenis soal tidak valid pada hasil AI: ${s.jenis}`);
          }

          const soalId = uuidv4();
          const needImg = shouldGenerateImage(s);
          const soalJenis = s.jenis;
          const soalKesulitan = s.tingkat_kesulitan || tingkat_kesulitan;

          const normalizedStimulus = normalizeStimulus(s.stimulus_type, s.stimulus_content, { mode: 'generate' });
          if (normalizedStimulus.warnings.length) {
            stimulusWarnings.push({
              index: idx + 1,
              requested_type: s.stimulus_type || 'none',
              normalized_type: normalizedStimulus.stimulus_type,
              messages: normalizedStimulus.warnings
            });
          }

          insertSoal.run(
            soalId, bank_soal_id, req.user.id, sharedStimulus?.id || null, bab, materi, soalJenis,
            sharedStimulus ? 'text' : (VALID_GENERATE_STIMULUS_TYPES.includes(normalizedStimulus.stimulus_type) ? normalizedStimulus.stimulus_type : 'none'),
            sharedStimulus ? sharedStimulus.konten : normalizedStimulus.stimulus_content,
            s.pertanyaan, soalKesulitan, s.pembahasan || null,
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
            stimulus_id: sharedStimulus?.id || null,
            stimulus_type: sharedStimulus ? 'text' : (VALID_GENERATE_STIMULUS_TYPES.includes(normalizedStimulus.stimulus_type) ? normalizedStimulus.stimulus_type : 'none'),
            stimulus_content: sharedStimulus ? sharedStimulus.konten : normalizedStimulus.stimulus_content,
            pertanyaan: s.pertanyaan,
            jenis: soalJenis,
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
        stimulus_warnings: stimulusWarnings,
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
