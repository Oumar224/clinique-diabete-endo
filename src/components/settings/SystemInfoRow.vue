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
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid var(--cd-gray-200);
}

.sir:last-child {
  border-bottom: none;
}

.sir__label {
  font-size: 14px;
  color: var(--cd-gray-400);
}

.sir__value {
  font-size: 14px;
  font-weight: 600;
  color: var(--cd-gray-900);
  font-variant-numeric: tabular-nums;
}
</style>
