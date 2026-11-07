<template>
  <div v-if="!activePatient" class="dossier-patient-header dossier-patient-header--loading">
    <span class="dossier-patient-header__loading-text">Chargement patient…</span>
    <span v-if="contactDisplayNormalized" class="dossier-patient-header__meta-item dossier-patient-header__meta-item--contact"><strong>Patient :</strong> {{ contactDisplayNormalized }}</span>
    <el-tag v-else type="danger" size="small" effect="plain">Aucun contact</el-tag>
  </div>
  <div v-else class="dossier-patient-header" :class="{ 'dossier-patient-header--prominent': prominent }">
    <div class="dossier-patient-header__top">
      <span class="dossier-patient-header__name">
        <span class="dossier-patient-header__civilite" aria-hidden="true">{{ civiliteSymbol }}</span>
        {{ displayName }}
      </span>
      <el-tag v-if="age != null" size="small" effect="plain" type="info" class="dossier-patient-header__age">{{ age }} ans</el-tag>
      <span v-if="sexeLabel" class="dossier-patient-header__sexe">{{ sexeLabel }}</span>
    </div>
    <div class="dossier-patient-header__meta">
      <span class="dossier-patient-header__meta-item"><strong>NIP :</strong> {{ activePatient.nip || '—' }}</span>
      <span class="dossier-patient-header__meta-item"><strong>N° SS :</strong> {{ activePatient.nir || '—' }}</span>
      <span class="dossier-patient-header__meta-item"><strong>Né(e) le :</strong> {{ formatDate(activePatient.date_naissance) }}</span>
      <span v-if="addressLine" class="dossier-patient-header__meta-item"><strong>Adresse :</strong> {{ addressLine }}</span>
      <span class="dossier-patient-header__meta-item"><strong>Région :</strong> {{ regionDisplay }}</span>
      <span class="dossier-patient-header__meta-item"><strong>Résidence :</strong> {{ residenceDisplay }}</span>
      <span v-if="contactDisplayNormalized" class="dossier-patient-header__meta-item dossier-patient-header__meta-item--contact"><strong>NDA / Contact :</strong> {{ contactDisplayNormalized }}</span>
      <el-tag v-else type="danger" size="small" effect="plain">Aucun contact</el-tag>
      <span v-if="admission?.serviceAccueil" class="dossier-patient-header__meta-item"><strong>Service :</strong> {{ admission.serviceAccueil }}</span>
      <span v-if="medecinReferent" class="dossier-patient-header__meta-item"><strong>Médecin référent :</strong> {{ medecinReferent }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { usePatientContext } from '@/composables/usePatientContext'
import { useCrhDiabeteCalculations } from '@/composables/useCrhDiabeteCalculations'
import { calculateAge } from '@/utils/age'
import { getCiviliteSymbol } from '@/utils/civilite'
import { formatDate } from '@/utils/date'
import { useLocalites } from '@/composables/useLocalites'
import type { AdmissionData } from '@/types/crh-diabete'

const props = withDefaults(defineProps<{
  contactDisplay?: string | null
  admission?: Partial<AdmissionData> | null
  prominent?: boolean
}>(), {
  contactDisplay: '',
  admission: null,
  prominent: false,
})

const { activePatient } = usePatientContext()
const { calcAge } = useCrhDiabeteCalculations()
const { localites } = useLocalites()

const contactDisplayNormalized = computed(() => String(props.contactDisplay ?? ''))

const civiliteSymbol = computed(() => getCiviliteSymbol(activePatient.value?.civilite ?? ''))

const displayName = computed(() => {
  const p = activePatient.value
  if (!p) return ''
  const nom = (p.nom || '').toUpperCase()
  const prenom = p.prenom || ''
  return `${nom} ${prenom}`.trim() || '—'
})

const sexeLabel = computed(() => {
  const c = activePatient.value?.civilite
  if (c === 'M') return 'Masculin'
  if (c === 'Mme' || c === 'Mlle') return 'Féminin'
  return ''
})

const age = computed(() => {
  const p = activePatient.value
  if (!p?.date_naissance) return null
  const dateEntree = props.admission?.dateEntree ?? ''
  if (dateEntree) {
    const a = calcAge(p.date_naissance, dateEntree)
    if (a != null) return a
  }
  try {
    return calculateAge(p.date_naissance)
  } catch { return null }
})

const addressLine = computed(() => {
  const p = activePatient.value
  if (!p) return ''
  return [p.adresse, p.complement_adresse].filter(Boolean).join(' – ')
})

const regionDisplay = computed(() => {
  const code = activePatient.value?.region
  if (!code) return '—'
  const found = localites.value.find(l => l.code === code)
  return found?.name ?? code
})

const residenceDisplay = computed(() => {
  const code = activePatient.value?.residence_code
  if (!code) return '—'
  const found = localites.value.find(l => l.code === code)
  return found?.name ?? code
})

const medecinReferent = computed(() => {
  return props.admission?.medecinTraitantNom || activePatient.value?.medecin_traitant || ''
})
</script>

<style scoped lang="scss">
.dossier-patient-header {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 10px 16px;
  background: var(--cde-surface);
  border: 1px solid var(--cde-border);
  border-radius: 6px;
  margin: 0 16px;
  flex-shrink: 0;
}

.dossier-patient-header--loading {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 16px;
  background: var(--cde-surface);
  border: 1px solid var(--cde-border);
  border-radius: 6px;
  margin: 0 16px;
  color: var(--cde-muted);
}

.dossier-patient-header__loading-text {
  font-size: 12px;
  color: var(--cde-muted);
}

.dossier-patient-header__top {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.dossier-patient-header__civilite {
  font-size: 14px;
  margin-right: 4px;
}

.dossier-patient-header__name {
  font-size: 14px;
  font-weight: 700;
  color: var(--cde-header-text);
  line-height: 1.2;
}

.dossier-patient-header__age {
  flex-shrink: 0;
}

.dossier-patient-header__sexe {
  font-size: 11px;
  color: var(--cde-muted);
  background: var(--cde-surface-tint);
  padding: 2px 6px;
  border-radius: 4px;
}

.dossier-patient-header__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 16px;
  font-size: 11.5px;
  color: var(--cde-muted);
  line-height: 1.5;
}

.dossier-patient-header__meta-item {
  white-space: nowrap;
  strong {
    color: var(--cde-header-text);
    font-weight: 600;
  }
}

.dossier-patient-header__meta-item--contact {
  color: var(--cde-accent-strong);
}

.dossier-patient-header--prominent {
  padding: 10px 20px;
  margin: 0;
  gap: 8px;
  border-color: var(--cde-border);

  .dossier-patient-header__top {
    gap: 10px;
    row-gap: 4px;
  }

  .dossier-patient-header__name {
    font-size: 15px;
    line-height: 1.2;
  }

  .dossier-patient-header__civilite {
    font-size: 14px;
    margin-right: 6px;
  }

  .dossier-patient-header__sexe {
    font-size: 11px;
    padding: 3px 8px;
  }

  .dossier-patient-header__age {
    font-size: 11px;
  }

  .dossier-patient-header__meta {
    font-size: 12px;
    gap: 6px 20px;
    line-height: 1.5;
  }
}
</style>
