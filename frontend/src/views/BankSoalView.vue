<template>
  <div class="p-6 max-w-6xl mx-auto">
    <div class="flex items-center justify-between mb-6">
      <div>
        <h2 class="text-xl font-bold text-slate-900">Bank Soal</h2>
        <p class="text-slate-500 text-sm mt-1">Kelola koleksi soal Anda</p>
      </div>
      <button @click="showModal = true" class="btn-primary">
        <Plus class="w-4 h-4" /> Buat Bank Soal
      </button>
    </div>

    <!-- Filter bar -->
    <div class="flex gap-3 mb-5 flex-wrap">
      <div class="relative">
        <Search class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input v-model="search" type="text" class="input pl-9 w-72" placeholder="Cari nama, mapel, kelas, atau deskripsi..." @input="debouncedFetch" />
      </div>
      <input v-model="filterMapel" type="text" class="input w-48" placeholder="Filter mata pelajaran" @change="fetchBanks" />
      <select v-model="filterJenjang" class="input w-36" @change="fetchBanks">
        <option value="">Semua Jenjang</option>
        <option>SD</option><option>SMP</option><option>SMA</option><option>SMK</option><option>PT</option>
      </select>
      <button v-if="search || filterMapel || filterJenjang" @click="resetFilters" class="btn-secondary btn-sm">
        <X class="w-3.5 h-3.5" /> Reset
      </button>
    </div>

    <!-- Loading skeleton -->
    <div v-if="loading" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <div v-for="i in 6" :key="i" class="card p-5 animate-pulse">
        <div class="h-4 bg-slate-200 rounded w-3/4 mb-3"></div>
        <div class="h-3 bg-slate-100 rounded w-1/2 mb-2"></div>
        <div class="h-3 bg-slate-100 rounded w-1/3"></div>
      </div>
    </div>

    <!-- Empty state -->
    <div v-else-if="banks.length === 0" class="text-center py-16 card">
      <BookOpen class="w-14 h-14 mx-auto text-slate-300 mb-4" />
      <p class="text-slate-500 text-sm">Belum ada bank soal. Mulai dengan membuat yang baru!</p>
      <button @click="showModal = true" class="btn-primary mt-4">Buat Bank Soal Pertama</button>
    </div>

    <!-- Grid -->
    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <div v-for="bank in banks" :key="bank.id" class="card hover:shadow-md hover:border-primary-200 transition-all duration-200 flex flex-col">
        <div class="p-5 flex-1">
          <div class="flex items-start justify-between gap-2 mb-3">
            <h3 class="font-semibold text-slate-800 text-sm leading-snug">{{ bank.nama }}</h3>
            <div class="relative flex-shrink-0">
              <button @click="toggleMenu(bank.id)" class="btn-ghost p-1 rounded">
                <MoreVertical class="w-4 h-4" />
              </button>
              <div v-if="activeMenu === bank.id" class="absolute right-0 mt-1 w-40 bg-white rounded-xl shadow-lg border border-slate-200 py-1 z-10 animate-fade-in">
                <button @click="openEdit(bank)" class="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2">
                  <Pencil class="w-3.5 h-3.5" /> Edit
                </button>
                <button @click="handleDuplicate(bank.id)" class="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2">
                  <Copy class="w-3.5 h-3.5" /> Duplikat
                </button>
                <RouterLink :to="`/export/${bank.id}`" class="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">
                  <Download class="w-3.5 h-3.5" /> Export
                </RouterLink>
                <button @click="confirmDelete(bank)" class="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2">
                  <Trash2 class="w-3.5 h-3.5" /> Hapus
                </button>
              </div>
            </div>
          </div>
          <p class="text-xs text-slate-500 mb-2">{{ bank.mata_pelajaran }}</p>
          <div class="flex flex-wrap gap-1 mb-3">
            <span v-if="bank.jenjang" class="badge badge-gray">{{ bank.jenjang }}</span>
            <span v-if="bank.kelas" class="badge badge-gray">Kelas {{ bank.kelas }}</span>
            <span v-if="bank.semester" class="badge badge-gray">Sem {{ bank.semester }}</span>
            <span v-if="bank.total_stimulus" class="badge badge-primary">{{ bank.total_stimulus }} stimulus</span>
          </div>
          <div class="flex items-center justify-between text-xs text-slate-500">
            <span class="font-semibold text-slate-700 text-base">{{ bank.total_soal_actual || bank.total_soal || 0 }} <span class="text-xs font-normal">soal</span></span>
            <span>{{ formatDate(bank.updated_at) }}</span>
          </div>
        </div>
        <div class="border-t border-slate-100 px-4 py-3 flex gap-2">
          <RouterLink :to="`/bank-soal/${bank.id}`" class="btn-primary btn-sm flex-1 justify-center">
            <FolderOpen class="w-3.5 h-3.5" /> Buka
          </RouterLink>
          <RouterLink :to="`/generate?bank=${bank.id}`" class="btn-secondary btn-sm flex-1 justify-center">
            <Sparkles class="w-3.5 h-3.5" /> Generate
          </RouterLink>
        </div>
      </div>
    </div>

    <!-- Modal Create/Edit -->
    <div v-if="showModal" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" @click.self="closeModal">
      <div class="bg-white rounded-2xl w-full max-w-lg p-6 animate-slide-up">
        <h3 class="text-lg font-semibold mb-5">{{ editMode ? 'Edit Bank Soal' : 'Buat Bank Soal Baru' }}</h3>
        <div class="space-y-3">
          <div><label class="label">Nama Bank Soal *</label>
            <input v-model="formData.nama" type="text" class="input" placeholder="cth: Soal UTS Biologi Kelas XI" /></div>
          <div><label class="label">Mata Pelajaran *</label>
            <input v-model="formData.mata_pelajaran" type="text" class="input" placeholder="cth: Biologi, Matematika..." /></div>
          <div class="grid grid-cols-3 gap-3">
            <div><label class="label">Jenjang</label>
              <select v-model="formData.jenjang" class="input">
                <option value="">-</option>
                <option>SD</option><option>SMP</option><option>SMA</option><option>SMK</option><option>PT</option>
              </select>
            </div>
            <div><label class="label">Kelas</label>
              <input v-model="formData.kelas" type="text" class="input" placeholder="8 / X / II" /></div>
            <div><label class="label">Semester</label>
              <select v-model="formData.semester" class="input">
                <option value="">-</option>
                <option value="1">Ganjil (1)</option>
                <option value="2">Genap (2)</option>
              </select>
            </div>
          </div>
          <div><label class="label">Tahun Ajaran</label>
            <input v-model="formData.tahun_ajaran" type="text" class="input" placeholder="2024/2025" /></div>
          <div><label class="label">Deskripsi (opsional)</label>
            <textarea v-model="formData.deskripsi" class="input resize-none h-20" placeholder="Deskripsi singkat..."></textarea></div>
        </div>
        <div class="flex gap-3 mt-6">
          <button @click="closeModal" class="btn-secondary flex-1 justify-center">Batal</button>
          <button @click="handleSave" class="btn-primary flex-1 justify-center" :disabled="saving">
            <Loader2 v-if="saving" class="w-4 h-4 animate-spin" />
            {{ saving ? 'Menyimpan...' : editMode ? 'Simpan' : 'Buat' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Confirm Delete -->
    <div v-if="deleteTarget" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-2xl w-full max-w-sm p-6 animate-slide-up text-center">
        <div class="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Trash2 class="w-6 h-6 text-red-600" />
        </div>
        <h3 class="font-semibold text-slate-800">Hapus Bank Soal?</h3>
        <p class="text-sm text-slate-500 mt-2">Bank soal "<strong>{{ deleteTarget.nama }}</strong>" dan semua soal di dalamnya akan dihapus permanen.</p>
        <div class="flex gap-3 mt-5">
          <button @click="deleteTarget = null" class="btn-secondary flex-1 justify-center">Batal</button>
          <button @click="handleDelete" class="btn-danger flex-1 justify-center" :disabled="deleting">
            <Loader2 v-if="deleting" class="w-4 h-4 animate-spin" />
            {{ deleting ? 'Menghapus...' : 'Hapus' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useToast } from 'vue-toastification'
import {
  Plus, Search, BookOpen, MoreVertical, Pencil, Copy, Download,
  Trash2, FolderOpen, Sparkles, Loader2, X
} from 'lucide-vue-next'
import { useBankSoalStore } from '../stores/bankSoal.js'

const toast = useToast()
const route = useRoute()
const store = useBankSoalStore()
const banks = ref([])
const loading = ref(false)
const search = ref('')
const filterMapel = ref('')
const filterJenjang = ref('')
const showModal = ref(false)
const editMode = ref(false)
const saving = ref(false)
const deleting = ref(false)
const deleteTarget = ref(null)
const activeMenu = ref(null)
const editId = ref(null)

const emptyForm = { nama: '', mata_pelajaran: '', jenjang: '', kelas: '', semester: '', tahun_ajaran: '', deskripsi: '' }
const formData = ref({ ...emptyForm })

async function fetchBanks() {
  loading.value = true
  try {
    await store.fetchAll({ search: search.value, mapel: filterMapel.value, jenjang: filterJenjang.value })
    banks.value = store.banks
  } finally { loading.value = false }
}

let debounceTimer
function debouncedFetch() { clearTimeout(debounceTimer); debounceTimer = setTimeout(fetchBanks, 400) }
function resetFilters() {
  search.value = ''
  filterMapel.value = ''
  filterJenjang.value = ''
  fetchBanks()
}
function toggleMenu(id) { activeMenu.value = activeMenu.value === id ? null : id }
function openEdit(bank) { editMode.value = true; editId.value = bank.id; formData.value = { ...bank }; showModal.value = true; activeMenu.value = null }
function closeModal() { showModal.value = false; editMode.value = false; editId.value = null; formData.value = { ...emptyForm } }
function confirmDelete(bank) { deleteTarget.value = bank; activeMenu.value = null }

async function handleSave() {
  if (!formData.value.nama || !formData.value.mata_pelajaran) { toast.error('Nama dan mata pelajaran wajib diisi'); return }
  saving.value = true
  try {
    if (editMode.value) { await store.update(editId.value, formData.value); toast.success('Bank soal diperbarui!') }
    else { await store.create(formData.value); toast.success('Bank soal dibuat!') }
    banks.value = store.banks; closeModal()
  } catch { toast.error('Gagal menyimpan') } finally { saving.value = false }
}

async function handleDelete() {
  deleting.value = true
  try {
    await store.remove(deleteTarget.value.id); banks.value = store.banks; deleteTarget.value = null; toast.success('Bank soal dihapus')
  } catch { toast.error('Gagal menghapus') } finally { deleting.value = false }
}

async function handleDuplicate(id) {
  activeMenu.value = null
  try { await store.duplicate(id); banks.value = store.banks; toast.success('Bank soal diduplikat!') }
  catch { toast.error('Gagal menduplikat') }
}

function formatDate(dt) {
  if (!dt) return '-'
  return new Date(dt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
}

function handleOutsideClick(e) { if (activeMenu.value && !e.target.closest('.relative')) activeMenu.value = null }
watch(() => route.query.search, (value) => {
  const next = typeof value === 'string' ? value : ''
  if (search.value !== next) {
    search.value = next
    fetchBanks()
  }
}, { immediate: true })

onMounted(() => { document.addEventListener('click', handleOutsideClick) })
onUnmounted(() => document.removeEventListener('click', handleOutsideClick))
</script>
