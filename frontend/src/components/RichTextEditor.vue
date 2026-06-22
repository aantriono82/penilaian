<template>
  <div class="rich-editor" :class="{ 'rich-editor--focused': isFocused }">
    <!-- Toolbar -->
    <div v-if="editor" class="rich-editor__toolbar">
      <!-- Text formatting -->
      <div class="rich-editor__group">
        <button type="button" @click="editor.chain().focus().toggleBold().run()"
          :class="{ 'is-active': editor.isActive('bold') }"
          class="toolbar-btn" title="Bold (Ctrl+B)">
          <Bold class="w-4 h-4" />
        </button>
        <button type="button" @click="editor.chain().focus().toggleItalic().run()"
          :class="{ 'is-active': editor.isActive('italic') }"
          class="toolbar-btn" title="Italic (Ctrl+I)">
          <Italic class="w-4 h-4" />
        </button>
        <button type="button" @click="editor.chain().focus().toggleUnderline().run()"
          :class="{ 'is-active': editor.isActive('underline') }"
          class="toolbar-btn" title="Underline (Ctrl+U)">
          <UnderlineIcon class="w-4 h-4" />
        </button>
        <button type="button" @click="editor.chain().focus().toggleStrike().run()"
          :class="{ 'is-active': editor.isActive('strike') }"
          class="toolbar-btn" title="Strikethrough">
          <Strikethrough class="w-4 h-4" />
        </button>
      </div>

      <div class="rich-editor__divider"></div>

      <!-- Headings -->
      <div class="rich-editor__group">
        <button type="button" @click="editor.chain().focus().setParagraph().run()"
          :class="{ 'is-active': editor.isActive('paragraph') && !editor.isActive('heading') }"
          class="toolbar-btn" title="Paragraph">
          <span class="text-xs font-bold">P</span>
        </button>
        <button type="button" @click="editor.chain().focus().toggleHeading({ level: 3 }).run()"
          :class="{ 'is-active': editor.isActive('heading', { level: 3 }) }"
          class="toolbar-btn" title="Heading 3">
          <span class="text-xs font-bold">H3</span>
        </button>
        <button type="button" @click="editor.chain().focus().toggleHeading({ level: 4 }).run()"
          :class="{ 'is-active': editor.isActive('heading', { level: 4 }) }"
          class="toolbar-btn" title="Heading 4">
          <span class="text-xs font-bold">H4</span>
        </button>
      </div>

      <div class="rich-editor__divider"></div>

      <!-- Lists -->
      <div class="rich-editor__group">
        <button type="button" @click="editor.chain().focus().toggleBulletList().run()"
          :class="{ 'is-active': editor.isActive('bulletList') }"
          class="toolbar-btn" title="Bullet List">
          <List class="w-4 h-4" />
        </button>
        <button type="button" @click="editor.chain().focus().toggleOrderedList().run()"
          :class="{ 'is-active': editor.isActive('orderedList') }"
          class="toolbar-btn" title="Ordered List">
          <ListOrdered class="w-4 h-4" />
        </button>
      </div>

      <div class="rich-editor__divider"></div>

      <!-- Alignment -->
      <div class="rich-editor__group">
        <button type="button" @click="editor.chain().focus().setTextAlign('left').run()"
          :class="{ 'is-active': editor.isActive({ textAlign: 'left' }) }"
          class="toolbar-btn" title="Align Left">
          <AlignLeft class="w-4 h-4" />
        </button>
        <button type="button" @click="editor.chain().focus().setTextAlign('center').run()"
          :class="{ 'is-active': editor.isActive({ textAlign: 'center' }) }"
          class="toolbar-btn" title="Align Center">
          <AlignCenter class="w-4 h-4" />
        </button>
        <button type="button" @click="editor.chain().focus().setTextAlign('right').run()"
          :class="{ 'is-active': editor.isActive({ textAlign: 'right' }) }"
          class="toolbar-btn" title="Align Right">
          <AlignRight class="w-4 h-4" />
        </button>
      </div>

      <div class="rich-editor__divider"></div>

      <!-- Media & Extras -->
      <div class="rich-editor__group">
        <button type="button" @click="showImageInput = !showImageInput"
          :class="{ 'is-active': showImageInput }"
          class="toolbar-btn" title="Insert Image"
          :disabled="uploading">
          <Loader2 v-if="uploading" class="w-4 h-4 animate-spin" />
          <ImageIcon v-else class="w-4 h-4" />
        </button>
        <button type="button" @click="editor.chain().focus().setHorizontalRule().run()"
          class="toolbar-btn" title="Horizontal Rule">
          <Minus class="w-4 h-4" />
        </button>
        <button type="button" @click="editor.chain().focus().setHardBreak().run()"
          class="toolbar-btn" title="Line Break">
          <CornerDownLeft class="w-4 h-4" />
        </button>
      </div>

      <div class="rich-editor__divider"></div>

      <!-- Undo/Redo -->
      <div class="rich-editor__group">
        <button type="button" @click="editor.chain().focus().undo().run()"
          :disabled="!editor.can().undo()"
          class="toolbar-btn" title="Undo (Ctrl+Z)">
          <Undo2 class="w-4 h-4" />
        </button>
        <button type="button" @click="editor.chain().focus().redo().run()"
          :disabled="!editor.can().redo()"
          class="toolbar-btn" title="Redo (Ctrl+Y)">
          <Redo2 class="w-4 h-4" />
        </button>
      </div>
    </div>

    <!-- Image input bar -->
    <Transition name="slide">
      <div v-if="showImageInput && editor" class="rich-editor__image-input">
        <!-- URL input -->
        <div class="flex items-center gap-2">
          <input v-model="imageUrl" type="text" class="input text-xs flex-1"
            placeholder="Masukkan URL gambar..."
            @keydown.enter.prevent="insertImage" />
          <button type="button" @click="insertImage" class="btn-primary btn-sm whitespace-nowrap"
            :disabled="!imageUrl.trim() || uploading">
            <ImageIcon class="w-3.5 h-3.5" /> Sisipkan URL
          </button>
        </div>
        <!-- File picker -->
        <div class="flex items-center gap-2 mt-2">
          <button type="button" @click="openFilePicker"
            class="btn-secondary btn-sm"
            :disabled="uploading">
            <Loader2 v-if="uploading" class="w-3.5 h-3.5 animate-spin" />
            <ImageIcon v-else class="w-3.5 h-3.5" />
            {{ uploading ? 'Mengunggah...' : 'Pilih File' }}
          </button>
          <span class="text-xs text-slate-400">atau</span>
          <span class="text-xs text-slate-400">Tempel gambar <kbd class="px-1 py-0.5 bg-slate-100 rounded text-[10px]">Ctrl+V</kbd></span>
        </div>
        <input ref="fileInput" type="file" accept="image/*" class="hidden" @change="onFileSelected" />
        <button type="button" @click="showImageInput = false; imageUrl = ''"
          class="absolute top-2 right-2 text-slate-400 hover:text-slate-600">
          <X class="w-4 h-4" />
        </button>
      </div>
    </Transition>

    <!-- Editor content -->
    <editor-content :editor="editor" class="rich-editor__content" />

    <!-- Floating word count -->
    <div v-if="editor" class="rich-editor__footer">
      <span class="text-xs text-slate-400">{{ wordCount }} kata</span>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onBeforeUnmount, computed } from 'vue'
import { useEditor, EditorContent } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import Underline from '@tiptap/extension-underline'
import TextAlign from '@tiptap/extension-text-align'
import { TextStyle } from '@tiptap/extension-text-style'
import { Color } from '@tiptap/extension-color'
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  List, ListOrdered, AlignLeft, AlignCenter, AlignRight,
  ImageIcon, Minus, CornerDownLeft, Undo2, Redo2, X,
  Loader2
} from 'lucide-vue-next'
import api from '../utils/api.js'

const props = defineProps({
  modelValue: { type: String, default: '' },
  placeholder: { type: String, default: 'Tulis teks di sini...' }
})

const emit = defineEmits(['update:modelValue'])

const showImageInput = ref(false)
const imageUrl = ref('')
const isFocused = ref(false)
const uploading = ref(false)

/**
 * Upload file ke server → return URL
 */
async function uploadFile(file) {
  const formData = new FormData()
  formData.append('file', file)
  const { data } = await api.post('/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
  return data.data.url
}

/**
 * Handle file dari clipboard atau input
 * Upload ke server lalu insert URL ke editor
 */
async function handleImageFile(file) {
  if (!file || !editor.value) return
  uploading.value = true
  try {
    const url = await uploadFile(file)
    editor.value.chain().focus().setImage({ src: url }).run()
  } catch (err) {
    console.error('Upload gagal:', err)
    // Fallback ke base64 jika upload gagal
    const reader = new FileReader()
    reader.onload = () => {
      editor.value?.chain().focus().setImage({ src: reader.result }).run()
    }
    reader.readAsDataURL(file)
  } finally {
    uploading.value = false
  }
}

const editor = useEditor({
  content: props.modelValue || '',
  extensions: [
    StarterKit.configure({
      heading: { levels: [3, 4] }
    }),
    Image.configure({
      inline: true,
      allowBase64: true,
      HTMLAttributes: {
        class: 'editor-image'
      }
    }),
    Link.configure({
      openOnClick: false,
      HTMLAttributes: { class: 'editor-link' }
    }),
    Placeholder.configure({
      placeholder: props.placeholder
    }),
    Underline,
    TextAlign.configure({
      types: ['heading', 'paragraph']
    }),
    TextStyle,
    Color
  ],
  onUpdate: ({ editor }) => {
    emit('update:modelValue', editor.getHTML())
  },
  onFocus: () => { isFocused.value = true },
  onBlur: () => { isFocused.value = false },
  editorProps: {
    handlePaste: (view, event) => {
      const items = event.clipboardData?.items
      if (!items) return false
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          event.preventDefault()
          const file = item.getAsFile()
          if (file) handleImageFile(file)
          return true
        }
      }
      return false
    },
    handleDrop: (view, event) => {
      const files = event.dataTransfer?.files
      if (!files?.length) return false
      for (const file of files) {
        if (file.type.startsWith('image/')) {
          event.preventDefault()
          handleImageFile(file)
          return true
        }
      }
      return false
    }
  }
})

// Sync external content changes
watch(() => props.modelValue, (val) => {
  if (!editor.value) return
  const current = editor.value.getHTML()
  if (val !== current) {
    editor.value.commands.setContent(val || '', false)
  }
})

const wordCount = computed(() => {
  if (!editor.value) return 0
  const text = editor.value.getText().trim()
  return text ? text.split(/\s+/).length : 0
})

/**
 * Insert image dari URL (external atau yang sudah di-upload)
 */
function insertImage() {
  const url = imageUrl.value.trim()
  if (!url || !editor.value) return
  editor.value.chain().focus().setImage({ src: url }).run()
  imageUrl.value = ''
  showImageInput.value = false
}

/**
 * Trigger file input dialog
 */
const fileInput = ref(null)
function openFilePicker() {
  fileInput.value?.click()
}
function onFileSelected(e) {
  const file = e.target.files?.[0]
  if (file) handleImageFile(file)
  e.target.value = '' // reset
}

onBeforeUnmount(() => {
  editor.value?.destroy()
})
</script>

<style>
/* ── Toolbar ── */
.rich-editor {
  @apply rounded-xl border border-slate-200 bg-white overflow-hidden transition-all duration-200;
}
.rich-editor--focused {
  @apply border-primary-400 ring-2 ring-primary-500/20;
}

.rich-editor__toolbar {
  @apply flex items-center gap-0.5 px-2 py-1.5 border-b border-slate-100 bg-slate-50/80 flex-wrap;
}

.rich-editor__group {
  @apply flex items-center gap-0.5;
}

.rich-editor__divider {
  @apply w-px h-5 bg-slate-200 mx-1;
}

.toolbar-btn {
  @apply p-1.5 rounded-md text-slate-500 hover:bg-slate-200/70 hover:text-slate-700
  transition-colors duration-100 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer;
}
.toolbar-btn.is-active {
  @apply bg-primary-100 text-primary-700;
}

/* ── Image input bar ── */
.rich-editor__image-input {
  @apply px-3 py-2 border-b border-slate-100 bg-primary-50/50 relative;
}

/* ── Editor content ── */
.rich-editor__content {
  @apply px-3 py-2 min-h-[80px] max-h-[400px] overflow-y-auto;
}

.rich-editor__content .tiptap {
  @apply outline-none min-h-[60px];
}

.rich-editor__content .tiptap p.is-editor-empty:first-child::before {
  @apply text-slate-400 float-left pointer-events-none h-0;
  content: attr(data-placeholder);
}

/* ── Styled content inside editor ── */
.rich-editor__content .tiptap h3 {
  @apply text-base font-semibold text-slate-800 mt-3 mb-1;
}
.rich-editor__content .tiptap h4 {
  @apply text-sm font-semibold text-slate-700 mt-2 mb-1;
}
.rich-editor__content .tiptap ul {
  @apply list-disc pl-6 my-1;
}
.rich-editor__content .tiptap ol {
  @apply list-decimal pl-6 my-1;
}
.rich-editor__content .tiptap li {
  @apply my-0.5;
}
.rich-editor__content .tiptap blockquote {
  @apply border-l-4 border-primary-300 pl-4 italic text-slate-600 my-2;
}
.rich-editor__content .tiptap hr {
  @apply border-slate-200 my-3;
}
.rich-editor__content .tiptap .editor-image {
  @apply max-w-full h-auto rounded-lg my-2 border border-slate-200;
  max-height: 300px;
  object-fit: contain;
}
.rich-editor__content .tiptap .editor-link {
  @apply text-primary-600 underline hover:text-primary-700;
}
.rich-editor__content .tiptap code {
  @apply bg-slate-100 text-slate-800 px-1 py-0.5 rounded text-xs font-mono;
}
.rich-editor__content .tiptap pre {
  @apply bg-slate-900 text-slate-100 p-3 rounded-lg my-2 overflow-x-auto;
}
.rich-editor__content .tiptap pre code {
  @apply bg-transparent text-inherit p-0;
}

/* ── Footer ── */
.rich-editor__footer {
  @apply px-3 py-1 border-t border-slate-100 bg-slate-50/50 flex justify-end;
}

/* ── Slide transition ── */
.slide-enter-active, .slide-leave-active { transition: all 0.15s ease; }
.slide-enter-from, .slide-leave-to { opacity: 0; max-height: 0; }
.slide-enter-to, .slide-leave-from { opacity: 1; max-height: 100px; }
</style>
