<template>
  <div class="p-6 max-w-4xl mx-auto">
    <div class="mb-6">
      <h2 class="text-xl font-bold text-slate-900">Konfigurasi</h2>
      <p class="text-slate-500 text-sm mt-1">Atur API key, model AI, dan preferensi lainnya</p>
    </div>

    <!-- Tabs -->
    <div class="flex gap-1 bg-slate-100 p-1 rounded-xl mb-6 w-fit">
      <button v-for="tab in tabs" :key="tab.id" @click="activeTab = tab.id"
        class="px-4 py-2 rounded-lg text-sm font-medium transition-all"
        :class="activeTab === tab.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-800'">
        {{ tab.label }}
      </button>
    </div>

    <!-- Tab: API Key -->
    <div v-if="activeTab === 'api'" class="space-y-5">
      <div class="card">
        <div class="card-header"><h3 class="font-semibold text-slate-800">OpenRouter API Key</h3></div>
        <div class="card-body space-y-4">
          <p class="text-sm text-slate-600">
            Dapatkan API key gratis di <a href="https://openrouter.ai/keys" target="_blank" class="text-primary-600 underline">openrouter.ai/keys</a>.
            OpenRouter menyediakan akses ke banyak model AI, termasuk yang gratis.
          </p>
          <div>
            <label class="label">API Key</label>
            <div class="flex gap-2">
              <input v-model="apiKey" :type="showKey ? 'text' : 'password'" class="input flex-1 font-mono" placeholder="sk-or-..." />
              <button @click="showKey = !showKey" class="btn-secondary">{{ showKey ? 'Sembunyikan' : 'Tampilkan' }}</button>
            </div>
          </div>
          <div class="flex gap-3">
            <button @click="saveApiKey" class="btn-primary" :disabled="savingKey">
              {{ savingKey ? 'Menyimpan...' : 'Simpan API Key' }}
            </button>
            <button @click="testApiKey" class="btn-secondary" :disabled="testingKey">
              {{ testingKey ? 'Testing...' : '🔌 Test Koneksi' }}
            </button>
          </div>
          <div v-if="testResult" :class="testResult.success ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'" class="rounded-lg p-3 text-sm">
            {{ testResult.message }}
          </div>
        </div>
      </div>
    </div>

    <!-- Tab: Model AI -->
    <div v-if="activeTab === 'models'" class="space-y-5">
      <div class="flex items-center justify-between">
        <p class="text-sm text-slate-600">Tambahkan model OpenRouter yang ingin digunakan untuk generate soal.</p>
        <button @click="openModelForm()" class="btn-primary btn-sm">+ Tambah Model</button>
      </div>

      <!-- Browse from OpenRouter -->
      <div class="card">
        <div class="card-header">
          <h3 class="font-semibold text-slate-800 text-sm">🌐 Browse Model OpenRouter</h3>
          <button @click="loadORModels" class="btn-secondary btn-sm" :disabled="loadingOR">
            {{ loadingOR ? 'Memuat...' : 'Muat Daftar Model' }}
          </button>
        </div>
        <div v-if="orModels.length > 0" class="divide-y divide-slate-100 max-h-80 overflow-y-auto">
          <div v-for="m in orModels.slice(0, 50)" :key="m.id"
            class="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50">
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-slate-800 truncate">{{ m.name }}</p>
              <p class="text-xs text-slate-500 font-mono truncate">{{ m.id }}</p>
            </div>
            <span v-if="m.is_free" class="badge badge-green text-xs">Gratis ⭐</span>
            <button @click="quickAddModel(m)" class="btn-secondary btn-sm flex-shrink-0">+ Tambah</button>
          </div>
        </div>
      </div>

      <!-- Saved models -->
      <div v-if="models.length > 0" class="space-y-3">
        <h3 class="font-semibold text-slate-700 text-sm">Model Tersimpan ({{ models.length }})</h3>
        <div v-for="m in models" :key="m.id" class="card p-4">
          <div class="flex items-center gap-3">
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2">
                <p class="font-semibold text-slate-800">{{ m.name }}</p>
                <span v-if="m.is_default" class="badge badge-primary">Default</span>
              </div>
              <p class="text-xs text-slate-500 font-mono mt-0.5">{{ m.model_id }}</p>
              <p class="text-xs text-slate-500 mt-1">Max tokens: {{ m.max_tokens }} · Temp: {{ m.temperature }}</p>
            </div>
            <div class="flex items-center gap-2">
              <button v-if="!m.is_default" @click="setDefault(m.id)" class="btn-secondary btn-sm">Set Default</button>
              <button @click="openModelForm(m)" class="btn-ghost btn-sm">Edit</button>
              <button @click="deleteModel(m.id)" class="btn-ghost btn-sm text-red-500 hover:bg-red-50">Hapus</button>
            </div>
          </div>
        </div>
      </div>
      <div v-else class="card p-8 text-center text-slate-400 text-sm">Belum ada model. Tambah model OpenRouter di atas.</div>
    </div>

    <!-- Tab: Prompt Templates -->
    <div v-if="activeTab === 'templates'" class="space-y-5">
      <div class="flex items-center justify-between">
        <p class="text-sm text-slate-600">Kustomisasi prompt untuk setiap jenis soal.</p>
        <button @click="openTemplateForm()" class="btn-primary btn-sm">+ Tambah Template</button>
      </div>
      <div v-if="templates.length === 0" class="card p-8 text-center text-slate-400 text-sm">
        Belum ada template kustom. Sistem menggunakan template bawaan.
      </div>
      <div v-for="t in templates" :key="t.id" class="card p-4">
        <div class="flex items-start justify-between gap-3">
          <div class="flex-1">
            <div class="flex items-center gap-2 mb-1">
              <p class="font-semibold text-slate-800">{{ t.name }}</p>
              <span :class="`jenis-${t.jenis_soal}`">{{ t.jenis_soal }}</span>
            </div>
            <pre class="text-xs text-slate-500 mt-2 whitespace-pre-wrap line-clamp-3 bg-slate-50 p-2 rounded">{{ t.template }}</pre>
          </div>
          <div class="flex gap-2 flex-shrink-0">
            <button @click="openTemplateForm(t)" class="btn-ghost btn-sm">Edit</button>
            <button @click="deleteTemplate(t.id)" class="btn-ghost btn-sm text-red-500 hover:bg-red-50">Hapus</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Model form modal -->
    <div v-if="showModelForm" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" @click.self="showModelForm = false">
      <div class="bg-white rounded-2xl w-full max-w-md p-6 animate-slide-up">
        <h3 class="text-lg font-semibold mb-5">{{ editModelId ? 'Edit Model' : 'Tambah Model AI' }}</h3>
        <div class="space-y-3">
          <div>
            <label class="label">Nama / Label</label>
            <input v-model="modelForm.name" type="text" class="input" placeholder="cth: Llama 3.1 (Free)" />
          </div>
          <div>
            <label class="label">Model ID OpenRouter</label>
            <input v-model="modelForm.model_id" type="text" class="input font-mono" placeholder="cth: meta-llama/llama-3.1-8b-instruct:free" />
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="label">Max Tokens</label>
              <input v-model.number="modelForm.max_tokens" type="number" class="input" />
            </div>
            <div>
              <label class="label">Temperature (0-2)</label>
              <input v-model.number="modelForm.temperature" type="number" step="0.1" min="0" max="2" class="input" />
            </div>
          </div>
          <div>
            <label class="label">Catatan (opsional)</label>
            <input v-model="modelForm.notes" type="text" class="input" placeholder="cth: Model gratis, cocok untuk soal PG" />
          </div>
        </div>
        <div class="flex gap-3 mt-5">
          <button @click="showModelForm = false" class="btn-secondary flex-1 justify-center">Batal</button>
          <button @click="saveModel" class="btn-primary flex-1 justify-center" :disabled="savingModel">
            {{ savingModel ? 'Menyimpan...' : 'Simpan' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Template form modal -->
    <div v-if="showTemplateForm" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" @click.self="showTemplateForm = false">
      <div class="bg-white rounded-2xl w-full max-w-2xl p-6 animate-slide-up">
        <h3 class="text-lg font-semibold mb-5">{{ editTemplateId ? 'Edit Template' : 'Tambah Prompt Template' }}</h3>
        <div class="space-y-3">
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="label">Nama Template</label>
              <input v-model="templateForm.name" type="text" class="input" placeholder="cth: Template PG Ketat" />
            </div>
            <div>
              <label class="label">Jenis Soal</label>
              <select v-model="templateForm.jenis_soal" class="input">
                <option value="pg">PG</option><option value="pgk">PGK</option>
                <option value="essay">Essay</option><option value="isian">Isian</option>
                <option value="benar_salah">Benar/Salah</option>
              </select>
            </div>
          </div>
          <div>
            <label class="label">Prompt Template</label>
            <textarea v-model="templateForm.template" rows="10" class="input font-mono text-xs resize-y" placeholder="Tulis prompt template..."></textarea>
            <p class="text-xs text-slate-400 mt-1">Gunakan variabel: {mata_pelajaran}, {bab}, {materi}, {jumlah}, {tingkat_kesulitan}</p>
          </div>
        </div>
        <div class="flex gap-3 mt-5">
          <button @click="showTemplateForm = false" class="btn-secondary flex-1 justify-center">Batal</button>
          <button @click="saveTemplate" class="btn-primary flex-1 justify-center" :disabled="savingTemplate">Simpan</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useToast } from 'vue-toastification'
import api from '../utils/api.js'

const toast = useToast()
const activeTab = ref('api')
const tabs = [
  { id: 'api', label: '🔑 API Key' },
  { id: 'models', label: '🤖 Model AI' },
  { id: 'templates', label: '📝 Prompt Template' }
]

// API Key
const apiKey = ref('')
const showKey = ref(false)
const savingKey = ref(false)
const testingKey = ref(false)
const testResult = ref(null)

// Models
const models = ref([])
const orModels = ref([])
const loadingOR = ref(false)
const showModelForm = ref(false)
const editModelId = ref(null)
const savingModel = ref(false)
const modelForm = ref({ name: '', model_id: '', max_tokens: 4096, temperature: 0.7, notes: '' })

// Templates
const templates = ref([])
const showTemplateForm = ref(false)
const editTemplateId = ref(null)
const savingTemplate = ref(false)
const templateForm = ref({ name: '', jenis_soal: 'pg', template: '' })

async function saveApiKey() {
  if (!apiKey.value) return toast.error('API key tidak boleh kosong')
  savingKey.value = true
  try {
    await api.post('/config', { key: 'openrouter_api_key', value: apiKey.value })
    toast.success('API key disimpan!')
  } catch { toast.error('Gagal menyimpan') }
  finally { savingKey.value = false }
}

async function testApiKey() {
  testingKey.value = true
  testResult.value = null
  try {
    const { data } = await api.get('/config/test-api-key')
    testResult.value = data
  } catch (err) {
    testResult.value = { success: false, message: err.response?.data?.message || 'Koneksi gagal' }
  } finally { testingKey.value = false }
}

async function loadORModels() {
  loadingOR.value = true
  try {
    const { data } = await api.get('/config/openrouter-models')
    orModels.value = data.data
  } catch { toast.error('Pastikan API key sudah disimpan') }
  finally { loadingOR.value = false }
}

function openModelForm(m = null) {
  editModelId.value = m?.id || null
  modelForm.value = m ? { name: m.name, model_id: m.model_id, max_tokens: m.max_tokens, temperature: m.temperature, notes: m.notes || '' } : { name: '', model_id: '', max_tokens: 4096, temperature: 0.7, notes: '' }
  showModelForm.value = true
}

function quickAddModel(m) {
  modelForm.value = { name: m.name, model_id: m.id, max_tokens: 4096, temperature: 0.7, notes: m.is_free ? 'Model gratis' : '' }
  editModelId.value = null
  showModelForm.value = true
}

async function saveModel() {
  if (!modelForm.value.name || !modelForm.value.model_id) return toast.error('Nama dan Model ID wajib diisi')
  savingModel.value = true
  try {
    if (editModelId.value) {
      await api.put(`/config/models/${editModelId.value}`, modelForm.value)
    } else {
      await api.post('/config/models', modelForm.value)
    }
    await fetchModels()
    showModelForm.value = false
    toast.success('Model disimpan!')
  } catch { toast.error('Gagal menyimpan model') }
  finally { savingModel.value = false }
}

async function setDefault(id) {
  await api.put(`/config/models/${id}/default`)
  await fetchModels()
  toast.success('Default model diperbarui')
}

async function deleteModel(id) {
  if (!confirm('Hapus model ini?')) return
  await api.delete(`/config/models/${id}`)
  await fetchModels()
  toast.success('Model dihapus')
}

async function fetchModels() {
  const { data } = await api.get('/config/models')
  models.value = data.data
}

function openTemplateForm(t = null) {
  editTemplateId.value = t?.id || null
  templateForm.value = t ? { name: t.name, jenis_soal: t.jenis_soal, template: t.template } : { name: '', jenis_soal: 'pg', template: '' }
  showTemplateForm.value = true
}

async function saveTemplate() {
  if (!templateForm.value.name || !templateForm.value.template) return toast.error('Semua field wajib diisi')
  savingTemplate.value = true
  try {
    if (editTemplateId.value) await api.put(`/config/templates/${editTemplateId.value}`, templateForm.value)
    else await api.post('/config/templates', templateForm.value)
    const { data } = await api.get('/config/templates')
    templates.value = data.data
    showTemplateForm.value = false
    toast.success('Template disimpan!')
  } catch { toast.error('Gagal menyimpan template') }
  finally { savingTemplate.value = false }
}

async function deleteTemplate(id) {
  if (!confirm('Hapus template ini?')) return
  await api.delete(`/config/templates/${id}`)
  templates.value = templates.value.filter(t => t.id !== id)
  toast.success('Template dihapus')
}

onMounted(async () => {
  await fetchModels()
  const { data: tmplData } = await api.get('/config/templates')
  templates.value = tmplData.data
})
</script>
