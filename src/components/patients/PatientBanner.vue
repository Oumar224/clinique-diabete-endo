<template>
  <div v-if="patient" class="patient-banner">
    <div class="patient-banner__identity">
      <el-avatar
        :size="48"
        :src="patient.photo || undefined"
        shape="circle"
        class="patient-banner__photo"
      >
        {{ initials }}
      </el-avatar>
      <div class="patient-banner__info">
        <div class="patient-banner__name">
          {{ getCiviliteSymbol(patient.civilite) }} {{ patient.prenom }} {{ patient.nom }}
        </div>
        <div class="patient-banner__meta">
          <span><strong>&Acirc;ge&nbsp;:</strong> {{ age }} ans</span>
          <span class="patient-banner__sep">|</span>
          <span>N\u00b0 SS&nbsp;: {{ maskNir(patient.nir) }}</span>
          <span v-if="addressLine" class="patient-banner__sep">|</span>
          <span v-if="addressLine" class="patient-banner__address">{{ addressLine }}</span>
          <span v-if="patient.allergies && patient.allergies.length" class="patient-banner__allergies">
            <el-icon style="color:#e74c3c"><WarningFilled /></el-icon>
            Allergies&nbsp;: {{ patient.allergies.join(', ') }}
          </span>
        </div>
      </div>
    </div>
    <div class="patient-banner__actions">
      <el-button size="small" @click="$emit('edit')">
        <el-icon><Edit /></el-icon> Modifier
      </el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Edit, WarningFilled } from '@element-plus/icons-vue'
import { getCiviliteSymbol } from '@/utils/civilite'
import type { Patient } from '@/composables/usePatientContext'

const props = defineProps<{
  patient: Patient | null
  age: number | null
}>()

defineEmits<{
  edit: []
}>()

const initials = computed(() => {
  if (!props.patient) return ''
  const p = props.patient
  return ((p.prenom?.charAt(0) || '') + (p.nom?.charAt(0) || '')).toUpperCase()
})

const addressLine = computed(() => {
  if (!props.patient) return ''
  const parts: string[] = []
  if (props.patient.adresse) parts.push(props.patient.adresse)
  if (props.patient.lieu_naissance) parts.push(props.patient.lieu_naissance)
  return parts.join(', ')
})

function maskNir(nir: string | undefined): string {
  if (!nir) return '\u2014'
  if (nir.length <= 4) return '\u2022\u2022' + nir.slice(-2)
  return '\u2022\u2022' + nir.slice(-4)
}
</script>

<style scoped>
.patient-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: var(--cd-widget-bg, #fff);
  border: 1px solid var(--cd-border, #d9dde3);
  border-radius: 2px;
}

.patient-banner__identity {
  display: flex;
  align-items: center;
  gap: 12px;
}

.patient-banner__photo {
  flex-shrink: 0;
  background: var(--cd-primary, #0b3b6b) !important;
}

.patient-banner__name {
  font-size: 15px;
  font-weight: 700;
  color: var(--cd-gray-900, #222);
}

.patient-banner__meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: var(--cd-gray-500, #777);
  margin-top: 4px;
}

.patient-banner__sep {
  color: var(--cd-gray-300, #ccc);
}

.patient-banner__address {
  color: var(--cd-gray-400);
}

.patient-banner__allergies {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  color: #e74c3c;
  font-weight: 600;
  margin-left: 4px;
}

.patient-banner__actions {
  display: flex;
  gap: 6px;
  flex-shrink: 0;
}
</style>
