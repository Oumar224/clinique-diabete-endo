<template>
  <Teleport v-if="chrome && subtitleTarget" :to="subtitleTarget">
    <div v-if="$slots.sub" class="cde-page-sub">
      <slot name="sub" />
    </div>
  </Teleport>

  <Teleport v-if="chrome && actionsTarget" :to="actionsTarget">
    <div class="cde-page-actions">
      <slot />
    </div>
  </Teleport>

  <div v-if="!chrome || !hasTargets" class="cde-page-toolbar">
    <div v-if="$slots.sub" class="cde-page-sub">
      <slot name="sub" />
    </div>
    <div class="cde-page-actions">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, inject } from 'vue'
import { PATIENT_PAGE_CHROME } from '@/views/patients/patientSections'

/**
 * Page-level subtitle + actions for a patient screen.
 *
 * Inside `PatientLayout` the content is teleported into the tinted page band so
 * the title (rendered once by the layout) and the actions share the same line.
 * When the component is mounted outside the layout (unit tests, isolated use)
 * or before the band targets exist, it falls back to a compact toolbar
 * rendered in place.
 */
const chrome = inject(PATIENT_PAGE_CHROME, null)
const subtitleTarget = computed(() => chrome?.subtitleTarget.value ?? null)
const actionsTarget = computed(() => chrome?.actionsTarget.value ?? null)
const hasTargets = computed(() => Boolean(subtitleTarget.value && actionsTarget.value))
</script>
