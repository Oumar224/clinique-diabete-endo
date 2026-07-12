<template>
  <div class="examens-view">
    <h3 class="examens-view__title">Demande d'examens</h3>

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
            <el-radio value="avis" size="large" border>
              <span class="examens-radio-content">
                <el-icon><UserFilled /></el-icon>
                <span>Avis spécialisé</span>
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
          <el-select v-model="form.examen" placeholder="Sélectionner un examen" style="width:100%" filterable>
            <el-option
              v-for="examen in imageriesDisponibles"
              :key="examen.id!"
              :label="examen.label"
              :value="examen.label"
            />
          </el-select>
        </el-form-item>

        <el-form-item v-if="form.type === 'avis'" label="Spécialité" prop="examen">
          <el-select v-model="form.examen" placeholder="Sélectionner une spécialité" style="width:100%">
            <el-option label="Cardiologie" value="Cardiologie" />
            <el-option label="Neurologie" value="Neurologie" />
            <el-option label="Néphrologie" value="Néphrologie" />
            <el-option label="Ophtalmologie" value="Ophtalmologie" />
            <el-option label="Endocrinologie" value="Endocrinologie" />
          </el-select>
        </el-form-item>

        <el-form-item v-if="form.type === 'laboratoire'" label="Analyses demandées" prop="examens">
          <el-select
            v-model="form.examens"
            multiple
            filterable
            placeholder="Rechercher et sélectionner des analyses"
            style="width:100%"
            collapse-tags
            collapse-tags-tooltip
          >
            <el-option
              v-for="analyse in analysesDisponibles"
              :key="analyse.id!"
              :label="analyse.label"
              :value="analyse.id!"
            />
          </el-select>
        </el-form-item>

        <el-form-item v-if="form.type !== 'laboratoire'" label="Motif clinique de la demande" prop="motif">
          <el-input v-model="form.motif" type="textarea" :rows="3" placeholder="Décrire le motif clinique..." />
        </el-form-item>

        <el-form-item>
          <el-button type="primary" @click="onEnvoyer">Envoyer la demande</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- Historique des demandes -->
    <h3 style="font-size:15px;font-weight:600;margin:24px 0 12px">Demandes récentes</h3>
    <el-table :data="mockDemandes" size="small" style="width:100%">
      <el-table-column prop="date" label="Date" width="110" />
      <el-table-column prop="type" label="Type" width="140" />
      <el-table-column prop="examen" label="Examen / Service" />
      <el-table-column prop="motif" label="Motif" show-overflow-tooltip />
      <el-table-column prop="statut" label="Statut" width="120">
        <template #default="{ row }">
          <el-tag :type="row.statut === 'En cours' ? 'warning' : row.statut === 'Réalisé' ? 'success' : 'info'" size="small">
            {{ row.statut }}
          </el-tag>
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, watch, onMounted } from 'vue'
import { Camera, UserFilled, DataAnalysis } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import { useAuth } from '@/composables/useAuth'
import { users as allUsers, loadUsers, getUserDisplayName, type UserDto } from '@/composables/useUsers'
import { useExamTypes, type ExamTypeDto } from '@/composables/useExamTypes'

const { user } = useAuth()
const { fetchAllByCategory, allTypes } = useExamTypes()
const formRef = ref<FormInstance>()

const imageriesDisponibles = ref<ExamTypeDto[]>([])
const analysesDisponibles = ref<ExamTypeDto[]>([])
const medecins = ref<UserDto[]>([])

function createExamForm() {
  return {
    type: '',
    examen: '',
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
  form.examen = ''
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

const mockDemandes = ref([
  { date: '26/06/2026', type: 'Imagerie', examen: 'IRM cardiaque', motif: 'Insuffisance cardiaque à évaluer', statut: 'En cours' },
  { date: '25/06/2026', type: 'Laboratoire', examen: 'HbA1c', motif: 'Contrôle diabète', statut: 'Réalisé' },
])

async function onEnvoyer() {
  if (!formRef.value) return
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return

  const typeLabels: Record<string, string> = {
    imagerie: 'Imagerie',
    avis: 'Avis spécialisé',
    laboratoire: 'Laboratoire',
  }

  const examensLabel = form.type === 'laboratoire'
    ? form.examens.map(id => analysesDisponibles.value.find(a => a.id === id)?.label || '').join(', ')
    : form.examen

  mockDemandes.value.unshift({
    date: new Date().toLocaleDateString('fr-FR'),
    type: typeLabels[form.type] || form.type,
    examen: examensLabel,
    motif: form.type !== 'laboratoire' ? form.motif : '',
    statut: 'En cours',
  })
  ElMessage.success('Demande envoyée')
  formRef.value.resetFields()
  Object.assign(form, createExamForm())
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
  } catch {
    // Silently fail - prescripteur selection will still work with empty list
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
