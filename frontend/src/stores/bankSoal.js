import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '../utils/api.js'

export const useBankSoalStore = defineStore('bankSoal', () => {
  const banks = ref([])
  const current = ref(null)
  const loading = ref(false)

  async function fetchAll(params = {}) {
    loading.value = true
    try {
      const { data } = await api.get('/bank-soal', { params })
      banks.value = data.data
    } finally { loading.value = false }
  }

  async function fetchOne(id) {
    const { data } = await api.get(`/bank-soal/${id}`)
    current.value = data.data
    return data.data
  }

  async function create(payload) {
    const { data } = await api.post('/bank-soal', payload)
    banks.value.unshift(data.data)
    return data.data
  }

  async function update(id, payload) {
    const { data } = await api.put(`/bank-soal/${id}`, payload)
    const idx = banks.value.findIndex(b => b.id === id)
    if (idx >= 0) banks.value[idx] = data.data
    if (current.value?.id === id) current.value = data.data
    return data.data
  }

  async function remove(id) {
    await api.delete(`/bank-soal/${id}`)
    banks.value = banks.value.filter(b => b.id !== id)
  }

  async function duplicate(id) {
    const { data } = await api.post(`/bank-soal/${id}/duplicate`)
    banks.value.unshift(data.data)
    return data.data
  }

  return { banks, current, loading, fetchAll, fetchOne, create, update, remove, duplicate }
})
