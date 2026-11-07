<template>
  <div class="dsc">
    <div class="dsc__text">
      <span class="dsc__count">{{ count }}</span>
      <span class="dsc__label">{{ label }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Component } from 'vue'

defineProps<{
  icon: Component
  count: number | string
  label: string
  bgColor?: string
  iconColor?: string
}>()
</script>

<style scoped>
.dsc {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  padding: 8px 12px;
  background: var(--cde-bg);
  border: 1px solid var(--cde-border);
  border-radius: 6px;
}

.dsc__text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.dsc__count {
  font-size: 16px;
  font-weight: 600;
  color: var(--cd-gray-900);
  font-variant-numeric: tabular-nums;
  line-height: 1.1;
}

.dsc__label {
  font-size: 10.5px;
  color: var(--cde-muted);
}
</style>
