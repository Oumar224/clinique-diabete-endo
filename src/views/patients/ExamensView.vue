<template>
  <div class="examens-view" v-loading="loading">
    <h3 class="examens-view__title">Demande d'examens</h3>

    <el-alert v-if="error" type="error" :title="error" show-icon closable style="margin-bottom:12px" />

    <div class="examens-view__form-card">
      <div class="examens-view__form-header" @click="formOpen = !formOpen">
        <div class="examens-view__form-header-left">
          <el-icon class="examens-view__form-header-icon"><Plus /></el-icon>
          <span class="examens-view__form-title">Nouvelle demande</span>
          <span class="examens-view__form-badge">{{ todayRequestCount }}</span>
        </div>
        <el-icon
          class="examens-view__form-arrow"
          :class="{ 'examens-view__form-arrow--open': formOpen }"
        >
          <ArrowDown />
        </el-icon>
      </div>
      <div v-show="formOpen" class="examens-view__form-body">
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
              <el-radio value="imagerie" size="large" border>
                <span class="examens-radio-content">
                  <el-icon><Camera /></el-icon>
                  <span>Imagerie (Radio, Scanner, IRM)</span>
                </span>
              </el-radio>
              <el-radio value="laboratoire" size="large" border>
                <span class="examens-radio-content">
                  <el-icon><DataAnalysis /></el-icon>
                  <span>Examen de laboratoire</span>
                </span>
              </el-radio>
              <el-radio value="avis" size="large" border>
                <span class="examens-radio-content">
                  <el-icon><Document /></el-icon>
                  <span>Avis spécialisé</span>
                </span>
              </el-radio>
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
            <el-input v-model="form.motif" type="textarea" :rows="3" placeholder="Décrire le motif clinique..." />
          </el-form-item>

          <el-form-item>
            <el-button class="examens-view__submit-btn" :loading="saving" @click="onEnvoyer">Envoyer la demande</el-button>
          </el-form-item>
        </el-form>
      </div>
    </div>

    <div class="examens-calendar__header">
      <el-button-group>
        <el-button :icon="ArrowLeft" @click="previousWeek" />
        <el-button class="examens-calendar__week-label">{{ weekLabel }}</el-button>
        <el-button :icon="ArrowRight" @click="nextWeek" />
      </el-button-group>
      <el-button :icon="Refresh" :loading="refreshing" @click="onRefresh">Actualiser</el-button>
      <el-button @click="goToToday" size="small">Aujourd'hui</el-button>
    </div>

    <div v-if="!loading" class="examens-calendar__grid-wrapper">
      <div class="examens-calendar__grid" :style="{ gridTemplateColumns: gridColumns }">
        <div class="examens-calendar__slot-header" style="grid-row: 1; grid-column: 1">Créneau</div>

        <div
          v-for="(day, di) in weekDays"
          :key="'d-' + di"
          class="examens-calendar__date-header"
          :class="{ 'examens-calendar__date-header--today': day.isToday }"
          :style="{ gridRow: 1, gridColumn: `${2 + di * hours.length} / ${2 + (di + 1) * hours.length}` }"
        >
          <div class="examens-calendar__date-text">{{ formatDateHeader(day.fullDate) }}</div>
          <div class="examens-calendar__date-hours-row">
            <span
              v-for="hour in hours"
              :key="hour"
              class="examens-calendar__date-hour"
              :class="{ 'examens-calendar__date-hour--now': day.isToday && hour === currentHour }"
            >
              {{ String(hour).padStart(2, '0') }}:00
            </span>
          </div>
        </div>

        <template v-for="(day, di) in weekDays" :key="'data-' + di">
          <div
            v-for="(hour, hi) in hours"
            :key="'cell-' + di + '-' + hour"
            class="examens-calendar__cell"
            :class="{ 'examens-calendar__cell--now': day.isToday && hour === currentHour }"
            :style="{ gridRow: 2, gridColumn: `${2 + di * hours.length + hi}` }"
          >
            <div
              v-for="req in getRequestsForSlot(day.fullDate, hour)"
              :key="'req-' + di + '-' + hour + '-' + (req.id ?? 0)"
              class="examens-calendar__card"
              :class="'examens-calendar__card--' + req.type"
              @click="onEditRequest(req)"
            >
              <div class="examens-calendar__card-header">
                <span class="examens-calendar__type-dot" :class="'examens-calendar__type-dot--' + req.type" />
                <span class="examens-calendar__card-type-label">{{ typeLabel(req.type) }}</span>
              </div>
              <div class="examens-calendar__card-exam">{{ examLabel(req) }}</div>
              <div class="examens-calendar__card-prescripteur">{{ req.prescripteurNom || '—' }}</div>
              <el-tag
                class="examens-calendar__statut-badge"
                :type="statutTagType(req.statut)"
                size="small"
                effect="plain"
              >
                {{ statutLabel(req.statut) }}
              </el-tag>
            </div>

            <div
              v-if="getRequestsForSlot(day.fullDate, hour).length === 0"
              class="examens-calendar__empty-cell"
              @click="onCreateFromCell(day.fullDate, hour)"
            >
              <span class="examens-calendar__empty-text">Nouveau</span>
            </div>
          </div>
        </template>
      </div>
    </div>

    <el-empty v-if="!loading && requests.length === 0" description="Aucune demande" />

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
          <el-input v-model="editForm.motif" type="textarea" :rows="3" />
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
        <el-button
          v-if="editForm.type === 'laboratoire' && editForm.statut === 'en_cours'"
          type="success"
          @click="openValidation"
        >
          Remplir résultats
        </el-button>
        <el-button @click="editDialogVisible = false">Annuler</el-button>
        <el-button type="primary" :loading="editSaving" @click="onEditSave">Enregistrer</el-button>
      </template>
    </el-dialog>

    <ExamValidationDialog
      v-model:visible="showValidationDialog"
      :exam-request-id="validationRequestId!"
      :exam-ids="validationExamIds"
      @validated="onValidationComplete"
    />
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, watch, computed, onMounted } from 'vue'
import { ArrowLeft, ArrowRight, Plus, ArrowDown, Refresh } from '@element-plus/icons-vue'
import { Camera, DataAnalysis, Document } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import { useAuth } from '@/composables/useAuth'
import { useUsers, getUserDisplayName, type UserDto } from '@/composables/useUsers'
import { useExamTypes, type ExamTypeDto } from '@/composables/useExamTypes'
import { useExamRequests, type ExamRequestDto } from '@/composables/useExamRequests'
import { useSpecialties } from '@/composables/useSpecialties'
import { usePatientContext } from '@/composables/usePatientContext'
import ExamValidationDialog from '@/components/patients/ExamValidationDialog.vue'

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
const formOpen = ref(false)

const todayRequestCount = computed(() => {
  const today = formatLocalDate(new Date())
  return requests.value.filter(r => r.createdAt?.startsWith(today)).length
})

const formRules = computed<FormRules>(() => {
  const rules: FormRules = {
    prescripteur: [{ required: true, message: 'Sélectionnez un prescripteur', trigger: 'change' }],
    type: [{ required: true, message: 'Sélectionnez un type de demande', trigger: 'change' }],
  }
  if (form.type === 'imagerie') {
    rules.examen = [{ required: true, message: 'Sélectionnez un examen', trigger: 'change' }]
    rules.motif = [{ required: true, message: 'Le motif clinique est requis', trigger: 'blur' }]
  } else if (form.type === 'laboratoire') {
    rules.examens = [{ required: true, message: 'Sélectionnez au moins une analyse', trigger: 'change' }]
  } else if (form.type === 'avis') {
    rules.specialtyId = [{ required: true, message: 'La spécialité est requise', trigger: 'change' }]
    rules.motif = [{ required: true, message: 'Le motif clinique est requis', trigger: 'blur' }]
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

function statutTagType(statut: string): 'warning' | 'primary' | 'success' | 'danger' {
  const map: Record<string, 'warning' | 'primary' | 'success' | 'danger'> = {
    en_attente: 'warning',
    en_cours: 'primary',
    realise: 'success',
    annule: 'danger',
  }
  return map[statut] || 'info'
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
    return row.examIds.map(id => findLabel(analysesDisponibles.value, id)).join(', ')
  }
  if (row.examenLabel) return row.examenLabel
  if (row.examenId != null) return findLabel(imageriesDisponibles.value, row.examenId)
  return ''
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
      formRef.value.resetFields()
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

const currentWeekStart = ref(getWeekStart(new Date()))

const weekDays = computed(() => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(currentWeekStart.value)
    d.setDate(d.getDate() + i)
    d.setHours(0, 0, 0, 0)
    const isToday = d.getTime() === today.getTime()
    return {
      isToday,
      fullDate: d,
    }
  })
})

const hours = [6, 8, 10, 12, 14, 16, 18, 20, 22]

const currentHour = computed(() => {
  const h = new Date().getHours()
  return [...hours].reverse().find(hr => hr <= h) ?? hours[0]
})

const gridColumns = computed(() => {
  return `80px repeat(${weekDays.value.length * hours.length}, minmax(80px, 1fr))`
})

const weekLabel = computed(() => {
  const start = weekDays.value[0]
  const end = weekDays.value[6]
  const fmt = (d: Date) =>
    `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`
  return `${fmt(start.fullDate)} — ${fmt(end.fullDate)}`
})

function getWeekStart(d: Date): Date {
  const date = new Date(d)
  const day = date.getDay()
  const diff = date.getDate() - day + (day === 0 ? -6 : 1)
  date.setDate(diff)
  date.setHours(0, 0, 0, 0)
  return date
}

function previousWeek() {
  const d = new Date(currentWeekStart.value)
  d.setDate(d.getDate() - 7)
  currentWeekStart.value = d
}

function nextWeek() {
  const d = new Date(currentWeekStart.value)
  d.setDate(d.getDate() + 7)
  currentWeekStart.value = d
}

function goToToday() {
  currentWeekStart.value = getWeekStart(new Date())
}

const refreshing = ref(false)

async function onRefresh() {
  if (!activePatient.value) return
  refreshing.value = true
  goToToday()
  await fetchRequests(activePatient.value.id)
  refreshing.value = false
}

function formatLocalDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function formatDateHeader(d: Date): string {
  return d.toLocaleDateString('fr-FR', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
  })
}

const requestsBySlot = computed(() => {
  const map = new Map<string, ExamRequestDto[]>()
  for (const req of requests.value) {
    if (!req.createdAt) continue
    const dateStr = req.createdAt.substring(0, 10)
    const reqHour = parseInt(req.createdAt.substring(11, 13))
    const slotHour = [...hours].reverse().find(h => h <= reqHour) ?? hours[0]
    const key = `${dateStr}-${slotHour}`
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(req)
  }
  return map
})

function getRequestsForSlot(date: Date, hour: number): ExamRequestDto[] {
  const key = `${formatLocalDate(date)}-${hour}`
  return requestsBySlot.value.get(key) ?? []
}

function onCreateFromCell(date: Date, hour: number) {
  formOpen.value = true
  form.plannedDate = formatLocalDate(date)
  form.plannedHour = hour
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

const showValidationDialog = ref(false)
const validationRequestId = ref<number | null>(null)
const validationExamIds = ref<number[]>([])

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

function openValidation() {
  validationRequestId.value = editRequestId.value
  const req = requests.value.find(r => r.id === editRequestId.value)
  if (req?.type === 'laboratoire') {
    validationExamIds.value = req.examIds ?? []
    showValidationDialog.value = true
    editDialogVisible.value = false
  }
}

async function onValidationComplete() {
  if (activePatient.value) {
    await fetchRequests(activePatient.value.id)
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

  fetchSpecialties(true)
})
</script>

<style scoped>
.examens-view__title {
  font-size: 16px;
  font-weight: 600;
  color: var(--cd-gray-900);
  margin-bottom: 16px;
}
.examens-radio-content {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 4px 0;
}

.examens-view__form-card {
  border: 1px solid var(--cd-gray-200);
  border-radius: 8px;
  overflow: hidden;
  margin-bottom: 16px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
}
.examens-view__form-header {
  background: linear-gradient(135deg, var(--cd-primary), #1ABC9C);
  color: #fff;
  padding: 12px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  user-select: none;
  transition: opacity 0.15s;
}
.examens-view__form-header:hover {
  opacity: 0.92;
}
.examens-view__form-header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}
.examens-view__form-header-icon {
  font-size: 18px;
}
.examens-view__form-title {
  font-size: 14px;
  font-weight: 600;
}
.examens-view__form-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  font-size: 11px;
  font-weight: 700;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.25);
  color: #fff;
  line-height: 1;
}
.examens-view__form-arrow {
  transition: transform 0.25s ease;
  font-size: 16px;
}
.examens-view__form-arrow--open {
  transform: rotate(180deg);
}
.examens-view__form-body {
  padding: 16px;
}
.examens-view__submit-btn {
  width: 100%;
  background: linear-gradient(135deg, var(--cd-primary), #1ABC9C);
  border: none;
  color: #fff;
  font-weight: 600;
  letter-spacing: 0.3px;
}
.examens-view__submit-btn:hover {
  background: linear-gradient(135deg, #1A5276, #16A085);
  color: #fff;
}

.examens-calendar__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}
.examens-calendar__week-label {
  font-weight: 600;
  min-width: 140px;
  cursor: default;
}

.examens-calendar__grid-wrapper {
  overflow: auto;
  border: 1px solid var(--cd-gray-200);
  border-radius: 8px;
  max-height: calc(100vh - 260px);
}

.examens-calendar__grid {
  display: grid;
  background: var(--cd-widget-bg);
  min-width: max-content;
}

.examens-calendar__slot-header {
  position: sticky;
  left: 0;
  z-index: 3;
  padding: 8px;
  font-size: 11px;
  font-weight: 700;
  text-align: center;
  background: #AEB6BF;
  color: #1C2833;
  border-bottom: 1px solid #95A5A6;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.examens-calendar__date-header {
  position: sticky;
  top: 0;
  z-index: 2;
  background: var(--cd-gray-100);
  border-bottom: 1px solid var(--cd-gray-200);
  border-right: 1px solid var(--cd-gray-200);
  padding: 0;
  display: flex;
  flex-direction: column;
}

.examens-calendar__date-text {
  padding: 6px 12px 2px;
  font-size: 11px;
  font-weight: 600;
  text-align: left;
  line-height: 1.2;
}

.examens-calendar__date-header--today {
  background: var(--cd-primary) !important;
  color: white;
}
.examens-calendar__date-header--today .examens-calendar__date-text {
  color: white;
}
.examens-calendar__date-header--today .examens-calendar__date-hours-row {
  border-top-color: rgba(255,255,255,0.3);
}
.examens-calendar__date-header--today .examens-calendar__date-hour {
  color: rgba(255,255,255,0.9);
  border-right-color: rgba(255,255,255,0.2);
}

.examens-calendar__date-hours-row {
  display: flex;
  border-top: 1px solid var(--cd-gray-300);
}

.examens-calendar__date-hour {
  flex: 1;
  padding: 2px 4px;
  font-size: 10px;
  font-weight: 600;
  text-align: center;
  color: var(--cd-gray-600);
  border-right: 1px solid var(--cd-gray-200);
}

.examens-calendar__date-hour:last-child {
  border-right: none;
}

.examens-calendar__date-hour--now {
  background: #A04000;
  color: #F9E79F;
  font-weight: 700;
}

.examens-calendar__cell {
  min-height: 60px;
  padding: 4px;
  background: #E5E7E9;
  border-right: 1px solid var(--cd-gray-200);
  border-bottom: 1px solid var(--cd-gray-150);
  transition: background 0.2s ease;
}

.examens-calendar__cell:hover {
  background: #D5D8DC;
}

.examens-calendar__cell--now {
  background: #F9E79F;
}

.examens-calendar__empty-cell {
  border: 1px dashed var(--cd-gray-300, #aeb6bf);
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex: 1;
  min-height: 36px;
  transition: background 0.15s, border-color 0.15s;
}
.examens-calendar__empty-cell:hover {
  background: var(--cd-gray-100, #f0f3f4);
  border-color: var(--cd-primary, #2E86C1);
  border-style: solid;
}
.examens-calendar__empty-text {
  font-size: 11px;
  color: var(--cd-gray-400, #bdc3c7);
  font-weight: 500;
  transition: color 0.15s;
}
.examens-calendar__empty-cell:hover .examens-calendar__empty-text {
  color: var(--cd-primary, #2E86C1);
}

.examens-calendar__card {
  background: #fff;
  border: 1px solid var(--cd-gray-200, #d5d8dc);
  border-left: 4px solid var(--cd-gray-300, #aeb6bf);
  border-radius: 4px;
  padding: 5px 7px;
  cursor: pointer;
  transition: box-shadow 0.15s, transform 0.15s;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.examens-calendar__card:hover {
  box-shadow: 0 2px 8px rgba(0,0,0,0.12);
  transform: translateY(-1px);
}
.examens-calendar__card--imagerie {
  border-left-color: #3498DB;
}
.examens-calendar__card--laboratoire {
  border-left-color: #27AE60;
}
.examens-calendar__card--avis {
  border-left-color: #E67E22;
}
.examens-calendar__card-header {
  display: flex;
  align-items: center;
  gap: 4px;
}
.examens-calendar__card-type-label {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  color: var(--cd-gray-600, #7f8c8d);
}
.examens-calendar__card-exam {
  font-size: 12px;
  font-weight: 600;
  color: #1C2833;
  line-height: 1.3;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.examens-calendar__card-prescripteur {
  font-size: 10px;
  color: var(--cd-gray-500, #95a5a6);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.examens-calendar__statut-badge {
  align-self: flex-start;
  margin-top: 2px;
}

.examens-calendar__type-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}
.examens-calendar__type-dot--imagerie {
  background: #3498DB;
}
.examens-calendar__type-dot--laboratoire {
  background: #27AE60;
}
.examens-calendar__type-dot--avis {
  background: #E67E22;
}
</style>
