<template>
  <div class="examens-view cde" v-loading="loading">
    <PatientPageToolbar>
      <el-button :icon="Refresh" :loading="refreshing" @click="onRefresh">Actualiser</el-button>
      <el-button type="primary" :icon="Plus" @click="openCreateDialog">Nouvelle demande</el-button>
    </PatientPageToolbar>

    <el-alert v-if="error" type="error" :title="error" show-icon closable class="cde-alert cde-alert--danger" />

    <div class="cde-toolbar examens-view__filters">
      <div class="cde-filters">
        <div class="cde-filter">
          <span class="cde-filter__label">Période</span>
          <el-date-picker
            v-model="dateRange"
            class="cde-toolbar__range"
            type="daterange"
            range-separator="→"
            start-placeholder="Début"
            end-placeholder="Fin"
            value-format="YYYY-MM-DD"
            clearable
            aria-label="Période de la demande"
          />
        </div>
        <div class="cde-filter">
          <span class="cde-filter__label">Type</span>
          <el-select
            v-model="typeFilter"
            class="cde-toolbar__select"
            placeholder="Tous"
            clearable
            aria-label="Filtrer par type"
          >
            <el-option label="Imagerie" value="imagerie" />
            <el-option label="Laboratoire" value="laboratoire" />
            <el-option label="Avis spécialisé" value="avis" />
          </el-select>
        </div>
        <div class="cde-filter">
          <span class="cde-filter__label">Statut</span>
          <el-select
            v-model="statutFilter"
            class="cde-toolbar__select"
            placeholder="Tous"
            clearable
            aria-label="Filtrer par statut"
          >
            <el-option label="En attente" value="en_attente" />
            <el-option label="En cours" value="en_cours" />
            <el-option label="Réalisé" value="realise" />
            <el-option label="Annulé" value="annule" />
          </el-select>
        </div>
      </div>
    </div>

    <div class="cde-table-card">
      <el-table
        :data="filteredRequests"
        size="small"
        class="examens-view__table"
        @row-click="openDetailDialog"
      >
        <el-table-column label="Demande" width="150">
          <template #default="{ row }">{{ formatDateTime(row.createdAt) }}</template>
        </el-table-column>
        <el-table-column label="Type" width="130">
          <template #default="{ row }">
            <span class="cde-badge" :class="typeBadgeClass(row.type)">{{ typeLabel(row.type) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="Examen(s)" min-width="200">
          <template #default="{ row }">{{ examLabel(row) || '—' }}</template>
        </el-table-column>
        <el-table-column label="Prescripteur" width="150">
          <template #default="{ row }">{{ row.prescripteurNom || '—' }}</template>
        </el-table-column>
        <el-table-column label="Planifié" width="130">
          <template #default="{ row }">{{ formatPlanned(row) }}</template>
        </el-table-column>
        <el-table-column label="Réalisation" width="150">
          <template #default="{ row }">{{ formatRealization(row) }}</template>
        </el-table-column>
        <el-table-column label="Statut" width="110">
          <template #default="{ row }">
            <span class="cde-badge" :class="statutBadgeClass(row.statut)">{{ statutLabel(row.statut) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="Actions" width="320" fixed="right">
          <template #default="{ row }">
            <el-button
              type="primary"
              size="small"
              plain
              :loading="generatingId === row.id"
              @click.stop="onGenerateOrdonnance(row)"
            >
              Générer
            </el-button>
            <el-tooltip content="Aperçu PDF de l'ordonnance" placement="top" :show-after="400">
              <el-button size="small" :icon="View" @click.stop="onPreviewOrdonnance(row)" />
            </el-tooltip>
            <el-button
              v-if="canRealize(row)"
              type="success"
              size="small"
              class="examens-view__realize-btn"
              @click.stop="onRealize(row)"
            >
              Réaliser
            </el-button>
            <el-button size="small" @click.stop="onEditRequest(row)">Modifier</el-button>
            <el-popconfirm
              title="Supprimer cette demande ?"
              confirm-button-text="Supprimer"
              cancel-button-text="Annuler"
              @confirm="onDeleteRow(row)"
            >
              <template #reference>
                <el-button type="danger" size="small" @click.stop>Supprimer</el-button>
              </template>
            </el-popconfirm>
          </template>
        </el-table-column>
        <template #empty>
          <div class="cde-empty">
            Aucune demande.
          </div>
        </template>
      </el-table>
    </div>

    <div class="cde-footer">
      <span class="cde-muted">{{ filteredRequests.length }} demande(s)</span>
    </div>

    <el-dialog v-model="createDialogVisible" title="Nouvelle demande" width="620px" :close-on-click-modal="false" @closed="onCreateDialogClosed">
      <el-form ref="formRef" :model="form" :rules="formRules" label-position="top">
        <el-form-item label="Prescripteur" prop="prescripteur">
          <el-select v-model="form.prescripteur" placeholder="Sélectionner un prescripteur" style="width:100%" filterable>
            <el-option
              v-for="medecin in medecins"
              :key="medecin.id!"
              :label="formatMedecin(medecin)"
              :value="medecin.id!"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="Type de demande" prop="type">
          <el-radio-group v-model="form.type">
            <el-radio value="imagerie" size="large" border>Imagerie (Radio, Scanner, IRM)</el-radio>
            <el-radio value="laboratoire" size="large" border>Examen de laboratoire</el-radio>
            <el-radio value="avis" size="large" border>Avis spécialisé</el-radio>
          </el-radio-group>
        </el-form-item>

        <el-form-item v-if="form.type === 'avis'" label="Spécialité sollicitée" prop="specialtyId">
          <el-select v-model="form.specialtyId" placeholder="Sélectionner une spécialité" style="width:100%" filterable>
            <el-option
              v-for="spec in specialties"
              :key="spec.id!"
              :label="spec.name"
              :value="spec.id!"
            />
          </el-select>
        </el-form-item>

        <el-form-item v-if="form.type === 'imagerie'" label="Examen demandé" prop="examen">
          <el-tree-select
            v-model="form.examen"
            :data="imagerieTreeData"
            :props="{ label: 'label', children: 'children' }"
            node-key="id"
            check-strictly
            filterable
            placeholder="Sélectionner un examen"
            style="width:100%"
          />
        </el-form-item>

        <el-form-item v-if="form.type === 'laboratoire'" label="Analyses demandées" prop="examens">
          <el-tree-select
            v-model="form.examens"
            :data="laboratoireTreeData"
            :props="{ label: 'label', children: 'children' }"
            node-key="id"
            multiple
            show-checkbox
            check-strictly
            filterable
            placeholder="Rechercher et sélectionner des analyses"
            style="width:100%"
            collapse-tags
            collapse-tags-tooltip
          />
        </el-form-item>

        <el-form-item v-if="form.type !== 'laboratoire'" label="Motif clinique de la demande" prop="motif">
          <RichTextEditor v-model="form.motif" :rows="3" placeholder="Décrire le motif clinique..." />
        </el-form-item>

        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="Date planifiée">
              <el-date-picker
                v-model="form.plannedDate"
                type="date"
                value-format="YYYY-MM-DD"
                style="width:100%"
                placeholder="Date de l'examen"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="Heure planifiée">
              <el-select v-model="form.plannedHour" style="width:100%" placeholder="Heure" clearable>
                <el-option
                  v-for="h in hours"
                  :key="h"
                  :label="String(h).padStart(2, '0') + ':00'"
                  :value="h"
                />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
      <template #footer>
        <el-button @click="createDialogVisible = false">Annuler</el-button>
        <el-button type="primary" :loading="saving" @click="onEnvoyer">Envoyer la demande</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="editDialogVisible" title="Modifier la demande" width="550px" :close-on-click-modal="false">
      <el-form :model="editForm" label-position="top">
        <el-form-item label="Type">
          <el-radio-group v-model="editForm.type" disabled>
            <el-radio value="imagerie" size="large" border>Imagerie</el-radio>
            <el-radio value="laboratoire" size="large" border>Laboratoire</el-radio>
            <el-radio value="avis" size="large" border>Avis spécialisé</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="Date planifiée">
              <el-date-picker
                v-model="editForm.plannedDate"
                type="date"
                value-format="YYYY-MM-DD"
                style="width:100%"
                placeholder="Date de l'examen"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="Heure planifiée">
              <el-select v-model="editForm.plannedHour" style="width:100%" placeholder="Heure">
                <el-option
                  v-for="h in hours"
                  :key="h"
                  :label="String(h).padStart(2, '0') + ':00'"
                  :value="h"
                />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="Prescripteur">
          <el-select v-model="editForm.prescripteurId" style="width:100%" filterable>
            <el-option
              v-for="medecin in medecins"
              :key="medecin.id!"
              :label="formatMedecin(medecin)"
              :value="medecin.id!"
            />
          </el-select>
        </el-form-item>
        <el-form-item v-if="editForm.type === 'avis'" label="Spécialité">
          <el-select v-model="editForm.specialtyId" style="width:100%" filterable>
            <el-option
              v-for="spec in specialties"
              :key="spec.id!"
              :label="spec.name"
              :value="spec.id!"
            />
          </el-select>
        </el-form-item>
        <el-form-item v-if="editForm.type === 'imagerie'" label="Examen">
          <el-tree-select
            v-model="editForm.examenId"
            :data="imagerieTreeData"
            :props="{ label: 'label', children: 'children' }"
            node-key="id"
            check-strictly
            filterable
            style="width:100%"
          />
        </el-form-item>
        <el-form-item v-if="editForm.type === 'laboratoire'" label="Analyses">
          <el-tree-select
            v-model="editForm.examIds"
            :data="laboratoireTreeData"
            :props="{ label: 'label', children: 'children' }"
            node-key="id"
            multiple
            show-checkbox
            check-strictly
            filterable
            style="width:100%"
            collapse-tags
            collapse-tags-tooltip
          />
        </el-form-item>
        <el-form-item label="Motif">
          <RichTextEditor v-model="editForm.motif" :rows="3" />
        </el-form-item>
        <el-form-item label="Statut">
          <el-select v-model="editForm.statut" style="width:100%">
            <el-option label="En attente" value="en_attente" />
            <el-option label="En cours" value="en_cours" />
            <el-option label="Réalisé" value="realise" />
            <el-option label="Annulé" value="annule" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button type="danger" :disabled="editRequestId == null" @click="onEditDelete" style="float:left">
          Supprimer
        </el-button>
        <el-button @click="editDialogVisible = false">Annuler</el-button>
        <el-button type="primary" :loading="editSaving" @click="onEditSave">Enregistrer</el-button>
      </template>
    </el-dialog>

    <ExamRequestDetailDialog v-model:visible="detailDialogVisible" :request="selectedRequest" />
    <OrdonnancePreview
      ref="ordonnancePreviewRef"
      :patient-id="activePatient?.id ?? 0"
      :ordonnance-items="previewOrdonnanceItems"
    />

    <ExamValidationDialog
      v-model:visible="showValidationDialog"
      :exam-request-id="validationRequestId!"
      :exam-ids="validationExamIds"
      @validated="onValidationComplete"
    />

    <AvisResultDialog
      v-model:visible="showAvisDialog"
      :exam-request-id="avisRequestId"
      :title="avisTitle"
      @realized="onValidationComplete"
    />
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, watch, computed, onMounted } from 'vue'
import { Plus, Refresh, View } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { FormInstance, FormItemRule, FormRules } from 'element-plus'
import { useAuth } from '@/composables/useAuth'
import { useUsers, getUserDisplayName, type UserDto } from '@/composables/useUsers'
import { useExamTypes, type ExamTypeDto } from '@/composables/useExamTypes'
import { useExamRequests, type ExamRequestDto } from '@/composables/useExamRequests'
import { useSpecialties } from '@/composables/useSpecialties'
import { usePatientContext } from '@/composables/usePatientContext'
import { useEncounters } from '@/composables/useEncounters'
import { useOrdonnanceLibre } from '@/composables/useOrdonnanceLibre'
import type { PrescriptionSortie } from '@/types/crh-diabete'
import ExamValidationDialog from '@/components/patients/ExamValidationDialog.vue'
import ExamRequestDetailDialog from '@/components/patients/ExamRequestDetailDialog.vue'
import OrdonnancePreview from '@/components/prescriptions/OrdonnancePreview.vue'
import PatientPageToolbar from '@/components/patients/PatientPageToolbar.vue'
import AvisResultDialog from '@/components/patients/AvisResultDialog.vue'
import RichTextEditor from '@/components/patients/RichTextEditor.vue'
import { isRichTextEmpty } from '@/utils/rich-text'
import { formatDate, formatDateTime } from '@/utils/date'

interface TreeNode {
  id: number
  label: string
  children?: TreeNode[]
}

const { user } = useAuth()
const { users: allUsers, loadUsers } = useUsers()
const { activePatient } = usePatientContext()
const { fetchAllByCategory, allTypes } = useExamTypes()
const {
  requests, loading, error,
  fetchRequests, createRequest, updateRequest, deleteRequest,
} = useExamRequests()
const { specialties, fetchSpecialties } = useSpecialties()
const formRef = ref<FormInstance>()

const imageriesDisponibles = ref<ExamTypeDto[]>([])
const analysesDisponibles = ref<ExamTypeDto[]>([])
const medecins = ref<UserDto[]>([])
const saving = ref(false)

const imagerieTreeData = computed<TreeNode[]>(() => buildTree(imageriesDisponibles.value))
const laboratoireTreeData = computed<TreeNode[]>(() => buildTree(analysesDisponibles.value))

function buildTree(items: ExamTypeDto[]): TreeNode[] {
  const types = items.filter(t => !t.parent_id)
  return types.map(type => {
    const children = items.filter(e => e.parent_id === type.id)
    return {
      id: type.id!,
      label: type.label,
      children: children.length > 0
        ? children.map(c => ({ id: c.id!, label: c.label }))
        : undefined,
    }
  })
}

function findLabel(items: ExamTypeDto[], id: number): string {
  return items.find(i => i.id === id)?.label ?? String(id)
}

function createExamForm() {
  return {
    type: '',
    examen: null as number | null,
    examens: [] as number[],
    specialtyId: null as number | null,
    motif: '',
    prescripteur: null as number | null,
    plannedDate: null as string | null,
    plannedHour: null as number | null,
  }
}

const form = reactive(createExamForm())

function richTextRequiredRule(message: string): FormItemRule {
  return {
    validator: (_rule: unknown, value: unknown, callback: (error?: string | Error) => void) => {
      if (isRichTextEmpty(value as string | null | undefined)) {
        callback(new Error(message))
      } else {
        callback()
      }
    },
    trigger: 'blur',
  }
}

const formRules = computed<FormRules>(() => {
  const rules: FormRules = {
    prescripteur: [{ required: true, message: 'Sélectionnez un prescripteur', trigger: 'change' }],
    type: [{ required: true, message: 'Sélectionnez un type de demande', trigger: 'change' }],
  }
  if (form.type === 'imagerie') {
    rules.examen = [{ required: true, message: 'Sélectionnez un examen', trigger: 'change' }]
    rules.motif = [richTextRequiredRule('Le motif clinique est requis')]
  } else if (form.type === 'laboratoire') {
    rules.examens = [{ required: true, message: 'Sélectionnez au moins une analyse', trigger: 'change' }]
  } else if (form.type === 'avis') {
    rules.specialtyId = [{ required: true, message: 'La spécialité est requise', trigger: 'change' }]
    rules.motif = [richTextRequiredRule('Le motif clinique est requis')]
  }
  return rules
})

watch(() => form.type, async (newType) => {
  form.examen = null
  form.examens = []
  form.specialtyId = null
  form.motif = ''
  if (newType === 'imagerie') {
    await fetchAllByCategory('imagerie')
    imageriesDisponibles.value = [...allTypes.value]
  } else if (newType === 'laboratoire') {
    await fetchAllByCategory('laboratoire')
    analysesDisponibles.value = [...allTypes.value]
  }
  formRef.value?.clearValidate(['examen', 'examens', 'specialtyId', 'motif'])
})

function formatMedecin(m: UserDto): string {
  return getUserDisplayName(m)
}

function typeLabel(type: string): string {
  const map: Record<string, string> = { imagerie: 'Imagerie', laboratoire: 'Laboratoire', avis: 'Avis spécialisé' }
  return map[type] || type
}

function statutLabel(statut: string): string {
  const map: Record<string, string> = {
    en_attente: 'En attente',
    en_cours: 'En cours',
    realise: 'Réalisé',
    annule: 'Annulé',
  }
  return map[statut] || statut
}

function statutBadgeClass(statut: string): string {
  const map: Record<string, string> = {
    en_attente: 'cde-badge--warning',
    en_cours: 'cde-badge--info',
    realise: 'cde-badge--success',
    annule: 'cde-badge--danger',
  }
  return map[statut] || 'cde-badge--muted'
}

function typeBadgeClass(type: string): string {
  const map: Record<string, string> = {
    imagerie: 'cde-badge--info',
    laboratoire: 'cde-badge--success',
    avis: 'cde-badge--warning',
  }
  return map[type] || 'cde-badge--muted'
}

function examLabel(row: ExamRequestDto): string {
  if (row.type === 'avis') {
    if (row.specialtyName) return row.specialtyName
    if (row.specialtyId != null) {
      const spec = specialties.value.find(s => s.id === row.specialtyId)
      if (spec) return spec.name
    }
    return row.specialite || 'Avis spécialisé'
  }
  if (row.type === 'laboratoire' && row.examIds && row.examIds.length > 0) {
    return row.examIds.map(id => findLabel([...analysesDisponibles.value, ...imageriesDisponibles.value], id)).join(', ')
  }
  if (row.examenLabel) return row.examenLabel
  if (row.examenId != null) return findLabel(imageriesDisponibles.value, row.examenId)
  return ''
}

const hours = [6, 8, 10, 12, 14, 16, 18, 20, 22]

function formatPlanned(row: ExamRequestDto): string {
  if (!row.plannedDate) return '—'
  const base = formatDate(row.plannedDate)
  if (row.plannedHour != null) return `${base} ${String(row.plannedHour).padStart(2, '0')}:00`
  return base
}

function formatRealization(row: ExamRequestDto): string {
  return formatDateTime(row.realizedAt ?? row.validatedAt)
}

async function onEnvoyer() {
  if (!formRef.value) return
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return
  if (!activePatient.value) { ElMessage.warning('Aucun patient sélectionné'); return }

  saving.value = true
  try {
    const dto: Record<string, unknown> = {
      patientId: activePatient.value.id,
      type: form.type,
      prescripteurId: form.prescripteur,
      specialtyId: form.type === 'avis' ? form.specialtyId : null,
      motif: form.type !== 'laboratoire' ? form.motif : '',
      examenId: form.type !== 'laboratoire' ? form.examen : null,
      examIds: form.type === 'laboratoire' ? form.examens : undefined,
      plannedDate: form.plannedDate,
      plannedHour: form.plannedHour,
    }
    const created = await createRequest(dto as Parameters<typeof createRequest>[0])
    if (created) {
      ElMessage.success('Demande envoyée')
      createDialogVisible.value = false
      Object.assign(form, createExamForm())
      await fetchRequests(activePatient.value.id)
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    if (msg.includes('introuvable dans patient')) {
      ElMessage.error('Le dossier patient semble inaccessible. Veuillez rafraîchir la page.')
    } else {
      ElMessage.error(`Erreur: ${msg}`)
    }
  } finally {
    saving.value = false
  }
}

const refreshing = ref(false)

async function onRefresh() {
  if (!activePatient.value) return
  refreshing.value = true
  await fetchRequests(activePatient.value.id)
  refreshing.value = false
}

const createDialogVisible = ref(false)

function openCreateDialog() {
  Object.assign(form, createExamForm())
  createDialogVisible.value = true
}

function onCreateDialogClosed() {
  Object.assign(form, createExamForm())
  formRef.value?.clearValidate()
}

const dateRange = ref<string[] | null>(null)
const typeFilter = ref<string>('')
const statutFilter = ref<string>('')

const filteredRequests = computed(() => {
  return requests.value.filter(req => {
    if (typeFilter.value && req.type !== typeFilter.value) return false
    if (statutFilter.value && req.statut !== statutFilter.value) return false
    if (dateRange.value && dateRange.value.length === 2) {
      const dateStr = req.createdAt?.substring(0, 10) ?? ''
      if (!dateStr) return false
      if (dateStr < dateRange.value[0] || dateStr > dateRange.value[1]) return false
    }
    return true
  })
})

function canRealize(row: ExamRequestDto): boolean {
  return row.statut !== 'realise' && row.statut !== 'annule'
}

function createEditForm() {
  return {
    type: '' as string,
    prescripteurId: null as number | null,
    specialtyId: null as number | null,
    examenId: null as number | null,
    examIds: [] as number[],
    motif: '',
    statut: 'en_attente' as string,
    plannedDate: null as string | null,
    plannedHour: null as number | null,
  }
}

const editForm = reactive(createEditForm())
const editDialogVisible = ref(false)
const editRequestId = ref<number | null>(null)
const editSaving = ref(false)

function onEditRequest(req: ExamRequestDto) {
  const r = req as unknown as Record<string, unknown>
  editRequestId.value = req.id ?? null
  editForm.type = req.type
  editForm.prescripteurId = req.prescripteurId ?? null
  editForm.specialtyId = req.specialtyId ?? null
  editForm.examenId = req.examenId ?? null
  editForm.examIds = req.examIds ?? []
  editForm.motif = req.motif ?? ''
  editForm.statut = req.statut
  editForm.plannedDate = (r.plannedDate as string | null) ?? null
  editForm.plannedHour = (r.plannedHour as number | null) ?? null
  editDialogVisible.value = true
}

async function onEditSave() {
  if (editRequestId.value == null) return
  editSaving.value = true
  try {
    const dto: Record<string, unknown> = {
      type: editForm.type,
      prescripteurId: editForm.prescripteurId,
      specialtyId: editForm.type === 'avis' ? editForm.specialtyId : null,
      motif: editForm.motif,
      statut: editForm.statut,
      examenId: editForm.type !== 'laboratoire' ? editForm.examenId : null,
      examIds: editForm.type === 'laboratoire' ? editForm.examIds : undefined,
      plannedDate: editForm.plannedDate,
      plannedHour: editForm.plannedHour,
    }
    const updated = await updateRequest(editRequestId.value, dto as Parameters<typeof updateRequest>[1])
    if (updated) {
      ElMessage.success('Demande mise à jour')
      editDialogVisible.value = false
      if (activePatient.value) await fetchRequests(activePatient.value.id)
    } else {
      ElMessage.error('Erreur lors de la mise à jour')
    }
  } catch (e) {
    ElMessage.error(`Erreur: ${e instanceof Error ? e.message : String(e)}`)
  } finally {
    editSaving.value = false
  }
}

async function onEditDelete() {
  if (editRequestId.value == null) return
  try {
    await ElMessageBox.confirm('Supprimer cette demande ?', 'Confirmation', {
      type: 'warning',
      confirmButtonText: 'Supprimer',
      cancelButtonText: 'Annuler',
    })
    const ok = await deleteRequest(editRequestId.value)
    if (ok) {
      ElMessage.success('Demande supprimée')
      editDialogVisible.value = false
      if (activePatient.value) await fetchRequests(activePatient.value.id)
    }
  } catch { /* cancelled */ }
}

async function onDeleteRow(row: ExamRequestDto) {
  if (row.id == null) return
  const ok = await deleteRequest(row.id)
  if (ok) {
    ElMessage.success('Demande supprimée')
    if (activePatient.value) await fetchRequests(activePatient.value.id)
  }
}

const detailDialogVisible = ref(false)
const selectedRequest = ref<ExamRequestDto | null>(null)

// ─── Aperçu PDF de l'ordonnance d'une demande (sans génération) ───

const ordonnancePreviewRef = ref<InstanceType<typeof OrdonnancePreview> | null>(null)
const previewOrdonnanceItems = ref<PrescriptionSortie[]>([])

function onPreviewOrdonnance(row: ExamRequestDto) {
  if (!activePatient.value) {
    ElMessage.warning('Aucun patient sélectionné')
    return
  }
  const built = buildOrdonnanceItem(row)
  if (!built) {
    ElMessage.warning('Impossible de résoudre le libellé de cette demande')
    return
  }
  previewOrdonnanceItems.value = [built.item]
  ordonnancePreviewRef.value?.open()
}

function openDetailDialog(row: ExamRequestDto) {
  selectedRequest.value = {
    ...row,
    examenLabel: row.type === 'laboratoire' ? examLabel(row) : row.examenLabel,
  }
  detailDialogVisible.value = true
}

const showValidationDialog = ref(false)
const validationRequestId = ref<number | null>(null)
const validationExamIds = ref<number[]>([])

const showAvisDialog = ref(false)
const avisRequestId = ref<number | null>(null)
const avisTitle = ref('')

function onRealize(row: ExamRequestDto) {
  if (row.id == null) return
  if (row.type === 'laboratoire') {
    validationRequestId.value = row.id
    validationExamIds.value = row.examIds ?? []
    showValidationDialog.value = true
  } else {
    avisRequestId.value = row.id
    avisTitle.value = row.type === 'avis' ? "Compte-rendu d'avis spécialisé" : "Compte-rendu d'imagerie"
    showAvisDialog.value = true
  }
}

async function onValidationComplete() {
  if (activePatient.value) {
    await fetchRequests(activePatient.value.id)
  }
}

// ─── Génération d'ordonnance par demande ────────────────────────────

const generatingId = ref<number | null>(null)
const { createOrReplaceFromGroup, findCrhGroupOrdonnance } = useOrdonnanceLibre()
const { listEncountersByPatient } = useEncounters()

function truncateLabel(label: string, max = 40): string {
  const clean = label.replace(/<[^>]*>/g, '').trim()
  return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean
}

function buildOrdonnanceItem(row: ExamRequestDto): { item: PrescriptionSortie; categorie: string; shortLabel: string } | null {
  const motif = row.motif ?? ''
  const base = {
    _key: crypto.randomUUID(),
    medicament: '',
    dosage: '',
    unite: '',
    voie: '',
    duree: 7,
    dureeType: 'courte' as const,
    frequence: [] as string[],
    frequenceType: 'moments',
    instructions: '',
    formeGalenique: '',
    momentPrises: [] as string[],
    renouvellement: false,
    nbRenouvellements: 1,
  }
  if (row.type === 'imagerie') {
    const label = examLabel(row)
    if (!label || label === '—') return null
    return {
      categorie: 'examen',
      shortLabel: truncateLabel(label),
      item: { ...base, categorie: 'examen', examenType: 'imagerie', examen: label, examens: [], specialite: '', motif },
    }
  }
  if (row.type === 'laboratoire') {
    const all = [...analysesDisponibles.value, ...imageriesDisponibles.value]
    let labels: string[] = (row.examIds ?? []).map(id => findLabel(all, id)).filter(Boolean)
    if (labels.length === 0) {
      const fallback = examLabel(row)
      if (!fallback || fallback === '—') return null
      labels = fallback.split(',').map(s => s.trim()).filter(Boolean)
    }
    if (labels.length === 0) return null
    return {
      categorie: 'examen',
      shortLabel: truncateLabel(labels.length === 1 ? labels[0] : `${labels[0]} +${labels.length - 1}`),
      item: { ...base, categorie: 'examen', examenType: 'laboratoire', examen: labels.join(', '), examens: labels, specialite: '', motif },
    }
  }
  // avis
  const specialite = examLabel(row)
  if (!specialite || specialite === '—') return null
  return {
    categorie: 'avis',
    shortLabel: truncateLabel(specialite),
    item: { ...base, categorie: 'avis', examen: '', specialite, motif },
  }
}

async function onGenerateOrdonnance(row: ExamRequestDto) {
  if (row.id == null) return
  if (!activePatient.value) {
    ElMessage.warning('Aucun patient sélectionné')
    return
  }
  const patientId = activePatient.value.id
  const built = buildOrdonnanceItem(row)
  if (!built) {
    ElMessage.warning('Impossible de résoudre le libellé de cette demande')
    return
  }
  const { item, categorie, shortLabel } = built
  if (item.examen === '' && (item as PrescriptionSortie).examens?.length === 0 && categorie === 'examen') {
    ElMessage.warning('Impossible de résoudre le libellé de cette demande')
    return
  }

  // Résout le séjour actif (contactId) — ExamensView n'a pas de contact courant.
  const activeEncounters = await listEncountersByPatient(patientId, 'active')
  let encounter = activeEncounters.find(e => e.contact_type === 'hospitalisation' && e.status === 'active')
    ?? activeEncounters.find(e => e.status === 'active')
    ?? activeEncounters[0]
  if (!encounter) {
    const all = await listEncountersByPatient(patientId)
    encounter = all.find(e => e.contact_type === 'hospitalisation' && e.status === 'active')
      ?? all.find(e => e.status === 'active')
      ?? all[0]
  }
  if (!encounter?.id) {
    ElMessage.error('Aucun séjour actif trouvé pour ce patient. Créez ou réouvrez un contact avant de générer une ordonnance.')
    return
  }
  const contactId = String(encounter.id)
  const createdBy = user.value?.id ? String(user.value.id) : ''
  const sourceDocumentId = `exam-request-${row.id}`
  const title = `Ordonnance - ${shortLabel} - ${formatDate(new Date())}`

  generatingId.value = row.id
  try {
    const existing = await findCrhGroupOrdonnance(patientId, sourceDocumentId, categorie)
    if (existing) {
      try {
        await ElMessageBox.confirm(
          'Une ordonnance existe déjà pour cette demande (celle-ci sera remplacée). Continuer ?',
          'Remplacer l\'ordonnance',
          { type: 'warning', confirmButtonText: 'Remplacer', cancelButtonText: 'Annuler' },
        )
      } catch {
        return
      }
    }
    const res = await createOrReplaceFromGroup({
      patientId,
      contactId,
      serviceId: null,
      siteId: null,
      createdBy,
      title,
      sourceDocumentId,
      categorie,
      items: [item],
    })
    if (res?.replaced) {
      ElMessage.info(`L'ordonnance « ${title} » existante a été remplacée.`)
    } else if (res) {
      ElMessage.success(`Ordonnance « ${title} » générée.`)
    } else {
      return
    }
    ElMessage.success('Retrouvez-la dans le menu Ordonnances du patient.')
  } finally {
    generatingId.value = null
  }
}

onMounted(async () => {
  try {
    await loadUsers()
    medecins.value = allUsers.value.filter(u => u.role === 'MEDECIN' || u.role === 'ADMIN')
    if (user.value && medecins.value.some(m => m.id === user.value!.id)) {
      form.prescripteur = user.value.id as number
    } else if (medecins.value.length > 0 && medecins.value[0].id != null) {
      form.prescripteur = medecins.value[0].id
    }
  } catch { /* silent */ }

  if (activePatient.value) {
    await fetchRequests(activePatient.value.id)
  }

  // Charge les libellés d'examens dès le montage pour que la colonne
  // « Examen(s) » des demandes laboratoire/imagerie affiche des noms et
  // non des IDs bruts (avant, les listes n'étaient chargées qu'à
  // l'ouverture du dialogue de création).
  try {
    await fetchAllByCategory('laboratoire')
    analysesDisponibles.value = [...allTypes.value]
  } catch { /* silent */ }
  try {
    await fetchAllByCategory('imagerie')
    imageriesDisponibles.value = [...allTypes.value]
  } catch { /* silent */ }

  fetchSpecialties(true)
})
</script>

<style scoped>
.examens-view__table {
  width: 100%;
}
</style>