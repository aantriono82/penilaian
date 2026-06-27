<template>
  <RouterView />
</template>

<script setup>
import { onMounted } from 'vue'
import { useAuthStore } from './stores/auth.js'
import { useThemeStore } from './stores/theme.js'

const auth = useAuthStore()
const theme = useThemeStore()
onMounted(() => {
  theme.initTheme()
  if (auth.isLoggedIn) auth.fetchMe()
})
</script>
