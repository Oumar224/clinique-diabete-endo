<template>
  <div class="collapsible-section staged-section">
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
      <slot :draft="draft" :dirty="dirty" />
      <div class="staged-section__footer">
        <el-button
          size="small"
          :disabled="!dirty || readonly"
          @click="save"
        >
          Enregistrer
        </el-button>
        <el-button
          size="small"
          :disabled="!dirty || readonly"
          @click="cancel"
        >
          Annuler
        </el-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { ElMessageBox } from 'element-plus'
import { Plus, Minus, ArrowDown } from '@element-plus/icons-vue'

const props = withDefaults(defineProps<{
  title: string
  keys: string[]
  modelValue: Record<string, any>
  defaultOpen?: boolean
  readonly?: boolean
  badge?: number
}>(), {
  defaultOpen: false,
  readonly: false,
  badge: undefined,
})

const emit = defineEmits<{
  save: []
}>()

const open = ref(props.defaultOpen)

function cloneValue(key: string): unknown {
  const value = props.modelValue[key]
  if (value === undefined) return ''
  return JSON.parse(JSON.stringify(value))
}

function makeDraft(): Record<string, any> {
  const out: Record<string, any> = {}
  for (const key of props.keys) {
    out[key] = cloneValue(key)
  }
  return out
}

const draft = reactive<Record<string, any>>(makeDraft())

const dirty = computed(() =>
  props.keys.some(key => JSON.stringify(draft[key]) !== JSON.stringify(props.modelValue[key])),
)

function syncDraft() {
  const fresh = makeDraft()
  for (const key of props.keys) {
    draft[key] = fresh[key]
  }
}

function openSection() {
  syncDraft()
  open.value = true
}

function closeSection() {
  open.value = false
}

async function attemptClose() {
  if (dirty.value) {
    try {
      await ElMessageBox.confirm(
        'Des modifications non enregistrées seront perdues. Fermer sans enregistrer ?',
        'Modifications non enregistrées',
        { confirmButtonText: 'Fermer sans enregistrer', cancelButtonText: 'Rester', type: 'warning' },
      )
    } catch {
      return
    }
    syncDraft()
  }
  open.value = false
}

async function toggle() {
  if (open.value) {
    await attemptClose()
  } else {
    syncDraft()
    open.value = true
  }
}

function save() {
  for (const key of props.keys) {
    // eslint-disable-next-line vue/no-mutating-props -- commit volontaire dans l'objet réactif partagé pour déclencher le watcher parent
    props.modelValue[key] = JSON.parse(JSON.stringify(draft[key]))
  }
  emit('save')
  open.value = false
}

function cancel() {
  syncDraft()
  open.value = false
}

defineExpose({
  open: openSection,
  close: closeSection,
  toggle,
  isOpen: () => open.value,
  save,
  cancel,
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
.staged-section__footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--el-border-color-lighter);
}
</style>
