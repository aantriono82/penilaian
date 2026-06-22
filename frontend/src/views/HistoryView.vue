<template>
  <div class="p-6 max-w-5xl mx-auto">
    <div class="mb-6 flex items-start justify-between">
      <div>
        <h2 class="text-xl font-bold text-slate-900">Riwayat Generate</h2>
        <p class="text-slate-500 text-sm mt-1">Log semua aktivitas generate soal dengan AI</p>
      </div>
      <button v-if="!loading && history.length > 0"
        @click="toggleSelectMode"
        class="btn-secondary btn-sm"
        :class="{ '!bg-red-50 !border-red-200 !text-red-600': selectMode }">
        <Trash2 class="w-3.5 h-3.5" />
        {{ selectMode ? 'Batal' : 'Pilih' }}
      </button>
    </div>

    <!-- Bulk action bar -->
    <Transition name="slide">
      <div v-if="selectMode && selectedIds.size > 0"
        class="card p-3 mb-4 flex items-center justify-between bg-primary-50/50 border-primary-200">
        <span class="text-sm font-medium text-primary-700">
          {{ selectedIds.size }} item dipilih
        </span>
        <button @click="handleBulkDelete" class="btn-danger btn-sm" :disabled="deleting">
          <Loader2 v-if="deleting" class="w-3.5 h-3.5 animate-spin" />
          <Trash2 v-else class="w-3.5 h-3.5" />
          {{ deleting ? 'Menghapus...' : 'Hapus Terpilih' }}
        </button>
      </div>
    </Transition>

    <div v-if="loading" class="space-y-3">
      <div v-for="i in 5" :key="i" class="card p-4 animate-pulse">
        <div class="h-4 bg-slate-200 rounded w-3/4 mb-2"></div>
        <div class="h-3 bg-slate-100 rounded w-1/2"></div>
      </div>
    </div>

    <div v-else-if="history.length === 0" class="card text-center py-16">
      <Clock class="w-12 h-12 mx-auto text-slate-300 mb-3" />
      <p class="text-slate-500 text-sm">Belum ada riwayat generate.</p>
      <RouterLink to="/generate" class="btn-primary mt-4">
        <Sparkles class="w-4 h-4" /> Generate Sekarang
      </RouterLink>
    </div>

    <div v-else class="space-y-3">
      <div v-for="h in history" :key="h.id"
        class="card p-4 hover:border-slate-300 transition-all"
        :class="{ 'border-primary-300 bg-primary-50/30': selectMode && selectedIds.has(h.id) }">
        <div class="flex items-start justify-between gap-4">
          <div class="flex items-start gap-3 flex-1 min-w-0">
            <!-- Checkbox or Status icon -->
            <div v-if="selectMode"
              @click="toggleSelect(h.id)"
              class="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 cursor-pointer transition-all"
              :class="selectedIds.has(h.id)
                ? 'bg-primary-600 text-white'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-400'">
              <Check v-if="selectedIds.has(h.id)" class="w-4 h-4" />
              <div v-else class="w-4 h-4 rounded border-2 border-slate-300"></div>
            </div>
            <div v-else
              class="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
              :class="{
                'bg-emerald-100': h.status === 'done',
                'bg-red-100': h.status === 'failed',
                'bg-primary-100': h.status === 'processing',
                'bg-slate-100': h.status === 'pending'
              }">
              <CheckCircle v-if="h.status === 'done'" class="w-4 h-4 text-emerald-600" />
              <XCircle v-else-if="h.status === 'failed'" class="w-4 h-4 text-red-500" />
              <Loader2 v-else class="w-4 h-4 text-primary-500 animate-spin" />
            </div>

            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 mb-1 flex-wrap">
                <span :class="statusBadge(h.status)">{{ statusLabel(h.status) }}</span>
                <span class="text-sm font-semibold text-slate-800 truncate">{{ h.bank_nama }}</span>
              </div>
              <p class="text-xs text-slate-500 font-mono">{{ h.model_name }}</p>
              <p class="text-xs text-slate-500 mt-1 flex items-center gap-3 flex-wrap">
                <span class="flex items-center gap-1">
                  <FileQuestion class="w-3 h-3" />
                  {{ h.total_soal_berhasil }}/{{ h.total_soal_diminta }} soal
                </span>
                <span v-if="h.duration_ms" class="flex items-center gap-1">
                  <Timer class="w-3 h-3" /> {{ (h.duration_ms / 1000).toFixed(1) }}s
                </span>
              </p>
              <p v-if="h.error_message" class="text-xs text-red-500 mt-1 flex items-center gap-1">
                <AlertCircle class="w-3 h-3" /> {{ h.error_message }}
              </p>
            </div>
          </div>
          <div class="text-right flex-shrink-0 flex flex-col items-end gap-1.5">
            <p class="text-xs text-slate-400">{{ formatDate(h.created_at) }}</p>
            <div class="flex items-center gap-1.5">
              <RouterLink v-if="h.status === 'done' && h.bank_soal_id"
                :to="`/bank-soal/${h.bank_soal_id}`"
                class="btn-link">
                Lihat soal <ArrowRight class="w-3.5 h-3.5" />
              </RouterLink>
              <button v-if="!selectMode"
                @click.stop="confirmDelete(h)"
                class="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all"
                title="Hapus riwayat">
                <Trash2 class="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Confirm dialog -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="confirmDialog.show" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          @click.self="confirmDialog.show = false">
          <div class="bg-white rounded-2xl w-full max-w-sm p-6 animate-slide-up">
            <div class="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <Trash2 class="w-6 h-6 text-red-500" />
            </div>
            <h3 class="text-lg font-semibold text-center mb-2">Hapus Riwayat?</h3>
            <p class="text-sm text-slate-500 text-center mb-6">
              {{ confirmDialog.message }}
            </p>
            <div class="flex gap-3">
              <button @click="confirmDialog.show = false"
                class="btn-secondary flex-1 justify-center">Batal</button>
              <button @click="confirmDialog.onConfirm"
                class="btn-danger flex-1 justify-center"
                :disabled="deleting">
                <Loader2 v-if="deleting" class="w-4 h-4 animate-spin" />
                {{ deleting ? 'Menghapus...' : 'Hapus' }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useToast } from 'vue-toastification'
import {
  Clock, Sparkles, CheckCircle, XCircle, Loader2,
  FileQuestion, Timer, AlertCircle, ArrowRight,
  Trash2, Check
} from 'lucide-vue-next'
import api from '../utils/api.js'

const toast = useToast()

const history = ref([])
const loading = ref(true)
const deleting = ref(false)
const selectMode = ref(false)
const selectedIds = reactive(new Set())

const confirmDialog = reactive({
  show: false,
  message: '',
  onConfirm: () => {}
})

const statusBadge = (s) => ({
  done: 'badge badge-green', failed: 'badge badge-red',
  processing: 'badge badge-primary', pending: 'badge badge-gray'
}[s] || 'badge badge-gray')

const statusLabel = (s) => ({
  done: 'Berhasil', failed: 'Gagal', processing: 'Proses...', pending: 'Pending'
}[s] || s)

function formatDate(dt) {
  return new Date(dt).toLocaleString('id-ID', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })
}

function toggleSelectMode() {
  selectMode.value = !selectMode.value
  selectedIds.clear()
}

function toggleSelect(id) {
  if (selectedIds.has(id)) selectedIds.delete(id)
  else selectedIds.add(id)
}

function confirmDelete(item) {
  confirmDialog.message = `Riwayat "${item.bank_nama}" akan dihapus permanen.`
  confirmDialog.onConfirm = async () => {
    await deleteSingle(item.id)
    confirmDialog.show = false
  }
  confirmDialog.show = true
}

async function deleteSingle(id) {
  deleting.value = true
  try {
    await api.delete(`/generate/history/${id}`)
    history.value = history.value.filter(h => h.id !== id)
    toast.success('Riwayat dihapus')
  } catch (err) {
    toast.error(err.response?.data?.message || 'Gagal menghapus')
  } finally {
    deleting.value = false
  }
}

async function handleBulkDelete() {
  const count = selectedIds.size
  confirmDialog.message = `${count} riwayat akan dihapus permanen.`
  confirmDialog.onConfirm = async () => {
    deleting.value = true
    try {
      await api.post('/generate/history/bulk-delete', { ids: [...selectedIds] })
      history.value = history.value.filter(h => !selectedIds.has(h.id))
      selectedIds.clear()
      selectMode.value = false
      toast.success(`${count} riwayat dihapus`)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal menghapus')
    } finally {
      deleting.value = false
      confirmDialog.show = false
    }
  }
  confirmDialog.show = true
}

onMounted(async () => {
  try {
    const { data } = await api.get('/generate/history')
    history.value = data.data
  } finally { loading.value = false }
})
</script>

<style scoped>
.slide-enter-active, .slide-leave-active { transition: all 0.2s ease; }
.slide-enter-from, .slide-leave-to { opacity: 0; transform: translateY(-8px); }
.fade-enter-active, .fade-leave-active { transition: opacity 0.15s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
