<template>
  <div class="dsc">
    <div class="dsc__icon-wrap" :style="{ background: bgColor || 'var(--cd-primary-light)' }">
      <el-icon :size="22" :color="iconColor || 'var(--cd-primary)'">
        <component :is="icon" />
      </el-icon>
    </div>
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
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: var(--cd-white);
  border-radius: 10px;
  border: 1px solid var(--cd-gray-200);
}

.dsc__icon-wrap {
  width: 44px;
  height: 44px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.dsc__text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.dsc__count {
  font-size: 22px;
  font-weight: 700;
  color: var(--cd-gray-900);
  font-variant-numeric: tabular-nums;
  line-height: 1;
}

.dsc__label {
  font-size: 12px;
  color: var(--cd-gray-400);
}
</style>
