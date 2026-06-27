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
      <!-- Logo -->
      <div class="text-center mb-8">
        <div class="inline-flex items-center justify-center w-14 h-14 bg-primary-600 rounded-2xl mb-4 shadow-lg shadow-primary-200">
          <FileText class="w-7 h-7 text-white" />
        </div>
        <h1 class="text-2xl font-bold text-slate-900 dark:text-slate-50">Atiga Asesmen</h1>
        <p class="text-slate-500 mt-1 dark:text-slate-400">AI Question Generator untuk Pendidik</p>
      </div>

      <div class="card">
        <div class="card-body">
          <h2 class="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-6">Masuk ke Akun</h2>
          <form @submit.prevent="handleLogin" class="space-y-4">
            <div class="form-group">
              <label class="label">Email</label>
              <input v-model="form.email" type="email" class="input" placeholder="nama@sekolah.com" required />
            </div>
            <div class="form-group">
              <label class="label">Password</label>
              <div class="relative">
                <input v-model="form.password" :type="showPass ? 'text' : 'password'" class="input pr-10" placeholder="Password" required />
                <button type="button" @click="showPass = !showPass" class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  <EyeOff v-if="showPass" class="w-4 h-4" />
                  <Eye v-else class="w-4 h-4" />
                </button>
              </div>
            </div>
            <div v-if="error" class="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm flex items-center gap-2">
              <AlertCircle class="w-4 h-4 flex-shrink-0" />{{ error }}
            </div>
            <button type="submit" class="btn-primary w-full justify-center py-2.5" :disabled="loading">
              <Loader2 v-if="loading" class="w-4 h-4 animate-spin" />
              {{ loading ? 'Memproses...' : 'Masuk' }}
            </button>
          </form>
        </div>
      </div>

      <p class="text-center text-sm text-slate-500 mt-4">
        Belum punya akun?
        <RouterLink to="/register" class="text-link">Daftar sekarang <ArrowRight class="w-3.5 h-3.5" /></RouterLink>
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { FileText, Eye, EyeOff, AlertCircle, Loader2, ArrowRight, SunMedium, MoonStar } from 'lucide-vue-next'
import { useAuthStore } from '../stores/auth.js'
import { useThemeStore } from '../stores/theme.js'

const router = useRouter()
const auth = useAuthStore()
const theme = useThemeStore()
const form = ref({ email: '', password: '' })
const loading = ref(false)
const error = ref('')
const showPass = ref(false)

async function handleLogin() {
  error.value = ''
  loading.value = true
  try {
    await auth.login(form.value.email, form.value.password)
    router.push('/')
  } catch (err) {
    error.value = err.response?.data?.message || 'Login gagal. Coba lagi.'
  } finally {
    loading.value = false
  }
}
</script>
