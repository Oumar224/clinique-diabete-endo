<template>
  <div
    class="form-preview"
    :class="[`form-preview--${variant}`, { 'form-preview--hide-header': hideHeader }]"
  >
    <header
      v-if="!hideHeader"
      class="form-preview__header"
    >
      <span
        class="form-preview__accent"
        aria-hidden="true"
      />
      <div class="form-preview__title">
        {{ title }}
      </div>
      <span
        class="form-preview__icon"
        aria-hidden="true"
      >
        <svg
          viewBox="0 0 1024 1024"
          xmlns="http://www.w3.org/2000/svg"
          fill="currentColor"
        >
          <path
            d="M512 64a448 448 0 1 1 0 896.064A448 448 0 0 1 512 64m67.2 275.072c33.28 0 60.288-23.104 60.288-57.344s-27.072-57.344-60.288-57.344c-33.28 0-60.16 23.104-60.16 57.344s26.88 57.344 60.16 57.344M590.912 699.2c0-6.848 2.368-24.64 1.024-34.752l-52.608 60.544c-10.88 11.456-24.512 19.392-30.912 17.28a12.99 12.99 0 0 1-8.256-14.72l87.68-276.992c7.168-35.136-12.544-67.2-54.336-71.296-44.096 0-108.992 44.736-148.48 101.504 0 6.784-1.28 23.68.064 33.792l52.544-60.608c10.88-11.328 23.552-19.328 29.952-17.152a12.8 12.8 0 0 1 7.808 16.128L388.48 728.576c-10.048 32.256 8.96 63.872 55.04 71.04 67.84 0 107.904-43.648 147.456-100.416z"
          />
        </svg>
      </span>
      <div class="form-preview__spacer" />
      <button
        type="button"
        class="form-preview__zoom-btn"
        aria-label="Zoom arrière"
        :disabled="zoom <= MIN_ZOOM"
        @click.stop="zoomOut"
      >
        <span aria-hidden="true">A−</span>
      </button>
      <span class="form-preview__zoom-value">{{ Math.round(zoom * 100) }} %</span>
      <button
        type="button"
        class="form-preview__zoom-btn"
        aria-label="Zoom avant"
        :disabled="zoom >= MAX_ZOOM"
        @click.stop="zoomIn"
      >
        <span aria-hidden="true">A+</span>
      </button>
    </header>
    <div
      class="form-preview__zoom"
      :style="zoomStyle"
    >
      <el-empty
        v-if="!visibleFields.length"
        :description="emptyText"
        :image-size="40"
      />
      <div
        v-else
        class="form-preview__rows"
      >
        <div
          v-for="(field, idx) in visibleFields"
          :key="idx"
          class="form-preview__row"
          :class="{ 'form-preview__row--rich': field.rich, 'form-preview__row--hide-label': field.hideLabel }"
        >
          <span
            v-if="!field.hideLabel"
            class="form-preview__label"
          >{{ field.label }}</span>
          <span
            v-if="field.rich"
            class="form-preview__value"
            :class="{ 'form-preview__value--rich': field.rich }"
            v-html="String(field.value)"
          />
          <span
            v-else
            class="form-preview__value"
          >{{ field.value }}</span>
          <div
            v-if="field.key"
            class="form-preview__meta"
          >
            <span class="form-preview__updated">
              <template v-if="field.updatedAt">Modifié le {{ formatUpdatedAt(field.updatedAt) }}</template>
              <template v-else-if="field.tracked">Non modifié</template>
            </span>
            <button
              v-if="deletable"
              type="button"
              class="form-preview__delete"
              :aria-label="`Supprimer ${field.label}`"
              :title="`Supprimer ${field.label}`"
              @click.stop="onDeleteField(field)"
            >
              <Delete class="form-preview__delete-icon" aria-hidden="true" />
            </button>
            <button
              type="button"
              class="form-preview__edit"
              :aria-label="`Modifier ${field.label}`"
              :title="`Modifier ${field.label}`"
              @click="onEditField(field)"
            >
              <Edit class="form-preview__edit-icon" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { Delete, Edit } from '@element-plus/icons-vue'
import { formatUpdatedAt } from '@/utils/field-meta'

export interface FormPreviewField {
  label: string
  value?: string | number | boolean | null
  key?: string
  updatedAt?: string | null
  tracked?: boolean
  rich?: boolean
  hideLabel?: boolean
}

const props = withDefaults(defineProps<{
  title?: string
  fields: FormPreviewField[]
  emptyText?: string
  variant?: 'default' | 'compact'
  hideHeader?: boolean
  deletable?: boolean
}>(), {
  title: 'Aperçu',
  emptyText: 'Aucune valeur saisie',
  variant: 'default',
  hideHeader: false,
  deletable: false,
})

const emit = defineEmits<{ edit: [key: string]; delete: [key: string] }>()

const visibleFields = computed(() =>
  props.fields.filter(field => {
    const value = field.value
    return value !== undefined && value !== null && value !== '' && value !== false
  }),
)

const MIN_ZOOM = 0.75
const MAX_ZOOM = 1.5
const ZOOM_STEP = 0.125

const zoom = ref(1)
const zoomStyle = computed(() => ({ zoom: zoom.value }))

function zoomIn() {
  zoom.value = Math.min(MAX_ZOOM, Math.round((zoom.value + ZOOM_STEP) * 1000) / 1000)
}

function zoomOut() {
  zoom.value = Math.max(MIN_ZOOM, Math.round((zoom.value - ZOOM_STEP) * 1000) / 1000)
}

function onEditField(field: FormPreviewField) {
  if (field.key) emit('edit', field.key)
}

function onDeleteField(field: FormPreviewField) {
  if (field.key) emit('delete', field.key)
}
</script>

<style scoped>
.form-preview {
  border: 1px solid var(--cde-border);
  border-radius: 6px;
  background: var(--cde-surface);
  padding: 0 14px 10px;
  margin-top: 10px;
  overflow: hidden;
}

/* ── Slim title bar ─────────────────────────────────────────────── */
.form-preview__header {
  display: flex;
  align-items: center;
  gap: 7px;
  margin: 0 -14px 10px;
  padding: 7px 14px;
  border-bottom: 1px solid var(--cde-border);
  background: var(--cde-header-bg);
}
.form-preview__accent {
  width: 3px;
  height: 12px;
  border-radius: 2px;
  background: var(--cde-accent);
  flex-shrink: 0;
}
.form-preview__title {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  color: var(--el-text-color-secondary);
  min-width: 0;
}
.form-preview__icon {
  width: 13px;
  height: 13px;
  flex-shrink: 0;
  color: var(--el-color-primary-light-3);
}
.form-preview__icon svg {
  width: 100%;
  height: 100%;
  display: block;
}

/* ── Zoom controls ───────────────────────────────────────────────── */
.form-preview__spacer {
  flex: 1;
}
.form-preview__zoom-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 22px;
  padding: 0;
  border: 1px solid var(--cde-border-soft);
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.8);
  color: var(--el-text-color-secondary);
  font-size: 12px;
  line-height: 1;
  cursor: pointer;
  user-select: none;
}
.form-preview__zoom-btn:hover:not(:disabled) {
  border-color: var(--cd-primary);
  color: var(--cd-primary);
}
.form-preview__zoom-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
.form-preview__zoom-value {
  min-width: 42px;
  text-align: center;
  font-size: 11px;
  color: var(--el-text-color-secondary);
  user-select: none;
}
.form-preview__zoom {
  min-width: 0;
}

/* ── Value rows ─────────────────────────────────────────────────── */
.form-preview__rows {
  display: flex;
  flex-direction: column;
}
.form-preview__row {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: baseline;
  gap: 16px;
  padding: 5px 0;
  border-bottom: 1px dashed var(--cde-border-soft);
  font-size: 17px;
}
.form-preview__row:last-child {
  border-bottom: none;
}
.form-preview__label {
  color: var(--el-text-color-secondary);
  font-size: 12px;
  flex-shrink: 0;
}
.form-preview__value {
  color: var(--el-text-color-primary);
  font-weight: 600;
  text-align: right;
  line-height: 1.4;
  min-width: 0;
  overflow-wrap: anywhere;
}

/* ── Rich HTML value (RichTextEditor output) ─────────────────────── */
.form-preview__value--rich {
  text-align: left;
  font-weight: 400;
  overflow-wrap: anywhere;
}
.form-preview__value--rich :deep(p) {
  margin: 0 0 6px;
}
.form-preview__value--rich :deep(h1),
.form-preview__value--rich :deep(h2),
.form-preview__value--rich :deep(h3) {
  margin: 8px 0 6px;
  font-weight: 700;
}
.form-preview__value--rich :deep(h1) {
  font-size: 16px;
}
.form-preview__value--rich :deep(h2) {
  font-size: 14px;
}
.form-preview__value--rich :deep(h3) {
  font-size: 13px;
}
.form-preview__value--rich :deep(ul),
.form-preview__value--rich :deep(ol) {
  margin: 0 0 6px;
  padding-left: 18px;
}
.form-preview__value--rich :deep(li) {
  margin-bottom: 2px;
}
.form-preview__value--rich :deep(blockquote) {
  border-left: 3px solid var(--cde-border);
  margin: 6px 0;
  padding: 2px 8px;
  color: var(--cde-muted);
  font-style: italic;
}
.form-preview__value--rich :deep(pre) {
  background: var(--cde-surface-tint);
  border: 1px solid var(--cde-border-soft);
  padding: 8px;
  font-family: monospace;
  font-size: 11px;
  white-space: pre-wrap;
  margin: 6px 0;
}
.form-preview__value--rich :deep(code) {
  background: var(--cde-surface-tint);
  font-family: monospace;
  font-size: 11px;
  padding: 1px 3px;
}
.form-preview__value--rich :deep(hr) {
  border: none;
  border-top: 1px solid var(--cde-border);
  margin: 8px 0;
}
.form-preview__value--rich :deep(img) {
  max-width: 100%;
  height: auto;
}
.form-preview__value--rich :deep(img.is-left) {
  float: left;
  margin: 0 12px 6px 0;
  max-width: 45%;
}
.form-preview__value--rich :deep(img.is-right) {
  float: right;
  margin: 0 0 6px 12px;
  max-width: 45%;
}
.form-preview__value--rich :deep(img.is-center) {
  display: block;
  margin: 6px auto;
}
.form-preview__value--rich :deep(a) {
  color: var(--cde-accent);
  text-decoration: underline;
}

.form-preview__row--rich {
  flex-direction: column;
  align-items: stretch;
  gap: 6px;
}
.form-preview__row--rich .form-preview__label {
  font-weight: 700;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.form-preview__row--rich .form-preview__value--rich {
  width: 100%;
  text-align: left;
  font-weight: 400;
}
.form-preview__row--hide-label .form-preview__value--rich {
  width: 100%;
}

/* ── Meta line (updated-at + edit button) ────────────────────────── */
.form-preview__meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: auto;
}
.form-preview__updated {
  font-size: 11px;
  color: var(--el-text-color-placeholder);
}
.form-preview__edit {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  padding: 2px;
  cursor: pointer;
  color: var(--el-color-primary);
  line-height: 1;
}
.form-preview__edit:hover {
  color: var(--el-color-primary-dark-2);
}
.form-preview__edit-icon {
  width: 13px;
  height: 13px;
}
.form-preview__delete {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  padding: 2px;
  cursor: pointer;
  color: var(--cde-danger);
  line-height: 1;
}
.form-preview__delete:hover {
  opacity: 0.75;
}
.form-preview__delete-icon {
  width: 13px;
  height: 13px;
}

/* ── Empty state ────────────────────────────────────────────────── */
.form-preview :deep(.el-empty) {
  padding: 8px 0 2px;
}
.form-preview :deep(.el-empty__description) {
  color: var(--el-text-color-secondary);
  font-size: 12px;
}

/* ── Compact variant ────────────────────────────────────────────── */
.form-preview--compact {
  border-radius: 6px;
  padding: 0 10px 8px;
  margin-top: 8px;
}
.form-preview--compact .form-preview__header {
  gap: 6px;
  margin: 0 -10px 6px;
  padding: 5px 10px;
}
.form-preview--hide-header .form-preview__header {
  display: none;
}
.form-preview--compact .form-preview__title {
  font-size: 10px;
  letter-spacing: 0.6px;
}
.form-preview--compact .form-preview__accent {
  height: 10px;
}
.form-preview--compact .form-preview__icon {
  width: 12px;
  height: 12px;
}
.form-preview--compact .form-preview__zoom-btn {
  width: 22px;
  height: 20px;
  font-size: 11px;
}
.form-preview--compact .form-preview__zoom-value {
  min-width: 38px;
  font-size: 10px;
}
.form-preview--compact .form-preview__row {
  padding: 3px 0;
  font-size: 12px;
}
.form-preview--compact .form-preview__label {
  font-size: 11px;
}
.form-preview--compact .form-preview__updated,
.form-preview--compact .form-preview__edit,
.form-preview--compact .form-preview__delete {
  font-size: 10px;
}
</style>
