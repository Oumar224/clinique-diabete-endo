<template>
  <div class="contact-view cde" v-loading="loading">
    <EncountersTable
      :encounters="encounters"
      @new-contact="openContactDialog"
      @edit-contact="onEditContact"
      @delete-contact="onDeleteContact"
      @view-contact="onViewContact"
    />

    <section v-if="activeEncounterId" class="cde-panel contact-view__section">
      <div class="cde-panel__head">
        <span class="cde-panel__title">Mouvements du contact hospitalisation en cours</span>
      </div>
      <EncounterMovements :encounter-id="activeEncounterId" @updated="loadEncounters" />
    </section>

    <ContactFormDialog
      v-model:visible="contactDialogVisible"
      :patient-id="patientId"
      :patient-name="patientName"
      :user-id="currentUserId"
      :encounter="editingEncounter"
      @saved="onContactSaved"
    />

    <ContactDetailDialog ref="contactDetailRef" />
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
import ContactDetailDialog from '@/components/patients/ContactDetailDialog.vue'
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
const contactDetailRef = ref<InstanceType<typeof ContactDetailDialog> | null>(null)

function openContactDialog() {
  editingEncounter.value = null
  contactDialogVisible.value = true
}

function onViewContact(encounter: EncounterDto) {
  contactDetailRef.value?.open(encounter)
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

.contact-view__section {
  margin-top: 12px;
}
</style>
