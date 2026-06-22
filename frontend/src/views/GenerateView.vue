<template>
  <div class="p-6 max-w-4xl mx-auto">
    <div class="mb-6">
      <h2 class="text-xl font-bold text-slate-900">Generate Soal dengan AI</h2>
      <p class="text-slate-500 text-sm mt-1">Isi data di bawah, lalu AI akan membuatkan soal untuk Anda</p>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Form panel -->
      <div class="lg:col-span-2 space-y-4">

        <!-- Bank Soal -->
        <div class="card">
          <div class="card-header">
            <h3 class="font-semibold text-slate-800 text-sm flex items-center gap-2">
              <Library class="w-4 h-4 text-primary-500" /> Data Bank Soal
            </h3>
          </div>
          <div class="card-body space-y-4">
            <div class="form-group">
              <label class="label">Bank Soal Tujuan <span class="text-red-500">*</span></label>
              <div class="flex gap-2">
                <select v-model="form.bank_soal_id" class="input flex-1" required>
                  <option value="">-- Pilih Bank Soal --</option>
                  <option v-for="b in banks" :key="b.id" :value="b.id">{{ b.nama }} ({{ b.mata_pelajaran }})</option>
                </select>
                <button @click="showNewBank = true" class="btn-secondary btn-sm whitespace-nowrap">
                  <Plus class="w-3.5 h-3.5" /> Baru
                </button>
              </div>
            </div>
            <div class="grid grid-cols-2 gap-4">
              <div class="form-group">
                <label class="label">BAB <span class="text-red-500">*</span></label>
                <input v-model="form.bab" type="text" class="input" placeholder="cth: BAB 3 / Sistem Pernapasan" required />
              </div>
              <div class="form-group">
                <label class="label">Materi / Subbab <span class="text-red-500">*</span></label>
                <input v-model="form.materi" type="text" class="input" placeholder="cth: Organ Pernapasan Manusia" required />
              </div>
            </div>
          </div>
        </div>

        <!-- Konfigurasi soal -->
        <div class="card">
          <div class="card-header">
            <h3 class="font-semibold text-slate-800 text-sm flex items-center gap-2">
              <SlidersHorizontal class="w-4 h-4 text-primary-500" /> Konfigurasi Soal
            </h3>
          </div>
          <div class="card-body space-y-4">
            <div class="grid grid-cols-2 gap-4">
              <div class="form-group">
                <label class="label">Jenis Soal <span class="text-red-500">*</span></label>
                <select v-model="form.jenis_soal" class="input">
                  <option value="pg">Pilihan Ganda (PG)</option>
                  <option value="pgk">PG Kompleks (PGK)</option>
                  <option value="benar_salah">Benar / Salah</option>
                  <option value="isian">Isian Singkat</option>
                  <option value="essay">Essay / Uraian</option>
                  <option value="menjodohkan">Menjodohkan</option>
                </select>
              </div>
              <div class="form-group">
                <label class="label">Jumlah Soal</label>
                <input v-model.number="form.jumlah" type="number" min="1" max="30" class="input" />
                <p class="text-xs text-slate-400 mt-1">Disarankan maks. 15 soal</p>
              </div>
            </div>
            <div class="grid grid-cols-2 gap-4">
              <div class="form-group">
                <label class="label">Tingkat Kesulitan</label>
                <select v-model="form.tingkat_kesulitan" class="input">
                  <option value="mudah">😊 Mudah (C1–C2)</option>
                  <option value="sedang">🤔 Sedang (C3–C4)</option>
                  <option value="sulit">🧠 Sulit (C5–C6)</option>
                </select>
              </div>
              <div v-if="['pg', 'pgk'].includes(form.jenis_soal)" class="form-group">
                <label class="label">Jumlah Opsi Jawaban</label>
                <select v-model.number="form.jumlah_opsi" class="input">
                  <option :value="3">3 Opsi (A–C)</option>
                  <option :value="4">4 Opsi (A–D)</option>
                  <option :value="5">5 Opsi (A–E)</option>
                </select>
              </div>
            </div>

            <!-- Toggle pembahasan -->
            <label class="flex items-center gap-3 cursor-pointer p-3 rounded-lg border border-slate-200 hover:border-primary-300 hover:bg-primary-50/50 transition-all select-none">
              <input v-model="form.generate_pembahasan" type="checkbox" class="w-4 h-4 rounded text-primary-600 cursor-pointer" />
              <div>
                <p class="text-sm font-medium text-slate-700 flex items-center gap-1.5">
                  <BookOpenCheck class="w-4 h-4 text-amber-500" /> Generate Pembahasan
                </p>
                <p class="text-xs text-slate-500">AI menyertakan penjelasan jawaban (lebih banyak token)</p>
              </div>
            </label>
          </div>
        </div>

        <!-- Pilih Model AI -->
        <div class="card">
          <div class="card-header">
            <h3 class="font-semibold text-slate-800 text-sm flex items-center gap-2">
              <BrainCircuit class="w-4 h-4 text-primary-500" /> Model AI
            </h3>
            <RouterLink to="/konfigurasi" class="btn-link">
              <Settings class="w-3.5 h-3.5" /> Kelola
            </RouterLink>
          </div>
          <div class="card-body">
            <div v-if="models.length === 0" class="text-center py-4">
              <BrainCircuit class="w-8 h-8 mx-auto text-slate-300 mb-2" />
              <p class="text-sm text-slate-500">Belum ada model dikonfigurasi.</p>
              <RouterLink to="/konfigurasi" class="btn-primary btn-sm mt-2">Tambah Model</RouterLink>
            </div>
            <div v-else class="space-y-2">
              <div v-for="m in models" :key="m.id"
                @click="form.model_id = m.id"
                class="flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all"
                :class="form.model_id === m.id
                  ? 'border-primary-400 bg-primary-50 shadow-sm shadow-primary-100'
                  : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'">
                <div class="w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors"
                  :class="form.model_id === m.id ? 'border-primary-600' : 'border-slate-300'">
                  <div v-if="form.model_id === m.id" class="w-2 h-2 rounded-full bg-primary-600"></div>
                </div>
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-medium text-slate-800">{{ m.name }}</p>
                  <p class="text-xs text-slate-400 font-mono truncate">{{ m.model_id }}</p>
                </div>
                <span v-if="m.is_default" class="badge badge-primary">Default</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Submit -->
        <button @click="handleGenerate"
          class="btn-primary w-full py-3 text-base justify-center"
          :disabled="generating || !isFormValid">
          <Loader2 v-if="generating" class="w-5 h-5 animate-spin" />
          <Sparkles v-else class="w-5 h-5" />
          {{ generating ? 'Sedang Generate...' : `Generate ${form.jumlah} Soal` }}
        </button>
      </div>

      <!-- Right: Status & Tips -->
      <div class="space-y-4">
        <!-- Status panel -->
        <div class="card">
          <div class="card-header">
            <h3 class="font-semibold text-slate-800 text-sm">Status</h3>
            <div v-if="generating" class="flex items-center gap-1.5 text-xs text-primary-600">
              <span class="w-2 h-2 rounded-full bg-primary-500 animate-pulse"></span>
              Live
            </div>
          </div>
          <div class="card-body">
            <!-- Idle -->
            <div v-if="!generating && !result && !errorMessage" class="text-center py-6 text-slate-400">
              <Sparkles class="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p class="text-sm">Isi form dan klik Generate</p>
            </div>

            <!-- Generating -->
            <div v-if="generating" class="space-y-3">
              <div class="flex items-center gap-2 text-primary-600">
                <Loader2 class="w-4 h-4 animate-spin" />
                <span class="text-sm font-medium">{{ statusMessage }}</span>
              </div>
              <div class="streaming-text text-xs">{{ streamingText.slice(-600) || '...' }}</div>
            </div>

            <!-- Success -->
            <div v-if="result" class="space-y-3 animate-fade-in">
              <div class="flex items-center gap-2 text-emerald-600">
                <CheckCircle class="w-5 h-5" />
                <span class="text-sm font-semibold">{{ result.message }}</span>
              </div>
              <p class="text-xs text-slate-500 flex items-center gap-1">
                <Clock class="w-3.5 h-3.5" /> Selesai dalam {{ (result.duration_ms / 1000).toFixed(1) }}s
              </p>
              <RouterLink :to="`/bank-soal/${form.bank_soal_id}`" class="btn-primary w-full justify-center">
                Lihat Soal <ArrowRight class="w-4 h-4" />
              </RouterLink>
              <button @click="result = null; streamingText = ''" class="btn-ghost w-full justify-center text-sm">
                Generate Lagi
              </button>
            </div>

            <!-- Error -->
            <div v-if="errorMessage" class="bg-red-50 rounded-lg p-3 border border-red-200">
              <div class="flex items-start gap-2">
                <AlertCircle class="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                <p class="text-sm text-red-700">{{ errorMessage }}</p>
              </div>
              <button @click="errorMessage = ''" class="text-xs text-red-400 underline mt-2">Tutup</button>
            </div>
          </div>
        </div>

        <!-- Tips -->
        <div class="card p-4 bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200">
          <h4 class="text-sm font-semibold text-amber-800 mb-2 flex items-center gap-1.5">
            <Lightbulb class="w-4 h-4" /> Tips Generate
          </h4>
          <ul class="text-xs text-amber-700 space-y-1.5">
            <li class="flex items-start gap-1.5"><span class="mt-0.5">•</span> Gunakan model gratis dari OpenRouter (ditandai ⭐)</li>
            <li class="flex items-start gap-1.5"><span class="mt-0.5">•</span> Materi spesifik = soal lebih relevan</li>
            <li class="flex items-start gap-1.5"><span class="mt-0.5">•</span> PGK cocok untuk evaluasi pemahaman mendalam</li>
            <li class="flex items-start gap-1.5"><span class="mt-0.5">•</span> Aktifkan pembahasan untuk soal latihan</li>
            <li class="flex items-start gap-1.5"><span class="mt-0.5">•</span> Maks. 10–15 soal per generate untuk kualitas terbaik</li>
          </ul>
        </div>
      </div>
    </div>

    <!-- Modal: Buat Bank Soal Baru -->
    <div v-if="showNewBank" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" @click.self="showNewBank = false">
      <div class="bg-white rounded-2xl w-full max-w-md p-6 animate-slide-up">
        <h3 class="text-lg font-semibold mb-4">Buat Bank Soal Baru</h3>
        <div class="space-y-3">
          <div><label class="label">Nama Bank Soal *</label>
            <input v-model="newBank.nama" type="text" class="input" placeholder="cth: Soal UTS IPA Kelas 8" /></div>
          <div><label class="label">Mata Pelajaran *</label>
            <input v-model="newBank.mata_pelajaran" type="text" class="input" placeholder="cth: IPA / Matematika" /></div>
          <div class="grid grid-cols-2 gap-3">
            <div><label class="label">Jenjang</label>
              <select v-model="newBank.jenjang" class="input">
                <option value="">-</option>
                <option>SD</option><option>SMP</option><option>SMA</option><option>SMK</option><option>PT</option>
              </select>
            </div>
            <div><label class="label">Kelas</label>
              <input v-model="newBank.kelas" type="text" class="input" placeholder="cth: 8 / X" /></div>
          </div>
        </div>
        <div class="flex gap-3 mt-5">
          <button @click="showNewBank = false" class="btn-secondary flex-1 justify-center">Batal</button>
          <button @click="createNewBank" class="btn-primary flex-1 justify-center" :disabled="savingBank">
            <Loader2 v-if="savingBank" class="w-4 h-4 animate-spin" />
            {{ savingBank ? 'Menyimpan...' : 'Buat' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useToast } from 'vue-toastification'
import {
  Library, Plus, SlidersHorizontal, BookOpenCheck, BrainCircuit,
  Settings, Sparkles, Loader2, CheckCircle, Clock, ArrowRight,
  AlertCircle, Lightbulb
} from 'lucide-vue-next'
import { useBankSoalStore } from '../stores/bankSoal.js'
import api from '../utils/api.js'

const toast = useToast()
const bankStore = useBankSoalStore()

const banks = ref([])
const models = ref([])
const generating = ref(false)
const streamingText = ref('')
const statusMessage = ref('')
const result = ref(null)
const errorMessage = ref('')
const showNewBank = ref(false)
const savingBank = ref(false)

const form = ref({
  bank_soal_id: '', bab: '', materi: '',
  jenis_soal: 'pg', jumlah: 10,
  tingkat_kesulitan: 'sedang', jumlah_opsi: 4,
  generate_pembahasan: false, model_id: ''
})
const newBank = ref({ nama: '', mata_pelajaran: '', jenjang: '', kelas: '' })

const isFormValid = computed(() =>
  form.value.bank_soal_id && form.value.bab && form.value.materi && form.value.model_id
)

onMounted(async () => {
  await bankStore.fetchAll()
  banks.value = bankStore.banks
  const { data } = await api.get('/config/models')
  models.value = data.data
  const def = models.value.find(m => m.is_default) || models.value[0]
  if (def) form.value.model_id = def.id
})

async function handleGenerate() {
  if (!isFormValid.value) return
  generating.value = true
  result.value = null
  errorMessage.value = ''
  streamingText.value = ''
  statusMessage.value = 'Menghubungi AI...'

  try {
    const response = await fetch('/api/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(form.value)
    })

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const parts = buffer.split('\n\n')
      buffer = parts.pop()

      for (const part of parts) {
        const eventMatch = part.match(/^event: (\w+)/m)
        const dataMatch = part.match(/^data: (.+)/m)
        if (!dataMatch) continue
        try {
          const payload = JSON.parse(dataMatch[1])
          const event = eventMatch?.[1]
          if (event === 'status') statusMessage.value = payload.message
          else if (event === 'token') streamingText.value += payload.delta
          else if (event === 'done') { result.value = payload; toast.success(`${payload.soal?.length || 0} soal berhasil dibuat!`) }
          else if (event === 'error') { errorMessage.value = payload.message; toast.error(payload.message) }
        } catch {}
      }
    }
  } catch {
    errorMessage.value = 'Koneksi terputus. Periksa jaringan dan coba lagi.'
  } finally {
    generating.value = false
  }
}

async function createNewBank() {
  if (!newBank.value.nama || !newBank.value.mata_pelajaran) {
    toast.error('Nama dan mata pelajaran wajib diisi'); return
  }
  savingBank.value = true
  try {
    const bank = await bankStore.create(newBank.value)
    banks.value = bankStore.banks
    form.value.bank_soal_id = bank.id
    showNewBank.value = false
    newBank.value = { nama: '', mata_pelajaran: '', jenjang: '', kelas: '' }
    toast.success('Bank soal dibuat!')
  } catch { toast.error('Gagal membuat bank soal') }
  finally { savingBank.value = false }
}
</script>
