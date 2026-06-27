<template>
  <component :is="tag" ref="root" :class="contentClass"></component>
</template>

<script setup>
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'
import { renderMathInContainer } from '../utils/mathRenderer.js'

const props = defineProps({
  html: { type: String, default: '' },
  tag: { type: String, default: 'div' },
  contentClass: { type: [String, Array, Object], default: '' }
})

const root = ref(null)
let renderToken = 0
let unmounted = false

async function syncHtml() {
  const currentToken = ++renderToken
  const el = root.value
  if (!el || unmounted) return

  el.innerHTML = props.html || ''

  try {
    await renderMathInContainer(el)
  } catch (err) {
    console.error('Render math gagal:', err)
  }

  if (unmounted || currentToken !== renderToken || !el.isConnected) return
}

watch(() => props.html, () => {
  syncHtml()
}, { flush: 'post' })

onMounted(() => {
  syncHtml()
})

onBeforeUnmount(() => {
  unmounted = true
  renderToken++
})
</script>
