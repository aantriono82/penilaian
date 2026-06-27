import { createApp } from 'vue'
import { createPinia } from 'pinia'
import Toast, { POSITION } from 'vue-toastification'
import 'vue-toastification/dist/index.css'
import App from './App.vue'
import router from './router/index.js'
import './assets/main.css'
import { useThemeStore } from './stores/theme.js'

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.use(Toast, {
  position: POSITION.BOTTOM_RIGHT,
  timeout: 3000,
  closeOnClick: true,
  pauseOnHover: true,
  maxToasts: 5
})

useThemeStore().initTheme()

app.mount('#app')
