<template>
  <div class="p-6 max-w-6xl mx-auto">
    <!-- Welcome -->
    <div class="mb-6">
      <h2 class="text-xl font-bold text-slate-900">Selamat datang, {{ auth.user?.name }}! 👋</h2>
      <p class="text-slate-500 text-sm mt-1">{{ auth.user?.lembaga || 'SoalGen — AI Question Generator' }}</p>
    </div>

    <!-- Stats -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      <div class="card p-5">
        <div class="flex items-center justify-between mb-2">
          <p class="text-xs text-slate-500 font-medium uppercase tracking-wider">Bank Soal</p>
          <div class="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center">
            <Library class="w-4 h-4 text-primary-600" />
          </div>
        </div>
        <p class="text-3xl font-bold text-slate-900">{{ stats.banks }}</p>
        <RouterLink to="/bank-soal" class="btn-link mt-2">Lihat semua <ArrowRight class="w-3.5 h-3.5" /></RouterLink>
      </div>
      <div class="card p-5">
        <div class="flex items-center justify-between mb-2">
          <p class="text-xs text-slate-500 font-medium uppercase tracking-wider">Total Soal</p>
          <div class="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
            <FileQuestion class="w-4 h-4 text-emerald-600" />
          </div>
        </div>
        <p class="text-3xl font-bold text-slate-900">{{ stats.soal }}</p>
      </div>
      <div class="card p-5">
        <div class="flex items-center justify-between mb-2">
          <p class="text-xs text-slate-500 font-medium uppercase tracking-wider">Generate Hari Ini</p>
          <div class="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
            <Zap class="w-4 h-4 text-amber-600" />
          </div>
        </div>
        <p class="text-3xl font-bold text-primary-600">{{ stats.todayGenerate }}</p>
      </div>
      <div class="card p-5">
        <div class="flex items-center justify-between mb-2">
          <p class="text-xs text-slate-500 font-medium uppercase tracking-wider">Model AI</p>
          <div class="w-8 h-8 bg-violet-100 rounded-lg flex items-center justify-center">
            <BrainCircuit class="w-4 h-4 text-violet-600" />
          </div>
        </div>
        <p class="text-3xl font-bold text-slate-900">{{ stats.models }}</p>
        <RouterLink to="/konfigurasi" class="btn-link mt-2">Kelola <ArrowRight class="w-3.5 h-3.5" /></RouterLink>
      </div>
    </div>

    <!-- Quick actions -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
      <RouterLink to="/generate" class="card p-5 hover:shadow-md hover:border-primary-200 transition-all duration-200 group">
        <div class="w-10 h-10 bg-primary-100 rounded-xl flex items-center justify-center mb-3 group-hover:bg-primary-600 transition-colors">
          <Sparkles class="w-5 h-5 text-primary-600 group-hover:text-white transition-colors" />
        </div>
        <h3 class="font-semibold text-slate-800">Generate Soal Baru</h3>
        <p class="text-xs text-slate-500 mt-1">Buat soal dengan AI dari materi yang Anda tentukan</p>
      </RouterLink>

      <RouterLink to="/bank-soal" class="card p-5 hover:shadow-md hover:border-primary-200 transition-all duration-200 group">
        <div class="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center mb-3 group-hover:bg-emerald-600 transition-colors">
          <BookOpen class="w-5 h-5 text-emerald-600 group-hover:text-white transition-colors" />
        </div>
        <h3 class="font-semibold text-slate-800">Kelola Bank Soal</h3>
        <p class="text-xs text-slate-500 mt-1">Edit, hapus, dan atur soal yang sudah dibuat</p>
      </RouterLink>

      <RouterLink to="/konfigurasi" class="card p-5 hover:shadow-md hover:border-primary-200 transition-all duration-200 group">
        <div class="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center mb-3 group-hover:bg-amber-600 transition-colors">
          <Settings class="w-5 h-5 text-amber-600 group-hover:text-white transition-colors" />
        </div>
        <h3 class="font-semibold text-slate-800">Konfigurasi AI</h3>
        <p class="text-xs text-slate-500 mt-1">Atur model OpenRouter dan API key Anda</p>
      </RouterLink>
    </div>

    <!-- Recent banks -->
    <div class="card">
      <div class="card-header">
        <h3 class="font-semibold text-slate-800">Bank Soal Terbaru</h3>
        <RouterLink to="/bank-soal" class="btn-link">Lihat semua <ArrowRight class="w-3.5 h-3.5" /></RouterLink>
      </div>
      <div v-if="recentBanks.length === 0" class="p-8 text-center text-slate-400">
        <BookOpen class="w-10 h-10 mx-auto mb-2 opacity-30" />
        <p class="text-sm">Belum ada bank soal.</p>
        <RouterLink to="/generate" class="btn-link mt-2">Buat sekarang <Sparkles class="w-3.5 h-3.5" /></RouterLink>
      </div>
      <div v-else>
        <div v-for="bank in recentBanks" :key="bank.id"
          class="flex items-center gap-4 px-5 py-3 border-t border-slate-100 hover:bg-slate-50 transition-colors">
          <div class="w-9 h-9 bg-primary-100 rounded-lg flex items-center justify-center flex-shrink-0">
            <FileText class="w-4 h-4 text-primary-600" />
          </div>
          <div class="flex-1 min-w-0">
            <p class="font-medium text-slate-800 text-sm truncate">{{ bank.nama }}</p>
            <p class="text-xs text-slate-500">{{ bank.mata_pelajaran }} • {{ bank.total_soal_actual || bank.total_soal }} soal</p>
          </div>
          <div class="flex items-center gap-2">
            <RouterLink :to="`/bank-soal/${bank.id}`" class="btn-secondary btn-sm">Buka</RouterLink>
            <RouterLink :to="`/export/${bank.id}`" class="btn-ghost btn-sm">
              <Download class="w-3.5 h-3.5" />
            </RouterLink>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { Library, FileQuestion, Zap, BrainCircuit, Sparkles, BookOpen, Settings, FileText, Download, ArrowRight } from 'lucide-vue-next'
import { useAuthStore } from '../stores/auth.js'
import { useBankSoalStore } from '../stores/bankSoal.js'
import api from '../utils/api.js'

const auth = useAuthStore()
const bankStore = useBankSoalStore()
const stats = ref({ banks: 0, soal: 0, todayGenerate: 0, models: 0 })
const recentBanks = ref([])

onMounted(async () => {
  await bankStore.fetchAll()
  recentBanks.value = bankStore.banks.slice(0, 5)
  stats.value.banks = bankStore.banks.length
  stats.value.soal = bankStore.banks.reduce((sum, b) => sum + (b.total_soal_actual || b.total_soal || 0), 0)

  try {
    const [modelsRes, historyRes] = await Promise.allSettled([
      api.get('/config/models'),
      api.get('/generate/history')
    ])
    if (modelsRes.status === 'fulfilled') stats.value.models = modelsRes.value.data.data.length
    if (historyRes.status === 'fulfilled') {
      const today = new Date().toDateString()
      stats.value.todayGenerate = historyRes.value.data.data
        .filter(h => new Date(h.created_at.replace(' ', 'T') + 'Z').toDateString() === today && h.status === 'done').length
    }
  } catch {}
})
</script>
