import { v4 as uuidv4 } from 'uuid';
import { db } from '../db/init.js';

export const configController = {
  // APP CONFIG (key-value store per user)
  getConfig(req, res) {
    const configs = db.prepare('SELECT key, value FROM app_config WHERE user_id = ?').all(req.user.id);
    const result = {};
    configs.forEach(c => {
      // Mask API key
      result[c.key] = c.key.includes('api_key') ? '***' + c.value.slice(-4) : c.value;
    });
    res.json({ data: result });
  },

  setConfig(req, res) {
    const { key, value } = req.body;
    if (!key || value === undefined) return res.status(400).json({ message: 'Key dan value diperlukan' });

    const id = uuidv4();
    db.prepare(`
      INSERT INTO app_config (id, user_id, key, value) VALUES (?, ?, ?, ?)
      ON CONFLICT(user_id, key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')
    `).run(id, req.user.id, key, value);

    res.json({ message: 'Konfigurasi disimpan' });
  },

  // AI MODELS
  getModels(req, res) {
    const models = db.prepare('SELECT * FROM ai_models WHERE user_id = ? ORDER BY created_at DESC').all(req.user.id);
    res.json({ data: models });
  },

  createModel(req, res) {
    const { name, model_id, provider = 'openrouter', max_tokens = 4096, temperature = 0.7, notes } = req.body;
    if (!name || !model_id) return res.status(400).json({ message: 'Name dan model_id wajib diisi' });

    const id = uuidv4();
    // Set as default if first model
    const count = db.prepare('SELECT COUNT(*) as c FROM ai_models WHERE user_id = ?').get(req.user.id).c;
    const is_default = count === 0 ? 1 : 0;

    db.prepare(`
      INSERT INTO ai_models (id, user_id, name, model_id, provider, max_tokens, temperature, notes, is_default)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, req.user.id, name, model_id, provider, max_tokens, temperature, notes, is_default);

    res.status(201).json({ data: db.prepare('SELECT * FROM ai_models WHERE id = ?').get(id) });
  },

  updateModel(req, res) {
    const model = db.prepare('SELECT id FROM ai_models WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
    if (!model) return res.status(404).json({ message: 'Model tidak ditemukan' });

    const { name, model_id, max_tokens, temperature, notes } = req.body;
    db.prepare(`UPDATE ai_models SET name=?, model_id=?, max_tokens=?, temperature=?, notes=? WHERE id=?`)
      .run(name, model_id, max_tokens, temperature, notes, req.params.id);

    res.json({ data: db.prepare('SELECT * FROM ai_models WHERE id = ?').get(req.params.id) });
  },

  deleteModel(req, res) {
    const model = db.prepare('SELECT id FROM ai_models WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
    if (!model) return res.status(404).json({ message: 'Model tidak ditemukan' });
    db.prepare('DELETE FROM ai_models WHERE id = ?').run(req.params.id);
    res.json({ message: 'Model dihapus' });
  },

  setDefaultModel(req, res) {
    const model = db.prepare('SELECT id FROM ai_models WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
    if (!model) return res.status(404).json({ message: 'Model tidak ditemukan' });
    db.prepare('UPDATE ai_models SET is_default = 0 WHERE user_id = ?').run(req.user.id);
    db.prepare('UPDATE ai_models SET is_default = 1 WHERE id = ?').run(req.params.id);
    res.json({ message: 'Default model diperbarui' });
  },

  // PROMPT TEMPLATES
  getTemplates(req, res) {
    const templates = db.prepare('SELECT * FROM prompt_templates WHERE user_id = ? ORDER BY jenis_soal, name').all(req.user.id);
    res.json({ data: templates });
  },

  createTemplate(req, res) {
    const { name, jenis_soal, template } = req.body;
    if (!name || !jenis_soal || !template) return res.status(400).json({ message: 'Semua field wajib diisi' });

    const id = uuidv4();
    db.prepare('INSERT INTO prompt_templates (id, user_id, name, jenis_soal, template) VALUES (?, ?, ?, ?, ?)')
      .run(id, req.user.id, name, jenis_soal, template);
    res.status(201).json({ data: db.prepare('SELECT * FROM prompt_templates WHERE id = ?').get(id) });
  },

  updateTemplate(req, res) {
    const tmpl = db.prepare('SELECT id FROM prompt_templates WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
    if (!tmpl) return res.status(404).json({ message: 'Template tidak ditemukan' });
    const { name, jenis_soal, template } = req.body;
    db.prepare("UPDATE prompt_templates SET name=?, jenis_soal=?, template=?, updated_at=datetime('now') WHERE id=?")
      .run(name, jenis_soal, template, req.params.id);
    res.json({ data: db.prepare('SELECT * FROM prompt_templates WHERE id = ?').get(req.params.id) });
  },

  deleteTemplate(req, res) {
    const tmpl = db.prepare('SELECT id FROM prompt_templates WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
    if (!tmpl) return res.status(404).json({ message: 'Template tidak ditemukan' });
    db.prepare('DELETE FROM prompt_templates WHERE id = ?').run(req.params.id);
    res.json({ message: 'Template dihapus' });
  },

  // Test koneksi OpenRouter
  async testApiKey(req, res) {
    const apiKeyConfig = db.prepare("SELECT value FROM app_config WHERE user_id = ? AND key = 'openrouter_api_key'").get(req.user.id);
    if (!apiKeyConfig) return res.status(400).json({ message: 'API Key belum dikonfigurasi' });

    try {
      const r = await fetch('https://openrouter.ai/api/v1/models', {
        headers: { 'Authorization': `Bearer ${apiKeyConfig.value}` }
      });
      if (!r.ok) throw new Error(`Status ${r.status}`);
      const data = await r.json();
      res.json({ success: true, message: 'API Key valid', model_count: data.data?.length || 0 });
    } catch (err) {
      res.status(400).json({ success: false, message: `API Key tidak valid: ${err.message}` });
    }
  },

  // Ambil daftar model gratis dari OpenRouter
  async getOpenRouterModels(req, res) {
    const apiKeyConfig = db.prepare("SELECT value FROM app_config WHERE user_id = ? AND key = 'openrouter_api_key'").get(req.user.id);
    if (!apiKeyConfig) return res.status(400).json({ message: 'API Key belum dikonfigurasi' });

    try {
      const r = await fetch('https://openrouter.ai/api/v1/models', {
        headers: { 'Authorization': `Bearer ${apiKeyConfig.value}` }
      });
      const data = await r.json();

      // Filter & map model
      const models = (data.data || []).map(m => ({
        id: m.id,
        name: m.name,
        context_length: m.context_length,
        is_free: m.pricing?.prompt === '0',
        pricing: m.pricing
      })).sort((a, b) => (b.is_free ? 1 : 0) - (a.is_free ? 1 : 0));

      res.json({ data: models });
    } catch (err) {
      res.status(500).json({ message: 'Gagal mengambil daftar model' });
    }
  }
};
