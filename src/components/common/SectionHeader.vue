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
  min-width: 0;
  max-width: 100%;
  overflow: hidden;
}

.section-header__bar {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 7px 12px 7px 13px;
  background: var(--cde-header-bg);
  color: var(--cde-header-text);
  font-size: 13px;
  font-weight: 600;
  user-select: none;
  border: 1px solid var(--cde-border);
  border-bottom: 1px solid var(--cde-border);
  border-radius: 4px 4px 0 0;
  box-shadow: inset 3px 0 0 var(--cde-accent);
}

/* Bandeau fermé : coins arrondis sur les quatre côtés */
.section-header:not(:has(.section-header__content)) .section-header__bar {
  border-radius: 4px;
}

.section-header--secondary .section-header__bar {
  padding: 6px 12px 6px 13px;
}

.section-header--tertiary .section-header__bar {
  padding: 5px 12px 5px 13px;
}

.section-header--collapsible .section-header__bar {
  cursor: pointer;
}

.section-header--collapsible .section-header__bar:hover {
  background: var(--cde-surface-tint);
}

.section-header__arrow {
  flex-shrink: 0;
  color: var(--cde-muted);
  transition: transform 0.15s ease;
}

.section-header__icon {
  flex-shrink: 0;
  color: var(--cde-accent);
}

.section-header__label {
  flex: 1;
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: var(--cde-header-text);
}

.section-header__badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border: 1px solid var(--cde-border);
  border-radius: 4px;
  background: var(--cde-accent-tint);
  color: var(--cde-accent-strong);
  font-size: 11px;
  font-weight: 600;
}

.section-header__actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 4px;
  margin-left: auto;
  flex-shrink: 0;
  min-width: 0;
}

.section-header__content {
  padding: 10px 12px;
  background: var(--cde-surface);
  border: 1px solid var(--cde-border);
  border-top: none;
  border-radius: 0 0 4px 4px;
  min-width: 0;
  max-width: 100%;
  overflow: hidden;
}
</style>
