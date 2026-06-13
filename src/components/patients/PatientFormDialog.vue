<template>
  <el-dialog
    v-model="dialogVisible"
    :title="isEdit ? 'Modifier le patient' : 'Nouveau patient'"
    width="650px"
    @closed="resetForm"
  >
    <el-form ref="formRef" :model="form" :rules="rules" label-width="140px">
      <el-form-item label="Civilité" prop="civilite">
        <el-select v-model="form.civilite" style="width:100%">
          <el-option label="Monsieur" value="M" />
          <el-option label="Madame" value="Mme" />
          <el-option label="Mademoiselle" value="Mlle" />
        </el-select>
      </el-form-item>
      <el-row :gutter="16">
        <el-col :span="12">
          <el-form-item label="Nom" prop="nom">
            <el-input v-model="form.nom" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="Prénom" prop="prenom">
            <el-input v-model="form.prenom" />
          </el-form-item>
        </el-col>
      </el-row>
      <el-form-item label="Date de naissance" prop="date_naissance">
        <el-date-picker v-model="form.date_naissance" type="date" value-format="YYYY-MM-DD" style="width:100%" />
      </el-form-item>
      <el-form-item label="NIR" prop="nir">
        <el-input v-model="form.nir" />
      </el-form-item>
      <el-form-item label="Téléphone" prop="telephone">
        <el-input v-model="form.telephone" />
      </el-form-item>
      <el-form-item label="Email">
        <el-input v-model="form.email" />
      </el-form-item>
      <el-form-item label="Adresse">
        <el-input v-model="form.adresse" type="textarea" :rows="2" />
      </el-form-item>
      <el-row :gutter="16">
        <el-col :span="12">
          <el-form-item label="Mutuelle">
            <el-input v-model="form.mutuelle" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="Médecin traitant">
            <el-input v-model="form.medecin_traitant" />
          </el-form-item>
        </el-col>
      </el-row>
      <el-form-item label="Allergies">
        <div class="allergies-input">
          <el-tag
            v-for="(tag, i) in form.allergies ?? []"
            :key="i"
            closable
            type="danger"
            size="small"
            @close="removeAllergy(i)"
          >
            {{ tag }}
          </el-tag>
          <el-input
            v-if="allergyInputVisible"
            ref="allergyInputRef"
            v-model="allergyInputValue"
            size="small"
            style="width:120px"
            @keyup.enter="addAllergy"
            @blur="addAllergy"
          />
          <el-button v-else text size="small" @click="showAllergyInput">
            + Ajouter
          </el-button>
        </div>
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button @click="dialogVisible = false">Annuler</el-button>
      <el-button type="primary" @click="submit">
        {{ isEdit ? 'Enregistrer' : 'Créer' }}
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, reactive, nextTick, toRaw } from 'vue'
import { ElMessage } from 'element-plus'
import { showLoader, hideLoader } from '@/components/utils/AppLoader'
import { createPatient, updatePatient } from '@/composables/usePatients'
import type { PatientDto } from '@/composables/usePatients'
import type { Patient } from '@/composables/usePatientContext'

const emit = defineEmits<{ saved: [] }>()

const dialogVisible = ref(false)
const isEdit = ref(false)
const editId = ref<number | null>(null)
const formRef = ref<any>(null)
const allergyInputRef = ref<any>(null)
const allergyInputVisible = ref(false)
const allergyInputValue = ref('')

const form = reactive<Omit<PatientDto, 'id'>>({
  civilite: 'M',
  nom: '',
  prenom: '',
  date_naissance: '',
  nir: '',
  telephone: '',
  email: '',
  adresse: '',
  mutuelle: '',
  medecin_traitant: '',
  allergies: [],
})

const rules = {
  civilite: [{ required: true, message: 'Choisissez une civilité', trigger: 'change' }],
  nom: [{ required: true, message: 'Le nom est requis', trigger: 'blur' }],
  prenom: [{ required: true, message: 'Le prénom est requis', trigger: 'blur' }],
  date_naissance: [{ required: true, message: 'La date de naissance est requise', trigger: 'change' }],
  nir: [
    { required: true, message: 'Le NIR est requis', trigger: 'blur' },
    { min: 13, max: 15, message: 'Le NIR doit contenir 13 à 15 caractères', trigger: 'blur' },
  ],
  telephone: [{ required: true, message: 'Le téléphone est requis', trigger: 'blur' }],
}

function showAllergyInput() {
  allergyInputVisible.value = true
  nextTick(() => {
    allergyInputRef.value?.focus()
  })
}

function addAllergy() {
  const val = allergyInputValue.value.trim()
  if (val && !(form.allergies ?? []).includes(val)) {
    form.allergies = [...(form.allergies ?? []), val]
  }
  allergyInputValue.value = ''
  allergyInputVisible.value = false
}

function removeAllergy(i: number) {
  form.allergies = (form.allergies ?? []).filter((_, idx) => idx !== i)
}

function resetForm() {
  form.civilite = 'M'
  form.nom = ''
  form.prenom = ''
  form.date_naissance = ''
  form.nir = ''
  form.telephone = ''
  form.email = ''
  form.adresse = ''
  form.mutuelle = ''
  form.medecin_traitant = ''
  form.allergies = []
  editId.value = null
  isEdit.value = false
  allergyInputVisible.value = false
  allergyInputValue.value = ''
  formRef.value?.resetFields()
}

function close() {
  dialogVisible.value = false
}

function open(patient?: Patient) {
  if (patient) {
    isEdit.value = true
    editId.value = patient.id
    form.civilite = patient.civilite
    form.nom = patient.nom
    form.prenom = patient.prenom
    form.date_naissance = patient.date_naissance
    form.nir = patient.nir
    form.telephone = patient.telephone
    form.email = patient.email || ''
    form.adresse = patient.adresse || ''
    form.mutuelle = patient.mutuelle || ''
    form.medecin_traitant = patient.medecin_traitant || ''
    form.allergies = [...patient.allergies]
  }
  dialogVisible.value = true
}

async function submit() {
  if (!formRef.value) return
  formRef.value.validate(async (v: boolean) => {
    if (!v) {
      ElMessage.warning('Veuillez remplir tous les champs obligatoires')
      return
    }
    const loader = showLoader(isEdit.value ? 'Enregistrement...' : 'Création...')
    try {
      if (isEdit.value && editId.value) {
        await updatePatient({ ...toRaw(form), id: editId.value })
        ElMessage.success('Patient mis à jour')
      } else {
        await createPatient(toRaw(form))
        ElMessage.success('Patient créé')
      }
      close()
      emit('saved')
    } catch (e) {
      ElMessage.error(`Erreur: ${(e as Error).message}`)
    } finally {
      hideLoader(loader)
    }
  })
}

defineExpose({ open })
</script>

<style scoped>
.allergies-input {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
}
</style>
