<template>
  <div
    class="scp"
    role="radiogroup"
    :aria-label="ariaLabel"
  >
    <button
      v-for="c in colors"
      :key="c"
      class="scp__swatch"
      :class="{ 'scp__swatch--selected': modelValue === c }"
      :style="{ background: c }"
      role="radio"
      :aria-checked="modelValue === c"
      :aria-label="`Couleur ${c}`"
      @click="select(c)"
    >
      <el-icon v-if="modelValue === c" class="scp__check"><Check /></el-icon>
    </button>
  </div>
</template>

<script setup lang="ts">
import { Check } from '@element-plus/icons-vue'

const props = withDefaults(defineProps<{
  modelValue?: string | null
  ariaLabel?: string
}>(), {
  modelValue: null,
  ariaLabel: 'Couleur du service',
})

const emit = defineEmits<{
  'update:modelValue': [value: string | null]
}>()

const colors = [
  '#0E5C5B',
  '#0891B2',
  '#2563EB',
  '#7C3AED',
  '#DB2777',
  '#DC2626',
  '#EA580C',
  '#D97706',
  '#65A30D',
  '#16A34A',
  '#78716C',
  '#6B7280',
]

function select(c: string) {
  emit('update:modelValue', props.modelValue === c ? null : c)
}
</script>

<style scoped>
.scp {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.scp__swatch {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 2px solid transparent;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: border-color 0.2s, transform 0.15s;
  outline: none;
  padding: 0;
}

.scp__swatch:hover {
  transform: scale(1.15);
}

.scp__swatch:focus-visible {
  box-shadow: 0 0 0 2px var(--cd-primary-light);
}

.scp__swatch--selected {
  border-color: var(--cd-gray-900);
  transform: scale(1.1);
}

.scp__check {
  color: #fff;
  font-size: 16px;
  font-weight: 700;
}
</style>
