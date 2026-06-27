import fs from 'fs';
import path from 'path';
import multer from 'multer';
import { fileURLToPath } from 'url';
import pdfParse from 'pdf-parse/lib/pdf-parse.js';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../db/init.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOAD_DIR = path.join(__dirname, '../../uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const ALLOWED_EXTENSIONS = new Set(['.txt', '.md', '.pdf']);
const ALLOWED_MIME_TYPES = new Set([
  'text/plain',
  'text/markdown',
  'application/pdf',
  'application/octet-stream'
]);

export const stimulusUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOAD_DIR),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
    }
  }),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ALLOWED_EXTENSIONS.has(ext) || ALLOWED_MIME_TYPES.has(file.mimetype)) {
      cb(null, true);
      return;
    }
    cb(new Error('Tipe file stimulus tidak didukung'), false);
  }
});

function cleanText(text = '') {
  return String(text)
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function truncateTitle(text = '', max = 120) {
  const value = cleanText(text);
  if (!value) return null;
  return value.length > max ? `${value.slice(0, max).trim()}...` : value;
}

async function getOpenRouterStimulus(apiKey, modelId, prompt) {
  const openRouterBaseUrl = process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1';
  const openRouterReferer = process.env.OPENROUTER_HTTP_REFERER || process.env.FRONTEND_URL || 'http://localhost:5173';
  const openRouterTitle = process.env.OPENROUTER_X_TITLE || 'Atiga Asesmen';

  const response = await fetch(`${openRouterBaseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': openRouterReferer,
      'X-Title': openRouterTitle
    },
    body: JSON.stringify({
      model: modelId,
      max_tokens: 900,
      temperature: 0.7,
      stream: false,
      messages: [{ role: 'user', content: prompt }]
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`OpenRouter error: ${response.status} - ${errText}`);
  }

  const payload = await response.json();
  const content = payload.choices?.[0]?.message?.content || '';
  return cleanText(content);
}

function buildStimulusPrompt({ bank, topik, prompt }) {
  const konteks = [
    bank?.mata_pelajaran && `Mata Pelajaran: ${bank.mata_pelajaran}`,
    bank?.jenjang && `Jenjang: ${bank.jenjang}`,
    bank?.kelas && `Kelas: ${bank.kelas}`,
    bank?.nama && `Bank Soal: ${bank.nama}`
  ].filter(Boolean).join('\n');

  return `Kamu adalah guru yang menulis stimulus bacaan untuk soal asesmen.

KONTEKS:
${konteks || '-'}

TUGAS:
Buat satu stimulus bersama yang relevan untuk soal-soal berikut.
Topik/instruksi: ${prompt || topik || '-'}

ATURAN:
- Tulis dalam Bahasa Indonesia.
- Panjang stimulus 2-4 paragraf singkat.
- Isi harus faktual, jelas, dan cukup kaya untuk dipakai pada beberapa jenis soal.
- Jangan buat judul, penjelasan, bullet list, atau catatan tambahan.
- Output hanya teks stimulus final.`;
}

function insertStimulus({
  bankSoalId,
  konten,
  tipeSumber,
  createdBy,
  namaFileAsli = null,
  judul = null
}) {
  const id = db.prepare(`
    INSERT INTO stimulus (bank_soal_id, judul, konten, tipe_sumber, nama_file_asli, created_by)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(bankSoalId, judul, konten, tipeSumber, namaFileAsli, createdBy).lastInsertRowid;

  return Number(id);
}

export const stimulusController = {
  async generate(req, res) {
    try {
      const { bankSoalId, bank_soal_id, prompt, topik, model, model_id } = req.body;
      const resolvedBankId = bankSoalId || bank_soal_id;
      const resolvedModelId = model || model_id;
      const promptText = cleanText(prompt || topik || '');

      if (!resolvedBankId || !resolvedModelId || !promptText) {
        return res.status(400).json({ message: 'bankSoalId, prompt/topik, dan model wajib diisi' });
      }

      const bank = db.prepare('SELECT * FROM bank_soal WHERE id = ? AND user_id = ?').get(resolvedBankId, req.user.id);
      if (!bank) {
        return res.status(404).json({ message: 'Bank soal tidak ditemukan' });
      }

      const modelConfig = db.prepare('SELECT * FROM ai_models WHERE id = ? AND user_id = ?').get(resolvedModelId, req.user.id);
      if (!modelConfig) {
        return res.status(404).json({ message: 'Model AI tidak ditemukan' });
      }

      const apiKeyConfig = db.prepare("SELECT value FROM app_config WHERE user_id = ? AND key = 'openrouter_api_key'").get(req.user.id);
      if (!apiKeyConfig) {
        return res.status(400).json({ message: 'API Key OpenRouter belum dikonfigurasi' });
      }

      const konten = await getOpenRouterStimulus(
        apiKeyConfig.value,
        modelConfig.model_id,
        buildStimulusPrompt({ bank, topik: topik || promptText, prompt: promptText })
      );

      if (!konten) {
        return res.status(500).json({ message: 'Stimulus AI kosong' });
      }

      const id = insertStimulus({
        bankSoalId: resolvedBankId,
        konten,
        tipeSumber: 'generated',
        createdBy: req.user.id,
        judul: truncateTitle(promptText)
      });

      res.status(201).json({ id, konten });
    } catch (err) {
      console.error('Generate stimulus error:', err);
      res.status(500).json({ message: err.message || 'Gagal generate stimulus' });
    }
  },

  async upload(req, res) {
    try {
      const { bankSoalId, bank_soal_id } = req.body;
      const resolvedBankId = bankSoalId || bank_soal_id;

      if (!resolvedBankId) {
        return res.status(400).json({ message: 'bankSoalId wajib diisi' });
      }

      const bank = db.prepare('SELECT id FROM bank_soal WHERE id = ? AND user_id = ?').get(resolvedBankId, req.user.id);
      if (!bank) {
        return res.status(404).json({ message: 'Bank soal tidak ditemukan' });
      }

      if (!req.file) {
        return res.status(400).json({ message: 'File stimulus tidak ditemukan' });
      }

      const ext = path.extname(req.file.originalname).toLowerCase();
      if (!ALLOWED_EXTENSIONS.has(ext)) {
        fs.existsSync(req.file.path) && fs.unlinkSync(req.file.path);
        return res.status(400).json({ message: 'Gunakan file .txt, .md, atau .pdf' });
      }

      let konten = '';
      if (ext === '.pdf' || req.file.mimetype === 'application/pdf') {
        const buffer = fs.readFileSync(req.file.path);
        const parsed = await pdfParse(buffer);
        konten = cleanText(parsed.text);
      } else {
        konten = cleanText(fs.readFileSync(req.file.path, 'utf8'));
      }

      if (!konten) {
        return res.status(400).json({ message: 'Isi file stimulus kosong atau tidak dapat dibaca' });
      }

      const id = insertStimulus({
        bankSoalId: resolvedBankId,
        konten,
        tipeSumber: 'uploaded',
        createdBy: req.user.id,
        namaFileAsli: req.file.originalname,
        judul: truncateTitle(path.basename(req.file.originalname, ext))
      });

      res.status(201).json({ id, konten });
    } catch (err) {
      console.error('Upload stimulus error:', err);
      if (req.file?.path && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      res.status(500).json({ message: err.message || 'Gagal upload stimulus' });
    }
  },

  async update(req, res) {
    try {
      const { id } = req.params;
      const { konten, judul } = req.body;
      const row = db.prepare(`
        SELECT s.* FROM stimulus s
        INNER JOIN bank_soal b ON b.id = s.bank_soal_id
        WHERE s.id = ? AND b.user_id = ?
      `).get(id, req.user.id);

      if (!row) {
        return res.status(404).json({ message: 'Stimulus tidak ditemukan' });
      }

      const nextKonten = cleanText(konten || '');
      if (!nextKonten) {
        return res.status(400).json({ message: 'Konten stimulus tidak boleh kosong' });
      }

      db.prepare(`
        UPDATE stimulus
        SET konten = ?, judul = ?
        WHERE id = ?
      `).run(nextKonten, judul === undefined ? row.judul : truncateTitle(judul), id);

      res.json({ id: Number(id), konten: nextKonten });
    } catch (err) {
      console.error('Update stimulus error:', err);
      res.status(500).json({ message: err.message || 'Gagal memperbarui stimulus' });
    }
  }
};
