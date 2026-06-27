import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

const STORAGE_KEY = 'theme'

function getInitialTheme() {
  if (typeof window === 'undefined') return 'light'
  const saved = localStorage.getItem(STORAGE_KEY)
  if (saved === 'light' || saved === 'dark') return saved
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function applyTheme(theme) {
  if (typeof document === 'undefined') return
  document.documentElement.classList.toggle('dark', theme === 'dark')
  document.documentElement.style.colorScheme = theme
}

export const useThemeStore = defineStore('theme', () => {
  const theme = ref(getInitialTheme())

  const isDark = computed(() => theme.value === 'dark')

  function setTheme(nextTheme) {
    theme.value = nextTheme === 'dark' ? 'dark' : 'light'
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, theme.value)
    }
    applyTheme(theme.value)
  }

  function toggleTheme() {
    setTheme(theme.value === 'dark' ? 'light' : 'dark')
  }

  function initTheme() {
    applyTheme(theme.value)
  }

  return { theme, isDark, setTheme, toggleTheme, initTheme }
})
