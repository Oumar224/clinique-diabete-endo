// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import type { Component } from 'vue'
import FormPreview from '../FormPreview.vue'

// ─── EL Stubs ──────────────────────────────────────────────────────

const EL_STUBS: Record<string, Component> = {
  'el-empty': {
    template: '<div class="el-empty" :description="description" :image-size="imageSize"><slot /></div>',
    props: ['description', 'imageSize'],
  },
}

// ─── Mount helper ──────────────────────────────────────────────────

function mountPreview(props: Record<string, unknown> = {}) {
  return mount(FormPreview, {
    props,
    global: { stubs: EL_STUBS },
  })
}

// ─── Test suite ────────────────────────────────────────────────────

describe('FormPreview', () => {
  it('renders label and value rows for filled fields', () => {
    const wrapper = mountPreview({
      fields: [
        { label: 'Nom', value: 'Dupont' },
        { label: 'Glycémie', value: 6.1 },
        { label: 'Score Glasgow', value: 0 },
        { label: 'Fumeur', value: true },
      ],
    })
    expect(wrapper.findAll('.form-preview__row')).toHaveLength(4)
    expect(wrapper.text()).toContain('Nom')
    expect(wrapper.text()).toContain('Dupont')
    expect(wrapper.text()).toContain('6.1')
    expect(wrapper.text()).toContain('0')
    expect(wrapper.find('.el-empty').exists()).toBe(false)
  })

  it('hides empty values (undefined, null, empty string, false)', () => {
    const wrapper = mountPreview({
      fields: [
        { label: 'Vide undefined', value: undefined },
        { label: 'Vide null', value: null },
        { label: 'Vide chaine', value: '' },
        { label: 'Vide false', value: false },
        { label: 'Rempli', value: 'ok' },
      ],
    })
    const rows = wrapper.findAll('.form-preview__row')
    expect(rows).toHaveLength(1)
    expect(rows[0].text()).toContain('Rempli')
    expect(wrapper.text()).toContain('ok')
    expect(wrapper.text()).not.toContain('Vide')
  })

  // ─── Rich HTML values (RichTextEditor output) ────────────────────

  it('renders a rich field value as raw HTML via v-html', () => {
    const wrapper = mountPreview({
      fields: [{
        label: 'Motif',
        value: '<p>Décompensation <strong>sévère</strong></p><ul><li>Point 1</li></ul>',
        rich: true,
      }],
    })
    const value = wrapper.find('.form-preview__value')
    expect(value.exists()).toBe(true)
    expect(value.classes()).toContain('form-preview__value--rich')
    // Raw markup is rendered, not escaped
    expect(value.find('strong').text()).toBe('sévère')
    expect(value.find('li').text()).toBe('Point 1')
    expect(value.text()).not.toContain('&lt;')
  })

  it('passes a tag-only rich value through as-is (emptiness is the caller\'s job via isRichTextEmpty)', () => {
    // FormPreview only filters on the raw value; HTML-content detection is
    // handled upstream by the tabs (isRichTextEmpty) before building the fields.
    const wrapper = mountPreview({
      fields: [{ label: 'Motif', value: '<p></p>', rich: true }],
    })
    expect(wrapper.find('.form-preview__row').exists()).toBe(true)
    expect(wrapper.find('.form-preview__value--rich').exists()).toBe(true)
  })

  it('keeps the plain-text interpolation for non-rich fields', () => {
    const wrapper = mountPreview({
      fields: [{ label: 'Valeur', value: '<p>pas de HTML</p>' }],
    })
    const value = wrapper.find('.form-preview__value')
    expect(value.classes()).not.toContain('form-preview__value--rich')
    expect(value.find('p').exists()).toBe(false)
    expect(value.text()).toBe('<p>pas de HTML</p>')
  })

  it('shows el-empty with default emptyText when all values are empty', () => {
    const wrapper = mountPreview({
      fields: [{ label: 'Champ', value: '' }],
    })
    const empty = wrapper.find('.el-empty')
    expect(empty.exists()).toBe(true)
    expect(empty.attributes('description')).toBe('Aucune valeur saisie')
  })

  it('respects a custom emptyText', () => {
    const wrapper = mountPreview({
      fields: [{ label: 'Champ', value: null }],
      emptyText: 'Rien à afficher',
    })
    expect(wrapper.find('.el-empty').attributes('description')).toBe('Rien à afficher')
  })

  it('respects a custom title', () => {
    const wrapper = mountPreview({
      title: 'Résumé du séjour',
      fields: [{ label: 'Durée', value: 3 }],
    })
    expect(wrapper.find('.form-preview__title').text()).toBe('Résumé du séjour')
  })

  it('uses the default title "Aperçu"', () => {
    const wrapper = mountPreview({ fields: [{ label: 'Durée', value: 3 }] })
    expect(wrapper.find('.form-preview__title').text()).toBe('Aperçu')
  })

  it('applies the compact variant class', () => {
    const wrapper = mountPreview({
      variant: 'compact',
      fields: [{ label: 'Durée', value: 3 }],
    })
    expect(wrapper.find('.form-preview--compact').exists()).toBe(true)
  })

  it('renders a title bar with a primary accent mark and a subtle info icon', () => {
    const wrapper = mountPreview({ fields: [{ label: 'Durée', value: 3 }] })
    expect(wrapper.find('.form-preview__accent').exists()).toBe(true)
    expect(wrapper.find('.form-preview__icon').exists()).toBe(true)
  })

  // ─── Meta line (dernière modification + Modifier) ────────────────

  it('renders "Modifié le" with a formatted date when the field has an updatedAt', () => {
    const wrapper = mountPreview({
      fields: [{
        label: 'Glycémie',
        value: 6.1,
        key: 'bilan.glycemie',
        updatedAt: '2026-06-15T10:30:00.000Z',
      }],
    })
    const updated = wrapper.find('.form-preview__row .form-preview__updated')
    expect(updated.exists()).toBe(true)
    expect(updated.text()).toMatch(/^Modifié le \d{2}\/\d{2}\/\d{4} \d{2}:\d{2}$/)
  })

  it('renders "Non modifié" when the field is tracked but has no updatedAt', () => {
    const wrapper = mountPreview({
      fields: [{ label: 'Glycémie', value: 6.1, key: 'bilan.glycemie', tracked: true }],
    })
    expect(wrapper.find('.form-preview__updated').text()).toBe('Non modifié')
  })

  it('hides the meta line entirely when the field has no key', () => {
    const wrapper = mountPreview({
      fields: [{
        label: 'Glycémie',
        value: 6.1,
        updatedAt: '2026-06-15T10:30:00.000Z',
        tracked: true,
      }],
    })
    expect(wrapper.find('.form-preview__meta').exists()).toBe(false)
    expect(wrapper.find('.form-preview__edit').exists()).toBe(false)
  })

  it('renders a "Modifier" button with a descriptive aria-label', () => {
    const wrapper = mountPreview({
      fields: [{ label: 'Glycémie', value: 6.1, key: 'bilan.glycemie' }],
    })
    const btn = wrapper.find('.form-preview__edit')
    expect(btn.exists()).toBe(true)
    expect(btn.find('.form-preview__edit-icon').exists()).toBe(true)
    expect(btn.attributes('aria-label')).toBe('Modifier Glycémie')
  })

  it('emits edit with the field key when "Modifier" is clicked', async () => {
    const wrapper = mountPreview({
      fields: [{ label: 'Glycémie', value: 6.1, key: 'bilan.glycemie', tracked: true }],
    })
    await wrapper.find('.form-preview__edit').trigger('click')
    expect(wrapper.emitted('edit')).toEqual([['bilan.glycemie']])
  })

  it('does not render a Modifier button when the field has no key', () => {
    const wrapper = mountPreview({
      fields: [{ label: 'Glycémie', value: 6.1 }],
    })
    expect(wrapper.find('.form-preview__edit').exists()).toBe(false)
  })
})
