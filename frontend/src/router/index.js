import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth.js'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/LoginView.vue'),
    meta: { guest: true }
  },
  {
    path: '/register',
    name: 'Register',
    component: () => import('../views/RegisterView.vue'),
    meta: { guest: true }
  },
  {
    path: '/',
    component: () => import('../components/layout/AppLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        name: 'Dashboard',
        component: () => import('../views/DashboardView.vue')
      },
      {
        path: 'bank-soal',
        name: 'BankSoal',
        component: () => import('../views/BankSoalView.vue')
      },
      {
        path: 'bank-soal/:id',
        name: 'BankSoalDetail',
        component: () => import('../views/BankSoalDetailView.vue')
      },
      {
        path: 'generate',
        name: 'Generate',
        component: () => import('../views/GenerateView.vue')
      },
      {
        path: 'soal/:id/edit',
        name: 'SoalEdit',
        component: () => import('../views/SoalEditView.vue')
      },
      {
        path: 'export/:bankId',
        name: 'Export',
        component: () => import('../views/ExportView.vue')
      },
      {
        path: 'konfigurasi',
        name: 'Config',
        component: () => import('../views/ConfigView.vue')
      },
      {
        path: 'history',
        name: 'History',
        component: () => import('../views/HistoryView.vue')
      },
      {
        path: 'admin',
        name: 'Admin',
        component: () => import('../views/AdminView.vue'),
        meta: { adminOnly: true }
      },
      {
        path: 'profil',
        name: 'Profile',
        component: () => import('../views/ProfileView.vue')
      }
    ]
  },
  { path: '/:pathMatch(.*)*', redirect: '/' }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to, from, next) => {
  const auth = useAuthStore()

  if (to.meta.requiresAuth && !auth.isLoggedIn) {
    return next('/login')
  }
  if (to.meta.guest && auth.isLoggedIn) {
    return next('/')
  }
  if (to.meta.adminOnly && !auth.isAdmin) {
    return next('/')
  }
  next()
})

export default router
