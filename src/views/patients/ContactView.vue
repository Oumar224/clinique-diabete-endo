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
import { listEncountersByPatient, deleteEncounter } from '@/composables/useEncounters'
import type { EncounterDto } from '@/composables/useEncounters'
import EncountersTable from '@/components/patients/EncountersTable.vue'
import ContactFormDialog from '@/components/patients/ContactFormDialog.vue'

const route = useRoute()
const { activePatient } = usePatientContext()
const { user } = useAuth()

const patientId = computed(() => Number(route.params.id) || activePatient.value?.id || 0)
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
</style>
