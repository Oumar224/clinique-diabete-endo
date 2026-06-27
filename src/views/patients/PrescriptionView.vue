<template>
  <div class="prescription-view">
    <div class="prescription-view__header">
      <h3 class="prescription-view__title">Prescription médicale</h3>
      <el-button type="primary" size="small" :icon="Plus" @click="showForm = true">
        Nouvelle prescription
      </el-button>
    </div>

    <!-- Interaction warning banner -->
    <el-alert
      v-if="interactionWarning"
      :title="interactionWarning"
      type="warning"
      show-icon
      :closable="false"
      class="prescription-view__interaction"
    />
    <el-alert
      title="Vérification limitée — utilisez un référentiel officiel (ex: Thériaque, Vidal) pour confirmer l'absence d'interactions."
      type="info"
      show-icon
      :closable="false"
      class="prescription-view__interaction"
    />

    <!-- Prescription form -->
    <el-card v-if="showForm" class="prescription-view__form">
      <template #header>
        <span><strong>Nouvelle prescription</strong></span>
      </template>
      <el-form ref="formRef" :model="form" :rules="formRules" label-position="top" size="small">
        <el-row :gutter="16">
          <el-col :span="8">
            <el-form-item label="Médicament" prop="medicament">
              <el-select v-model="form.medicament" filterable placeholder="Rechercher un médicament..." style="width:100%">
                <el-option v-for="m in medicaments" :key="m" :label="m" :value="m" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="4">
            <el-form-item label="Dosage" prop="dosage">
              <el-input v-model="form.dosage" placeholder="500 mg" />
            </el-form-item>
          </el-col>
          <el-col :span="4">
            <el-form-item label="Voie" prop="voie">
              <el-select v-model="form.voie" placeholder="Voie">
                <el-option v-for="v in voies" :key="v" :label="v" :value="v" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="4">
            <el-form-item label="Durée (jours)" prop="duree">
              <el-input-number v-model="form.duree" :min="1" :max="90" />
            </el-form-item>
          </el-col>
          <el-col :span="4">
            <el-form-item label="Si besoin">
              <el-switch v-model="form.prn" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="Fréquence" prop="frequence">
              <el-checkbox-group v-model="form.frequence">
                <el-checkbox label="Matin" value="Matin" />
                <el-checkbox label="Midi" value="Midi" />
                <el-checkbox label="Soir" value="Soir" />
                <el-checkbox label="Nuit" value="Nuit" />
              </el-checkbox-group>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="24">
            <el-form-item label="Instructions">
              <el-input v-model="form.instructions" type="textarea" :rows="2" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="24">
            <el-button type="primary" @click="onPrescrire">Prescrire</el-button>
            <el-button @click="showForm = false">Annuler</el-button>
          </el-col>
        </el-row>
      </el-form>
    </el-card>

    <!-- Prescriptions table -->
    <el-table :data="mockPrescriptions" style="width:100%;margin-top:16px" size="small">
      <el-table-column prop="medicament" label="Médicament" />
      <el-table-column prop="dosage" label="Dosage" width="100" />
      <el-table-column prop="frequence" label="Fréquence" width="160" />
      <el-table-column prop="voie" label="Voie" width="80" />
      <el-table-column prop="duree" label="Durée" width="80" />
      <el-table-column prop="prn" label="PRN" width="60">
        <template #default="{ row }">
          <el-tag :type="row.prn ? 'warning' : 'info'" size="small">{{ row.prn ? 'Oui' : 'Non' }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="datePrescription" label="Date" width="110" />
      <el-table-column label="Actions" width="100" align="center">
        <el-button text type="primary" size="small" :icon="Edit" />
        <el-button text type="danger" size="small" :icon="Delete" />
      </el-table-column>
    </el-table>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { Plus, Edit, Delete } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'

const showForm = ref(false)
const interactionWarning = ref('')
const formRef = ref<FormInstance>()

const medicaments = [
  'Amoxicilline 500 mg', 'Furosémide 40 mg', 'Metformine 500 mg', 'Ramipril 5 mg',
  'Paracétamol 500 mg', 'Ibuprofène 400 mg', 'Warfarine 5 mg', 'Aspirine 100 mg',
  'Atorvastatine 20 mg', 'Oméprazole 20 mg',
]

const voies = ['IV', 'PO', 'SC', 'IM', 'SL']

function createPrescriptionForm() {
  return { medicament: '', dosage: '', voie: '', duree: 7, prn: false, frequence: [] as string[], instructions: '' }
}

const form = reactive(createPrescriptionForm())

const formRules: FormRules = {
  medicament: [{ required: true, message: 'Choisissez un médicament', trigger: 'change' }],
  dosage: [{ required: true, message: 'Indiquez le dosage', trigger: 'blur' }],
  voie: [{ required: true, message: 'Sélectionnez la voie d\'administration', trigger: 'change' }],
  duree: [{ required: true, message: 'Indiquez la durée', trigger: 'blur' }],
  frequence: [{ required: true, message: 'Sélectionnez au moins une fréquence', trigger: 'change' }],
}

const mockPrescriptions = ref([
  { medicament: 'Furosémide', dosage: '40 mg', frequence: 'Matin, Soir', voie: 'PO', duree: '30 j', prn: false, datePrescription: '26/06/2026', valide: true },
  { medicament: 'Metformine', dosage: '500 mg', frequence: 'Matin, Midi, Soir', voie: 'PO', duree: '90 j', prn: false, datePrescription: '26/06/2026', valide: true },
  { medicament: 'Paracétamol', dosage: '500 mg', frequence: 'Si besoin', voie: 'PO', duree: '5 j', prn: true, datePrescription: '26/06/2026', valide: true },
])

const INTERACTIONS_DB: Record<string, string[]> = {
  Warfarine: ['Aspirine', 'Ibuprofène'],
  Aspirine: ['Warfarine', 'Ibuprofène'],
  Ibuprofène: ['Warfarine', 'Aspirine'],
}

async function onPrescrire() {
  if (!formRef.value) return
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return

  const molName = form.medicament.split(' ')[0]
  for (const existing of mockPrescriptions.value) {
    const existingMol = existing.medicament.split(' ')[0]
    const dangerous = INTERACTIONS_DB[molName]
    if (dangerous?.includes(existingMol)) {
      interactionWarning.value = `⚠ Interaction détectée: ${molName} + ${existingMol}. Veuillez vérifier la prescription.`
      return
    }
  }

  interactionWarning.value = ''
  mockPrescriptions.value.push({
    medicament: form.medicament,
    dosage: form.dosage,
    frequence: form.frequence.join(', '),
    voie: form.voie,
    duree: `${form.duree} j`,
    prn: form.prn,
    datePrescription: new Date().toLocaleDateString('fr-FR'),
    valide: false,
  })

  ElMessage.success('Prescription ajoutée')
  showForm.value = false
  formRef.value.resetFields()
  Object.assign(form, createPrescriptionForm())
}
</script>

<style scoped>
.prescription-view__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}
.prescription-view__title {
  font-size: 16px;
  font-weight: 600;
  color: var(--cd-gray-900);
}
.prescription-view__interaction {
  margin-bottom: 16px;
}
.prescription-view__form {
  margin-bottom: 16px;
}
</style>
