<template>
  <div class="h-[calc(100vh-4rem)] flex flex-col">
    <!-- Header -->
    <div class="flex items-center gap-3 px-6 pt-5 pb-3 flex-shrink-0">
      <button @click="$router.back()" class="btn-ghost p-2 rounded-lg">
        <ArrowLeft class="w-5 h-5" />
      </button>
      <div class="flex-1">
        <h2 class="text-xl font-bold text-slate-900">Export Soal</h2>
        <p class="text-slate-500 text-sm">{{ bank?.nama }}</p>
      </div>
      <div class="flex items-center gap-2 flex-shrink-0">
        <!-- Format selector -->
        <div class="inline-flex rounded-lg border border-slate-200 overflow-hidden">
          <button v-for="f in formatOptions" :key="f.value"
            @click="format = f.value"
            :class="[
              'px-3 py-1.5 text-xs font-medium transition-colors',
              format === f.value
                ? 'bg-primary-500 text-white'
                : 'bg-white text-slate-600 hover:bg-slate-50'
            ]">
            {{ f.label }}
          </button>
        </div>

        <!-- Dynamic export buttons -->
        <template v-if="format === 'default'">
          <button @click="exportDOCX" class="btn-primary btn-sm" :disabled="!!exporting">
            <Loader2 v-if="exporting === 'docx'" class="w-3.5 h-3.5 animate-spin" />
            <FileText v-else class="w-3.5 h-3.5" />
            {{ exporting === 'docx' ? 'Membuat...' : 'Export DOCX' }}
          </button>
          <button @click="exportPDF" class="btn-secondary btn-sm" :disabled="!!exporting">
            <Printer class="w-3.5 h-3.5" /> Export PDF
          </button>
        </template>
        <button v-else @click="exportCBT" class="btn-primary btn-sm" :disabled="!!exporting">
          <Loader2 v-if="exporting === 'cbt'" class="w-3.5 h-3.5 animate-spin" />
          <FileText v-else class="w-3.5 h-3.5" />
          {{ exporting === 'cbt' ? 'Membuat...' : `Export ${formatOptions.find(f => f.value === format)?.label}` }}
        </button>
      </div>
    </div>

    <!-- Main: sidebar + preview -->
    <div class="flex-1 flex gap-5 px-6 pb-5 min-h-0">

      <!-- ── Sidebar settings (scrollable) ── -->
      <aside class="w-72 flex-shrink-0 overflow-y-auto space-y-3 pr-1 custom-scrollbar">

        <!-- Pengaturan Dokumen -->
        <div class="card">
          <div class="card-header">
            <h3 class="font-semibold text-slate-800 text-sm flex items-center gap-2">
              <FileText class="w-4 h-4 text-primary-500" /> Pengaturan Dokumen
            </h3>
          </div>
          <div class="card-body space-y-3">
            <div><label class="label">Judul Dokumen</label>
              <input v-model="layout.title" type="text" class="input" placeholder="SOAL ULANGAN HARIAN" /></div>
            <div><label class="label">Nama Institusi</label>
              <input v-model="layout.institution" type="text" class="input" placeholder="SMP Negeri 1..." /></div>
            <div><label class="label">Mata Pelajaran</label>
              <input v-model="layout.subject" type="text" class="input" /></div>
            <div class="grid grid-cols-2 gap-2">
              <div><label class="label">Kelas</label>
                <input v-model="layout.grade" type="text" class="input" placeholder="VIII" /></div>
              <div><label class="label">Semester</label>
                <input v-model="layout.semester" type="text" class="input" placeholder="1" /></div>
            </div>
            <div class="grid grid-cols-2 gap-2">
              <div><label class="label">Tahun Ajaran</label>
                <input v-model="layout.year" type="text" class="input" placeholder="2024/2025" /></div>
              <div><label class="label">Waktu (mnt)</label>
                <input v-model.number="layout.duration" type="number" class="input" /></div>
            </div>
            <div><label class="label">Petunjuk Umum</label>
              <textarea v-model="layout.instructions" rows="3" class="input resize-none text-xs"></textarea></div>
          </div>
        </div>

        <!-- Filter Soal -->
        <div class="card">
          <div class="card-header">
            <h3 class="font-semibold text-slate-800 text-sm flex items-center gap-2">
              <Filter class="w-4 h-4 text-primary-500" /> Pilih Soal
            </h3>
          </div>
          <div class="card-body space-y-3">
            <div>
              <label class="label">Filter Jenis</label>
              <div class="space-y-1.5">
                <label v-for="j in jenisOptions" :key="j.value"
                  class="flex items-center gap-2 text-sm cursor-pointer select-none p-1 rounded hover:bg-slate-50">
                  <input type="checkbox" v-model="selectedJenis" :value="j.value" class="rounded" />
                  <span>{{ j.label }}</span>
                  <span class="ml-auto text-xs text-slate-400">{{ jenisCount[j.value] || 0 }}</span>
                </label>
              </div>
            </div>
            <div><label class="label">Pembahasan</label>
              <select v-model="layout.showPembahasan" class="input">
                <option :value="false">Tanpa pembahasan (ujian)</option>
                <option :value="true">Dengan pembahasan (latihan)</option>
              </select>
            </div>
            <div><label class="label">Kunci Jawaban</label>
              <select v-model="layout.showKunci" class="input">
                <option :value="false">Tidak ditampilkan</option>
                <option :value="true">Tampilkan di akhir</option>
              </select>
            </div>
            <div><label class="label">Nomor awal</label>
              <input v-model.number="layout.startNumber" type="number" min="1" class="input" /></div>
          </div>
        </div>

        <p class="text-xs text-slate-400 text-center flex items-center justify-center gap-1 pb-2">
          <Info class="w-3 h-3" /> {{ filteredSoal.length }} soal akan di-export
        </p>
      </aside>

      <!-- ── Preview ── -->
      <div class="flex-1 card flex flex-col min-w-0">
        <div class="card-header flex-shrink-0">
          <h3 class="font-semibold text-slate-800 text-sm flex items-center gap-2">
            <Eye class="w-4 h-4 text-primary-500" /> Preview Dokumen
          </h3>
          <span class="badge badge-gray">{{ filteredSoal.length }} soal</span>
        </div>
        <div class="flex-1 overflow-y-auto bg-white p-8 min-h-0" id="preview-area">
            <!-- Banner info CBT -->
            <div v-if="format !== 'default'" class="mb-5 space-y-2">
              <div class="flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800">
                <Info class="w-4 h-4 flex-shrink-0 mt-0.5" />
                <div>
                  <p class="font-semibold">{{ formatOptions.find(f => f.value === format)?.label }} format aktif</p>
                  <p class="mt-0.5 text-blue-700">
                    File akan di-generate sesuai template import CBT.
                    {{ format === 'zen' ? 'ZenCBT: tabel 2-kolom per soal.' : 'ExoCBT Template 2: paragraf flat dengan marker TS/KD/KJ/ABS.' }}
                  </p>
                </div>
              </div>
              <div v-if="bestEffortSoal.length > 0"
                class="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
                <AlertTriangle class="w-4 h-4 flex-shrink-0 mt-0.5" />
                <div>
                  <p class="font-semibold">{{ bestEffortSoal.length }} soal dipetakan best-effort</p>
                  <p class="mt-0.5 text-amber-700">
                    Jenis Benar/Salah &amp; Menjodohkan tidak cocok 1:1 dengan format CBT dan akan dipetakan semirip mungkin.
                    Sebaiknya cek hasil import di CBT tujuan.
                  </p>
                </div>
              </div>
            </div>

            <!-- Kop -->
            <div class="text-center mb-6 border-b-2 border-slate-800 pb-4">
              <p v-if="layout.institution" class="font-bold text-base uppercase tracking-wide">{{ layout.institution }}</p>
              <h1 class="font-bold text-xl uppercase mt-1 tracking-wider">{{ layout.title || 'SOAL UJIAN' }}</h1>
              <div class="flex justify-center gap-4 text-sm mt-3 flex-wrap text-slate-700">
                <span v-if="layout.subject || bank?.mata_pelajaran">
                  Mapel: <strong>{{ layout.subject || bank?.mata_pelajaran }}</strong>
                </span>
                <span v-if="layout.grade">Kelas: <strong>{{ layout.grade }}</strong></span>
                <span v-if="layout.semester">Sem: <strong>{{ layout.semester }}</strong></span>
                <span v-if="layout.duration">Waktu: <strong>{{ layout.duration }} mnt</strong></span>
              </div>
            </div>

            <!-- Petunjuk -->
            <div v-if="layout.instructions" class="mb-5 text-sm">
              <p class="font-semibold mb-1">Petunjuk Umum:</p>
              <p class="whitespace-pre-line text-slate-600 text-xs">{{ layout.instructions }}</p>
            </div>

            <!-- Soal -->
            <div class="space-y-4 text-sm">
              <div v-for="(soal, idx) in filteredSoal" :key="soal.id">
                <div v-if="soal.stimulus_content" class="mb-2 ml-5 rounded-md border border-slate-200 bg-slate-50 p-3">
                  <div class="mb-1 flex items-center gap-2 flex-wrap">
                    <p class="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      Stimulus {{ stimulusLabel[soal.stimulus_type] || '' }}
                    </p>
                    <span
                      v-if="hasVisualMarkup(soal.stimulus_content)"
                      class="badge"
                      :class="isSvgStimulus(soal.stimulus_content) ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'"
                    >
                      {{ isSvgStimulus(soal.stimulus_content) ? 'SVG' : 'Raster' }}
                    </span>
                  </div>
                  <div v-if="hasVisualMarkup(soal.stimulus_content)" class="space-y-2">
                    <MathHtml :html="soal.stimulus_content" content-class="soal-content text-slate-700" />
                    <p class="text-[11px] text-slate-500">
                      {{ visualStimulusHint(soal.stimulus_content) }}
                    </p>
                  </div>
                  <MathHtml v-else :html="soal.stimulus_content" content-class="soal-content text-slate-700" />
                </div>
                <div class="font-medium leading-relaxed soal-content">
                  <span class="font-bold">{{ layout.startNumber + idx }}.</span>
                  <MathHtml :html="soal.pertanyaan" tag="span" content-class="soal-content" />
                </div>

                <div v-if="soal.opsi?.length && ['pg','pgk'].includes(soal.jenis)" class="mt-1.5 ml-5 space-y-0.5">
                  <p v-for="opsi in soal.opsi" :key="opsi.id"
                    :class="layout.showKunci && opsi.is_benar ? 'text-emerald-700 font-semibold' : 'text-slate-700'">
                    <span class="font-bold">{{ opsi.label }}.</span>
                    <MathHtml :html="opsi.teks" tag="span" content-class="soal-content" />
                    <CheckCircle v-if="layout.showKunci && opsi.is_benar" class="inline w-3.5 h-3.5 ml-1 text-emerald-500" />
                  </p>
                </div>

                <p v-if="soal.jenis === 'benar_salah'" class="mt-1 ml-5 text-slate-500 text-xs">
                  Jawaban: ( Benar / Salah )
                </p>
                <p v-if="soal.jenis === 'isian'" class="mt-1 ml-5 text-slate-400 text-xs">
                  Jawaban: ___________________________
                </p>
                <div v-if="soal.jenis === 'essay'" class="mt-1 ml-5 space-y-2">
                  <div v-for="i in 3" :key="i" class="border-b border-dashed border-slate-200 h-5"></div>
                </div>

                <div v-if="layout.showPembahasan && soal.pembahasan"
                  class="mt-1.5 ml-5 text-xs text-slate-500 bg-amber-50 p-2 rounded border-l-2 border-amber-300">
                  <strong>Pembahasan:</strong>
                  <MathHtml :html="soal.pembahasan" tag="span" content-class="soal-content" />
                </div>
              </div>
            </div>

            <!-- Kunci Jawaban -->
            <div v-if="layout.showKunci && pgSoal.length > 0" class="mt-10 pt-4 border-t-2 border-dashed border-slate-300">
              <p class="font-bold text-sm mb-3 uppercase tracking-wide">Kunci Jawaban</p>
              <div class="grid grid-cols-5 gap-x-4 gap-y-1 text-xs">
                <div v-for="(soal, idx) in pgSoal" :key="soal.id" class="flex gap-1.5">
                  <span class="text-slate-400 w-5 text-right">{{ layout.startNumber + idx }}.</span>
                  <span class="font-bold text-slate-800">{{ soal.opsi?.find(o => o.is_benar)?.label || '-' }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useToast } from 'vue-toastification'
import {
  ArrowLeft, FileText, Filter, Eye, Printer,
  Info, CheckCircle, Loader2, AlertTriangle
} from 'lucide-vue-next'
import { saveAs } from 'file-saver'
import api from '../utils/api.js'
import { exportDocx, FULLY_SUPPORTED } from '../utils/exporters/index.js'
import MathHtml from '../components/MathHtml.vue'

const route = useRoute()
const toast = useToast()
const bankId = route.params.bankId
const bank = ref(null)
const allSoal = ref([])
const exporting = ref(null)
const layout = ref({
  title: 'SOAL UJIAN', institution: '', subject: '', grade: '',
  semester: '', year: '', duration: 90,
  instructions: 'Kerjakan soal berikut dengan teliti dan jujur.',
  showPembahasan: false, showKunci: false, startNumber: 1
})

const format = ref('default')
const formatOptions = [
  { value: 'default', label: 'Default' },
  { value: 'zen', label: 'ZenCBT' },
  { value: 'exo', label: 'ExoCBT' }
]

const jenisOptions = [
  { value: 'pg', label: 'Pilihan Ganda' }, { value: 'pgk', label: 'PG Kompleks' },
  { value: 'benar_salah', label: 'Benar/Salah' }, { value: 'isian', label: 'Isian Singkat' },
  { value: 'essay', label: 'Essay' }
]
const selectedJenis = ref(['pg', 'pgk', 'benar_salah', 'isian', 'essay'])
const stimulusLabel = {
  text: 'Teks',
  image: 'Gambar',
  table: 'Tabel',
  diagram: 'Diagram',
  graph: 'Grafik'
}
const jenisCount = computed(() =>
  allSoal.value.reduce((a, s) => { a[s.jenis] = (a[s.jenis] || 0) + 1; return a }, {})
)
const filteredSoal = computed(() => allSoal.value.filter(s => selectedJenis.value.includes(s.jenis)))
const pgSoal = computed(() => filteredSoal.value.filter(s => ['pg', 'pgk'].includes(s.jenis)))
const bestEffortSoal = computed(() => filteredSoal.value.filter(s => !FULLY_SUPPORTED.includes(s.jenis)))

async function exportDOCX() {
  exporting.value = 'docx'
  try {
    const blob = await exportDocx({
      format: 'default',
      soal: filteredSoal.value,
      layout: layout.value,
      options: {
        showPembahasan: layout.value.showPembahasan,
        showKunci: layout.value.showKunci,
        startNumber: layout.value.startNumber
      }
    })
    saveAs(blob, `${bank.value?.nama || 'soal'}.docx`)
    toast.success('File DOCX berhasil dibuat!')
  } catch (err) {
    console.error(err); toast.error('Gagal membuat DOCX')
  } finally { exporting.value = null }
}

async function exportCBT() {
  exporting.value = 'cbt'
  try {
    const blob = await exportDocx({
      format: format.value,
      soal: filteredSoal.value,
      layout: layout.value,
      options: { startNumber: layout.value.startNumber }
    })
    const ext = 'docx'
    const label = formatOptions.find(f => f.value === format.value)?.label || 'CBT'
    saveAs(blob, `${bank.value?.nama || 'soal'}_${label}.${ext}`)
    toast.success(`File ${label} berhasil dibuat!`)
  } catch (err) {
    console.error(err); toast.error('Gagal membuat file CBT')
  } finally { exporting.value = null }
}

function exportPDF() {
  window.print()
}

function hasVisualMarkup(html = '') {
  return /<(img|svg|figure|canvas)\b/i.test(html || '')
}

function isSvgStimulus(html = '') {
  return /<svg\b|data:image\/svg\+xml|src=["'][^"']+\.svg(?:\?[^"']*)?["']/i.test(html || '')
}

function visualStimulusHint(html = '') {
  if (isSvgStimulus(html)) return 'Stimulus visual berbasis SVG'
  return 'Stimulus visual berbasis gambar'
}

onMounted(async () => {
  const [bankRes, soalRes] = await Promise.all([
    api.get(`/bank-soal/${bankId}`),
    api.get(`/bank-soal/${bankId}/soal`, { params: { limit: 200 } })
  ])
  bank.value = bankRes.data.data
  allSoal.value = soalRes.data.data
  layout.value.subject = bank.value.mata_pelajaran
  layout.value.grade = bank.value.kelas || ''
  layout.value.semester = bank.value.semester || ''
  layout.value.year = bank.value.tahun_ajaran || ''
})
</script>

<style scoped>
/* Sidebar scrollbar */
.custom-scrollbar::-webkit-scrollbar { width: 5px; }
.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
.custom-scrollbar::-webkit-scrollbar-thumb { @apply bg-slate-200 rounded-full; }
.custom-scrollbar::-webkit-scrollbar-thumb:hover { @apply bg-slate-300; }

/* Preview area scrollbar */
#preview-area::-webkit-scrollbar { width: 6px; }
#preview-area::-webkit-scrollbar-track { background: transparent; }
#preview-area::-webkit-scrollbar-thumb { @apply bg-slate-200 rounded-full; }
#preview-area::-webkit-scrollbar-thumb:hover { @apply bg-slate-300; }

/* Preview document look */
#preview-area {
  @apply mx-auto;
  max-width: 800px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.06);
  @apply border border-slate-100 rounded-lg;
}

.soal-content :deep(img) {
  @apply max-w-full h-auto rounded my-1 border border-slate-200;
  max-height: 200px;
  object-fit: contain;
}
.soal-content :deep(p) {
  @apply my-0.5;
}
.soal-content :deep(ul), .soal-content :deep(ol) {
  @apply pl-5 my-0.5;
}
.soal-content :deep(table) {
  @apply w-full border-collapse my-2 text-xs sm:text-sm;
}
.soal-content :deep(th), .soal-content :deep(td) {
  @apply border border-slate-300 px-2 py-1 align-top;
}
.soal-content :deep(th) {
  @apply bg-slate-100 font-semibold;
}
</style>
