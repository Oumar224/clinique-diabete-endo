<template>
  <div class="contact-view" v-loading="loading">
    <el-card class="contact-view__card">
      <EncountersTable
        :encounters="encounters"
        @new-contact="openContactDialog"
        @edit-contact="onEditContact"
        @delete-contact="onDeleteContact"
      />
    </el-card>

    <el-card v-if="activeEncounterId" class="contact-view__card contact-view__card--section">
      <template #header>
        <span><strong>Mouvements du contact hospitalisation en cours</strong></span>
      </template>
      <EncounterMovements :encounter-id="activeEncounterId" @updated="loadEncounters" />
    </el-card>

    <ContactFormDialog
      v-model:visible="contactDialogVisible"
      :patient-id="patientId"
      :patient-name="patientName"
      :user-id="currentUserId"
      :encounter="editingEncounter"
      @saved="onContactSaved"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ElMessageBox, ElMessage } from 'element-plus'
import { useRoute } from 'vue-router'
import { usePatientContext } from '@/composables/usePatientContext'
import { useAuth } from '@/composables/useAuth'
import { useEncounters } from '@/composables/useEncounters'
import type { EncounterDto } from '@/composables/useEncounters'
import EncountersTable from '@/components/patients/EncountersTable.vue'
import ContactFormDialog from '@/components/patients/ContactFormDialog.vue'
import EncounterMovements from '@/components/patients/EncounterMovements.vue'

const route = useRoute()
const { activePatient } = usePatientContext()
const { user } = useAuth()
const { listEncountersByPatient, deleteEncounter } = useEncounters()

const patientId = computed(() => {
  const id = Number(route.params.id)
  return Number.isFinite(id) && id > 0 ? id : (activePatient.value?.id ?? 0)
})
const patientName = computed(() => {
  if (!activePatient.value) return ''
  const p = activePatient.value
  return `${p.prenom} ${p.nom}`
})
const currentUserId = computed(() => user.value?.id ?? null)

const loading = ref(true)
const encounters = ref<EncounterDto[]>([])
const contactDialogVisible = ref(false)
const editingEncounter = ref<EncounterDto | null>(null)
const activeEncounterId = ref<number | null>(null)

function openContactDialog() {
  editingEncounter.value = null
  contactDialogVisible.value = true
}

function onEditContact(encounter: EncounterDto) {
  editingEncounter.value = encounter
  contactDialogVisible.value = true
}

async function onDeleteContact(id: number) {
  try {
    await ElMessageBox.confirm('Supprimer ce contact ? Cette action est irréversible.', 'Confirmation', {
      confirmButtonText: 'Oui, supprimer',
      cancelButtonText: 'Annuler',
      type: 'warning',
    })
    await deleteEncounter(id)
    ElMessage.success('Contact supprimé')
    await loadEncounters()
  } catch {
    // cancelled
  }
}

async function onContactSaved() {
  editingEncounter.value = null
  await loadEncounters()
}

async function loadEncounters() {
  try {
    encounters.value = await listEncountersByPatient(patientId.value)
    const hospEncounter = encounters.value.find(e => e.contact_type === 'hospitalisation' && e.status === 'active')
    activeEncounterId.value = hospEncounter?.id ?? null
  } catch {
    encounters.value = []
  }
}

onMounted(async () => {
  loading.value = true
  await loadEncounters()
  loading.value = false
})
</script>

<style scoped>
.contact-view {
  width: 100%;
}

.contact-view__card {
  height: 100%;
}

.contact-view__card--section {
  margin-top: 16px;
}
</style>
