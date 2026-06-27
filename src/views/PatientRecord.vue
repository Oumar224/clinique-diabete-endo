<template>
  <div class="patient-record">
    <div v-if="loading" class="patient-record__loading">
      <el-skeleton :rows="6" animated />
    </div>

    <el-empty v-else-if="!patient" description="Patient introuvable" />

    <div v-else>
      <div class="patient-record__header">
        <div class="patient-record__identity-row">
          <el-avatar :size="64" :src="patient.photo || undefined" shape="circle" :class="'patient-record__photo patient-record__photo--' + avatarGender">
            <span class="patient-record__gender-symbol">{{ avatarSymbol }}</span>
          </el-avatar>
          <div class="patient-record__identity">
            <h2 class="patient-record__name">
              {{ getCiviliteSymbol(patient.civilite) }} {{ patient.prenom }} {{ patient.nom }}
            </h2>
            <div class="patient-record__meta">
              <span><strong>N° SS/Assurance:</strong> {{ patient.nir }}</span>
              <span><strong>Âge:</strong> {{ calculateAge(patient.date_naissance) }} ans</span>
              <span><strong>Né(e) le:</strong> {{ formatDate(patient.date_naissance) }}</span>
              <span><strong>NIP:</strong> {{ patient.nip }}</span>
            </div>
          </div>
        </div>
        <div class="patient-record__actions">
          <el-button :icon="Edit" @click="openEdit">Modifier</el-button>
          <el-button type="danger" :icon="Delete" @click="onDelete">Supprimer</el-button>
        </div>
      </div>

      <!-- Informations personnelles -->
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
            <span class="patient-record__label">Profession</span>
            <span class="patient-record__value">{{ patient.profession || '—' }}</span>
          </div>
          <div class="patient-record__field">
            <span class="patient-record__label">Lieu de naissance</span>
            <span class="patient-record__value">{{ patient.lieu_naissance || '—' }}</span>
          </div>
          <!-- Allergies inline -->
          <div class="patient-record__field">
            <span class="patient-record__label">Allergies et autres</span>
            <span class="patient-record__value">
              <template v-if="!patient.allergies || patient.allergies.length === 0">
                Aucune
              </template>
              <span v-else class="patient-record__allergies-tags">
                <el-tag
                  v-for="a in patient.allergies"
                  :key="a"
                  type="danger"
                  size="small"
                >
                  {{ a }}
                </el-tag>
              </span>
            </span>
          </div>
        </div>
      </el-card>

      <!-- Résidence -->
      <el-card class="patient-record__card">
        <template #header>
          <span><strong>Résidence</strong></span>
        </template>
        <div class="patient-record__fields">
          <div class="patient-record__field">
            <span class="patient-record__label">Région</span>
            <span class="patient-record__value">{{ patient.region || '—' }}</span>
          </div>
          <div class="patient-record__field">
            <span class="patient-record__label">Commune</span>
            <span class="patient-record__value">{{ residenceDisplay }}</span>
          </div>
          <div class="patient-record__field">
            <span class="patient-record__label">Complément</span>
            <span class="patient-record__value">{{ patient.complement_adresse || '—' }}</span>
          </div>
        </div>
      </el-card>

      <!-- Informations médicales -->
      <el-card class="patient-record__card">
        <template #header>
          <span><strong>Informations médicales</strong></span>
        </template>
        <div class="patient-record__fields">
          <div class="patient-record__field">
            <span class="patient-record__label">N° SS/Assurance</span>
            <span class="patient-record__value">{{ patient.nir || '—' }}</span>
          </div>
          <div class="patient-record__field">
            <span class="patient-record__label">Assurance / Mutuelle</span>
            <span class="patient-record__value">{{ patient.assuranceMutuelle || '—' }}</span>
          </div>
          <div class="patient-record__field">
            <span class="patient-record__label">Médecin référent</span>
            <span class="patient-record__value">{{ patient.medecin_traitant || '—' }}</span>
          </div>
          <div class="patient-record__field">
            <span class="patient-record__label">Site</span>
            <span class="patient-record__value">{{ siteName }}</span>
          </div>
          <div class="patient-record__field">
            <span class="patient-record__label">Consentement études</span>
            <span class="patient-record__value">{{ consentementLabel }}</span>
          </div>
        </div>
      </el-card>

      <el-card class="patient-record__section">
        <template #header>
          <span><strong>Personne de confiance</strong></span>
        </template>
        <template v-if="trustedPerson && trustedPerson.has_trusted">
          <div class="patient-record__fields">
            <div class="patient-record__field">
              <span class="patient-record__label">Nom</span>
              <span class="patient-record__value">{{ trustedPerson.nom || '—' }}</span>
            </div>
            <div class="patient-record__field">
              <span class="patient-record__label">Prénom</span>
              <span class="patient-record__value">{{ trustedPerson.prenom || '—' }}</span>
            </div>
            <div class="patient-record__field">
              <span class="patient-record__label">Profession</span>
              <span class="patient-record__value">{{ trustedPerson.profession || '—' }}</span>
            </div>
            <div class="patient-record__field">
              <span class="patient-record__label">Résidence</span>
              <span class="patient-record__value">{{ trustedPersonDisplayResidence }}</span>
            </div>
            <div class="patient-record__field">
              <span class="patient-record__label">Téléphone</span>
              <span class="patient-record__value">{{ trustedPerson.telephone || '—' }}</span>
            </div>
            <div class="patient-record__field">
              <span class="patient-record__label">Email</span>
              <span class="patient-record__value">{{ trustedPerson.email || '—' }}</span>
            </div>
            <div class="patient-record__field">
              <span class="patient-record__label">Complément</span>
              <span class="patient-record__value">{{ trustedPerson.complement_adresse || '—' }}</span>
            </div>
            <div class="patient-record__field">
              <span class="patient-record__label">Lien de parenté</span>
              <span class="patient-record__value">{{ trustedPerson.lien_parente || '—' }}</span>
            </div>
          </div>
        </template>
        <template v-else>
          <el-empty description="Aucune personne de confiance renseignée" />
        </template>
      </el-card>

      <el-card class="patient-record__section">
        <template #header>
          <span><strong>Pièces jointes</strong></span>
        </template>
        <PatientAttachmentsSection :patient-id="patient.id" category="patient" />
      </el-card>
      <el-card class="patient-record__section">
        <template #header>
          <span><strong>Pièces jointes (personne de confiance)</strong></span>
        </template>
        <PatientAttachmentsSection :patient-id="patient.id" category="trusted_person" />
      </el-card>
    </div>

    <PatientFormDialog ref="formDialogRef" @saved="onSaved" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onErrorCaptured } from 'vue'
import { useRoute } from 'vue-router'
import { Edit, Delete } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getPatient, deletePatient, fetchPatients, type PatientDto } from '@/composables/usePatients'
import { getTrustedPerson, type TrustedPersonDto } from '@/composables/useTrustedPerson'
import { calculateAge } from '@/utils/age'
import { formatDate } from '@/utils/date'
import { getCiviliteSymbol } from '@/utils/civilite'
import { usePatientContext } from '@/composables/usePatientContext'
import { useLocalites } from '@/composables/useLocalites'
import { ipcInvoke } from '@/utils/ipc'
import PatientFormDialog from '@/components/patients/PatientFormDialog.vue'

const route = useRoute()
const { setActivePatient } = usePatientContext()
const patient = ref<PatientDto | null>(null)
const loading = ref(true)
const formDialogRef = ref<InstanceType<typeof PatientFormDialog> | null>(null)
const { localites, fetchLocalites } = useLocalites()
const trustedPerson = ref<TrustedPersonDto | null>(null)
const sites = ref<Array<{ id: number; name: string }>>([])

const siteName = computed(() => {
  if (!patient.value?.site_id) return '—'
  const site = sites.value.find(s => s.id === patient.value!.site_id)
  return site?.name ?? '—'
})

const residenceDisplay = computed(() => {
  const p = patient.value
  if (!p?.residence_code) return '—'
  if (!localites.value) return p.residence_code
  const leaf = localites.value.find(l => l.code === p.residence_code)
  if (!leaf) return p.residence_code
  return leaf.name
})

const avatarGender = computed(() => {
  const c = patient.value?.civilite
  if (c === 'M') return 'male'
  if (c === 'Mme' || c === 'Mlle') return 'female'
  return 'none'
})

const avatarSymbol = computed(() => {
  const c = patient.value?.civilite
  if (c === 'M') return '\u2642'
  if (c === 'Mme' || c === 'Mlle') return '\u2640'
  return '\u2642\u2640'
})

const consentementLabel = computed(() => {
  if (!patient.value?.consentementEtude) return '—'
  const labels: Record<string, string> = { oui: 'Oui', non: 'Non', non_precise: 'Non précisé' }
  return labels[patient.value.consentementEtude] || patient.value.consentementEtude
})

const trustedPersonDisplayResidence = computed(() => {
  const tp = trustedPerson.value
  if (!tp) return '—'
  if (tp.residence_code) {
    if (!localites.value) return tp.residence_code
    const leaf = localites.value.find(l => l.code === tp.residence_code)
    if (leaf) return leaf.name
    return tp.residence_code
  }
  return tp.residence || '—'
})

onErrorCaptured((err) => {
  ElMessage.error(`Erreur: ${(err as Error).message}`)
  return false
})

onMounted(async () => {
  await fetchLocalites(false)
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
    // Load trusted person
    try {
      trustedPerson.value = await getTrustedPerson(id)
    } catch {
      trustedPerson.value = null
    }
    // Load sites for site name display
    try {
      sites.value = await ipcInvoke<Array<{ id: number; name: string }>>('sites:list')
    } catch {
      sites.value = []
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

</script>

<style scoped>
.patient-record__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
  padding: 28px 32px;
  background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%);
  border-radius: 12px;
  border: 1px solid var(--cd-gray-200, #e4e7ed);
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
  width: 100%;
  box-sizing: border-box;
}

.patient-record__identity-row {
  display: flex;
  align-items: flex-start;
  gap: 20px;
}

.patient-record__photo {
  flex-shrink: 0;
}
.patient-record__photo--male {
  background: var(--el-color-primary, #409eff) !important;
}
.patient-record__photo--female {
  background: var(--el-color-danger, #f56c6c) !important;
}
.patient-record__photo--none {
  background: var(--el-color-info, #909399) !important;
}
.patient-record__gender-symbol {
  font-size: 32px;
  line-height: 1;
  font-weight: 400;
}

.patient-record__name {
  font-size: 30px;
  font-weight: 700;
  color: var(--cd-gray-900);
}

.patient-record__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 28px;
  font-size: 18px;
  font-weight: 600;
  color: var(--cd-gray-400);
  margin-top: 2px;
}

.patient-record__actions {
  display: flex;
  gap: 8px;
}

.patient-record__grid {
  display: grid;
  grid-template-columns: 1fr;
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
  color: var(--cd-gray-600);
}

.patient-record__value {
  font-size: 14px;
  color: var(--cd-gray-900);
}

.patient-record__allergies-tags {
  display: inline-flex;
  gap: 6px;
  flex-wrap: wrap;
}

.patient-record__section {
  margin-bottom: 16px;
}
</style>
