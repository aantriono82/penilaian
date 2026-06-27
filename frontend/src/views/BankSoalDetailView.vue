<template>
  <div class="p-6 max-w-6xl mx-auto">
    <!-- Header -->
    <div class="flex items-start justify-between mb-6 gap-4">
      <div class="flex items-center gap-3">
        <RouterLink to="/bank-soal" class="btn-ghost p-2 rounded-lg">
          <ArrowLeft class="w-5 h-5" />
        </RouterLink>
        <div>
          <h2 class="text-xl font-bold text-slate-900">{{ bank?.nama || 'Loading...' }}</h2>
          <p class="text-slate-500 text-sm">
            {{ bank?.mata_pelajaran }}
            <span v-if="bank?.jenjang"> · {{ bank.jenjang }}</span>
            <span v-if="bank?.kelas"> · Kelas {{ bank.kelas }}</span>
          </p>
        </div>
      </div>
      <div class="flex items-center gap-2 flex-shrink-0">
        <RouterLink :to="`/bank-soal/${bankId}/soal/baru`" class="btn-secondary btn-sm">
          <Plus class="w-3.5 h-3.5" /> Tambah Soal
        </RouterLink>
        <RouterLink :to="`/generate?bank=${bankId}`" class="btn-secondary btn-sm">
          <Sparkles class="w-3.5 h-3.5" /> Generate
        </RouterLink>
        <RouterLink :to="`/export/${bankId}`" class="btn-primary btn-sm">
          <Download class="w-3.5 h-3.5" /> Export
        </RouterLink>
      </div>
    </div>

    <!-- Stats -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
      <div class="card p-3 text-center">
        <p class="text-2xl font-bold text-slate-900">{{ totalSoal }}</p>
        <p class="text-xs text-slate-500 mt-0.5">Total Soal</p>
      </div>
      <div v-for="(count, jenis) in jenisCount" :key="jenis" class="card p-3 text-center">
        <p class="text-2xl font-bold text-slate-900">{{ count }}</p>
        <p class="text-xs text-slate-500 mt-0.5">{{ jenisLabel[jenis] || jenis }}</p>
      </div>
    </div>

    <!-- Toolbar -->
    <div class="flex items-center gap-3 mb-4 flex-wrap">
      <div class="relative">
        <Search class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          v-model="search"
          type="text"
          class="input pl-9 w-72"
          placeholder="Cari bab, materi, pertanyaan, atau opsi..."
          @input="handleSearchInput"
        />
      </div>
      <select v-model="filterJenis" class="input w-44" @change="fetchSoal">
        <option value="">Semua Jenis</option>
        <option value="pg">Pilihan Ganda</option>
        <option value="pgk">PG Kompleks</option>
        <option value="essay">Essay</option>
        <option value="isian">Isian Singkat</option>
        <option value="benar_salah">Benar/Salah</option>
        <option value="menjodohkan">Menjodohkan</option>
      </select>
      <select v-model="filterKesulitan" class="input w-36" @change="fetchSoal">
        <option value="">Semua Kesulitan</option>
        <option value="mudah">Mudah</option>
        <option value="sedang">Sedang</option>
        <option value="sulit">Sulit</option>
      </select>
      <select v-model="filterStimulus" class="input w-44" @change="fetchSoal">
        <option value="">Semua Stimulus</option>
        <option value="true">Ada Stimulus</option>
        <option value="false">Tanpa Stimulus</option>
      </select>
      <button v-if="search || filterJenis || filterKesulitan || filterStimulus" @click="resetFilters" class="btn-secondary btn-sm">
        <X class="w-3.5 h-3.5" /> Reset
      </button>
      <div class="flex items-center gap-2 ml-auto">
        <span v-if="selected.length > 0" class="text-sm text-slate-600 font-medium">{{ selected.length }} dipilih</span>
        <button v-if="selected.length > 0" @click="bulkDelete" class="btn-danger btn-sm">
          <Trash2 class="w-3.5 h-3.5" /> Hapus {{ selected.length }}
        </button>
      </div>
    </div>

    <div v-if="errorMessage && !loading" class="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
      {{ errorMessage }}
    </div>

    <!-- Loading -->
    <div v-if="loading" class="space-y-3">
      <div v-for="i in 5" :key="i" class="card p-4 animate-pulse">
        <div class="h-4 bg-slate-200 rounded w-4/5 mb-2"></div>
        <div class="h-3 bg-slate-100 rounded w-1/2"></div>
      </div>
    </div>

    <!-- Empty -->
    <div v-else-if="soalList.length === 0" class="card text-center py-16">
      <FileQuestion class="w-12 h-12 mx-auto text-slate-300 mb-3" />
      <p class="text-slate-500 text-sm mb-4">Belum ada soal di bank ini.</p>
      <div class="flex items-center justify-center gap-3">
        <RouterLink :to="`/bank-soal/${bankId}/soal/baru`" class="btn-secondary">
          <Plus class="w-4 h-4" /> Tambah Manual
        </RouterLink>
        <RouterLink :to="`/generate?bank=${bankId}`" class="btn-primary">
          <Sparkles class="w-4 h-4" /> Generate dengan AI
        </RouterLink>
      </div>
    </div>

    <!-- Soal list -->
    <div v-else class="space-y-3">
      <label class="flex items-center gap-2 text-sm text-slate-600 cursor-pointer px-1 select-none">
        <input type="checkbox" class="rounded"
          :checked="selected.length === soalList.length && soalList.length > 0"
          @change="toggleSelectAll" />
        Pilih semua
      </label>

      <div v-for="(soal, idx) in soalList" :key="soal.id"
        class="card hover:border-primary-200 transition-all duration-150"
        :class="{ 'border-primary-300 bg-primary-50/30': selected.includes(soal.id) }">
        <div class="p-4">
          <div class="flex items-start gap-3">
            <input type="checkbox" class="rounded mt-1 flex-shrink-0" :value="soal.id" v-model="selected" />
            <div class="flex-1 min-w-0">
              <!-- Metadata -->
              <div class="flex items-center gap-2 mb-2 flex-wrap">
                <span class="text-xs font-semibold text-slate-400">{{ idx + 1 + (page - 1) * pageSize }}.</span>
                <span :class="`jenis-${soal.jenis}`">{{ jenisLabel[soal.jenis] || soal.jenis }}</span>
                <span :class="kesulitanBadge(soal.tingkat_kesulitan)">{{ soal.tingkat_kesulitan }}</span>
                <span v-if="soal.is_verified" class="badge badge-green">
                  <CheckCircle class="w-3 h-3 mr-0.5" /> Verified
                </span>
                <span v-if="soal.image_url" class="badge bg-violet-100 text-violet-700">
                  <ImageIcon class="w-3 h-3 mr-0.5" /> Gambar
                </span>
                <span class="text-xs text-slate-400 ml-auto hidden sm:block">{{ soal.bab }} · {{ soal.materi }}</span>
              </div>

              <!-- Layout: gambar kiri, teks kanan (jika ada gambar) -->
              <div class="flex gap-4" :class="soal.image_url ? 'flex-row' : ''">
                <!-- Gambar ilustrasi -->
                <!-- Gambar tidak di‑generate. Tampilkan deskripsi saja -->
                <div v-if="soal.image_prompt" class="flex-shrink-0 w-40">
                  <p class="text-xs text-slate-400 mt-1 text-center line-clamp-1">[GAMBAR: {{ soal.image_prompt }}]</p>
                </div>

                <!-- Konten soal -->
                <div class="flex-1 min-w-0">
                  <div v-if="soal.stimulus_content"
                    class="mb-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                    <div class="mb-2 flex items-center gap-2">
                      <span class="badge badge-gray">Stimulus</span>
                      <span class="text-xs text-slate-400 capitalize">{{ stimulusLabel[soal.stimulus_type] || 'Konten' }}</span>
                      <span
                        v-if="hasVisualStimulus(soal.stimulus_content)"
                        class="badge"
                        :class="usesSvgStimulus(soal.stimulus_content) ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'"
                      >
                        {{ usesSvgStimulus(soal.stimulus_content) ? 'SVG' : 'Raster' }}
                      </span>
                    </div>
                    <MathHtml
                      :html="soal.stimulus_content"
                      content-class="text-sm text-slate-700 soal-content"
                    />
                    <p
                      v-if="showVisualQualityHint(soal)"
                      class="mt-2 text-[11px]"
                      :class="usesSvgStimulus(soal.stimulus_content) ? 'text-emerald-700' : 'text-amber-700'"
                    >
                      {{ visualQualityHint(soal) }}
                    </p>
                  </div>
                  <MathHtml
                    :html="soal.pertanyaan"
                    content-class="text-sm text-slate-800 mb-2 leading-relaxed soal-content"
                  />

                  <!-- Opsi PG/PGK -->
                  <div v-if="soal.opsi?.length && ['pg', 'pgk', 'benar_salah'].includes(soal.jenis)"
                    class="grid grid-cols-1 sm:grid-cols-2 gap-1 mt-2">
                    <div v-for="opsi in soal.opsi.slice(0, 6)" :key="opsi.id"
                      class="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg"
                      :class="opsi.is_benar ? 'bg-emerald-50 text-emerald-700 font-medium' : 'bg-slate-50 text-slate-600'">
                      <span class="font-bold w-4 flex-shrink-0">{{ opsi.label }}.</span>
                      <MathHtml
                        :html="opsi.teks"
                        tag="span"
                        content-class="flex-1 soal-content"
                      />
                      <CheckCircle v-if="opsi.is_benar" class="w-3.5 h-3.5 flex-shrink-0 text-emerald-500" />
                    </div>
                  </div>

                  <!-- Kunci isian -->
                  <div v-if="soal.opsi?.length && soal.jenis === 'isian'"
                    class="mt-2 text-xs bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                    <Key class="w-3.5 h-3.5 flex-shrink-0" />
                    <span><strong>Kunci:</strong> <MathHtml :html="soal.opsi[0]?.teks" tag="span" content-class="soal-content" /></span>
                  </div>

                  <!-- Pembahasan -->
                  <div v-if="soal.pembahasan"
                    class="mt-2 text-xs bg-amber-50 text-amber-800 px-3 py-1.5 rounded-lg border border-amber-100 flex items-start gap-1.5">
                    <Lightbulb class="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                    <MathHtml :html="soal.pembahasan" tag="span" content-class="soal-content" />
                  </div>
                </div>
              </div>
            </div>

            <!-- Actions -->
            <div class="flex items-center gap-1 flex-shrink-0">
              <RouterLink :to="`/soal/${soal.id}/edit`"
                class="btn-ghost p-1.5 rounded-lg text-slate-500 hover:text-primary-600 hover:bg-primary-50">
                <Pencil class="w-4 h-4" />
              </RouterLink>
              <button @click="deleteSoal(soal)"
                class="btn-ghost p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50">
                <Trash2 class="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Pagination -->
      <div v-if="totalSoal > pageSize" class="flex items-center justify-center gap-3 pt-4">
        <button @click="changePage(page - 1)" :disabled="page === 1" class="btn-secondary btn-sm">
          <ChevronLeft class="w-4 h-4" />
        </button>
        <span class="text-sm text-slate-600">Halaman <strong>{{ page }}</strong> / {{ Math.ceil(totalSoal / pageSize) }}</span>
        <button @click="changePage(page + 1)" :disabled="page * pageSize >= totalSoal" class="btn-secondary btn-sm">
          <ChevronRight class="w-4 h-4" />
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useToast } from 'vue-toastification'
import {
  ArrowLeft, Sparkles, Download, FileQuestion, Trash2,
  CheckCircle, Key, Lightbulb, Pencil, ChevronLeft, ChevronRight,
  ImageIcon, Plus, Search, X
} from 'lucide-vue-next'
import api from '../utils/api.js'
import MathHtml from '../components/MathHtml.vue'

const route = useRoute()
const toast = useToast()
const bankId = route.params.id
const bank = ref(null)
const soalList = ref([])
const loading = ref(false)
const selected = ref([])
const search = ref('')
const filterJenis = ref('')
const filterKesulitan = ref('')
const filterStimulus = ref('')
const page = ref(1)
const pageSize = 20
const totalSoal = ref(0)
const errorMessage = ref('')

const jenisLabel = { pg: 'PG', pgk: 'PGK', essay: 'Essay', isian: 'Isian', benar_salah: 'B/S', menjodohkan: 'Jodoh' }
const stimulusLabel = {
  text: 'Teks',
  image: 'Gambar',
  table: 'Tabel',
  diagram: 'Diagram',
  graph: 'Grafik'
}
const jenisCount = computed(() =>
  soalList.value.reduce((acc, s) => { acc[s.jenis] = (acc[s.jenis] || 0) + 1; return acc }, {})
)
const kesulitanBadge = (k) => ({
  mudah: 'badge badge-green', sedang: 'badge badge-yellow', sulit: 'badge badge-red'
}[k] || 'badge badge-gray')

function hasVisualStimulus(html = '') {
  return /<(img|svg|figure|canvas)\b/i.test(html || '')
}

function usesSvgStimulus(html = '') {
  return /<svg\b|data:image\/svg\+xml|src=["'][^"']+\.svg(?:\?[^"']*)?["']/i.test(html || '')
}

function showVisualQualityHint(soal) {
  return ['diagram', 'graph', 'image'].includes(soal.stimulus_type) && hasVisualStimulus(soal.stimulus_content)
}

function visualQualityHint(soal) {
  if (usesSvgStimulus(soal.stimulus_content)) return 'Stimulus visual sudah berbasis SVG.'
  if (['diagram', 'graph'].includes(soal.stimulus_type)) return 'Stimulus visual masih berbasis raster. SVG lebih disarankan untuk diagram/grafik.'
  return 'Stimulus visual berbasis gambar raster.'
}

async function fetchBank() {
  const { data } = await api.get(`/bank-soal/${bankId}`)
  bank.value = data.data
}

async function fetchSoal() {
  loading.value = true
  try {
    const { data } = await api.get(`/bank-soal/${bankId}/soal`, {
      params: {
        search: search.value,
        jenis: filterJenis.value,
        kesulitan: filterKesulitan.value,
        has_stimulus: filterStimulus.value,
        page: page.value,
        limit: pageSize
      }
    })
    soalList.value = data.data
    totalSoal.value = data.total
    selected.value = []
    errorMessage.value = ''
  } catch (err) {
    soalList.value = []
    totalSoal.value = 0
    errorMessage.value = err.response?.data?.message || 'Gagal memuat daftar soal'
    toast.error(errorMessage.value)
  } finally { loading.value = false }
}

let searchTimer
function handleSearchInput() {
  page.value = 1
  clearTimeout(searchTimer)
  searchTimer = setTimeout(fetchSoal, 350)
}

function resetFilters() {
  search.value = ''
  filterJenis.value = ''
  filterKesulitan.value = ''
  filterStimulus.value = ''
  page.value = 1
  fetchSoal()
}

function toggleSelectAll(e) {
  selected.value = e.target.checked ? soalList.value.map(s => s.id) : []
}

async function deleteSoal(soal) {
  if (!confirm('Hapus soal ini?')) return
  try {
    await api.delete(`/soal/${soal.id}`)
    soalList.value = soalList.value.filter(s => s.id !== soal.id)
    totalSoal.value--
    toast.success('Soal dihapus')
  } catch { toast.error('Gagal menghapus') }
}

async function bulkDelete() {
  if (!confirm(`Hapus ${selected.value.length} soal?`)) return
  try {
    await api.post('/soal/bulk-delete', { ids: selected.value })
    soalList.value = soalList.value.filter(s => !selected.value.includes(s.id))
    totalSoal.value -= selected.value.length
    toast.success(`${selected.value.length} soal dihapus`)
    selected.value = []
  } catch { toast.error('Gagal menghapus') }
}

function changePage(p) { page.value = p; fetchSoal() }

onMounted(async () => {
  try {
    await Promise.all([fetchBank(), fetchSoal()])
  } catch (err) {
    errorMessage.value = err.response?.data?.message || 'Gagal memuat detail bank soal'
    toast.error(errorMessage.value)
  }
})
</script>

<style scoped>
.soal-content :deep(img) {
  @apply max-w-full h-auto rounded-lg my-1 border border-slate-200;
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
