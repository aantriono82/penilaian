<template>
  <div class="p-6 max-w-3xl mx-auto">
    <div class="flex items-center gap-3 mb-6">
      <button @click="$router.back()" class="btn-ghost p-2 rounded-lg">
        <ArrowLeft class="w-5 h-5" />
      </button>
      <div>
        <h2 class="text-xl font-bold text-slate-900">Edit Soal</h2>
        <p class="text-slate-500 text-sm">Ubah konten soal, opsi jawaban, dan pembahasan</p>
      </div>
    </div>

    <div v-if="loading" class="card p-8 text-center">
      <Loader2 class="w-8 h-8 animate-spin text-primary-500 mx-auto mb-2" />
      <p class="text-slate-400 text-sm">Memuat soal...</p>
    </div>

    <form v-else @submit.prevent="handleSave" class="space-y-5">
      <!-- Info soal -->
      <div class="card">
        <div class="card-header">
          <h3 class="font-semibold text-slate-800 text-sm flex items-center gap-2">
            <Info class="w-4 h-4 text-primary-500" /> Informasi Soal
          </h3>
        </div>
        <div class="card-body grid grid-cols-2 gap-4">
          <div><label class="label">BAB</label>
            <input v-model="form.bab" type="text" class="input" /></div>
          <div><label class="label">Materi / Subbab</label>
            <input v-model="form.materi" type="text" class="input" /></div>
          <div><label class="label">Jenis Soal</label>
            <select v-model="form.jenis" class="input">
              <option value="pg">Pilihan Ganda</option>
              <option value="pgk">PG Kompleks</option>
              <option value="benar_salah">Benar / Salah</option>
              <option value="isian">Isian Singkat</option>
              <option value="essay">Essay</option>
              <option value="menjodohkan">Menjodohkan</option>
            </select>
          </div>
          <div><label class="label">Tingkat Kesulitan</label>
            <select v-model="form.tingkat_kesulitan" class="input">
              <option value="mudah">Mudah</option>
              <option value="sedang">Sedang</option>
              <option value="sulit">Sulit</option>
            </select>
          </div>
          <div><label class="label">Skor</label>
            <input v-model.number="form.skor" type="number" min="1" class="input" /></div>
          <div class="flex items-end pb-1">
            <label class="flex items-center gap-2 cursor-pointer select-none">
              <input v-model="form.is_verified" type="checkbox" class="rounded w-4 h-4" />
              <span class="text-sm text-slate-700 flex items-center gap-1.5">
                <BadgeCheck class="w-4 h-4 text-emerald-500" /> Tandai terverifikasi
              </span>
            </label>
          </div>
        </div>
      </div>

      <!-- Pertanyaan -->
      <div class="card">
        <div class="card-header">
          <h3 class="font-semibold text-slate-800 text-sm flex items-center gap-2">
            <HelpCircle class="w-4 h-4 text-primary-500" /> Teks Pertanyaan
          </h3>
        </div>
        <div class="card-body">
          <RichTextEditor v-model="form.pertanyaan" placeholder="Tulis pertanyaan di sini..." />
        </div>
      </div>

      <div v-if="form.image_prompt" class="card">
        <div class="card-header">
          <h3 class="font-semibold text-slate-800 text-sm flex items-center gap-2">
            <span class="text-violet-500">Gambar Ilustrasi</span>
          </h3>
        </div>
        <div class="card-body">
          <p class="text-sm text-slate-600">[GAMBAR: {{ form.image_prompt }}]</p>
        </div>
      </div>

      <!-- Opsi Jawaban -->
      <div v-if="['pg', 'pgk', 'benar_salah'].includes(form.jenis)" class="card">
        <div class="card-header">
          <h3 class="font-semibold text-slate-800 text-sm flex items-center gap-2">
            <ListChecks class="w-4 h-4 text-primary-500" /> Opsi Jawaban
          </h3>
          <div class="flex items-center gap-2">
            <span class="text-xs text-slate-400">
              {{ form.jenis === 'pg' ? '1 jawaban benar' : form.jenis === 'pgk' ? 'Bisa >1 benar' : 'Benar/Salah' }}
            </span>
            <button v-if="form.jenis !== 'benar_salah'" type="button" @click="addOpsi" class="btn-secondary btn-sm">
              <Plus class="w-3.5 h-3.5" /> Opsi
            </button>
          </div>
        </div>
        <div class="card-body space-y-3">
          <div v-for="(opsi, i) in form.opsi" :key="i"
            class="rounded-xl border transition-all overflow-hidden"
            :class="opsi.is_benar ? 'border-emerald-300 bg-emerald-50/70' : 'border-slate-200'">
            <div class="flex items-center gap-3 p-3">
              <span class="w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center flex-shrink-0 transition-colors"
                :class="opsi.is_benar ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-600'">
                {{ opsi.label }}
              </span>
              <label class="flex items-center gap-1.5 text-xs cursor-pointer select-none flex-shrink-0">
                <input v-if="form.jenis === 'pg'" type="radio" name="benar"
                  :checked="opsi.is_benar" @change="setBenar(i)" class="text-emerald-500 cursor-pointer" />
                <input v-else type="checkbox" v-model="opsi.is_benar" class="rounded text-emerald-500 cursor-pointer" />
                <span :class="opsi.is_benar ? 'text-emerald-700 font-semibold' : 'text-slate-400'">Benar</span>
              </label>
              <button v-if="form.jenis !== 'benar_salah' && form.opsi.length > 2"
                type="button" @click="removeOpsi(i)"
                class="ml-auto text-slate-300 hover:text-red-500 transition-colors p-1">
                <X class="w-4 h-4" />
              </button>
            </div>
            <div class="px-3 pb-3 pt-0">
              <RichTextEditor :model-value="opsi.teks"
                @update:model-value="opsi.teks = $event"
                :placeholder="`Tulis teks opsi ${opsi.label}...`" />
            </div>
          </div>
        </div>
      </div>

      <!-- Kunci Jawaban Isian/Essay -->
      <div v-if="['isian', 'essay'].includes(form.jenis)" class="card">
        <div class="card-header">
          <h3 class="font-semibold text-slate-800 text-sm flex items-center gap-2">
            <Key class="w-4 h-4 text-primary-500" /> Kunci Jawaban
          </h3>
        </div>
        <div class="card-body">
          <RichTextEditor v-model="kunciJawaban" placeholder="Tulis kunci jawaban..." />
        </div>
      </div>

      <!-- Pembahasan -->
      <div class="card">
        <div class="card-header">
          <h3 class="font-semibold text-slate-800 text-sm flex items-center gap-2">
            <Lightbulb class="w-4 h-4 text-amber-500" /> Pembahasan
          </h3>
          <span class="text-xs text-slate-400">Opsional</span>
        </div>
        <div class="card-body">
          <RichTextEditor v-model="form.pembahasan" placeholder="Tulis penjelasan jawaban..." />
        </div>
      </div>

      <!-- Actions -->
      <div class="flex gap-3 pb-6">
        <button type="button" @click="$router.back()" class="btn-secondary flex-1 justify-center">Batal</button>
        <button type="submit" class="btn-primary flex-1 justify-center" :disabled="saving">
          <Loader2 v-if="saving" class="w-4 h-4 animate-spin" />
          <Save v-else class="w-4 h-4" />
          {{ saving ? 'Menyimpan...' : 'Simpan Perubahan' }}
        </button>
      </div>
    </form>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useToast } from 'vue-toastification'
import {
  ArrowLeft, Info, HelpCircle, ListChecks, Plus, X,
  Key, Lightbulb, BadgeCheck, Loader2, Save
} from 'lucide-vue-next'
import api from '../utils/api.js'
import RichTextEditor from '../components/RichTextEditor.vue'

const route = useRoute()
const router = useRouter()
const toast = useToast()
const soalId = route.params.id
const loading = ref(true)
const saving = ref(false)
const kunciJawaban = ref('')
const LABELS = ['A', 'B', 'C', 'D', 'E', 'F']

const form = ref({
  bab: '', materi: '', jenis: 'pg', pertanyaan: '',
  tingkat_kesulitan: 'sedang', skor: 10, pembahasan: '',
  is_verified: false, image_url: null, image_prompt: '',
  opsi: [
    { label: 'A', teks: '', is_benar: false },
    { label: 'B', teks: '', is_benar: false },
    { label: 'C', teks: '', is_benar: false },
    { label: 'D', teks: '', is_benar: false }
  ]
})

watch(() => form.value.jenis, (val) => {
  if (val === 'benar_salah') {
    form.value.opsi = [
      { label: 'Benar', teks: 'Benar', is_benar: true },
      { label: 'Salah', teks: 'Salah', is_benar: false }
    ]
  }
})

function setBenar(idx) { form.value.opsi.forEach((o, i) => { o.is_benar = i === idx }) }
function addOpsi() {
  if (form.value.opsi.length >= 6) return
  form.value.opsi.push({ label: LABELS[form.value.opsi.length], teks: '', is_benar: false })
}
function removeOpsi(idx) {
  form.value.opsi.splice(idx, 1)
  form.value.opsi.forEach((o, i) => { o.label = LABELS[i] })
}

async function handleSave() {
  saving.value = true
  try {
    let opsiToSave = form.value.opsi
    if (['isian', 'essay'].includes(form.value.jenis)) {
      opsiToSave = kunciJawaban.value ? [{ label: 'Kunci', teks: kunciJawaban.value, is_benar: true }] : []
    }
    await api.put(`/soal/${soalId}`, { ...form.value, opsi: opsiToSave })
    toast.success('Soal berhasil disimpan!')
    router.back()
  } catch (err) {
    toast.error(err.response?.data?.message || 'Gagal menyimpan')
  } finally { saving.value = false }
}

onMounted(async () => {
  try {
    const { data } = await api.get(`/soal/${soalId}`)
    const s = data.data
    form.value = {
      bab: s.bab, materi: s.materi, jenis: s.jenis, pertanyaan: s.pertanyaan,
      tingkat_kesulitan: s.tingkat_kesulitan, skor: s.skor,
      pembahasan: s.pembahasan || '', is_verified: s.is_verified === 1,
      image_url: s.image_url || null, image_prompt: s.image_prompt || '',
      opsi: s.opsi?.map(o => ({ label: o.label, teks: o.teks, is_benar: o.is_benar === 1 })) || []
    }
    if (['isian', 'essay'].includes(s.jenis)) {
      kunciJawaban.value = s.opsi?.find(o => o.is_benar)?.teks || ''
    }
  } catch {
    toast.error('Soal tidak ditemukan')
    router.back()
  } finally { loading.value = false }
})
</script>
