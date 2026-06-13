<template>
  <div class="patient-record">
    <div v-if="loading" class="patient-record__loading">
      <el-skeleton :rows="6" animated />
    </div>

    <el-empty v-else-if="!patient" description="Patient introuvable" />

    <div v-else>
      <div class="patient-record__header">
        <div class="patient-record__identity">
          <h2 class="patient-record__name">
            {{ patient.civilite }} {{ patient.prenom }} {{ patient.nom }}
          </h2>
          <div class="patient-record__meta">
            <span>{{ patient.nir }}</span>
            <span>{{ calculateAge(patient.date_naissance) }} ans</span>
            <span>{{ patient.date_naissance }}</span>
          </div>
        </div>
        <div class="patient-record__actions">
          <el-button :icon="Edit" @click="openEdit">Modifier</el-button>
          <el-button type="danger" :icon="Delete" @click="onDelete">Supprimer</el-button>
        </div>
      </div>

      <div class="patient-record__grid">
        <el-card class="patient-record__card">
          <template #header>
            <span><strong>Informations personnelles</strong></span>
          </template>
          <div class="patient-record__fields">
            <div class="patient-record__field">
              <span class="patient-record__label">Email</span>
              <span class="patient-record__value">{{ patient.email || '—' }}</span>
            </div>
            <div class="patient-record__field">
              <span class="patient-record__label">Téléphone</span>
              <span class="patient-record__value">{{ patient.telephone }}</span>
            </div>
            <div class="patient-record__field">
              <span class="patient-record__label">Adresse</span>
              <span class="patient-record__value">{{ patient.adresse }}</span>
            </div>
            <div class="patient-record__field">
              <span class="patient-record__label">Mutuelle</span>
              <span class="patient-record__value">{{ patient.mutuelle || 'Aucune' }}</span>
            </div>
            <div class="patient-record__field">
              <span class="patient-record__label">Médecin traitant</span>
              <span class="patient-record__value">{{ patient.medecin_traitant }}</span>
            </div>
          </div>
        </el-card>

        <el-card class="patient-record__card">
          <template #header>
            <span><strong>Allergies & Antécédents</strong></span>
          </template>
          <div v-if="!patient.allergies || patient.allergies.length === 0" class="patient-record__none">
            Aucune allergie documentée.
          </div>
          <div v-else class="patient-record__allergies">
            <el-tag
              v-for="a in patient.allergies"
              :key="a"
              type="danger"
              size="small"
              class="patient-record__allergy-tag"
            >
              {{ a }}
            </el-tag>
          </div>
        </el-card>
      </div>

      <el-card class="patient-record__section">
        <template #header>
          <span><strong>Dernières consultations</strong></span>
        </template>
        <el-empty description="Aucune consultation" />
      </el-card>
    </div>

    <PatientFormDialog ref="formDialogRef" @saved="onSaved" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onErrorCaptured } from 'vue'
import { useRoute } from 'vue-router'
import { Edit, Delete } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getPatient, deletePatient, fetchPatients, type PatientDto } from '@/composables/usePatients'
import { usePatientContext } from '@/composables/usePatientContext'
import PatientFormDialog from '@/components/patients/PatientFormDialog.vue'

const route = useRoute()
const { setActivePatient } = usePatientContext()
const patient = ref<PatientDto | null>(null)
const loading = ref(true)
const formDialogRef = ref<InstanceType<typeof PatientFormDialog> | null>(null)

onErrorCaptured((err) => {
  ElMessage.error(`Erreur: ${(err as Error).message}`)
  return false
})

onMounted(async () => {
  await loadPatient()
})

async function loadPatient() {
  const id = Number(route.params.id)
  loading.value = true
  try {
    const p = await getPatient(id)
    if (p) {
      patient.value = p
      setActivePatient(p)
    } else {
      ElMessage.warning('Patient introuvable')
    }
  } catch (e) {
    ElMessage.error(`Erreur lors du chargement du patient: ${(e as Error).message}`)
    patient.value = null
  } finally {
    loading.value = false
  }
}

function openEdit() {
  if (!patient.value) return
  if (!formDialogRef.value) {
    ElMessage.error('Erreur: le formulaire patient n\'est pas disponible')
    return
  }
  formDialogRef.value.open(patient.value)
}

function onDelete() {
  if (!patient.value) return
  ElMessageBox.confirm(
    `Supprimer le patient ${patient.value.prenom} ${patient.value.nom} ?`,
    'Confirmation',
    { type: 'warning', confirmButtonText: 'Supprimer', cancelButtonText: 'Annuler' },
  ).then(async () => {
    try {
      await deletePatient(patient.value!.id)
      await fetchPatients()
      patient.value = null
    } catch (e) {
      ElMessage.error(`Erreur lors de la suppression: ${(e as Error).message}`)
    }
  }).catch(() => {
    // user cancelled
  })
}

function onSaved() {
  loadPatient()
}

function calculateAge(dateStr: string): number {
  const birth = new Date(dateStr)
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const m = today.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
  return age
}
</script>

<style scoped>
.patient-record__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
}

.patient-record__name {
  font-size: 22px;
  font-weight: 700;
  color: var(--cd-gray-900);
}

.patient-record__meta {
  display: flex;
  gap: 16px;
  font-size: 14px;
  color: var(--cd-gray-400);
  margin-top: 4px;
}

.patient-record__actions {
  display: flex;
  gap: 8px;
}

.patient-record__grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 16px;
}

.patient-record__fields {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.patient-record__field {
  display: flex;
  gap: 12px;
}

.patient-record__label {
  min-width: 100px;
  font-size: 13px;
  color: var(--cd-gray-400);
}

.patient-record__value {
  font-size: 14px;
  color: var(--cd-gray-900);
}

.patient-record__none {
  font-size: 14px;
  color: var(--cd-gray-400);
}

.patient-record__allergies {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.patient-record__section {
  margin-bottom: 16px;
}
</style>
