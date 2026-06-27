<template>
  <div class="card">
    <div class="card-header">
      <h3 class="font-semibold text-slate-800 text-sm flex items-center gap-2">
        <BookOpen class="w-4 h-4 text-primary-500" /> Stimulus
      </h3>
      <span v-if="stimulus.mode !== 'none'" class="badge badge-primary">
        {{ modeLabel[stimulus.mode] }}
      </span>
    </div>

    <div class="card-body space-y-4">
      <div class="flex flex-wrap gap-2">
        <button
          v-for="option in modeOptions"
          :key="option.value"
          type="button"
          class="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors"
          :class="stimulus.mode === option.value ? 'border-primary-300 bg-primary-50 text-primary-700' : 'border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'"
          @click="setMode(option.value)"
        >
          <component :is="option.icon" class="w-4 h-4" />
          {{ option.label }}
        </button>
      </div>

      <div v-if="stimulus.mode === 'none'" class="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
        Soal akan dibuat tanpa stimulus bersama.
      </div>

      <template v-else>
        <div v-if="stimulus.mode === 'generate'" class="space-y-4">
          <div class="form-group">
            <label class="label">Topik / Instruksi Singkat</label>
            <textarea
              v-model="topicInput"
              class="input min-h-24 resize-y"
              placeholder="Contoh: bacaan tentang daur air untuk siswa SMP."
            />
          </div>
          <div class="flex items-center gap-3">
            <button
              type="button"
              class="btn-primary btn-sm"
              :disabled="loading || !canGenerate"
              @click="generateStimulus"
            >
              <Loader2 v-if="loading" class="w-4 h-4 animate-spin" />
              <Sparkles v-else class="w-4 h-4" />
              {{ loading ? 'Generate...' : 'Generate Stimulus' }}
            </button>
            <p class="text-xs text-slate-400" v-if="!props.modelId">Pilih model AI terlebih dahulu.</p>
          </div>
        </div>

        <div v-if="stimulus.mode === 'upload'" class="space-y-4">
          <div class="flex items-center gap-3">
            <label class="btn-secondary btn-sm cursor-pointer">
              <Upload class="w-4 h-4" />
              Pilih File
              <input class="hidden" type="file" accept=".txt,.md,.pdf" @change="handleFileChange" />
            </label>
            <span class="text-xs text-slate-500">{{ fileLabel }}</span>
          </div>
          <p class="text-xs text-slate-400">Maksimal 2 MB. Format yang didukung: .txt, .md, .pdf.</p>
          <div class="flex items-center gap-3">
            <button
              type="button"
              class="btn-primary btn-sm"
              :disabled="loading || !selectedFile"
              @click="uploadStimulus"
            >
              <Loader2 v-if="loading" class="w-4 h-4 animate-spin" />
              <Upload v-else class="w-4 h-4" />
              {{ loading ? 'Upload...' : 'Upload Stimulus' }}
            </button>
          </div>
        </div>

        <div v-if="stimulus.id" class="space-y-2">
          <div class="flex items-center justify-between gap-3">
            <label class="label mb-0">Konten Stimulus</label>
            <span class="text-[11px] text-slate-400">ID {{ stimulus.id }}</span>
          </div>
          <textarea
            v-model="draftContent"
            class="input min-h-44 resize-y font-mono text-sm"
            placeholder="Konten stimulus akan muncul di sini"
          />
          <p class="text-xs text-slate-400">Perubahan akan disimpan ke stimulus yang sama.</p>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useToast } from 'vue-toastification'
import { BookOpen, Loader2, Sparkles, Upload, FileText, Ban } from 'lucide-vue-next'
import api from '../utils/api.js'

const props = defineProps({
  bankSoalId: { type: [String, Number], default: '' },
  modelId: { type: [String, Number], default: '' },
  stimulus: {
    type: Object,
    default: () => ({ id: null, konten: '', mode: 'none' })
  }
})

const emit = defineEmits(['update:stimulus'])

const toast = useToast()
const loading = ref(false)
const topicInput = ref('')
const selectedFile = ref(null)
const draftContent = ref(props.stimulus.konten || '')
let saveTimer = null

const modeOptions = [
  { value: 'none', label: 'Tanpa stimulus', icon: Ban },
  { value: 'generate', label: 'Generate AI', icon: Sparkles },
  { value: 'upload', label: 'Upload sendiri', icon: FileText }
]

const modeLabel = {
  generate: 'AI',
  upload: 'Upload'
}

const fileLabel = computed(() => selectedFile.value?.name || 'Belum ada file dipilih')
const canGenerate = computed(() => Boolean(props.bankSoalId && props.modelId && topicInput.value.trim()))

function syncStimulus(next) {
  emit('update:stimulus', { ...next })
}

function setMode(mode) {
  selectedFile.value = null
  topicInput.value = mode === 'none' ? '' : topicInput.value
  const next = {
    ...props.stimulus,
    mode,
    id: mode === 'none' ? null : props.stimulus.id,
    konten: mode === 'none' ? '' : props.stimulus.konten || ''
  }
  draftContent.value = next.konten
  syncStimulus(next)
}

function handleFileChange(event) {
  const file = event.target.files?.[0]
  event.target.value = ''
  if (!file) return

  const ext = file.name.split('.').pop()?.toLowerCase()
  if (!['txt', 'md', 'pdf'].includes(ext || '')) {
    toast.error('Gunakan file .txt, .md, atau .pdf')
    return
  }

  if (file.size > 2 * 1024 * 1024) {
    toast.error('Ukuran file maksimal 2MB')
    return
  }

  selectedFile.value = file
}

async function generateStimulus() {
  if (!canGenerate.value) return
  loading.value = true
  try {
    const { data } = await api.post('/stimulus', {
      bankSoalId: props.bankSoalId,
      prompt: topicInput.value.trim(),
      model: props.modelId
    })

    const next = {
      id: data.id,
      konten: data.konten || '',
      mode: 'generate'
    }
    draftContent.value = next.konten
    syncStimulus(next)
    toast.success('Stimulus berhasil dibuat')
  } catch (err) {
    toast.error(err.response?.data?.message || err.message || 'Gagal generate stimulus')
  } finally {
    loading.value = false
  }
}

async function uploadStimulus() {
  if (!selectedFile.value || !props.bankSoalId) return
  loading.value = true
  try {
    const formData = new FormData()
    formData.append('bankSoalId', props.bankSoalId)
    formData.append('file', selectedFile.value)
    const { data } = await api.post('/stimulus/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })

    const next = {
      id: data.id,
      konten: data.konten || '',
      mode: 'upload'
    }
    draftContent.value = next.konten
    syncStimulus(next)
    toast.success('Stimulus berhasil diunggah')
  } catch (err) {
    toast.error(err.response?.data?.message || err.message || 'Gagal upload stimulus')
  } finally {
    loading.value = false
  }
}

watch(
  () => props.stimulus,
  (value) => {
    draftContent.value = value?.konten || ''
  },
  { deep: true, immediate: true }
)

watch(draftContent, (value) => {
  if (!props.stimulus?.id) {
    syncStimulus({ ...props.stimulus, konten: value })
    return
  }

  syncStimulus({ ...props.stimulus, konten: value })

  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(async () => {
    try {
      const { data } = await api.put(`/stimulus/${props.stimulus.id}`, { konten: value })
      if (data?.konten !== undefined) {
        syncStimulus({ ...props.stimulus, konten: data.konten })
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Gagal menyimpan stimulus')
    }
  }, 600)
})

watch(
  () => props.bankSoalId,
  () => {
    selectedFile.value = null
    topicInput.value = ''
    syncStimulus({ id: null, konten: '', mode: 'none' })
  }
)

onBeforeUnmount(() => {
  if (saveTimer) clearTimeout(saveTimer)
})
</script>
