<template>
  <header class="topbar" :class="{ 'topbar--has-patient': showPatientHeader }">
    <template v-if="hasActivePatient && activePatient && isPatientRoute">
      <div class="topbar__patient">
        <!-- Avatar -->
        <el-avatar
          :size="40"
          :src="activePatient.photo || undefined"
          class="topbar__avatar"
          :style="{ background: avatarBgColor }"
        >
          <span class="topbar__avatar-symbol">{{ getCiviliteSymbol(activePatient.civilite) }}</span>
        </el-avatar>

        <!-- Info block: name + meta on row 1, address on row 2 -->
        <div class="topbar__info">
          <!-- Row 1: Name (prominent) + Meta items (compact) -->
          <div class="topbar__primary-row">
            <span class="topbar__name">
              {{ getCiviliteSymbol(activePatient.civilite) }} {{ activePatient.prenom }} {{ activePatient.nom }}
            </span>
            <span class="topbar__meta-divider" aria-hidden="true" />
            <span class="topbar__meta-item">Âge: {{ age }} ans</span>
            <span class="topbar__meta-pipe" aria-hidden="true">|</span>
            <span class="topbar__meta-item">N° SS: {{ maskNir(activePatient.nir) }}</span>
            <template v-if="activePatient.assuranceMutuelle">
              <span class="topbar__meta-pipe" aria-hidden="true">|</span>
              <span class="topbar__meta-item">Assurance: {{ activePatient.assuranceMutuelle }}</span>
            </template>
          </div>
          <!-- Row 2: Address (less prominent, truncated) -->
          <div v-if="addressLine" class="topbar__secondary-row">
            <span class="topbar__address">{{ addressLine }}</span>
          </div>
        </div>

        <!-- Allergies badge (far right, compact) -->
        <div v-if="activePatient.allergies?.length" class="topbar__allergies">
          <el-tooltip
            :content="activePatient.allergies.join(', ')"
            placement="bottom"
            :show-after="300"
          >
            <el-tag type="danger" size="small" class="topbar__allergies-tag">
              ⚠ Allergies
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

const route = useRoute()
const { activePatient, age, hasActivePatient } = usePatientContext()

/** Routes that are specific to a single patient context */
const PATIENT_ROUTE_NAMES = new Set([
  'patient-detail', 'patient-factures', 'patient-dossier', 'patient-labo',
  'patient-prescription', 'patient-examens', 'patient-actes', 'patient-soins',
  'patient-sejour', 'patient-rdv',
])

const isPatientRoute = computed(() =>
  typeof route.name === 'string' && PATIENT_ROUTE_NAMES.has(route.name),
)

/** Show patient header only when on a patient-specific route AND a patient is active */
const showPatientHeader = computed(() =>
  hasActivePatient.value && activePatient.value && isPatientRoute.value,
)

const avatarBgColor = computed(() => {
  const c = activePatient.value?.civilite
  if (c === 'M') return 'var(--el-color-primary, #409eff)'
  if (c === 'Mme' || c === 'Mlle') return 'var(--el-color-danger, #f56c6c)'
  return 'var(--el-color-info, #909399)'
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
  if (!nir || nir.length < 4) return nir || '—'
  return '\u2022'.repeat(nir.length - 3) + nir.slice(-3)
}
</script>

<style scoped>
/* ═══════════════════════════════════════════════════
   TopBar — redesigned horizontal patient info bar
   ═══════════════════════════════════════════════════ */

/* ─── Base: empty state ─── */
.topbar {
  height: 48px;
  background: var(--cd-white);
  border-bottom: 1px solid var(--cd-gray-200);
  flex-shrink: 0;
  display: flex;
  align-items: center;
  padding: 0 24px;
  transition: height 0.2s ease, min-height 0.2s ease;
}

/* ─── Active patient: expand to fit content ─── */
.topbar--has-patient {
  height: auto;
  min-height: 64px;
  padding-top: 10px;
  padding-bottom: 10px;
}

/* ─── Outer flex row: avatar | info | allergies ─── */
.topbar__patient {
  display: flex;
  align-items: center;
  gap: 14px;
  width: 100%;
  min-width: 0;
}

/* ─── Avatar ─── */
.topbar__avatar {
  color: white;
  font-weight: 600;
  flex-shrink: 0;
}

.topbar__avatar-symbol {
  font-size: 20px;
  line-height: 1;
}

/* ─── Info column (name+meta row / address row) ─── */
.topbar__info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  flex: 1;
}

/* ─── Row 1: Name + Meta items ─── */
.topbar__primary-row {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.topbar__name {
  font-size: 15px;
  font-weight: 700;
  color: var(--cd-gray-900);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex-shrink: 1;
  min-width: 48px; /* keep at least initials visible */
  letter-spacing: -0.01em;
}

/* Visual separator dot between name group and meta */
.topbar__meta-divider {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: var(--cd-gray-400);
  flex-shrink: 0;
  opacity: 0.5;
}

/* ─── Meta items (Age, NSS, Assurance) ─── */
.topbar__meta-item {
  font-size: 13px;
  font-weight: 500;
  color: var(--cd-gray-600);
  white-space: nowrap;
  flex-shrink: 0;
}

.topbar__meta-pipe {
  color: var(--cd-gray-300);
  font-weight: 300;
  font-size: 12px;
  flex-shrink: 0;
  user-select: none;
}

/* ─── Row 2: Address line ─── */
.topbar__secondary-row {
  display: flex;
  align-items: center;
  min-width: 0;
}

.topbar__address {
  font-size: 12px;
  color: var(--cd-gray-400);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.3;
}

/* ─── Allergies badge (far right) ─── */
.topbar__allergies {
  display: flex;
  align-items: center;
  margin-left: auto;
  flex-shrink: 0;
  align-self: center;
  padding-left: 4px;
}

.topbar__allergies-tag {
  font-weight: 600;
  letter-spacing: 0.02em;
  border: none;
}
</style>
