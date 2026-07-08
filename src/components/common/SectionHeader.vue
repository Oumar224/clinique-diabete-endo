<template>
  <div class="section-header" :class="[`section-header--${level}`, { 'section-header--collapsible': collapsible }]">
    <div class="section-header__bar" @click="collapsible && toggle()">
      <el-icon v-if="collapsible" :size="14" class="section-header__arrow">
        <ArrowRight v-if="!isOpen" />
        <ArrowDown v-else />
      </el-icon>
      <el-icon v-if="icon" :size="16" class="section-header__icon">
        <component :is="icon" />
      </el-icon>
      <span class="section-header__label">{{ label }}</span>
      <span v-if="badge" class="section-header__badge">{{ badge }}</span>
      <div v-if="$slots.actions" class="section-header__actions">
        <slot name="actions" />
      </div>
    </div>
    <div v-if="!collapsible || isOpen" class="section-header__content">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { ArrowRight, ArrowDown } from '@element-plus/icons-vue'
import type { Component } from 'vue'

defineProps<{
  label: string
  icon?: Component
  level?: 'primary' | 'secondary' | 'tertiary'
  collapsible?: boolean
  defaultOpen?: boolean
  badge?: string | number
}>()

const isOpen = ref(true)

function toggle() {
  isOpen.value = !isOpen.value
}
</script>

<style scoped>
.section-header {
  margin-bottom: 6px;
}

.section-header__bar {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  background: var(--cd-primary);
  color: var(--cd-white);
  font-size: 13px;
  font-weight: 600;
  user-select: none;
  border-radius: 2px 2px 0 0;
}

.section-header--secondary .section-header__bar {
  background: var(--cd-primary-dark);
  font-size: 12px;
  padding: 4px 10px;
}

.section-header--tertiary .section-header__bar {
  background: var(--cd-gray-150);
  color: var(--cd-gray-900);
  font-size: 12px;
  padding: 3px 10px;
  border-bottom: 1px solid var(--cd-gray-200);
}

.section-header--collapsible .section-header__bar {
  cursor: pointer;
}

.section-header--collapsible .section-header__bar:hover {
  background: var(--cd-primary-dark);
}

.section-header--tertiary.section-header--collapsible .section-header__bar:hover {
  background: var(--cd-gray-200);
}

.section-header__arrow {
  flex-shrink: 0;
  transition: transform 0.15s ease;
}

.section-header__icon {
  flex-shrink: 0;
  opacity: 0.9;
}

.section-header__label {
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.section-header__badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: 2px;
  background: rgba(255, 255, 255, 0.2);
  font-size: 11px;
  font-weight: 700;
}

.section-header--tertiary .section-header__badge {
  background: var(--cd-gray-300);
  color: var(--cd-gray-900);
}

.section-header__actions {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-left: auto;
}

.section-header__content {
  padding: 8px;
  background: var(--cd-widget-bg);
  border: 1px solid var(--cd-gray-200);
  border-top: none;
}
</style>
