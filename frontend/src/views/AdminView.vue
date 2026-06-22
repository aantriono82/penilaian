<template>
  <div class="p-6 max-w-6xl mx-auto">
    <div class="mb-6">
      <h2 class="text-xl font-bold text-slate-900">Admin Panel</h2>
      <p class="text-slate-500 text-sm mt-1">Kelola pengguna dan pantau statistik aplikasi</p>
    </div>

    <!-- Stats -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
      <div class="card p-4 text-center">
        <p class="text-3xl font-bold text-slate-900">{{ stats.total_users }}</p>
        <p class="text-xs text-slate-500 mt-1">Total User</p>
      </div>
      <div class="card p-4 text-center">
        <p class="text-3xl font-bold text-slate-900">{{ stats.total_bank_soal }}</p>
        <p class="text-xs text-slate-500 mt-1">Bank Soal</p>
      </div>
      <div class="card p-4 text-center">
        <p class="text-3xl font-bold text-slate-900">{{ stats.total_soal }}</p>
        <p class="text-xs text-slate-500 mt-1">Total Soal</p>
      </div>
      <div class="card p-4 text-center">
        <p class="text-3xl font-bold text-primary-600">{{ stats.total_generate }}</p>
        <p class="text-xs text-slate-500 mt-1">Generate AI</p>
      </div>
    </div>

    <!-- User Management -->
    <div class="card mb-6">
      <div class="card-header">
        <h3 class="font-semibold text-slate-800">Manajemen Pengguna</h3>
        <button @click="showAddUser = true" class="btn-primary btn-sm">+ Tambah User</button>
      </div>
      <div class="overflow-x-auto">
        <table class="table">
          <thead>
            <tr>
              <th>Nama</th><th>Email</th><th>Role</th><th>Institusi</th>
              <th>Bank Soal</th><th>Total Soal</th><th>Status</th><th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="u in users" :key="u.id">
              <td class="font-medium">{{ u.name }}</td>
              <td class="text-slate-500 text-xs font-mono">{{ u.email }}</td>
              <td><span :class="u.role === 'admin' ? 'badge badge-primary' : 'badge badge-gray'">{{ u.role }}</span></td>
              <td class="text-slate-500 text-xs">{{ u.lembaga || '-' }}</td>
              <td class="text-center">{{ u.total_bank }}</td>
              <td class="text-center">{{ u.total_soal }}</td>
              <td><span :class="u.is_active ? 'badge badge-green' : 'badge badge-red'">{{ u.is_active ? 'Aktif' : 'Nonaktif' }}</span></td>
              <td>
                <div class="flex items-center gap-1">
                  <button @click="toggleStatus(u)" class="btn-ghost btn-sm text-xs" :class="u.is_active ? 'text-amber-600' : 'text-emerald-600'">
                    {{ u.is_active ? 'Nonaktifkan' : 'Aktifkan' }}
                  </button>
                  <button @click="openResetPass(u)" class="btn-ghost btn-sm text-xs text-slate-600">Reset Pass</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Recent Activity -->
    <div class="card">
      <div class="card-header"><h3 class="font-semibold text-slate-800">Aktivitas Terbaru</h3></div>
      <table class="table">
        <thead><tr><th>Waktu</th><th>User</th><th>Bank Soal</th><th>Soal</th><th>Status</th></tr></thead>
        <tbody>
          <tr v-for="a in stats.recent_activity" :key="a.created_at + a.bank_nama">
            <td class="text-xs text-slate-500">{{ formatDate(a.created_at) }}</td>
            <td>{{ a.name }}</td>
            <td class="text-slate-600 text-xs">{{ a.bank_nama }}</td>
            <td class="text-center">{{ a.total_soal_berhasil }}</td>
            <td><span :class="a.status === 'done' ? 'badge badge-green' : 'badge badge-red'">{{ a.status }}</span></td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Add User Modal -->
    <div v-if="showAddUser" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-2xl w-full max-w-md p-6 animate-slide-up">
        <h3 class="text-lg font-semibold mb-5">Tambah User Baru</h3>
        <div class="space-y-3">
          <div><label class="label">Nama *</label><input v-model="addForm.name" type="text" class="input" /></div>
          <div><label class="label">Email *</label><input v-model="addForm.email" type="email" class="input" /></div>
          <div><label class="label">Password *</label><input v-model="addForm.password" type="password" class="input" /></div>
          <div><label class="label">Role</label>
            <select v-model="addForm.role" class="input"><option value="guru">Guru</option><option value="admin">Admin</option></select>
          </div>
          <div><label class="label">Institusi</label><input v-model="addForm.lembaga" type="text" class="input" /></div>
        </div>
        <div class="flex gap-3 mt-5">
          <button @click="showAddUser = false" class="btn-secondary flex-1 justify-center">Batal</button>
          <button @click="createUser" class="btn-primary flex-1 justify-center" :disabled="savingUser">
            {{ savingUser ? 'Menyimpan...' : 'Buat User' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Reset Password Modal -->
    <div v-if="resetTarget" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-2xl w-full max-w-sm p-6 animate-slide-up">
        <h3 class="text-lg font-semibold mb-2">Reset Password</h3>
        <p class="text-sm text-slate-500 mb-4">Reset password untuk <strong>{{ resetTarget.name }}</strong></p>
        <input v-model="newPassword" type="password" class="input w-full" placeholder="Password baru (min 6 karakter)" />
        <div class="flex gap-3 mt-4">
          <button @click="resetTarget = null; newPassword = ''" class="btn-secondary flex-1 justify-center">Batal</button>
          <button @click="resetPassword" class="btn-primary flex-1 justify-center" :disabled="resetting">
            {{ resetting ? 'Mereset...' : 'Reset' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useToast } from 'vue-toastification'
import api from '../utils/api.js'

const toast = useToast()
const users = ref([])
const stats = ref({ total_users: 0, total_bank_soal: 0, total_soal: 0, total_generate: 0, recent_activity: [] })
const showAddUser = ref(false)
const savingUser = ref(false)
const resetTarget = ref(null)
const newPassword = ref('')
const resetting = ref(false)
const addForm = ref({ name: '', email: '', password: '', role: 'guru', lembaga: '' })

function formatDate(dt) {
  return new Date(dt).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

async function toggleStatus(u) {
  await api.put(`/admin/users/${u.id}/toggle`)
  u.is_active = u.is_active ? 0 : 1
  toast.success(`User ${u.is_active ? 'diaktifkan' : 'dinonaktifkan'}`)
}

function openResetPass(u) { resetTarget.value = u; newPassword.value = '' }

async function resetPassword() {
  if (newPassword.value.length < 6) return toast.error('Password min 6 karakter')
  resetting.value = true
  try {
    await api.put(`/admin/users/${resetTarget.value.id}/reset-password`, { new_password: newPassword.value })
    toast.success('Password berhasil direset')
    resetTarget.value = null
  } finally { resetting.value = false }
}

async function createUser() {
  if (!addForm.value.name || !addForm.value.email || !addForm.value.password) return toast.error('Data tidak lengkap')
  savingUser.value = true
  try {
    const { data } = await api.post('/admin/users', addForm.value)
    users.value.unshift({ ...data.data, total_bank: 0, total_soal: 0 })
    showAddUser.value = false
    addForm.value = { name: '', email: '', password: '', role: 'guru', lembaga: '' }
    toast.success('User dibuat!')
  } catch (err) { toast.error(err.response?.data?.message || 'Gagal membuat user') }
  finally { savingUser.value = false }
}

onMounted(async () => {
  const [usersRes, statsRes] = await Promise.all([api.get('/admin/users'), api.get('/admin/stats')])
  users.value = usersRes.data.data
  stats.value = statsRes.data.data
})
</script>
