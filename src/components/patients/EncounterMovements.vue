<template>
  <div class="encounter-movements">
    <div v-if="loading" v-loading="loading" class="encounter-movements__loading" />

    <template v-else-if="!encounter">
      <el-empty description="Aucun contact hospitalisation actif" :image-size="48" />
    </template>

    <template v-else>
      <!-- Contact infos -->
      <el-descriptions :column="3" border size="small" class="encounter-movements__contact">
        <el-descriptions-item label="Contact #">{{ encounter.id }}</el-descriptions-item>
        <el-descriptions-item label="Date début">{{ formatDate(encounter.start_date) }}</el-descriptions-item>
        <el-descriptions-item label="Statut">
          <el-tag :type="encounter.status === 'active' ? 'success' : 'info'" size="small" effect="dark">
            {{ encounter.status === 'active' ? 'Actif' : 'Fermé' }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="Service">{{ encounter.service_name || '—' }}</el-descriptions-item>
        <el-descriptions-item label="Médecin">{{ encounter.medecin_name || '—' }}</el-descriptions-item>
        <el-descriptions-item label="Date fin">{{ encounter.end_date ? formatDate(encounter.end_date) : '—' }}</el-descriptions-item>
      </el-descriptions>

      <!-- Actions bar -->
      <div v-if="!readonly" class="encounter-movements__actions">
        <el-button type="primary" size="small" :icon="Plus" @click="showAddDialog = true">
          Nouveau mouvement
        </el-button>
        <el-button size="small" :disabled="!hasOpenMovement" :loading="closing" @click="handleCloseMovement">
          Clôturer le mouvement en cours
        </el-button>
      </div>
      <el-alert v-else title="Contact clôturé — consultation en lecture seule" type="info" show-icon :closable="false" class="encounter-movements__readonly-banner" />

      <!-- Movements table -->
      <el-table :data="movements" style="width:100%" size="small" v-loading="loadingMovements" empty-text="Aucun mouvement" @row-click="showMovementDetails">
        <el-table-column label="Entrée" width="150">
          <template #default="{ row }">{{ formatDateTime(row.entered_at) }}</template>
        </el-table-column>
        <el-table-column label="Sortie" width="150">
          <template #default="{ row }">{{ row.exited_at ? formatDateTime(row.exited_at) : '—' }}</template>
        </el-table-column>
        <el-table-column label="Étape / Service" min-width="180">
          <template #default="{ row }">
            <div class="encounter-movements__cell">
              <span class="encounter-movements__step">{{ row.step_label }}</span>
              <span v-if="row.service_name" class="encounter-movements__service">{{ row.service_name }}</span>
              <span v-if="row.from_service_name" class="encounter-movements__from">(depuis {{ row.from_service_name }})</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="Motif" min-width="150">
          <template #default="{ row }">{{ row.motif || '—' }}</template>
        </el-table-column>
        <el-table-column label="Notes" min-width="120">
          <template #default="{ row }">{{ htmlToPlainText(row.notes) || '—' }}</template>
        </el-table-column>
        <el-table-column label="Action" width="100" fixed="right">
          <template #default="{ row }">
            <el-button v-if="!row.exited_at && !readonly" size="small" type="warning" link @click.stop="closeSingleMovement(row.id!)">
              Clôturer
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- Add movement dialog -->
      <el-dialog v-model="showAddDialog" title="Nouveau mouvement" width="480px" :close-on-click-modal="false">
        <el-form :model="form" label-position="top" size="small">
          <el-form-item label="Étape / Intitulé" required>
            <el-input v-model="form.step_label" placeholder="ex: Mutation en chirurgie" />
          </el-form-item>
          <el-row :gutter="16">
            <el-col :span="12">
              <el-form-item label="Service source">
                <el-select v-model="form.from_service_id" placeholder="(optionnel)" clearable filterable style="width:100%">
                  <el-option v-for="s in services" :key="s.id" :label="s.name" :value="s.id" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="Service destination" required>
                <el-select v-model="form.service_id" placeholder="Sélectionner" filterable style="width:100%">
                  <el-option v-for="s in services" :key="s.id" :label="s.name" :value="s.id" />
                </el-select>
              </el-form-item>
            </el-col>
          </el-row>
          <el-form-item label="Date / Heure d'entrée" required>
            <el-date-picker v-model="form.entered_at" type="datetime" placeholder="Choisir date et heure" style="width:100%"
              value-format="YYYY-MM-DDTHH:mm:ss.SSSZ" />
          </el-form-item>
          <el-form-item label="Motif">
            <el-input v-model="form.motif" placeholder="Motif du mouvement" />
          </el-form-item>
          <el-form-item label="Notes">
            <RichTextEditor v-model="form.notes" :rows="2" />
          </el-form-item>
        </el-form>
        <template #footer>
          <el-button @click="showAddDialog = false">Annuler</el-button>
          <el-button type="primary" :loading="saving" :disabled="!isFormValid" @click="handleAdd">Ajouter</el-button>
        </template>
      </el-dialog>

      <!-- Movement details dialog -->
      <el-dialog v-model="showDetailsDialog" title="Détails du mouvement" width="520px" :close-on-click-modal="false">
        <template v-if="selectedMovement">
          <el-descriptions :column="1" border size="small">
            <el-descriptions-item label="Étape / Intitulé">{{ selectedMovement.step_label }}</el-descriptions-item>
            <el-descriptions-item label="Service source">{{ selectedMovement.from_service_name || '—' }}</el-descriptions-item>
            <el-descriptions-item label="Service destination">{{ selectedMovement.service_name || '—' }}</el-descriptions-item>
            <el-descriptions-item label="Date/heure d'entrée">{{ formatDateTime(selectedMovement.entered_at) }}</el-descriptions-item>
            <el-descriptions-item label="Date/heure de sortie">{{ selectedMovement.exited_at ? formatDateTime(selectedMovement.exited_at) : 'En cours' }}</el-descriptions-item>
            <el-descriptions-item label="Motif">{{ selectedMovement.motif || '—' }}</el-descriptions-item>
            <el-descriptions-item label="Notes">
              <span v-if="!isRichTextEmpty(selectedMovement.notes)" v-html="selectedMovement.notes" />
              <span v-else>—</span>
            </el-descriptions-item>
            <el-descriptions-item label="Créé par">{{ selectedMovement.created_by ?? '—' }}</el-descriptions-item>
            <el-descriptions-item label="Date de création">{{ selectedMovement.created_at ? formatDateTime(selectedMovement.created_at) : '—' }}</el-descriptions-item>
          </el-descriptions>
        </template>
        <template #footer>
          <el-button @click="showDetailsDialog = false">Fermer</el-button>
        </template>
      </el-dialog>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import { useEncounters, type EncounterDto, type EncounterMovementDto } from '@/composables/useEncounters'
import RichTextEditor from '@/components/patients/RichTextEditor.vue'
import { htmlToPlainText, isRichTextEmpty } from '@/utils/rich-text'
import { ipcInvoke } from '@/utils/ipc'
import { emit as busEmit } from '@/utils/eventBus'

const props = defineProps<{
  encounterId: number | null
}>()

const emit = defineEmits<{
  updated: []
}>()
const { getEncounter, getEncounterMovements, addEncounterMovement, closeCurrentEncounterMovement } = useEncounters()

const loading = ref(false)
const loadingMovements = ref(false)
const saving = ref(false)
const closing = ref(false)
const encounter = ref<EncounterDto | null>(null)
const movements = ref<EncounterMovementDto[]>([])
const services = ref<{ id: number; name: string }[]>([])
const showAddDialog = ref(false)
const showDetailsDialog = ref(false)
const selectedMovement = ref<EncounterMovementDto | null>(null)

const form = ref({
  step_label: '',
  from_service_id: null as number | null,
  service_id: null as number | null,
  entered_at: '',
  motif: '',
  notes: '',
})

const isFormValid = computed(() => {
  return form.value.step_label.trim() && form.value.service_id && form.value.entered_at
})

const readonly = computed(() => encounter.value?.status === 'closed')

const hasOpenMovement = computed(() => movements.value.some(m => !m.exited_at))

function formatDate(dateStr: string): string {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function formatDateTime(dateStr: string): string {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }) +
    ' ' + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

async function loadData() {
  if (!props.encounterId) return
  loading.value = true
  try {
    const [enc, svcs] = await Promise.all([
      getEncounter(props.encounterId),
      ipcInvoke<{ id: number; name: string }[]>('services:list'),
    ])
    encounter.value = enc
    services.value = svcs
  } catch (e) {
    ElMessage.error(`Erreur chargement contact: ${(e as Error).message}`)
  } finally {
    loading.value = false
  }
}

async function loadMovements() {
  if (!props.encounterId) return
  loadingMovements.value = true
  try {
    movements.value = await getEncounterMovements(props.encounterId)
  } catch {
    movements.value = []
  } finally {
    loadingMovements.value = false
  }
}

watch(() => props.encounterId, async (id) => {
  if (id) {
    await Promise.all([loadData(), loadMovements()])
  } else {
    encounter.value = null
    movements.value = []
  }
}, { immediate: true })

watch(() => showAddDialog.value, (open) => {
  if (open) {
    if (movements.value.length > 0) {
      form.value.from_service_id = movements.value[movements.value.length - 1].service_id ?? null
    } else {
      form.value.from_service_id = encounter.value?.service_id ?? null
    }
  }
})

function showMovementDetails(row: EncounterMovementDto) {
  selectedMovement.value = row
  showDetailsDialog.value = true
}

async function handleAdd() {
  if (!isFormValid.value || !props.encounterId) return

  saving.value = true
  try {
    const dto = {
      encounter_id: props.encounterId,
      step_label: form.value.step_label.trim(),
      from_service_id: form.value.from_service_id ?? null,
      service_id: form.value.service_id!,
      entered_at: form.value.entered_at,
      motif: form.value.motif || null,
      notes: form.value.notes || null,
    }
    await addEncounterMovement(dto)
    ElMessage.success('Mouvement ajouté')
    showAddDialog.value = false
    form.value = { step_label: '', from_service_id: null, service_id: null, entered_at: '', motif: '', notes: '' }
    await loadMovements()
    busEmit('movement-updated')
    emit('updated')
  } catch (e) {
    ElMessage.error(`Erreur: ${(e as Error).message}`)
  } finally {
    saving.value = false
  }
}

async function handleCloseMovement() {
  if (!props.encounterId || !hasOpenMovement.value) return
  closing.value = true
  try {
    await closeCurrentEncounterMovement(props.encounterId)
    ElMessage.success('Mouvement clôturé')
    await loadMovements()
    busEmit('movement-updated')
    emit('updated')
  } catch (e) {
    ElMessage.error(`Erreur: ${(e as Error).message}`)
  } finally {
    closing.value = false
  }
}

async function closeSingleMovement(_movementId: number) {
  if (!props.encounterId) return
  closing.value = true
  try {
    await closeCurrentEncounterMovement(props.encounterId)
    ElMessage.success('Mouvement clôturé')
    await loadMovements()
    busEmit('movement-updated')
    emit('updated')
  } catch (e) {
    ElMessage.error(`Erreur: ${(e as Error).message}`)
  } finally {
    closing.value = false
  }
}
</script>

<style scoped>
.encounter-movements {
  width: 100%;
}

.encounter-movements__loading {
  min-height: 60px;
}

.encounter-movements__contact {
  margin-bottom: 12px;
}

.encounter-movements__actions {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.encounter-movements__cell {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.encounter-movements__step {
  font-weight: 600;
  font-size: 13px;
}

.encounter-movements__service {
  font-size: 12px;
  color: var(--el-color-primary);
}

.encounter-movements__from {
  font-size: 11px;
  color: var(--cde-muted);
}

.encounter-movements__readonly-banner {
  margin-bottom: 12px;
}
</style>
