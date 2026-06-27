<template>
  <div class="examens-view">
    <h3 class="examens-view__title">Demande d'examens</h3>

    <el-card class="examens-view__form">
      <template #header>
        <span><strong>Nouvelle demande</strong></span>
      </template>
      <el-form ref="formRef" :model="form" :rules="formRules" label-position="top">
        <el-form-item label="Type de demande" prop="type">
          <el-radio-group v-model="form.type">
            <el-radio value="imagerie" size="large" border>
              <span class="examens-radio-content">
                <el-icon><Camera /></el-icon>
                <span>Imagerie (Radio, Scanner, IRM)</span>
              </span>
            </el-radio>
            <el-radio value="consultation" size="large" border>
              <span class="examens-radio-content">
                <el-icon><UserFilled /></el-icon>
                <span>Consultation spécialisée</span>
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
          <el-select v-model="form.examen" placeholder="Sélectionner un examen" style="width:100%">
            <el-option label="Radiographie thoracique" value="Radio thoracique" />
            <el-option label="Scanner cérébral" value="Scanner cérébral" />
            <el-option label="IRM cardiaque" value="IRM cardiaque" />
            <el-option label="Échographie abdominale" value="Écho abdominale" />
            <el-option label="Scanner abdomino-pelvien" value="Scanner TAP" />
          </el-select>
        </el-form-item>

        <el-form-item v-if="form.type === 'consultation'" label="Spécialité" prop="examen">
          <el-select v-model="form.examen" placeholder="Sélectionner une spécialité" style="width:100%">
            <el-option label="Cardiologie" value="Cardiologie" />
            <el-option label="Neurologie" value="Neurologie" />
            <el-option label="Néphrologie" value="Néphrologie" />
            <el-option label="Ophtalmologie" value="Ophtalmologie" />
            <el-option label="Endocrinologie" value="Endocrinologie" />
          </el-select>
        </el-form-item>

        <el-form-item v-if="form.type === 'laboratoire'" label="Analyse demandée" prop="examen">
          <el-select v-model="form.examen" placeholder="Sélectionner une analyse" style="width:100%">
            <el-option label="NFS (Numération formule sanguine)" value="NFS" />
            <el-option label="Ionogramme sanguin" value="Ionogramme" />
            <el-option label="Bilan hépatique" value="Bilan hépatique" />
            <el-option label="Bilan rénal" value="Bilan rénal" />
            <el-option label="Hémoglobine glyquée (HbA1c)" value="HbA1c" />
          </el-select>
        </el-form-item>

        <el-form-item label="Motif clinique de la demande" prop="motif">
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
import { reactive, ref, watch } from 'vue'
import { Camera, UserFilled, DataAnalysis } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'

const formRef = ref<FormInstance>()

function createExamForm() {
  return { type: '', examen: '', motif: '' }
}

const form = reactive(createExamForm())

const formRules: FormRules = {
  type: [{ required: true, message: 'Sélectionnez un type de demande', trigger: 'change' }],
  examen: [{ required: true, message: 'Sélectionnez un examen', trigger: 'change' }],
  motif: [{ required: true, message: 'Le motif clinique est requis', trigger: 'blur' }],
}

watch(() => form.type, () => { form.examen = '' })

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
    consultation: 'Consultation spécialisée',
    laboratoire: 'Laboratoire',
  }

  mockDemandes.value.unshift({
    date: new Date().toLocaleDateString('fr-FR'),
    type: typeLabels[form.type] || form.type,
    examen: form.examen,
    motif: form.motif,
    statut: 'En cours',
  })
  ElMessage.success('Demande envoyée')
  formRef.value.resetFields()
  Object.assign(form, createExamForm())
}
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
