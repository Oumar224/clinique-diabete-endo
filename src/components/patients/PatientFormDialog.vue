<template>
  <el-dialog
    v-model="dialogVisible"
    :title="isEdit ? 'Modifier le patient' : 'Nouveau patient'"
    width="720px"
    @closed="resetForm"
  >
    <el-form ref="formRef" :model="form" :rules="rules" label-width="140px">
      <el-form-item label="Photo">
        <div class="photo-upload" @click="triggerFileInput">
          <el-avatar :size="80" :src="form.photo || undefined" shape="circle">
            <Camera style="width:32px;height:32px" />
          </el-avatar>
          <input ref="fileInputRef" type="file" accept="image/*" style="display:none" @change="handlePhotoChange" />
          <span v-if="form.photo" class="photo-remove" @click.stop="removePhoto">
            <el-icon><Delete /></el-icon>
          </span>
        </div>
      </el-form-item>
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
      <el-form-item label="Lieu de naissance">
        <el-input v-model="form.lieu_naissance" placeholder="Village / Secteur" />
      </el-form-item>
      <el-form-item label="Résidence">
        <div class="residence-group">
          <el-select v-model="selectedRegion" filterable clearable placeholder="Région">
            <el-option v-for="r in regions" :key="r.code" :label="r.name" :value="r.code" />
          </el-select>
          <el-select v-model="selectedPrefecture" filterable clearable placeholder="Préfecture" :disabled="!selectedRegion">
            <el-option v-for="p in prefectures" :key="p.code" :label="p.name" :value="p.code" />
          </el-select>
          <el-select v-model="form.residence_code" filterable clearable placeholder="Sous-préfecture / Quartier" :disabled="!selectedPrefecture">
            <el-option v-for="c in communesSousPref" :key="c.code" :label="c.name" :value="c.code" />
          </el-select>
          <el-input v-model="form.complement_adresse" placeholder="Complément d'adresse (quartier, rue, porte...)" />
        </div>
      </el-form-item>
      <el-form-item label="NIP">
        <el-input v-model="nip" disabled placeholder="Généré automatiquement" />
      </el-form-item>
      <el-form-item label="N° SS/Assurance" prop="nir">
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
          <el-form-item label="Référent">
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

    <el-divider v-if="isEdit && editId" />
    <PatientAttachmentsSection v-if="isEdit && editId" :patient-id="editId" />

    <template #footer>
      <el-button @click="dialogVisible = false">Annuler</el-button>
      <el-button type="primary" @click="submit">
        {{ isEdit ? 'Enregistrer' : 'Créer' }}
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, reactive, computed, nextTick, toRaw, watch, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Camera, Delete } from '@element-plus/icons-vue'
import { showLoader, hideLoader } from '@/components/utils/AppLoader'
import { createPatient, updatePatient } from '@/composables/usePatients'
import type { Patient } from '@/composables/usePatientContext'
import { generateNip } from '@/utils/nip-generator'
import { useLocalites } from '@/composables/useLocalites'

const emit = defineEmits<{ saved: [] }>()

const dialogVisible = ref(false)
const isEdit = ref(false)
const editId = ref<number | null>(null)
const formRef = ref<any>(null)
const allergyInputRef = ref<any>(null)
const allergyInputVisible = ref(false)
const allergyInputValue = ref('')
const fileInputRef = ref<HTMLInputElement>()
const selectedRegion = ref('')
const selectedPrefecture = ref('')
const nip = ref('')
const initializingNip = ref(false)
const { localites, fetchLocalites } = useLocalites()

const regions = computed(() => {
  return localites.value.filter(l => l.type === 'region')
})

const prefectures = computed(() => {
  if (!selectedRegion.value) return []
  const region = localites.value.find(l => l.code === selectedRegion.value)
  if (!region?.id) return []
  return localites.value.filter(l => l.parent_id === region.id)
})

const selectedPrefectureId = computed(() => {
  const found = prefectures.value.find(p => p.code === selectedPrefecture.value)
  return found?.id
})

const communesSousPref = computed(() => {
  const id = selectedPrefectureId.value
  if (!id) return []
  return localites.value.filter(l => l.parent_id === id)
})

const form = reactive({
  civilite: 'M' as 'M' | 'Mme' | 'Mlle',
  nom: '',
  prenom: '',
  date_naissance: '',
  lieu_naissance: '',
  nir: '',
  telephone: '',
  email: '',
  adresse: '',
  mutuelle: '',
  medecin_traitant: '',
  allergies: [] as string[],
  photo: null as string | null,
  nip: '',
  residence_code: '',
  complement_adresse: '',
  region: '',
})

const rules = {
  civilite: [{ required: true, message: 'Choisissez une civilité', trigger: 'change' }],
  nom: [{ required: true, message: 'Le nom est requis', trigger: 'blur' }],
  prenom: [{ required: true, message: 'Le prénom est requis', trigger: 'blur' }],
  date_naissance: [{ required: true, message: 'La date de naissance est requise', trigger: 'change' }],
  nir: [
    { required: true, message: 'Le N° SS/Assurance est requis', trigger: 'blur' },
    { min: 13, max: 15, message: 'Le N° SS/Assurance doit contenir 13 à 15 caractères', trigger: 'blur' },
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

// --- Photo ---
function triggerFileInput() {
  fileInputRef.value?.click()
}

function handlePhotoChange(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return
  if (file.size > 2 * 1024 * 1024) {
    ElMessage.error('La photo ne doit pas dépasser 2 Mo')
    target.value = ''
    return
  }
  const reader = new FileReader()
  reader.onload = () => { form.photo = reader.result as string }
  reader.readAsDataURL(file)
}

function removePhoto() {
  form.photo = null
  if (fileInputRef.value) fileInputRef.value.value = ''
}

// --- NIP ---
watch(
  [() => form.civilite, () => form.date_naissance, () => form.residence_code],
  ([civ, date, code]) => {
    if (initializingNip.value) return
    if (civ && date && code) {
      const generated = generateNip(civ, date, code)
      nip.value = generated
      form.nip = generated
    } else {
      nip.value = ''
      form.nip = ''
    }
  },
  { immediate: false },
)

onMounted(async () => {
  await fetchLocalites(true)
})

function resetForm() {
  form.civilite = 'M'
  form.nom = ''
  form.prenom = ''
  form.date_naissance = ''
  form.lieu_naissance = ''
  form.nir = ''
  form.telephone = ''
  form.email = ''
  form.adresse = ''
  form.mutuelle = ''
  form.medecin_traitant = ''
  form.allergies = []
  form.photo = null
  form.nip = ''
  form.residence_code = ''
  form.complement_adresse = ''
  form.region = ''
  selectedRegion.value = ''
  selectedPrefecture.value = ''
  nip.value = ''
  editId.value = null
  isEdit.value = false
  allergyInputVisible.value = false
  allergyInputValue.value = ''
  formRef.value?.resetFields()
}

function close() {
  dialogVisible.value = false
}

function reconstructResidence(code: string | undefined) {
  if (!code) return
  const leaf = localites.value.find(l => l.code === code)
  if (!leaf) return
  // Find parent (prefecture)
  if (leaf.parent_id) {
    const parent = localites.value.find(l => l.id === leaf.parent_id)
    if (parent) {
      selectedPrefecture.value = parent.code
      // Find grandparent (region)
      if (parent.parent_id) {
        const grandparent = localites.value.find(l => l.id === parent.parent_id)
        if (grandparent) {
          selectedRegion.value = grandparent.code
          form.region = grandparent.name
        }
      }
    }
  }
}

function open(patient?: Patient) {
  if (patient) {
    initializingNip.value = true
    isEdit.value = true
    editId.value = patient.id
    form.civilite = patient.civilite
    form.nom = patient.nom
    form.prenom = patient.prenom
    form.date_naissance = patient.date_naissance
    form.lieu_naissance = patient.lieu_naissance || ''
    form.nir = patient.nir
    form.telephone = patient.telephone
    form.email = patient.email || ''
    form.adresse = patient.adresse || ''
    form.mutuelle = patient.mutuelle || ''
    form.medecin_traitant = patient.medecin_traitant || ''
    form.allergies = [...patient.allergies]
    form.photo = patient.photo ?? null
    form.residence_code = patient.residence_code || ''
    form.complement_adresse = patient.complement_adresse || ''
    form.region = patient.region || ''
    nip.value = patient.nip ?? ''
    form.nip = patient.nip ?? ''
    reconstructResidence(patient.residence_code)
    initializingNip.value = false
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
    // Always resolve region from current residence_code
    if (form.residence_code) {
      const leaf = localites.value.find(l => l.code === form.residence_code)
      if (leaf?.parent_id) {
        const parent = localites.value.find(l => l.id === leaf.parent_id)
        if (parent?.parent_id) {
          const grandparent = localites.value.find(l => l.id === parent.parent_id)
          if (grandparent) form.region = grandparent.name
        }
      }
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

.photo-upload {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  cursor: pointer;
  position: relative;
}

.photo-upload:hover {
  opacity: 0.85;
}

.photo-remove {
  position: absolute;
  top: -4px;
  right: -4px;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: var(--el-color-danger);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  cursor: pointer;
  transition: transform 0.15s;
}

.photo-remove:hover {
  transform: scale(1.15);
}

.residence-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
}
</style>
