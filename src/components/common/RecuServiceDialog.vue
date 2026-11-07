<template>
  <HtmlPreviewDialog
    ref="previewRef"
    :title="title"
    :channel="previewChannel"
    :download-channel="pdfChannel"
    :params="params"
    orientation="portrait"
  />
</template>

<script setup lang="ts">
/**
 * Reçu de service — aperçu et téléchargement PDF.
 *
 * Un même composant sert le laboratoire et la pharmacie : seul le couple de
 * canaux IPC change. Le reçu est identifié par la demande (laboratoire) ou par
 * la vente (pharmacie), jamais par un paiement.
 */
import { computed, nextTick, ref } from 'vue'
import HtmlPreviewDialog from '@/components/common/HtmlPreviewDialog.vue'

const props = defineProps<{
  service: 'laboratoire' | 'pharmacie'
}>()

const previewRef = ref<InstanceType<typeof HtmlPreviewDialog> | null>(null)
const params = ref<{ id: number }>({ id: 0 })

const prefix = computed(() => (props.service === 'laboratoire' ? 'labo' : 'pharmacie'))
const title = computed(() => (
  props.service === 'laboratoire'
    ? 'Reçu de service — Laboratoire'
    : 'Reçu de service — Pharmacie'
))
const previewChannel = computed(() => `export:${prefix.value}-recu-preview`)
const pdfChannel = computed(() => `export:${prefix.value}-recu-pdf`)

/** Ouvre le reçu de la demande ou de la vente `id`. */
async function open(id: number): Promise<void> {
  if (!id) return
  params.value = { id }
  // L'aperçu lit ses paramètres au moment de l'ouverture : on attend que la
  // nouvelle valeur soit propagée au composant enfant avant de le déclencher.
  await nextTick()
  previewRef.value?.open()
}

defineExpose({ open })
</script>
