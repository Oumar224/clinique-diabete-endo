<template>
  <div class="sir">
    <span class="sir__label">{{ label }}</span>
    <span class="sir__value">{{ value || '—' }}</span>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  label: string
  value?: string | number | null
}>()
</script>

<style scoped>
.sir {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  padding: 2px 0;
  font-size: 12px;
}

.sir__label {
  color: var(--cde-muted);
}

.sir__value {
  font-variant-numeric: tabular-nums;
  text-align: right;
}
</style>
