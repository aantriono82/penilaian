<template>
  <div class="flex h-screen overflow-hidden bg-slate-50">
    <!-- Sidebar -->
    <aside
      class="flex flex-col w-64 bg-white border-r border-slate-200 flex-shrink-0 transition-all duration-300"
      :class="{ '-ml-64': !sidebarOpen }"
    >
      <!-- Logo -->
      <div class="flex items-center gap-3 px-5 py-5 border-b border-slate-100">
        <div class="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
          <FileText class="w-4 h-4 text-white" />
        </div>
        <div>
          <h1 class="text-sm font-bold text-slate-900">SoalGen</h1>
          <p class="text-xs text-slate-500">AI Question Generator</p>
        </div>
      </div>

      <!-- Nav -->
      <nav class="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        <p class="px-3 mb-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">Menu</p>

        <RouterLink to="/" class="sidebar-link" :class="{ active: $route.path === '/' }">
          <LayoutDashboard class="w-4 h-4" /> Dashboard
        </RouterLink>
        <RouterLink to="/bank-soal" class="sidebar-link" :class="{ active: $route.path.startsWith('/bank-soal') }">
          <BookOpen class="w-4 h-4" /> Bank Soal
        </RouterLink>
        <RouterLink to="/generate" class="sidebar-link" :class="{ active: $route.path === '/generate' }">
          <Sparkles class="w-4 h-4" /> Generate Soal
          <span class="ml-auto badge badge-primary text-xs">AI</span>
        </RouterLink>
        <RouterLink to="/history" class="sidebar-link" :class="{ active: $route.path === '/history' }">
          <Clock class="w-4 h-4" /> Riwayat Generate
        </RouterLink>

        <div class="my-3 border-t border-slate-100" />
        <p class="px-3 mb-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">Pengaturan</p>

        <RouterLink to="/konfigurasi" class="sidebar-link" :class="{ active: $route.path === '/konfigurasi' }">
          <Settings class="w-4 h-4" /> Konfigurasi
        </RouterLink>
        <RouterLink v-if="auth.isAdmin" to="/admin" class="sidebar-link" :class="{ active: $route.path === '/admin' }">
          <ShieldCheck class="w-4 h-4" /> Admin Panel
        </RouterLink>
      </nav>

      <!-- User profile -->
      <div class="border-t border-slate-100 p-3">
        <RouterLink to="/profil" class="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 transition-colors">
          <div class="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
            {{ auth.user?.name?.charAt(0)?.toUpperCase() }}
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium text-slate-800 truncate">{{ auth.user?.name }}</p>
            <p class="text-xs text-slate-500 truncate capitalize">{{ auth.user?.role }}</p>
          </div>
        </RouterLink>
        <button @click="handleLogout" class="btn-ghost w-full mt-1 text-xs justify-center text-red-500 hover:bg-red-50 hover:text-red-700">
          <LogOut class="w-3.5 h-3.5" /> Keluar
        </button>
      </div>
    </aside>

    <!-- Main content -->
    <div class="flex-1 flex flex-col overflow-hidden">
      <!-- Topbar -->
      <header class="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between flex-shrink-0">
        <div class="flex items-center gap-3">
          <button @click="sidebarOpen = !sidebarOpen" class="btn-ghost p-2">
            <Menu class="w-5 h-5" />
          </button>
          <nav class="flex items-center gap-1 text-sm text-slate-600 font-medium">
            <span>{{ pageTitle }}</span>
          </nav>
        </div>
        <div class="flex items-center gap-2">
          <RouterLink to="/generate" class="btn-primary btn-sm">
            <Sparkles class="w-3.5 h-3.5" /> Generate Soal
          </RouterLink>
        </div>
      </header>

      <!-- Page content -->
      <main class="flex-1 overflow-y-auto">
        <RouterView v-slot="{ Component }">
          <Transition name="fade" mode="out-in">
            <component :is="Component" :key="$route.path" />
          </Transition>
        </RouterView>
      </main>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  LayoutDashboard, BookOpen, Sparkles, Clock,
  Settings, ShieldCheck, LogOut, Menu, FileText
} from 'lucide-vue-next'
import { useAuthStore } from '../../stores/auth.js'

const sidebarOpen = ref(true)
const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const titleMap = {
  '/': 'Dashboard',
  '/bank-soal': 'Bank Soal',
  '/generate': 'Generate Soal',
  '/history': 'Riwayat Generate',
  '/konfigurasi': 'Konfigurasi',
  '/admin': 'Admin Panel',
  '/profil': 'Profil Saya'
}
const pageTitle = computed(() => {
  if (route.path.startsWith('/bank-soal/') && route.path.includes('/edit')) return 'Edit Soal'
  if (route.path.startsWith('/bank-soal/') && route.path.startsWith('/export')) return 'Export Soal'
  if (route.path.startsWith('/bank-soal/')) return 'Detail Bank Soal'
  return titleMap[route.path] || 'SoalGen'
})

function handleLogout() {
  auth.logout()
  router.push('/login')
}
</script>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.15s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
