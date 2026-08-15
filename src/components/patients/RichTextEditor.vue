<template>
  <div class="rich-editor" :class="{ 'is-readonly': readonly, 'is-focused': isFocused, 'is-empty': isEmpty }">
    <div v-if="!readonly" class="rich-editor__toolbar">
      <!-- Annuler / Rétablir -->
      <button
        type="button"
        aria-label="Annuler (Ctrl+Z)"
        title="Annuler (Ctrl+Z)"
        :disabled="!editor?.can().undo()"
        @click="editor?.chain().focus().undo().run(); emit('change')"
      >
        <Icon icon="mdi:undo" />
      </button>
      <button
        type="button"
        aria-label="Rétablir (Ctrl+Y)"
        title="Rétablir (Ctrl+Y)"
        :disabled="!editor?.can().redo()"
        @click="editor?.chain().focus().redo().run(); emit('change')"
      >
        <Icon icon="mdi:redo" />
      </button>

      <span class="toolbar-separator" />

      <!-- Style -->
      <button
        type="button"
        :class="{ 'is-active': editor?.isActive('paragraph') }"
        aria-label="Paragraphe"
        title="Paragraphe"
        @click="editor?.chain().focus().setParagraph().run(); emit('change')"
      >
        <Icon icon="mdi:format-paragraph" />
      </button>
      <button
        type="button"
        :class="{ 'is-active': editor?.isActive('heading', { level: 1 }) }"
        aria-label="Titre 1"
        title="Titre 1"
        @click="editor?.chain().focus().toggleHeading({ level: 1 }).run(); emit('change')"
      >
        <Icon icon="mdi:format-header-1" />
      </button>
      <button
        type="button"
        :class="{ 'is-active': editor?.isActive('heading', { level: 2 }) }"
        aria-label="Titre 2"
        title="Titre 2"
        @click="editor?.chain().focus().toggleHeading({ level: 2 }).run(); emit('change')"
      >
        <Icon icon="mdi:format-header-2" />
      </button>
      <button
        type="button"
        :class="{ 'is-active': editor?.isActive('heading', { level: 3 }) }"
        aria-label="Titre 3"
        title="Titre 3"
        @click="editor?.chain().focus().toggleHeading({ level: 3 }).run(); emit('change')"
      >
        <Icon icon="mdi:format-header-3" />
      </button>

      <span class="toolbar-separator" />

      <!-- Police -->
      <el-select
        :model-value="currentFontFamily"
        class="toolbar-select"
        aria-label="Famille de police"
        @update:model-value="applyFontFamily"
      >
        <el-option
          v-for="f in FONT_FAMILIES"
          :key="f"
          :label="f || 'Par défaut'"
          :value="f"
        />
      </el-select>
      <el-select
        :model-value="currentFontSize"
        class="toolbar-select toolbar-select--size"
        aria-label="Taille de police"
        @update:model-value="applyFontSize"
      >
        <el-option
          v-for="s in FONT_SIZES"
          :key="s"
          :label="s === '' ? 'Par défaut' : String(s)"
          :value="s"
        />
      </el-select>
      <button
        type="button"
        aria-label="Agrandir la police"
        title="Agrandir la police (A+)"
        @click="bumpFontSize(2)"
      >
        <Icon icon="mdi:format-font-size-increase" />
      </button>
      <button
        type="button"
        aria-label="Réduire la police"
        title="Réduire la police (A−)"
        @click="bumpFontSize(-2)"
      >
        <Icon icon="mdi:format-font-size-decrease" />
      </button>

      <span class="toolbar-separator" />

      <!-- Attributs de caractère -->
      <button
        type="button"
        :class="{ 'is-active': editor?.isActive('bold') }"
        aria-label="Gras (Ctrl+B)"
        title="Gras (Ctrl+B)"
        @click="editor?.chain().focus().toggleBold().run(); emit('change')"
      >
        <Icon icon="mdi:format-bold" />
      </button>
      <button
        type="button"
        :class="{ 'is-active': editor?.isActive('italic') }"
        aria-label="Italique (Ctrl+I)"
        title="Italique (Ctrl+I)"
        @click="editor?.chain().focus().toggleItalic().run(); emit('change')"
      >
        <Icon icon="mdi:format-italic" />
      </button>
      <button
        type="button"
        :class="{ 'is-active': editor?.isActive('underline') }"
        aria-label="Souligné (Ctrl+U)"
        title="Souligné (Ctrl+U)"
        @click="editor?.chain().focus().toggleUnderline().run(); emit('change')"
      >
        <Icon icon="mdi:format-underline" />
      </button>
      <button
        type="button"
        :class="{ 'is-active': editor?.isActive('strike') }"
        aria-label="Barré"
        title="Barré"
        @click="editor?.chain().focus().toggleStrike().run(); emit('change')"
      >
        <Icon icon="mdi:format-strikethrough" />
      </button>
      <button
        type="button"
        :class="{ 'is-active': editor?.isActive('subscript') }"
        aria-label="Indice"
        title="Indice"
        @click="editor?.chain().focus().toggleSubscript().run(); emit('change')"
      >
        <Icon icon="mdi:format-subscript" />
      </button>
      <button
        type="button"
        :class="{ 'is-active': editor?.isActive('superscript') }"
        aria-label="Exposant"
        title="Exposant"
        @click="editor?.chain().focus().toggleSuperscript().run(); emit('change')"
      >
        <Icon icon="mdi:format-superscript" />
      </button>
      <button
        type="button"
        :class="{ 'is-active': editor?.isActive('highlight') }"
        aria-label="Surligner"
        title="Surligner"
        @click="editor?.chain().focus().toggleHighlight().run(); emit('change')"
      >
        <Icon icon="mdi:format-color-highlight" />
      </button>
      <div class="color-picker-wrapper" @mouseleave="showColorPicker = false">
        <button
          type="button"
          aria-label="Couleur du texte"
          title="Couleur du texte"
          @click="showColorPicker = !showColorPicker"
        >
          <span class="color-icon">
            <span class="color-bar" :style="{ background: editor?.getAttributes('textStyle').color || '#000' }" />
            A
          </span>
        </button>
        <div v-if="showColorPicker" class="color-dropdown">
          <button
            v-for="c in presetColors"
            :key="c.value"
            type="button"
            class="color-swatch"
            :style="{ background: c.value }"
            :title="c.label"
            :aria-label="c.label"
            @click="setColor(c.value)"
          />
        </div>
      </div>

      <span class="toolbar-separator" />

      <!-- Listes & retraits -->
      <button
        type="button"
        :class="{ 'is-active': editor?.isActive('bulletList') }"
        aria-label="Liste à puces"
        title="Liste à puces"
        @click="editor?.chain().focus().toggleBulletList().run(); emit('change')"
      >
        <Icon icon="mdi:format-list-bulleted" />
      </button>
      <button
        type="button"
        :class="{ 'is-active': editor?.isActive('orderedList') }"
        aria-label="Liste numérotée"
        title="Liste numérotée"
        @click="editor?.chain().focus().toggleOrderedList().run(); emit('change')"
      >
        <Icon icon="mdi:format-list-numbered" />
      </button>
      <button
        type="button"
        aria-label="Réduire le retrait"
        title="Réduire le retrait"
        @click="editor?.chain().focus().liftListItem('listItem').run(); emit('change')"
      >
        <Icon icon="mdi:format-indent-decrease" />
      </button>
      <button
        type="button"
        aria-label="Augmenter le retrait"
        title="Augmenter le retrait"
        @click="editor?.chain().focus().sinkListItem('listItem').run(); emit('change')"
      >
        <Icon icon="mdi:format-indent-increase" />
      </button>

      <span class="toolbar-separator" />

      <!-- Alignement du texte -->
      <button
        type="button"
        :class="{ 'is-active': editor?.isActive({ textAlign: 'left' }) }"
        aria-label="Aligner à gauche"
        title="Aligner à gauche"
        @click="editor?.chain().focus().setTextAlign('left').run(); emit('change')"
      >
        <Icon icon="mdi:format-align-left" />
      </button>
      <button
        type="button"
        :class="{ 'is-active': editor?.isActive({ textAlign: 'center' }) }"
        aria-label="Centrer"
        title="Centrer"
        @click="editor?.chain().focus().setTextAlign('center').run(); emit('change')"
      >
        <Icon icon="mdi:format-align-center" />
      </button>
      <button
        type="button"
        :class="{ 'is-active': editor?.isActive({ textAlign: 'right' }) }"
        aria-label="Aligner à droite"
        title="Aligner à droite"
        @click="editor?.chain().focus().setTextAlign('right').run(); emit('change')"
      >
        <Icon icon="mdi:format-align-right" />
      </button>
      <button
        type="button"
        :class="{ 'is-active': editor?.isActive({ textAlign: 'justify' }) }"
        aria-label="Justifier"
        title="Justifier"
        @click="editor?.chain().focus().setTextAlign('justify').run(); emit('change')"
      >
        <Icon icon="mdi:format-align-justify" />
      </button>

      <span class="toolbar-separator" />

      <!-- Insertion -->
      <button
        type="button"
        aria-label="Insérer une image"
        title="Insérer une image"
        @click="fileInput?.click()"
      >
        <Icon icon="mdi:image" />
      </button>
      <button
        type="button"
        :class="{ 'is-active': editor?.isActive('link') }"
        aria-label="Insérer un lien"
        title="Insérer un lien"
        @click="showLinkInput = !showLinkInput"
      >
        <Icon icon="mdi:link" />
      </button>
      <button
        type="button"
        aria-label="Ligne horizontale"
        title="Ligne horizontale"
        @click="editor?.chain().focus().setHorizontalRule().run(); emit('change')"
      >
        <Icon icon="mdi:minus" />
      </button>

      <span class="toolbar-separator" />

      <!-- Divers -->
      <button
        type="button"
        :class="{ 'is-active': editor?.isActive('blockquote') }"
        aria-label="Citation"
        title="Citation"
        @click="editor?.chain().focus().toggleBlockquote().run(); emit('change')"
      >
        <Icon icon="mdi:format-quote-close" />
      </button>
      <button
        type="button"
        :class="{ 'is-active': editor?.isActive('code') }"
        aria-label="Code en ligne"
        title="Code en ligne"
        @click="editor?.chain().focus().toggleCode().run(); emit('change')"
      >
        <Icon icon="mdi:code-tags" />
      </button>
      <button
        type="button"
        :class="{ 'is-active': editor?.isActive('codeBlock') }"
        aria-label="Bloc de code"
        title="Bloc de code"
        @click="editor?.chain().focus().toggleCodeBlock().run(); emit('change')"
      >
        <Icon icon="mdi:code-braces" />
      </button>
      <button
        type="button"
        aria-label="Effacer le formatage"
        title="Effacer le formatage"
        @click="editor?.chain().focus().clearNodes().unsetAllMarks().run(); emit('change')"
      >
        <Icon icon="mdi:format-clear" />
      </button>

      <!-- Alignement d'image (visible quand une image est sélectionnée) -->
      <div
        v-if="editor?.isActive('image')"
        class="image-align-group"
      >
        <span class="toolbar-separator" />
        <button
          type="button"
          :class="{ 'is-active': imageClass() === 'is-left' }"
          aria-label="Image à gauche"
          title="Image à gauche"
          @click="alignImage('left')"
        >
          <Icon icon="mdi:format-align-left" />
        </button>
        <button
          type="button"
          :class="{ 'is-active': imageClass() === 'is-center' }"
          aria-label="Image centrée"
          title="Image centrée"
          @click="alignImage('center')"
        >
          <Icon icon="mdi:format-align-center" />
        </button>
        <button
          type="button"
          :class="{ 'is-active': imageClass() === 'is-right' }"
          aria-label="Image à droite"
          title="Image à droite"
          @click="alignImage('right')"
        >
          <Icon icon="mdi:format-align-right" />
        </button>
      </div>

      <!-- Link input popup -->
      <div
        v-if="showLinkInput"
        class="link-input-popup"
      >
        <input
          v-model="linkUrl"
          type="url"
          placeholder="https://..."
          class="link-input"
          aria-label="Adresse du lien"
          @keyup.enter="setLink"
          @keyup.escape="showLinkInput = false"
        >
        <button
          type="button"
          class="link-confirm"
          aria-label="Appliquer le lien"
          @click="setLink"
        >
          OK
        </button>
        <button
          type="button"
          class="link-cancel"
          aria-label="Annuler le lien"
          @click="showLinkInput = false; linkUrl = ''"
        >
          ✕
        </button>
      </div>

      <!-- Sélecteur d'image caché -->
      <input
        ref="fileInput"
        type="file"
        accept="image/*"
        class="rich-editor__file-input"
        @change="onFileInputChange"
      >
    </div>
    <editor-content :editor="editor" class="rich-editor__content" />
  </div>
</template>

<script lang="ts">
/**
 * Constantes et logique pure de validation d'image, exportées séparément du
 * composant pour rester testables sans dépendre de tiptap.
 */
export const MAX_IMAGE_SIZE = 2 * 1024 * 1024
export const MAX_FIELD_HTML_SIZE = 3 * 1024 * 1024

/** `true` si l'ajout de `newDataUrl` au HTML courant du champ dépasserait la limite totale. */
export function wouldExceedLimit(newDataUrl: string, currentHtml: string): boolean {
  return currentHtml.length + newDataUrl.length > MAX_FIELD_HTML_SIZE
}
</script>

<script setup lang="ts">
import { ref, computed, watch, onBeforeUnmount } from 'vue'
import { useEditor, EditorContent } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import { Color } from '@tiptap/extension-color'
import FontFamily from '@tiptap/extension-font-family'
import { TextStyle, FontSize } from '@tiptap/extension-text-style'
import Highlight from '@tiptap/extension-highlight'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import TextAlign from '@tiptap/extension-text-align'
import Subscript from '@tiptap/extension-subscript'
import Superscript from '@tiptap/extension-superscript'
import Image from '@tiptap/extension-image'
import { ElMessage } from 'element-plus'
import { Icon, addCollection } from '@iconify/vue'
import type { IconifyJSON } from '@iconify/types'
import { isRichTextEmpty } from '@/utils/rich-text'

/**
 * Sous-ensemble Material Design Icons embarqué localement (extrait de
 * `@iconify-json/mdi/icons.json`, icônes vérifiées présentes dans la collection)
 * pour que la toolbar fonctionne hors ligne, sans dépendre de l'API Iconify.
 */
const mdiToolbarIcons: IconifyJSON = {
  prefix: 'mdi',
  icons: {
    'format-bold': { body: '<path fill="currentColor" d="M13.5 15.5H10v-3h3.5A1.5 1.5 0 0 1 15 14a1.5 1.5 0 0 1-1.5 1.5m-3.5-9h3A1.5 1.5 0 0 1 14.5 8A1.5 1.5 0 0 1 13 9.5h-3m5.6 1.29c.97-.68 1.65-1.79 1.65-2.79c0-2.26-1.75-4-4-4H7v14h7.04c2.1 0 3.71-1.7 3.71-3.79c0-1.52-.86-2.82-2.15-3.42"/>', width: 24, height: 24 },
    'format-italic': { body: '<path fill="currentColor" d="M10 4v3h2.21l-3.42 8H6v3h8v-3h-2.21l3.42-8H18V4z"/>', width: 24, height: 24 },
    'format-underline': { body: '<path fill="currentColor" d="M5 21h14v-2H5zm7-4a6 6 0 0 0 6-6V3h-2.5v8a3.5 3.5 0 0 1-3.5 3.5A3.5 3.5 0 0 1 8.5 11V3H6v8a6 6 0 0 0 6 6"/>', width: 24, height: 24 },
    'format-strikethrough': { body: '<path fill="currentColor" d="M3 14h18v-2H3m2-8v3h5v3h4V7h5V4m-9 15h4v-3h-4z"/>', width: 24, height: 24 },
    'format-align-left': { body: '<path fill="currentColor" d="M3 3h18v2H3zm0 4h12v2H3zm0 4h18v2H3zm0 4h12v2H3zm0 4h18v2H3z"/>', width: 24, height: 24 },
    'format-align-center': { body: '<path fill="currentColor" d="M3 3h18v2H3zm4 4h10v2H7zm-4 4h18v2H3zm4 4h10v2H7zm-4 4h18v2H3z"/>', width: 24, height: 24 },
    'format-align-right': { body: '<path fill="currentColor" d="M3 3h18v2H3zm6 4h12v2H9zm-6 4h18v2H3zm6 4h12v2H9zm-6 4h18v2H3z"/>', width: 24, height: 24 },
    'format-align-justify': { body: '<path fill="currentColor" d="M3 3h18v2H3zm0 4h18v2H3zm0 4h18v2H3zm0 4h18v2H3zm0 4h18v2H3z"/>', width: 24, height: 24 },
    'format-list-bulleted': { body: '<path fill="currentColor" d="M7 5h14v2H7zm0 8v-2h14v2zM4 4.5A1.5 1.5 0 0 1 5.5 6A1.5 1.5 0 0 1 4 7.5A1.5 1.5 0 0 1 2.5 6A1.5 1.5 0 0 1 4 4.5m0 6A1.5 1.5 0 0 1 5.5 12A1.5 1.5 0 0 1 4 13.5A1.5 1.5 0 0 1 2.5 12A1.5 1.5 0 0 1 4 10.5M7 19v-2h14v2zm-3-2.5A1.5 1.5 0 0 1 5.5 18A1.5 1.5 0 0 1 4 19.5A1.5 1.5 0 0 1 2.5 18A1.5 1.5 0 0 1 4 16.5"/>', width: 24, height: 24 },
    'format-list-numbered': { body: '<path fill="currentColor" d="M7 13v-2h14v2zm0 6v-2h14v2zM7 7V5h14v2zM3 8V5H2V4h2v4zm-1 9v-1h3v4H2v-1h2v-.5H3v-1h1V17zm2.25-7a.75.75 0 0 1 .75.75c0 .2-.08.39-.21.52L3.12 13H5v1H2v-.92L4 11H2v-1z"/>', width: 24, height: 24 },
    'format-indent-increase': { body: '<path fill="currentColor" d="M11 13h10v-2H11m0-2h10V7H11M3 3v2h18V3M11 17h10v-2H11M3 8v8l4-4m-4 9h18v-2H3z"/>', width: 24, height: 24 },
    'format-indent-decrease': { body: '<path fill="currentColor" d="M11 13h10v-2H11m0-2h10V7H11M3 3v2h18V3M3 21h18v-2H3m0-7l4 4V8m4 9h10v-2H11z"/>', width: 24, height: 24 },
    'format-header-1': { body: '<path fill="currentColor" d="M3 4h2v6h4V4h2v14H9v-6H5v6H3zm11 14v-2h2V6.31l-2.5 1.44V5.44L16 4h2v12h2v2z"/>', width: 24, height: 24 },
    'format-header-2': { body: '<path fill="currentColor" d="M3 4h2v6h4V4h2v14H9v-6H5v6H3zm18 14h-6a2 2 0 0 1-2-2c0-.53.2-1 .54-1.36l4.87-5.23c.37-.36.59-.86.59-1.41a2 2 0 0 0-2-2a2 2 0 0 0-2 2h-2a4 4 0 0 1 4-4a4 4 0 0 1 4 4c0 1.1-.45 2.1-1.17 2.83L15 16h6z"/>', width: 24, height: 24 },
    'format-header-3': { body: '<path fill="currentColor" d="M3 4h2v6h4V4h2v14H9v-6H5v6H3zm12 0h4a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2v-1h2v1h4v-4h-4v-2h4V6h-4v1h-2V6a2 2 0 0 1 2-2"/>', width: 24, height: 24 },
    'format-quote-close': { body: '<path fill="currentColor" d="M14 17h3l2-4V7h-6v6h3M6 17h3l2-4V7H5v6h3z"/>', width: 24, height: 24 },
    'format-clear': { body: '<path fill="currentColor" d="M6 5v.18L8.82 8h2.4l-.72 1.68l2.1 2.1L14.21 8H20V5zM3.27 5L2 6.27l6.97 6.97L6.5 19h3l1.57-3.66L16.73 21L18 19.73L3.55 5.27z"/>', width: 24, height: 24 },
    'format-color-highlight': { body: '<path fill="currentColor" d="m4 17l2.75-2.75l-.03-.02c-.58-.59-.58-1.54 0-2.12l4.74-4.74l4.24 4.24l-4.74 4.74c-.57.58-1.5.58-2.09.02l-.63.63zM15.91 2.91c.59-.58 1.54-.58 2.12 0l2.13 2.12c.58.59.58 1.54 0 2.13l-3.3 3.29l-4.24-4.24z"/>', width: 24, height: 24 },
    'minus': { body: '<path fill="currentColor" d="M19 13H5v-2h14z"/>', width: 24, height: 24 },
    'code-tags': { body: '<path fill="currentColor" d="m14.6 16.6l4.6-4.6l-4.6-4.6L16 6l6 6l-6 6zm-5.2 0L4.8 12l4.6-4.6L8 6l-6 6l6 6z"/>', width: 24, height: 24 },
    'code-braces': { body: '<path fill="currentColor" d="M8 3a2 2 0 0 0-2 2v4a2 2 0 0 1-2 2H3v2h1a2 2 0 0 1 2 2v4a2 2 0 0 0 2 2h2v-2H8v-5a2 2 0 0 0-2-2a2 2 0 0 0 2-2V5h2V3m6 0a2 2 0 0 1 2 2v4a2 2 0 0 0 2 2h1v2h-1a2 2 0 0 0-2 2v4a2 2 0 0 1-2 2h-2v-2h2v-5a2 2 0 0 1 2-2a2 2 0 0 1-2-2V5h-2V3z"/>', width: 24, height: 24 },
    'undo': { body: '<path fill="currentColor" d="M12.5 8c-2.65 0-5.05 1-6.9 2.6L2 7v9h9l-3.62-3.62c1.39-1.16 3.16-1.88 5.12-1.88c3.54 0 6.55 2.31 7.6 5.5l2.37-.78C21.08 11.03 17.15 8 12.5 8"/>', width: 24, height: 24 },
    'redo': { body: '<path fill="currentColor" d="M18.4 10.6C16.55 9 14.15 8 11.5 8c-4.65 0-8.58 3.03-9.96 7.22L3.9 16a8 8 0 0 1 7.6-5.5c1.95 0 3.73.72 5.12 1.88L13 16h9V7z"/>', width: 24, height: 24 },
    'link': { body: '<path fill="currentColor" d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7a5 5 0 0 0-5 5a5 5 0 0 0 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1M8 13h8v-2H8zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4a5 5 0 0 0 5-5a5 5 0 0 0-5-5"/>', width: 24, height: 24 },
    'image': { body: '<path fill="currentColor" d="m8.5 13.5l2.5 3l3.5-4.5l4.5 6H5m16 1V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2"/>', width: 24, height: 24 },
    'format-subscript': { body: '<path fill="currentColor" d="M16 7.41L11.41 12L16 16.59L14.59 18L10 13.41L5.41 18L4 16.59L8.59 12L4 7.41L5.41 6L10 10.59L14.59 6zm5.85 13.62h-4.88v-1l.89-.8c.76-.65 1.32-1.19 1.7-1.63c.37-.44.56-.85.57-1.24a.9.9 0 0 0-.27-.7c-.18-.16-.47-.28-.86-.28c-.31 0-.58.06-.84.18l-.66.38l-.45-1.17c.27-.21.59-.39.98-.53s.82-.24 1.29-.24c.78.04 1.38.25 1.78.66s.62.93.62 1.57c-.01.56-.19 1.08-.54 1.55c-.34.47-.76.92-1.27 1.36l-.64.52v.02h2.58z"/>', width: 24, height: 24 },
    'format-superscript': { body: '<path fill="currentColor" d="M16 7.41L11.41 12L16 16.59L14.59 18L10 13.41L5.41 18L4 16.59L8.59 12L4 7.41L5.41 6L10 10.59L14.59 6zM21.85 9h-4.88V8l.89-.82c.76-.64 1.32-1.18 1.7-1.63q.555-.66.57-1.23a.88.88 0 0 0-.27-.7c-.18-.19-.47-.28-.86-.29c-.31.01-.58.07-.84.17l-.66.39l-.45-1.17c.27-.22.59-.39.98-.53S18.85 2 19.32 2c.78 0 1.38.2 1.78.61c.4.39.62.93.62 1.57c-.01.56-.19 1.08-.54 1.55c-.34.48-.76.93-1.27 1.36l-.64.52v.02h2.58z"/>', width: 24, height: 24 },
    'format-paragraph': { body: '<path fill="currentColor" d="M13 4a4 4 0 0 1 4 4a4 4 0 0 1-4 4h-2v6H9V4zm0 6a2 2 0 0 0 2-2a2 2 0 0 0-2-2h-2v4z"/>', width: 24, height: 24 },
    'format-font-size-increase': { body: '<path fill="currentColor" d="M5.12 14L7.5 7.67L9.87 14M6.5 5L1 19h2.25l1.12-3h6.25l1.13 3H14L8.5 5zM18 7l-5 5.07l1.41 1.43L17 10.9V17h2v-6.1l2.59 2.6L23 12.07z"/>', width: 24, height: 24 },
    'format-font-size-decrease': { body: '<path fill="currentColor" d="M5.12 14L7.5 7.67L9.87 14M6.5 5L1 19h2.25l1.12-3h6.25l1.13 3H14L8.5 5zM18 17l5-5.07l-1.41-1.43L19 13.1V7h-2v6.1l-2.59-2.6L13 11.93z"/>', width: 24, height: 24 },
  },
}

addCollection(mdiToolbarIcons)

const props = withDefaults(defineProps<{
  modelValue: string
  readonly?: boolean
  rows?: number
  placeholder?: string
  /** When true, pressing Enter (without Shift) inserts a timestamp line `[dd/mm/yyyy hh:mm]` at the cursor instead of a new paragraph. */
  timestampOnEnter?: boolean
}>(), {
  readonly: false,
  rows: 3,
  placeholder: '',
  timestampOnEnter: false,
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
  change: []
}>()

const isFocused = ref(false)

const isEmpty = computed(() => isRichTextEmpty(props.modelValue))

const minHeight = `${Math.max(props.rows, 2) * 24}px`

/* ── Constantes de mise en forme ── */

const FONT_FAMILIES = [
  '',
  'Inter',
  'Arial',
  'Georgia',
  'Times New Roman',
  'Courier New',
  'Verdana',
  'Tahoma',
  'Segoe UI',
  'Comic Sans MS',
]

const FONT_SIZES: Array<string | number> = [
  '', 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 22, 24, 26, 28, 32, 36, 40, 44, 48, 56, 64, 72,
]

const FONT_SIZE_MIN = 8
const FONT_SIZE_MAX = 72
const DEFAULT_FONT_SIZE = 16

/* ── Valeurs courantes (réactives aux transactions de l'éditeur) ── */

const currentFontFamily = computed(() => {
  const family = editor.value?.getAttributes('textStyle').fontFamily as string | undefined
  return family || ''
})

const currentFontSize = computed<number | string>(() => {
  const raw = editor.value?.getAttributes('textStyle').fontSize
  if (!raw) return ''
  const parsed = parseInt(String(raw), 10)
  return Number.isFinite(parsed) ? parsed : ''
})

function imageClass(): string {
  return (editor.value?.getAttributes('image')?.class as string | undefined) ?? ''
}

/* ── Timestamp on Enter ── */
function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

/** Formats a date as `[dd/mm/yyyy hh:mm] ` (trailing space so the user keeps typing after the stamp). */
function formatTimestamp(date: Date): string {
  const dd = pad2(date.getDate())
  const mm = pad2(date.getMonth() + 1)
  const yyyy = date.getFullYear()
  const hh = pad2(date.getHours())
  const mi = pad2(date.getMinutes())
  return `[${dd}/${mm}/${yyyy} ${hh}:${mi}] `
}

/* ── Commandes de mise en forme ── */

function applyFontFamily(value: string) {
  if (value) {
    editor.value?.chain().focus().setFontFamily(value).run()
  } else {
    editor.value?.chain().focus().unsetFontFamily().run()
  }
  emit('change')
}

function applyFontSize(value: string | number) {
  if (value === '' || value == null) {
    editor.value?.chain().focus().unsetFontSize().run()
  } else {
    editor.value?.chain().focus().setFontSize(`${value}px`).run()
  }
  emit('change')
}

function bumpFontSize(delta: number) {
  const raw = editor.value?.getAttributes('textStyle').fontSize
  const current = raw ? parseInt(String(raw), 10) : DEFAULT_FONT_SIZE
  const size = Math.min(FONT_SIZE_MAX, Math.max(FONT_SIZE_MIN, (Number.isFinite(current) ? current : DEFAULT_FONT_SIZE) + delta))
  editor.value?.chain().focus().setFontSize(`${size}px`).run()
  emit('change')
}

function alignImage(align: 'left' | 'center' | 'right') {
  const cls = align === 'left' ? 'is-left' : align === 'center' ? 'is-center' : 'is-right'
  editor.value?.chain().focus().updateAttributes('image', { class: cls }).run()
  emit('change')
}

/* ── Images ── */

const fileInput = ref<HTMLInputElement | null>(null)

function insertImageFile(file: File) {
  if (!file.type.startsWith('image/')) {
    ElMessage.warning('Fichier non image ignoré')
    return
  }
  if (file.size > MAX_IMAGE_SIZE) {
    ElMessage.error('Image trop lourde (max 2 Mo)')
    return
  }
  const reader = new FileReader()
  reader.onerror = () => {
    ElMessage.error("Impossible de lire l'image")
  }
  reader.onload = () => {
    const src = reader.result
    if (typeof src === 'string') {
      const currentHtml = editor.value?.getHTML() ?? ''
      if (wouldExceedLimit(src, currentHtml)) {
        ElMessage.error('Taille maximale du champ atteinte (3 Mo)')
        return
      }
      editor.value?.chain().focus().setImage({ src }).run()
      emit('change')
    }
  }
  reader.readAsDataURL(file)
}

function onFileInputChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) {
    insertImageFile(file)
  }
  input.value = ''
}

const editor = useEditor({
  content: props.modelValue || '',
  editable: !props.readonly,
  extensions: [
    StarterKit,
    Underline,
    TextStyle,
    FontFamily,
    FontSize,
    Color,
    Highlight.configure({ multicolor: true }),
    Link.configure({ openOnClick: false, HTMLAttributes: { class: 'editor-link' } }),
    Placeholder.configure({ placeholder: props.placeholder || 'Saisissez du texte...' }),
    TextAlign.configure({ types: ['heading', 'paragraph'] }),
    Subscript,
    Superscript,
    Image.configure({ allowBase64: true }),
  ],
  editorProps: {
    attributes: {
      style: `min-height: ${minHeight};`,
    },
    handleKeyDown: (_view, event) => {
      if (props.timestampOnEnter && event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault()
        editor.value
          ?.chain()
          .focus()
          .insertContent([{ type: 'hardBreak' }, { type: 'text', text: formatTimestamp(new Date()) }])
          .run()
        return true
      }
      return false
    },
    handlePaste: (_view, event) => {
      const items = event.clipboardData?.items
      if (!items) return false
      for (const item of Array.from(items)) {
        if (item.kind === 'file' && item.type.startsWith('image/')) {
          const file = item.getAsFile()
          if (!file) return false
          event.preventDefault()
          insertImageFile(file)
          return true
        }
      }
      return false
    },
  },
  onUpdate: ({ editor: e }) => {
    emit('update:modelValue', e.getHTML())
    emit('change')
  },
  onFocus: () => { isFocused.value = true },
  onBlur: () => { isFocused.value = false },
})

watch(() => props.readonly, (val) => {
  editor.value?.setEditable(!val)
})

watch(() => props.modelValue, (val) => {
  if (editor.value && val !== editor.value.getHTML()) {
    editor.value.commands.setContent(val || '', { emitUpdate: false })
  }
})

onBeforeUnmount(() => {
  editor.value?.destroy()
})

/* ── Link ── */
const showLinkInput = ref(false)
const linkUrl = ref('')

function setLink() {
  if (!linkUrl.value) {
    editor.value?.chain().focus().extendMarkRange('link').unsetLink().run()
  } else {
    editor.value?.chain().focus().extendMarkRange('link').setLink({ href: linkUrl.value }).run()
  }
  showLinkInput.value = false
  linkUrl.value = ''
  emit('change')
}

/* ── Color ── */
const showColorPicker = ref(false)

const presetColors = [
  { label: 'Noir', value: '#000000' },
  { label: 'Gris', value: '#6b7280' },
  { label: 'Rouge', value: '#dc2626' },
  { label: 'Bleu', value: '#2563eb' },
  { label: 'Vert', value: '#16a34a' },
  { label: 'Orange', value: '#ea580c' },
  { label: 'Violet', value: '#9333ea' },
  { label: 'Marron', value: '#92400e' },
]

function setColor(color: string) {
  editor.value?.chain().focus().setColor(color).run()
  showColorPicker.value = false
  emit('change')
}
</script>

<style scoped>
.rich-editor {
  width: 100%;
  box-sizing: border-box;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  overflow: hidden;
  transition: border-color 0.2s;
  background: #fff;
}

.rich-editor:focus-within,
.rich-editor.is-focused {
  border-color: #409eff;
}

/* ── Toolbar ── */
.rich-editor__toolbar {
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 4px 6px;
  background: #f5f7fa;
  border-bottom: 1px solid #e4e7ed;
  flex-wrap: wrap;
}

.rich-editor__toolbar button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 28px;
  height: 26px;
  padding: 0 5px;
  border: 1px solid transparent;
  border-radius: 3px;
  background: transparent;
  color: #606266;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.15s;
  font-family: inherit;
}

.rich-editor__toolbar button:hover {
  background: #e9ecef;
  border-color: #dee2e6;
}

.rich-editor__toolbar button.is-active {
  background: #ecf5ff;
  border-color: #b3d8ff;
  color: #409eff;
}

.rich-editor__toolbar button:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.toolbar-separator {
  width: 1px;
  height: 18px;
  background: #dcdfe6;
  margin: 0 3px;
}

/* Sélecteurs de police / taille */
.rich-editor__toolbar .toolbar-select {
  width: 110px;
  margin: 0 2px;
}

.rich-editor__toolbar .toolbar-select--size {
  width: 72px;
}

.rich-editor__toolbar :deep(.el-select__wrapper),
.rich-editor__toolbar :deep(.el-input__wrapper) {
  min-height: 26px;
  padding: 0 8px;
}

.rich-editor__toolbar :deep(.el-select__selected-item),
.rich-editor__toolbar :deep(.el-input__inner) {
  font-size: 12px;
}

/* ── Color picker ── */
.color-picker-wrapper {
  position: relative;
}

.color-icon {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  font-weight: 700;
}

.color-bar {
  display: block;
  width: 14px;
  height: 3px;
  border-radius: 1px;
}

.color-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  z-index: 20;
  display: flex;
  gap: 4px;
  padding: 6px 8px;
  background: #fff;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
  margin-top: 4px;
}

.color-swatch {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: 2px solid transparent;
  cursor: pointer;
  transition: border-color 0.15s, transform 0.15s;
  padding: 0;
}

.color-swatch:hover {
  border-color: #409eff;
  transform: scale(1.15);
}

/* ── Alignement d'image ── */
.image-align-group {
  display: inline-flex;
  align-items: center;
  gap: 2px;
}

/* ── Link input popup ── */
.link-input-popup {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-left: 4px;
}

.link-input {
  width: 180px;
  height: 26px;
  padding: 0 8px;
  border: 1px solid #dcdfe6;
  border-radius: 3px;
  font-size: 12px;
  outline: none;
}

.link-input:focus {
  border-color: #409eff;
}

.link-confirm {
  height: 26px;
  padding: 0 8px;
  background: #409eff;
  color: #fff;
  border: none;
  border-radius: 3px;
  cursor: pointer;
  font-size: 12px;
}

.link-cancel {
  height: 26px;
  padding: 0 6px;
  background: transparent;
  border: 1px solid #dcdfe6;
  border-radius: 3px;
  cursor: pointer;
  font-size: 12px;
  color: #909399;
}

/* ── Content area ── */
.rich-editor__content {
  overflow-y: auto;
  max-height: 300px;
}

.rich-editor__content :deep(.tiptap) {
  outline: none;
  padding: 8px 10px;
  font-size: 13px;
  line-height: 1.5;
  color: #303133;
  min-height: 48px;
}

/* Placeholder */
.rich-editor__content :deep(.tiptap p.is-editor-empty:first-child::before) {
  content: attr(data-placeholder);
  float: left;
  color: #adb5bd;
  pointer-events: none;
  height: 0;
  font-style: italic;
}

/* Headings */
.rich-editor__content :deep(.tiptap h1) {
  font-size: 1.4em;
  font-weight: 700;
  margin: 0.5em 0;
}

.rich-editor__content :deep(.tiptap h2) {
  font-size: 1.15em;
  font-weight: 600;
  margin: 0.4em 0;
}

.rich-editor__content :deep(.tiptap h3) {
  font-size: 1.05em;
  font-weight: 600;
  margin: 0.4em 0;
}

/* Blockquote */
.rich-editor__content :deep(.tiptap blockquote) {
  border-left: 3px solid #409eff;
  margin: 4px 0;
  padding: 2px 10px;
  color: #606266;
  background: #f5f7fa;
  border-radius: 0 3px 3px 0;
}

/* Inline code */
.rich-editor__content :deep(.tiptap code) {
  background: #f0f0f0;
  border-radius: 3px;
  padding: 1px 4px;
  font-family: 'Courier New', monospace;
  font-size: 0.9em;
}

/* Code block */
.rich-editor__content :deep(.tiptap pre) {
  background: #f5f7fa;
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  padding: 6px 10px;
  font-family: 'Courier New', monospace;
  font-size: 12px;
  overflow-x: auto;
}

/* Lists */
.rich-editor__content :deep(.tiptap ul),
.rich-editor__content :deep(.tiptap ol) {
  padding-left: 1.5em;
  margin: 4px 0;
}

/* Link in editor */
.rich-editor__content :deep(.tiptap a.editor-link) {
  color: #409eff;
  text-decoration: underline;
  cursor: pointer;
}

/* Horizontal rule */
.rich-editor__content :deep(.tiptap hr) {
  border: none;
  border-top: 1px solid #dcdfe6;
  margin: 12px 0;
}

/* Images */
.rich-editor__content :deep(.tiptap img) {
  max-width: 100%;
  height: auto;
  border-radius: 4px;
  display: inline-block;
}

.rich-editor__content :deep(.tiptap img.is-left) {
  float: left;
  margin: 0 12px 6px 0;
  max-width: 45%;
}

.rich-editor__content :deep(.tiptap img.is-right) {
  float: right;
  margin: 0 0 6px 12px;
  max-width: 45%;
}

.rich-editor__content :deep(.tiptap img.is-center) {
  display: block;
  margin: 6px auto;
}

.rich-editor__content :deep(.tiptap img.ProseMirror-selectednode) {
  outline: 2px solid #409eff;
}

/* ── Input fichier caché ── */
.rich-editor__file-input {
  display: none;
}

/* ── Readonly state ── */
.rich-editor.is-readonly {
  border-color: #e4e7ed;
  background: #f5f7fa;
}

.rich-editor.is-readonly .rich-editor__content :deep(.tiptap) {
  background: transparent;
}
</style>
