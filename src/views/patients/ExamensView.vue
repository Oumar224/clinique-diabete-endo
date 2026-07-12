<template>
  <div class="examens-view">
    <h3 class="examens-view__title">Demande d'examens</h3>

    <el-alert v-if="error" type="error" :title="error" show-icon closable style="margin-bottom:12px" />

    <el-card class="examens-view__form">
      <template #header>
        <span><strong>Nouvelle demande</strong></span>
      </template>
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
          </el-radio-group>
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
          <el-button type="primary" :loading="saving" @click="onEnvoyer">Envoyer la demande</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <h3 style="font-size:15px;font-weight:600;margin:24px 0 12px">Demandes récentes</h3>
    <el-table :data="requests" v-loading="loading" size="small" style="width:100%">
      <el-table-column label="Date" width="110">
        <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
      </el-table-column>
      <el-table-column prop="type" label="Type" width="140">
        <template #default="{ row }">{{ typeLabel(row.type) }}</template>
      </el-table-column>
      <el-table-column label="Examen / Service">
        <template #default="{ row }">{{ examLabel(row) }}</template>
      </el-table-column>
      <el-table-column prop="motif" label="Motif" show-overflow-tooltip />
      <el-table-column prop="statut" label="Statut" width="130">
        <template #default="{ row }">
          <el-select
            v-model="row.statut"
            size="small"
            style="width:110px"
            @change="(val: string) => onStatutChange(row, val as any)"
          >
            <el-option label="En attente" value="en_attente" />
            <el-option label="En cours" value="en_cours" />
            <el-option label="Réalisé" value="realise" />
            <el-option label="Annulé" value="annule" />
          </el-select>
        </template>
      </el-table-column>
      <el-table-column label="Actions" width="80" align="center">
        <template #default="{ row }">
          <el-button text type="danger" :icon="Delete" size="small" @click="onDelete(row)" />
        </template>
      </el-table-column>
    </el-table>

    <el-empty v-if="!loading && requests.length === 0" description="Aucune demande" />
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, watch, computed, onMounted } from 'vue'
import { Camera, DataAnalysis, Delete } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import { useAuth } from '@/composables/useAuth'
import { users as allUsers, loadUsers, getUserDisplayName, type UserDto } from '@/composables/useUsers'
import { useExamTypes, type ExamTypeDto } from '@/composables/useExamTypes'
import { useExamRequests, type ExamRequestDto } from '@/composables/useExamRequests'
import { usePatientContext } from '@/composables/usePatientContext'

interface TreeNode {
  id: number
  label: string
  children?: TreeNode[]
}

const { user } = useAuth()
const { activePatient } = usePatientContext()
const { fetchAllByCategory, allTypes } = useExamTypes()
const {
  requests, loading, error,
  fetchRequests, createRequest, updateStatut, deleteRequest,
} = useExamRequests()
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
    motif: '',
    prescripteur: null as number | null,
  }
}

const form = reactive(createExamForm())

const formRules: FormRules = {
  prescripteur: [{ required: true, message: 'Sélectionnez un prescripteur', trigger: 'change' }],
  type: [{ required: true, message: 'Sélectionnez un type de demande', trigger: 'change' }],
  examen: [{ required: true, message: 'Sélectionnez un examen', trigger: 'change' }],
  examens: [{ required: true, message: 'Sélectionnez au moins une analyse', trigger: 'change' }],
  motif: [{ required: true, message: 'Le motif clinique est requis', trigger: 'blur' }],
}

watch(() => form.type, async (newType) => {
  form.examen = null
  form.examens = []
  if (newType === 'imagerie') {
    await fetchAllByCategory('imagerie')
    imageriesDisponibles.value = [...allTypes.value]
  } else if (newType === 'laboratoire') {
    await fetchAllByCategory('laboratoire')
    analysesDisponibles.value = [...allTypes.value]
  }
})

function formatMedecin(m: UserDto): string {
  return getUserDisplayName(m)
}

function typeLabel(type: string): string {
  const map: Record<string, string> = { imagerie: 'Imagerie', laboratoire: 'Laboratoire' }
  return map[type] || type
}

function examLabel(row: ExamRequestDto): string {
  if (row.type === 'laboratoire' && row.examIds && row.examIds.length > 0) {
    return row.examIds.map(id => findLabel(analysesDisponibles.value, id)).join(', ')
  }
  if (row.examenLabel) return row.examenLabel
  if (row.examenId != null) return findLabel(imageriesDisponibles.value, row.examenId)
  return ''
}

function formatDate(date?: string): string {
  if (!date) return ''
  const d = new Date(date)
  return d.toLocaleDateString('fr-FR')
}

async function onEnvoyer() {
  if (!formRef.value) return
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return
  if (!activePatient.value) { ElMessage.warning('Aucun patient sélectionné'); return }

  saving.value = true
  try {
    const dto = {
      patientId: activePatient.value.id,
      type: form.type as 'imagerie' | 'laboratoire',
      prescripteurId: form.prescripteur,
      motif: form.type !== 'laboratoire' ? form.motif : '',
      examenId: form.type !== 'laboratoire' ? form.examen : null,
      examIds: form.type === 'laboratoire' ? form.examens : undefined,
    }
    const created = await createRequest(dto)
    if (created) {
      ElMessage.success('Demande envoyée')
      formRef.value.resetFields()
      Object.assign(form, createExamForm())
      await fetchRequests(activePatient.value.id)
    }
  } finally {
    saving.value = false
  }
}

async function onStatutChange(row: ExamRequestDto, newStatut: ExamRequestDto['statut']) {
  if (row.id == null) return
  const ok = await updateStatut(row.id, newStatut)
  if (ok) {
    ElMessage.success('Statut mis à jour')
  } else {
    await fetchRequests(activePatient.value!.id)
  }
}

async function onDelete(row: ExamRequestDto) {
  if (row.id == null) return
  try {
    await ElMessageBox.confirm('Supprimer cette demande ?', 'Confirmation', {
      type: 'warning', confirmButtonText: 'Supprimer', cancelButtonText: 'Annuler',
    })
    const ok = await deleteRequest(row.id)
    if (ok) {
      ElMessage.success('Demande supprimée')
      if (activePatient.value) await fetchRequests(activePatient.value.id)
    }
  } catch { /* cancelled */ }
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
})
</script>

<style scoped>
.examens-view__title {
  font-size: 16px;
  font-weight: 600;
  color: var(--cd-gray-900);
  margin-bottom: 16px;
}
.examens-view__form {
  margin-bottom: 16px;
}
.examens-radio-content {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 4px 0;
}
</style>
