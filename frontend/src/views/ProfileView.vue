<template>
  <div class="p-6 max-w-2xl mx-auto">
    <div class="mb-6">
      <h2 class="text-xl font-bold text-slate-900">Profil Saya</h2>
      <p class="text-slate-500 text-sm mt-1">Kelola informasi akun dan keamanan</p>
    </div>

    <div class="space-y-5">
      <!-- Avatar & info -->
      <div class="card p-6 flex items-center gap-5">
        <div class="w-16 h-16 bg-primary-600 rounded-2xl flex items-center justify-center text-white text-2xl font-bold flex-shrink-0">
          {{ auth.user?.name?.charAt(0)?.toUpperCase() }}
        </div>
        <div>
          <h3 class="font-semibold text-slate-900 text-lg">{{ auth.user?.name }}</h3>
          <p class="text-slate-500 text-sm">{{ auth.user?.email }}</p>
          <div class="flex items-center gap-2 mt-1">
            <span :class="auth.user?.role === 'admin' ? 'badge badge-primary' : 'badge badge-gray'">{{ auth.user?.role }}</span>
            <span v-if="auth.user?.lembaga" class="text-xs text-slate-500">{{ auth.user.lembaga }}</span>
          </div>
        </div>
      </div>

      <!-- Edit profil -->
      <div class="card">
        <div class="card-header"><h3 class="font-semibold text-slate-800">Edit Profil</h3></div>
        <div class="card-body space-y-3">
          <div><label class="label">Nama Lengkap</label>
            <input v-model="profileForm.name" type="text" class="input" /></div>
          <div><label class="label">Institusi / Lembaga</label>
            <input v-model="profileForm.lembaga" type="text" class="input" placeholder="Nama sekolah/kampus" /></div>
          <button @click="saveProfile" class="btn-primary" :disabled="savingProfile">
            {{ savingProfile ? 'Menyimpan...' : 'Simpan Profil' }}
          </button>
        </div>
      </div>

      <!-- Ganti password -->
      <div class="card">
        <div class="card-header"><h3 class="font-semibold text-slate-800">Ganti Password</h3></div>
        <div class="card-body space-y-3">
          <div><label class="label">Password Lama</label>
            <input v-model="passForm.oldPassword" type="password" class="input" /></div>
          <div><label class="label">Password Baru</label>
            <input v-model="passForm.newPassword" type="password" class="input" /></div>
          <div><label class="label">Konfirmasi Password Baru</label>
            <input v-model="passForm.confirmPassword" type="password" class="input" /></div>
          <button @click="changePassword" class="btn-primary" :disabled="savingPass">
            {{ savingPass ? 'Memproses...' : 'Ganti Password' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useToast } from 'vue-toastification'
import { useAuthStore } from '../stores/auth.js'
import api from '../utils/api.js'

const auth = useAuthStore()
const toast = useToast()
const savingProfile = ref(false)
const savingPass = ref(false)
const profileForm = ref({ name: auth.user?.name || '', lembaga: auth.user?.lembaga || '' })
const passForm = ref({ oldPassword: '', newPassword: '', confirmPassword: '' })

async function saveProfile() {
  savingProfile.value = true
  try {
    const { data } = await api.put('/auth/profile', profileForm.value)
    auth.user = data.user
    localStorage.setItem('user', JSON.stringify(data.user))
    toast.success('Profil diperbarui!')
  } catch { toast.error('Gagal menyimpan profil') }
  finally { savingProfile.value = false }
}

async function changePassword() {
  if (passForm.value.newPassword !== passForm.value.confirmPassword) {
    return toast.error('Konfirmasi password tidak cocok')
  }
  if (passForm.value.newPassword.length < 6) return toast.error('Password minimal 6 karakter')
  savingPass.value = true
  try {
    await api.put('/auth/change-password', { oldPassword: passForm.value.oldPassword, newPassword: passForm.value.newPassword })
    passForm.value = { oldPassword: '', newPassword: '', confirmPassword: '' }
    toast.success('Password berhasil diubah!')
  } catch (err) { toast.error(err.response?.data?.message || 'Gagal ubah password') }
  finally { savingPass.value = false }
}
</script>
