<template>
  <el-dialog
    v-model="dialogVisible"
    :title="isEdit ? 'Modifier le patient' : 'Nouveau patient'"
    width="800px"
    @closed="handleClose"
  >
    <el-steps :active="activeStep" align-center finish-status="success" style="margin-bottom: 24px">
      <el-step
        v-for="(step, index) in stepTitles"
        :key="index"
        :title="step"
        :class="{ 'is-clickable': isEdit }"
        @click="isEdit && (activeStep = index)"
      />
    </el-steps>

    <el-form ref="formRef" :model="form" :rules="rules" label-width="160px">
      <!-- Step 1: Identité -->
      <div v-if="activeStep === 0" class="step-content">
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
            <el-option label="Non défini" value="" />
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
          <div class="date-age-group">
            <el-date-picker v-model="form.date_naissance" type="date" format="DD/MM/YYYY" value-format="YYYY-MM-DD" style="flex:1" />
            <el-input-number v-model="ageInput" :min="0" :max="150" :controls="false" style="width:90px" placeholder="Âge" @change="onAgeChange" />
            <span class="age-unit">ans</span>
          </div>
        </el-form-item>
        <el-form-item label="Lieu de naissance">
          <el-input v-model="form.lieu_naissance" placeholder="Village / Secteur" />
        </el-form-item>
        <el-form-item label="Profession">
          <el-input v-model="form.profession" />
        </el-form-item>
      </div>

      <!-- Step 2: Contact & Résidence -->
      <div v-if="activeStep === 1" class="step-content">
        <el-form-item label="NIP">
          <el-input v-model="nip" disabled placeholder="Généré automatiquement" />
        </el-form-item>
        <el-form-item label="Téléphone" prop="telephone">
          <el-input v-model="form.telephone" />
        </el-form-item>
        <el-form-item label="Email">
          <el-input v-model="form.email" />
        </el-form-item>
        <el-form-item label="Résidence">
          <el-alert
            v-if="regions.length === 0 && !loading"
            type="warning"
            :closable="false"
            show-icon
            title="Aucune localité trouvée. Veuillez d'abord importer les localités dans les paramètres."
            style="margin-bottom: 8px"
          />
          <div class="residence-group">
            <el-select v-model="selectedRegion" filterable clearable placeholder="Région" :disabled="regions.length === 0" @change="onRegionChange">
              <el-option v-for="r in regions" :key="r.code" :label="r.name" :value="r.code" />
            </el-select>
            <el-select v-model="selectedPrefecture" filterable clearable placeholder="Préfecture" :disabled="!selectedRegion">
              <el-option v-for="p in prefectures" :key="p.code" :label="p.name" :value="p.code" />
            </el-select>
            <el-select v-model="form.residence_code" filterable clearable placeholder="Sous-préfecture / Commune" :disabled="!selectedPrefecture">
              <el-option v-for="c in communesSousPref" :key="c.code" :label="c.name" :value="c.code" />
            </el-select>
            <el-input v-model="form.complement_adresse" placeholder="Complément d'adresse (quartier, district, rue...)" />
          </div>
        </el-form-item>
        <el-form-item label="Assurance / Mutuelle" prop="assuranceMutuelle">
          <el-input v-model="form.assuranceMutuelle" placeholder="Assurance / Mutuelle" />
        </el-form-item>
        <el-form-item label="N° SS/Assurance" prop="nir">
          <el-input v-model="form.nir" />
        </el-form-item>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="Site">
              <el-select
                v-model="form.site_id"
                filterable
                clearable
                placeholder="Choisir un site"
                @change="onSiteChange"
                :key="'site-' + sites.length"
              >
                <el-option v-for="s in sites" :key="s.id" :label="s.name" :value="s.id" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="Médecin référent">
              <el-select v-model="form.medecin_traitant" filterable clearable placeholder="Choisir un médecin" :disabled="!form.site_id">
                <el-option v-for="d in doctors" :key="d.id" :label="`${d.prenom} ${d.nom}`" :value="`${d.prenom} ${d.nom}`" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
      </div>

      <!-- Step 3: Allergies et autres & Consentement -->
      <div v-if="activeStep === 2" class="step-content">
        <el-form-item label="Allergies et autres">
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
        <el-divider />
        <el-card shadow="never" class="consent-card">
          <template #header>
            <div class="consent-header">
              <el-icon size="18" color="#e6a23c"><WarningFilled /></el-icon>
              <span>Consentement données personnelles</span>
            </div>
          </template>
          <el-alert
            type="warning"
            :closable="false"
            show-icon
            title="Utilisation des données à caractère personnel pour les études scientifiques"
            description="Ces informations sont facultatives. Elles nous aident à améliorer nos services de recherche médicale. Vous pouvez changer d'avis à tout moment."
            style="margin-bottom: 16px"
          />
          <el-form-item label="Votre consentement">
            <el-radio-group v-model="form.consentementEtude">
              <el-radio value="oui">Oui</el-radio>
              <el-radio value="non">Non</el-radio>
              <el-radio value="non_precise">Non précisé</el-radio>
            </el-radio-group>
          </el-form-item>
        </el-card>
        <el-divider />
        <PatientAttachmentsSection :patient-id="editId ?? 0" category="patient" />
      </div>

      <!-- Step 4: Personne de confiance -->
      <div v-if="activeStep === 3" class="step-content">
        <el-form-item label="Personne de confiance">
          <el-radio-group v-model="form.has_trusted">
            <el-radio :label="true">Oui</el-radio>
            <el-radio :label="false">Non</el-radio>
          </el-radio-group>
        </el-form-item>

        <el-card v-if="form.has_trusted" class="trusted-person-card" shadow="never">
          <el-form-item label="Nom">
            <el-input v-model="form.tp_nom" />
          </el-form-item>
          <el-form-item label="Prénom">
            <el-input v-model="form.tp_prenom" />
          </el-form-item>
          <el-form-item label="Profession">
            <el-input v-model="form.tp_profession" />
          </el-form-item>
          <el-form-item label="Résidence">
            <div class="residence-group">
              <el-select v-model="tpSelectedRegion" filterable clearable placeholder="Région" @change="onTpRegionChange">
                <el-option v-for="r in regions" :key="r.code" :label="r.name" :value="r.code" />
              </el-select>
              <el-select v-model="tpSelectedPrefecture" filterable clearable placeholder="Préfecture" :disabled="!tpSelectedRegion">
                <el-option v-for="p in tpPrefectures" :key="p.code" :label="p.name" :value="p.code" />
              </el-select>
              <el-select v-model="form.tp_residence_code" filterable clearable placeholder="Sous-préfecture / Commune" :disabled="!tpSelectedPrefecture">
                <el-option v-for="c in tpCommunesSousPref" :key="c.code" :label="c.name" :value="c.code" />
              </el-select>
            </div>
          </el-form-item>
          <el-form-item label="Téléphone">
            <el-input v-model="form.tp_telephone" />
          </el-form-item>
          <el-form-item label="Email">
            <el-input v-model="form.tp_email" />
          </el-form-item>
          <el-form-item label="Complément d'adresse" >
            <el-input v-model="form.tp_complement_adresse" />
          </el-form-item>
          <el-form-item label="Lien de parenté">
            <el-select v-model="form.tp_lien_parente" placeholder="Choisir" clearable style="width:100%">
              <el-option label="Conjoint(e)" value="Conjoint(e)" />
              <el-option label="Enfant" value="Enfant" />
              <el-option label="Parent" value="Parent" />
              <el-option label="Frère/Sœur" value="Frère/Sœur" />
              <el-option label="Ami(e)" value="Ami(e)" />
              <el-option label="Autre" value="Autre" />
            </el-select>
          </el-form-item>
        </el-card>

        <el-divider />
        <PatientAttachmentsSection :patient-id="editId ?? 0" category="trusted_person" />
      </div>
    </el-form>

    <template #footer>
      <span class="dialog-footer">
        <span>
          <el-button v-if="activeStep > 0" @click="activeStep--">Précédent</el-button>
        </span>
        <span>
          <!-- Edit mode: always-visible save + post-save UX -->
          <template v-if="isEdit">
            <template v-if="postSave">
              <el-button type="primary" @click="finishAndClose">Terminer</el-button>
              <el-button v-if="activeStep < 3" @click="continueEditing">Suivant</el-button>
            </template>
            <template v-else>
              <el-button type="primary" @click="submit">Enregistrer les modifications</el-button>
              <el-button v-if="activeStep < 3" @click="activeStep++">Suivant</el-button>
            </template>
            <el-button @click="cancelAndClose">Annuler</el-button>
          </template>
          <!-- Create mode (not isEdit): existing logic -->
          <template v-else>
            <el-button v-if="isPostCreate" type="primary" @click="submit">Terminer</el-button>
            <el-button v-else-if="activeStep < 3" type="primary" @click="activeStep++">Suivant</el-button>
            <el-button v-else type="primary" @click="submit">Créer</el-button>
            <el-button @click="cancelAndClose">Annuler</el-button>
          </template>
        </span>
      </span>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, reactive, computed, nextTick, toRaw, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { FormInstance } from 'element-plus'
import { Camera, Delete, WarningFilled } from '@element-plus/icons-vue'
import { showLoader, hideLoader } from '@/components/utils/AppLoader'
import { createPatient, updatePatient, type PatientDto } from '@/composables/usePatients'
import { getTrustedPerson, upsertTrustedPerson, deleteTrustedPerson } from '@/composables/useTrustedPerson'
import type { Patient } from '@/composables/usePatientContext'
import { generateNip } from '@/utils/nip-generator'
import { calculateAge } from '@/utils/age'
import { useLocalites } from '@/composables/useLocalites'
import PatientAttachmentsSection from './PatientAttachmentsSection.vue'
import { ipcInvoke } from '@/utils/ipc'
import { usePatientFormStore } from '@/stores/patientFormStore'

const patientFormStore = usePatientFormStore()

const emit = defineEmits<{ saved: [] }>()

const dialogVisible = ref(false)
const isEdit = ref(false)
const editId = ref<number | null>(null)
const formRef = ref<FormInstance>()
const allergyInputRef = ref<any>(null)
const allergyInputVisible = ref(false)
const allergyInputValue = ref('')
const fileInputRef = ref<HTMLInputElement>()
const selectedRegion = ref('')
const selectedPrefecture = ref('')
const tpSelectedRegion = ref('')
const tpSelectedPrefecture = ref('')
let isReconstructingTpResidence = false
const nip = ref('')
const initializingNip = ref(false)
const ageInput = ref<number | null>(null)
const isSyncingAge = ref(false)
const isPostCreate = ref(false)
const activeStep = ref(0)
const postSave = ref(false)
let isReconstructingResidence = false

const stepTitles = ['Identité', 'Contact & Résidence', 'Allergies et autres', 'Personne de confiance']
const { localites, loading, fetchLocalites } = useLocalites()

const sites = ref<Array<{ id: number; name: string }>>([])
const doctors = ref<Array<{ id: number; nom: string; prenom: string }>>([])
const loadingSites = ref(false)
const loadingDoctors = ref(false)

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

const tpPrefectures = computed(() => {
  if (!tpSelectedRegion.value) return []
  const region = localites.value.find(l => l.code === tpSelectedRegion.value)
  if (!region?.id) return []
  return localites.value.filter(l => l.parent_id === region.id)
})

const tpSelectedPrefectureId = computed(() => {
  const found = tpPrefectures.value.find(p => p.code === tpSelectedPrefecture.value)
  return found?.id
})

const tpCommunesSousPref = computed(() => {
  const id = tpSelectedPrefectureId.value
  if (!id) return []
  return localites.value.filter(l => l.parent_id === id)
})

const form = reactive({
  civilite: '',
  nom: '',
  prenom: '',
  date_naissance: '',
  lieu_naissance: '',
  profession: '',
  nir: '',
  telephone: '',
  email: '',
  site_id: null as number | null,
  medecin_traitant: '',
  allergies: [] as string[],
  photo: null as string | null,
  nip: '',
  residence_code: '',
  complement_adresse: '',
  region: '',
  assuranceMutuelle: '',
  consentementEtude: 'non_precise',
  has_trusted: false,
  tp_nom: '',
  tp_prenom: '',
  tp_profession: '',
  tp_residence: '',
  tp_residence_code: '',
  tp_region: '',
  tp_telephone: '',
  tp_email: '',
  tp_complement_adresse: '',
  tp_lien_parente: '',
})

const rules = {
  civilite: [{ required: true, message: 'Choisissez une civilité', trigger: 'change' }],
  nom: [{ required: true, message: 'Le nom est requis', trigger: 'blur' }],
  prenom: [{ required: true, message: 'Le prénom est requis', trigger: 'blur' }],
  date_naissance: [{ required: true, message: 'La date de naissance est requise', trigger: 'change' }],
  nir: [],
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
  [() => form.civilite, () => form.date_naissance, () => form.lieu_naissance],
  ([civ, date, lieu]) => {
    if (initializingNip.value) return
    if (date && lieu) {
      const civForNip = civ || 'M'
      const generated = generateNip(civForNip as 'M' | 'Mme' | 'Mlle', date, lieu)
      nip.value = generated
      form.nip = generated
    } else {
      nip.value = ''
      form.nip = ''
    }
  },
  { immediate: false },
)

// Age ↔ Date de naissance sync
watch(
  () => form.date_naissance,
  (newDate) => {
    if (isSyncingAge.value) return
    if (!newDate) {
      ageInput.value = null
      return
    }
    ageInput.value = calculateAge(newDate)
  },
  { immediate: true },
)

function onAgeChange(val: number | undefined) {
  if (val === undefined || val === null) return
  isSyncingAge.value = true
  const year = new Date().getFullYear() - val
  form.date_naissance = `${year}-01-01`
  nextTick(() => { isSyncingAge.value = false })
}

watch(selectedRegion, (newCode) => {
  if (newCode) {
    const region = localites.value.find(l => l.code === newCode)
    form.region = region?.name ?? ''
  } else {
    form.region = ''
  }
})

function onRegionChange() {
  if (isReconstructingResidence) return
  selectedPrefecture.value = ''
  form.residence_code = ''
}

watch(tpSelectedRegion, (newCode) => {
  if (newCode) {
    const region = localites.value.find(l => l.code === newCode)
    form.tp_region = region?.name ?? ''
  } else {
    form.tp_region = ''
  }
})

function onTpRegionChange() {
  if (isReconstructingTpResidence) return
  tpSelectedPrefecture.value = ''
  form.tp_residence_code = ''
  form.tp_residence = ''
}

async function onSiteChange(siteId: number | undefined) {
  form.medecin_traitant = ''
  doctors.value = []
  if (!siteId) return
  loadingDoctors.value = true
  try {
    doctors.value = await ipcInvoke<Array<{ id: number; nom: string; prenom: string }>>('doctors:list-by-site', { site_id: siteId })
  } catch {
    doctors.value = []
  } finally {
    loadingDoctors.value = false
  }
}

function reconstructTpResidence(code: string | undefined) {
  if (!code) return
  isReconstructingTpResidence = true
  const leaf = localites.value.find(l => l.code === code)
  if (!leaf) {
    isReconstructingTpResidence = false
    return
  }
  if (leaf.parent_id) {
    const parent = localites.value.find(l => l.id === leaf.parent_id)
    if (parent) {
      tpSelectedPrefecture.value = parent.code
      if (parent.parent_id) {
        const grandparent = localites.value.find(l => l.id === parent.parent_id)
        if (grandparent) {
          tpSelectedRegion.value = grandparent.code
          form.tp_region = grandparent.name
        }
      }
    }
  }
  isReconstructingTpResidence = false
}

function resetForm() {
  form.civilite = ''
  form.nom = ''
  form.prenom = ''
  form.date_naissance = ''
  form.lieu_naissance = ''
  form.profession = ''
  form.nir = ''
  form.telephone = ''
  form.email = ''
  form.site_id = null
  form.medecin_traitant = ''
  doctors.value = []
  form.allergies = []
  form.photo = null
  form.nip = ''
  form.residence_code = ''
  form.complement_adresse = ''
  form.region = ''
  form.assuranceMutuelle = ''
  form.consentementEtude = 'non_precise'
  form.has_trusted = false
  form.tp_nom = ''
  form.tp_prenom = ''
  form.tp_profession = ''
  form.tp_residence = ''
  form.tp_residence_code = ''
  form.tp_region = ''
  form.tp_telephone = ''
  form.tp_email = ''
  form.tp_complement_adresse = ''
  form.tp_lien_parente = ''
  selectedRegion.value = ''
  selectedPrefecture.value = ''
  tpSelectedRegion.value = ''
  tpSelectedPrefecture.value = ''
  nip.value = ''
  editId.value = null
  isEdit.value = false
  allergyInputVisible.value = false
  allergyInputValue.value = ''
  ageInput.value = null
  isSyncingAge.value = false
  isPostCreate.value = false
  activeStep.value = 0
  formRef.value?.resetFields()
}

function close() {
  dialogVisible.value = false
}

async function cancelAndClose() {
  await patientFormStore.clearDraft()
  postSave.value = false
  resetForm()
  dialogVisible.value = false
}

async function handleClose() {
  if (postSave.value) return   // Don't re-save draft if user clicked Terminer
  const formType = isEdit.value ? 'patient_edit' : 'patient_create'
  await patientFormStore.saveDraft(formType, toRaw(form), activeStep.value, editId.value ?? undefined)
}

async function finishAndClose() {
  await patientFormStore.clearDraft()
  postSave.value = false
  dialogVisible.value = false
}

function continueEditing() {
  postSave.value = false
  activeStep.value++
}

function reconstructResidence(code: string | undefined) {
  if (!code) return
  isReconstructingResidence = true
  const leaf = localites.value.find(l => l.code === code)
  if (!leaf) {
    if (form.region) {
      const region = localites.value.find(l => l.type === 'region' && l.name === form.region)
      if (region) selectedRegion.value = region.code
    }
    isReconstructingResidence = false
    return
  }
  if (leaf.parent_id) {
    const parent = localites.value.find(l => l.id === leaf.parent_id)
    if (parent) {
      selectedPrefecture.value = parent.code
      if (parent.parent_id) {
        const grandparent = localites.value.find(l => l.id === parent.parent_id)
        if (grandparent) {
          selectedRegion.value = grandparent.code
          form.region = grandparent.name
        }
      }
    }
  }
  isReconstructingResidence = false
}

async function submitTrustedPerson() {
  if (!editId.value) return
  try {
    if (form.has_trusted) {
      await upsertTrustedPerson({
        patient_id: editId.value,
        has_trusted: true,
        nom: form.tp_nom || undefined,
        prenom: form.tp_prenom || undefined,
        profession: form.tp_profession || undefined,
        residence: form.tp_residence_code
          ? (localites.value.find(l => l.code === form.tp_residence_code)?.name || form.tp_residence_code)
          : undefined,
        residence_code: form.tp_residence_code || undefined,
        telephone: form.tp_telephone || undefined,
        email: form.tp_email || undefined,
        complement_adresse: form.tp_complement_adresse || undefined,
        lien_parente: form.tp_lien_parente || undefined,
      })
    } else if (isEdit.value) {
      await deleteTrustedPerson(editId.value)
    }
  } catch (e) {
    console.warn('[TP] Échec de la sauvegarde de la personne de confiance:', e)
  }
}

async function open(patient?: Patient) {
  postSave.value = false
  await fetchLocalites(false)

  // Fetch sites list
  loadingSites.value = true
  try {
    sites.value = await ipcInvoke<Array<{ id: number; name: string }>>('sites:list')
  } catch {
    sites.value = []
  } finally {
    loadingSites.value = false
  }

  if (!patient) {
    // Create mode: try loading draft from DB
    const draft = await patientFormStore.loadDraft('patient_create')
    if (draft) {
      Object.assign(form, draft.formData)
      activeStep.value = draft.activeStep
      dialogVisible.value = true
      return
    }
  } else {
    // Edit mode: check for existing draft for this patient
    const draft = await patientFormStore.loadDraft('patient_edit', patient.id)
    if (draft) {
      try {
        await ElMessageBox.confirm(
          'Un brouillon existe pour ce patient. Restaurer ?',
          'Brouillon trouvé',
          { confirmButtonText: 'Restaurer', cancelButtonText: 'Ignorer', type: 'info' }
        )
        Object.assign(form, draft.formData)
        activeStep.value = draft.activeStep
        dialogVisible.value = true
        return
      } catch {
        // User chose to ignore draft, clear it
        await patientFormStore.clearDraft()
      }
    }

    initializingNip.value = true
    isEdit.value = true
    editId.value = patient.id
    form.civilite = patient.civilite
    form.nom = patient.nom
    form.prenom = patient.prenom
    form.date_naissance = patient.date_naissance
    form.lieu_naissance = patient.lieu_naissance || ''
    form.profession = patient.profession || ''
    form.nir = patient.nir
    form.telephone = patient.telephone
    form.email = patient.email || ''
    form.site_id = patient.site_id ?? null
    await nextTick()
    form.medecin_traitant = patient.medecin_traitant || ''
    form.allergies = [...patient.allergies]
    form.photo = patient.photo ?? null
    form.residence_code = patient.residence_code || ''
    form.complement_adresse = patient.complement_adresse || ''
    form.region = patient.region || ''
    form.assuranceMutuelle = patient.assuranceMutuelle ?? ''
    form.consentementEtude = patient.consentementEtude ?? ''
    nip.value = patient.nip ?? ''
    form.nip = patient.nip ?? ''
    reconstructResidence(patient.residence_code)
    initializingNip.value = false

    // Load trusted person data
    try {
      const tp = await getTrustedPerson(patient.id)
      if (tp) {
        form.has_trusted = tp.has_trusted
        form.tp_nom = tp.nom || ''
        form.tp_prenom = tp.prenom || ''
        form.tp_profession = tp.profession || ''
        form.tp_residence = tp.residence || ''
        form.tp_residence_code = tp.residence_code || ''
        form.tp_region = tp.residence
          ? localites.value.find(l => l.code === tp.residence_code)?.name || ''
          : ''
        reconstructTpResidence(tp.residence_code)
        form.tp_telephone = tp.telephone || ''
        form.tp_email = tp.email || ''
        form.tp_complement_adresse = tp.complement_adresse || ''
        form.tp_lien_parente = tp.lien_parente || ''
      }
    } catch {
      // Trusted person not found, keep defaults
    }

    // Load doctors for the patient's site in edit mode
    if (form.site_id) {
      loadingDoctors.value = true
      try {
        doctors.value = await ipcInvoke<Array<{ id: number; nom: string; prenom: string }>>('doctors:list-by-site', { site_id: form.site_id })
      } catch {
        doctors.value = []
      } finally {
        loadingDoctors.value = false
      }
    }
  }
  activeStep.value = 0
  dialogVisible.value = true
  // Force reactive update for el-select bindings
  if (form.site_id) {
    await nextTick()
  }
}

async function submit() {
  if (!formRef.value) return
  formRef.value.validate(async (v: boolean) => {
    if (!v) {
      ElMessage.warning('Veuillez remplir tous les champs obligatoires')
      return
    }
    if (isPostCreate.value) {
      await submitTrustedPerson()
      await patientFormStore.clearDraft()
      close()
      emit('saved')
      return
    }
    const loader = showLoader(isEdit.value ? 'Enregistrement...' : 'Création...')
    try {
      const raw = toRaw(form) as Record<string, unknown>
      const patientPayload = { ...raw, civilite: raw.civilite || '' } as PatientDto
      if (isEdit.value && editId.value) {
        await updatePatient({ ...patientPayload, id: editId.value })
        await submitTrustedPerson()
        await patientFormStore.clearDraft()
        ElMessage.success('Modifications enregistrées')
        postSave.value = true
        emit('saved')
      } else {
        const created = await createPatient(patientPayload)
        if (created?.id) {
          editId.value = created.id
          isEdit.value = true
          isPostCreate.value = true
          activeStep.value = 3
          await submitTrustedPerson()
          if (created.nip) {
            nip.value = created.nip
            form.nip = created.nip
          }
          await patientFormStore.clearDraft()
          ElMessage.success('Patient créé. Vous pouvez ajouter des pièces jointes.')
          emit('saved')
        } else {
          await submitTrustedPerson()
          await patientFormStore.clearDraft()
          ElMessage.success('Patient créé')
          close()
          emit('saved')
        }
      }
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

.date-age-group {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
}

.age-unit {
  font-size: 13px;
  color: var(--el-text-color-secondary);
  white-space: nowrap;
  margin-left: 4px;
}

.step-content {
  min-height: 200px;
  background: #fafafa;
  border-radius: 8px;
  padding: 20px 24px;
  border: 1px solid #eee;
}

.el-form-item {
  margin-bottom: 18px;
}

.el-form-item:last-child {
  margin-bottom: 0;
}

.trusted-person-card {
  border: 1px solid var(--el-border-color-light);
  border-radius: 8px;
  background: var(--el-color-info-light-9);
  margin-bottom: 8px;
}

.trusted-person-card .el-form-item__label {
  white-space: normal;
  word-break: break-word;
  line-height: 1.3;
}

.dialog-footer {
  display: flex;
  justify-content: space-between;
  width: 100%;
}

.el-step.is-clickable {
  cursor: pointer;
}

.el-step.is-clickable:hover .el-step__title {
  color: var(--el-color-primary);
}

.el-form-item__label {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.consent-card {
  margin-bottom: 16px;
  border: 1px solid var(--el-color-warning-light-5, #faecd8);
  background: var(--el-color-warning-light-9, #fdf6ec);
  border-radius: 8px;
}
.consent-card .el-card__header {
  padding: 12px 16px;
  border-bottom: 1px solid var(--el-color-warning-light-5, #faecd8);
}
.consent-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  font-size: 14px;
  color: var(--el-color-warning, #e6a23c);
}
.consent-card .el-form-item {
  margin-bottom: 0;
}
</style>
