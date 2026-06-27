<template>
  <div class="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4 relative">
    <button
      @click="theme.toggleTheme"
      class="absolute right-4 top-4 btn-ghost p-2"
      :title="theme.isDark ? 'Switch to light mode' : 'Switch to dark mode'"
    >
      <SunMedium v-if="theme.isDark" class="w-4 h-4" />
      <MoonStar v-else class="w-4 h-4" />
    </button>
    <div class="w-full max-w-md animate-slide-up">
      <div class="text-center mb-8">
        <div class="inline-flex items-center justify-center w-14 h-14 bg-primary-600 rounded-2xl mb-4 shadow-lg shadow-primary-200">
          <FileText class="w-7 h-7 text-white" />
        </div>
        <h1 class="text-2xl font-bold text-slate-900 dark:text-slate-50">Atiga Asesmen</h1>
        <p class="text-slate-500 mt-1 dark:text-slate-400">Buat akun baru</p>
      </div>

      <div class="card">
        <div class="card-body">
          <h2 class="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-6">Daftar Akun</h2>
          <form @submit.prevent="handleRegister" class="space-y-4">
            <div class="form-group">
              <label class="label">Nama Lengkap</label>
              <input v-model="form.name" type="text" class="input" placeholder="Nama Anda" required />
            </div>
            <div class="form-group">
              <label class="label">Email</label>
              <input v-model="form.email" type="email" class="input" placeholder="email@contoh.com" required />
            </div>
            <div class="form-group">
              <label class="label">Institusi / Lembaga</label>
              <input v-model="form.lembaga" type="text" class="input" placeholder="Nama sekolah/kampus (opsional)" />
            </div>
            <div class="form-group">
              <label class="label">Password</label>
              <input v-model="form.password" type="password" class="input" placeholder="Minimal 6 karakter" required minlength="6" />
            </div>
            <div v-if="error" class="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm flex items-center gap-2">
              <AlertCircle class="w-4 h-4 flex-shrink-0" />{{ error }}
            </div>
            <button type="submit" class="btn-primary w-full justify-center py-2.5" :disabled="loading">
              <Loader2 v-if="loading" class="w-4 h-4 animate-spin" />
              {{ loading ? 'Mendaftarkan...' : 'Daftar' }}
            </button>
          </form>
        </div>
      </div>

      <p class="text-center text-sm text-slate-500 mt-4">
        Sudah punya akun?
        <RouterLink to="/login" class="text-link">Masuk di sini <ArrowRight class="w-3.5 h-3.5" /></RouterLink>
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { FileText, AlertCircle, Loader2, ArrowRight, SunMedium, MoonStar } from 'lucide-vue-next'
import { useAuthStore } from '../stores/auth.js'
import { useThemeStore } from '../stores/theme.js'

const router = useRouter()
const auth = useAuthStore()
const theme = useThemeStore()
const form = ref({ name: '', email: '', password: '', lembaga: '' })
const loading = ref(false)
const error = ref('')

async function handleRegister() {
  error.value = ''
  loading.value = true
  try {
    await auth.register(form.value)
    router.push('/')
  } catch (err) {
    error.value = err.response?.data?.message || 'Pendaftaran gagal.'
  } finally {
    loading.value = false
  }
}
</script>
