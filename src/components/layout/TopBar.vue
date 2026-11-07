<template>
  <header class="topbar" :class="{ 'topbar--has-patient': showPatientHeader }">
    <template v-if="hasActivePatient && activePatient && isPatientRoute">
      <div class="topbar__patient">
        <el-avatar
          :size="28"
          :src="activePatient.photo || undefined"
          class="topbar__avatar"
          :style="{ background: avatarBgColor }"
        >
          <span class="topbar__avatar-symbol">{{ getCiviliteSymbol(activePatient.civilite) }}</span>
        </el-avatar>

        <div class="topbar__info">
          <div class="topbar__primary-row">
            <span class="topbar__name">
              {{ getCiviliteSymbol(activePatient.civilite) }} {{ activePatient.prenom }} {{ activePatient.nom }}
            </span>
            <span class="topbar__meta-pipe" aria-hidden="true">|</span>
            <span class="topbar__meta-item">&Acirc;ge&nbsp;: {{ age }} ans</span>
            <span class="topbar__meta-pipe" aria-hidden="true">|</span>
            <span class="topbar__meta-item">N° SS&nbsp;: {{ maskNir(activePatient.nir) }}</span>
            <template v-if="activePatient.assuranceMutuelle">
              <span class="topbar__meta-pipe" aria-hidden="true">|</span>
              <span class="topbar__meta-item">Assurance&nbsp;: {{ activePatient.assuranceMutuelle }}</span>
            </template>
            <span v-if="addressLine" class="topbar__meta-pipe" aria-hidden="true">|</span>
            <span v-if="addressLine" class="topbar__meta-item topbar__address">{{ addressLine }}</span>
          </div>
        </div>

        <div v-if="activePatient.allergies?.length" class="topbar__allergies">
          <el-tooltip
            :content="normalizeAllergies(activePatient.allergies || []).map(a => a.libelle).join(', ')"
            placement="bottom"
            :show-after="300"
          >
            <el-tag type="danger" size="small" class="topbar__allergies-tag">
              Allergies
            </el-tag>
          </el-tooltip>
        </div>
      </div>
    </template>
  </header>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { usePatientContext } from '@/composables/usePatientContext'
import { getCiviliteSymbol } from '@/utils/civilite'
import { normalizeAllergies } from '@/utils/allergy-helpers'

const route = useRoute()
const { activePatient, age, hasActivePatient } = usePatientContext()

const PATIENT_ROUTE_NAMES = new Set([
  'patient-detail', 'patient-factures', 'patient-dossier', 'patient-labo',
  'patient-prescription', 'patient-examens', 'patient-actes', 'patient-soins',
  'patient-sejour', 'patient-rdv',
])

const isPatientRoute = computed(() =>
  typeof route.name === 'string' && PATIENT_ROUTE_NAMES.has(route.name),
)

const showPatientHeader = computed(() =>
  hasActivePatient.value && activePatient.value && isPatientRoute.value,
)

const avatarBgColor = computed(() => {
  const c = activePatient.value?.civilite
  if (c === 'M') return 'var(--cde-info)'
  if (c === 'Mme' || c === 'Mlle') return 'var(--cde-danger)'
  return 'var(--cde-muted)'
})

const addressLine = computed(() => {
  const p = activePatient.value
  if (!p) return ''
  const parts: string[] = []
  if (p.complement_adresse) parts.push(p.complement_adresse)
  if (p.region) parts.push(p.region)
  return parts.join(', ')
})

function maskNir(nir: string | undefined | null): string {
  if (!nir || nir.length < 4) return nir || '\u2014'
  return '\u2022'.repeat(nir.length - 3) + nir.slice(-3)
}
</script>

<style scoped>
.topbar {
  height: 48px;
  background: var(--cd-card-bg);
  border-bottom: 1px solid var(--cd-border);
  box-shadow: var(--cd-shadow-sm);
  flex-shrink: 0;
  display: flex;
  align-items: center;
  padding: 0 var(--cd-space-4);
  transition: height 0.15s ease;
}

.topbar--has-patient {
  height: auto;
  min-height: 38px;
  padding-top: 4px;
  padding-bottom: 4px;
  background: var(--cd-widget-bg);
  border-bottom: 2px solid var(--cd-primary);
}

.topbar__patient {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  min-width: 0;
}

.topbar__avatar {
  color: white;
  font-weight: 600;
  flex-shrink: 0;
}

.topbar__avatar-symbol {
  font-size: 14px;
  line-height: 1;
}

.topbar__info {
  display: flex;
  flex-direction: column;
  min-width: 0;
  flex: 1;
}

.topbar__primary-row {
  display: flex;
  align-items: center;
  gap: 4px;
  min-width: 0;
  flex-wrap: wrap;
}

.topbar__name {
  font-size: 13px;
  font-weight: 700;
  color: var(--cd-gray-900);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex-shrink: 1;
  min-width: 48px;
}

.topbar__meta-item {
  font-size: 11px;
  font-weight: 500;
  color: var(--cd-gray-600);
  white-space: nowrap;
  flex-shrink: 0;
}

.topbar__meta-pipe {
  color: var(--cd-gray-300);
  font-weight: 300;
  font-size: 11px;
  flex-shrink: 0;
  user-select: none;
}

.topbar__address {
  color: var(--cd-gray-400);
}

.topbar__allergies {
  display: flex;
  align-items: center;
  margin-left: auto;
  flex-shrink: 0;
  padding-left: 4px;
}

.topbar__allergies-tag {
  font-weight: 600;
  font-size: 10px;
  letter-spacing: 0.02em;
  border: none;
  height: 20px;
  padding: 0 6px;
}
</style>
