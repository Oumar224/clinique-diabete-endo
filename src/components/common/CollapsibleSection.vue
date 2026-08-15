<template>
  <div class="collapsible-section">
    <div
      class="collapsible-section__header"
      role="button"
      :aria-expanded="open"
      tabindex="0"
      @click="toggle"
      @keydown.enter.prevent="toggle"
      @keydown.space.prevent="toggle"
    >
      <div class="collapsible-section__header-left">
        <el-icon class="collapsible-section__header-icon" aria-hidden="true">
          <Plus v-if="!open" />
          <Minus v-else />
        </el-icon>
        <span class="collapsible-section__title">{{ title }}</span>
        <el-badge v-if="badge != null" :value="badge" class="collapsible-section__badge" />
      </div>
      <el-icon class="collapsible-section__arrow" :class="{ 'collapsible-section__arrow--open': open }">
        <ArrowDown />
      </el-icon>
    </div>
    <div v-show="open" class="collapsible-section__body">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Plus, Minus, ArrowDown } from '@element-plus/icons-vue'

const props = withDefaults(defineProps<{
  title: string
  defaultOpen?: boolean
  badge?: number
}>(), {
  defaultOpen: false,
  badge: undefined,
})

const open = ref(props.defaultOpen)

function toggle() {
  open.value = !open.value
}

function openSection() {
  open.value = true
}

function closeSection() {
  open.value = false
}

defineExpose({
  open: openSection,
  close: closeSection,
  toggle,
  isOpen: () => open.value,
})
</script>

<style scoped>
.collapsible-section {
  border: 1px solid var(--cd-gray-200);
  border-radius: 6px;
  overflow: hidden;
  margin-bottom: 16px;
}
.collapsible-section__header {
  background: linear-gradient(135deg, var(--cd-primary), #2E86C1);
  color: #fff;
  padding: 10px 14px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  user-select: none;
  transition: opacity 0.15s;
}
.collapsible-section__header:hover { opacity: 0.92; }
.collapsible-section__header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}
.collapsible-section__header-icon { font-size: 16px; }
.collapsible-section__title { font-size: 13px; font-weight: 600; }
.collapsible-section__badge :deep(.el-badge__content) {
  background: rgba(255, 255, 255, 0.3);
  border: none;
}
.collapsible-section__arrow { transition: transform 0.25s ease; font-size: 14px; }
.collapsible-section__arrow--open { transform: rotate(180deg); }
.collapsible-section__body { padding: 14px; background: #fff; }
</style>
