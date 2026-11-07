import type { InjectionKey, Ref } from 'vue'

/**
 * Tab strip rendered inside the patient page band by `PatientLayout`.
 *
 * The routed view (currently `SoinsView`) keeps ownership of the tab panes and
 * of their content, but the visible tab row lives in the page chrome so the
 * page title and the tabs share the same tinted band.
 */
export interface PatientSectionTab {
  name: string
  label: string
}

export const PATIENT_SECTION_TABS: Record<string, readonly PatientSectionTab[]> = {
  'patient-soins': [
    { name: 'distribution', label: 'Plan Distribution' },
    { name: 'vital-check', label: 'Vital Check' },
    { name: 'diagramme', label: 'Diagramme de Synthèse' },
  ],
}

/**
 * Active tab name shared between the band tab strip (layout) and the routed
 * tab panes (`SoinsView`). Provided by `PatientLayout`, injected by views that
 * render tabs. Standalone mounts fall back to a local ref.
 */
export const PATIENT_ACTIVE_SECTION_TAB: InjectionKey<Ref<string>> = Symbol(
  'patient-active-section-tab',
)

/**
 * Marker provided by `PatientLayout` so page toolbars know they must teleport
 * their actions into the band instead of rendering a second page header.
 *
 * Targets are exposed as element refs (not global selectors) so the teleport
 * also works when the layout is mounted in a detached test container.
 */
export interface PatientPageChrome {
  subtitleTarget: Ref<HTMLElement | null>
  actionsTarget: Ref<HTMLElement | null>
}

export const PATIENT_PAGE_CHROME: InjectionKey<PatientPageChrome> = Symbol('patient-page-chrome')
