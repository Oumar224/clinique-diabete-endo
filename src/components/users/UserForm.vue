<template>
  <el-dialog
    v-model="dialogVisible"
    :title="title"
    width="720px"
    :close-on-click-modal="false"
    @closed="onClosed"
  >
    <el-form ref="formRef" :model="form" :rules="rules" label-position="top">
      <!-- ==================== Identité ==================== -->
      <el-divider content-position="left">Identité</el-divider>

      <el-row :gutter="16">
        <el-col :span="24">
          <el-form-item label="Photo">
            <div class="photo-upload" @click="triggerFileInput">
              <el-avatar :size="80" :src="form.photo || undefined" shape="circle">
                <el-icon :size="32"><Camera /></el-icon>
              </el-avatar>
              <input
                ref="fileInputRef"
                type="file"
                accept="image/*"
                style="display: none"
                @change="handlePhotoChange"
              />
              <span v-if="form.photo" class="photo-remove" @click.stop="removePhoto">
                <el-icon><Delete /></el-icon>
              </span>
            </div>
          </el-form-item>
        </el-col>
      </el-row>

      <el-row :gutter="16">
        <el-col :span="12">
          <el-form-item label="Nom" prop="nom">
            <el-input v-model="form.nom" placeholder="Nom de famille" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="Prénom" prop="prenom">
            <el-input v-model="form.prenom" placeholder="Prénom" />
          </el-form-item>
        </el-col>
      </el-row>

      <!-- ==================== Contact ==================== -->
      <el-divider content-position="left">Contact</el-divider>

      <el-form-item label="Email" prop="email">
        <el-input v-model="form.email" type="email" placeholder="exemple@clinique.com" />
      </el-form-item>

      <el-form-item label="Téléphone">
        <el-row :gutter="16">
          <el-col :span="8">
            <el-select v-model="form.telephone_country_code" style="width: 100%">
              <el-option
                v-for="code in WEST_AFRICAN_COUNTRY_CODES"
                :key="code"
                :label="code"
                :value="code"
              />
            </el-select>
          </el-col>
          <el-col :span="16">
            <el-input
              v-model="form.telephone"
              placeholder="Numéro de téléphone"
              maxlength="20"
            />
          </el-col>
        </el-row>
      </el-form-item>

      <!-- ==================== Affectations ==================== -->
      <el-divider content-position="left">Affectations</el-divider>

      <el-form-item label="Sites">
        <el-select
          v-model="form.site_ids"
          multiple
          filterable
          style="width: 100%"
          placeholder="Sélectionner des sites"
          :loading="sitesLoading"
        >
          <el-option
            v-for="s in sites"
            :key="s.id!"
            :label="s.name"
            :value="s.id!"
          />
        </el-select>
      </el-form-item>

      <el-form-item label="Unités médicales">
        <el-select
          v-model="form.medical_unit_ids"
          multiple
          filterable
          style="width: 100%"
          placeholder="Sélectionner des unités"
          :loading="unitsLoading"
        >
          <el-option
            v-for="u in medicalUnits"
            :key="u.id!"
            :label="`${u.code} — ${u.name}`"
            :value="u.id!"
          />
        </el-select>
      </el-form-item>

      <el-form-item label="Services médicaux">
        <el-select
          v-model="form.service_ids"
          multiple
          filterable
          style="width: 100%"
          placeholder="Sélectionner des services"
          :loading="servicesLoading"
        >
          <el-option
            v-for="s in services"
            :key="s.id!"
            :label="s.name"
            :value="s.id!"
          />
        </el-select>
      </el-form-item>

      <!-- ==================== Profession ==================== -->
      <el-divider content-position="left">Profession</el-divider>

      <el-row :gutter="16">
        <el-col :span="12">
          <el-form-item label="Fonction" prop="fonction_id">
            <el-select v-model="form.fonction_id" placeholder="Sélectionner une fonction" clearable filterable style="width: 100%">
              <el-option
                v-for="f in fonctions"
                :key="f.id"
                :label="f.name"
                :value="f.id!"
              />
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="Tâche" prop="role">
            <el-select v-model="form.role" style="width: 100%">
              <el-option label="Médecin" value="MEDECIN" />
              <el-option label="Secrétaire" value="SECRETAIRE" />
              <el-option label="Pharmacien" value="PHARMACIEN" />
              <el-option label="Comptable" value="COMPTABLE" />
              <el-option label="Administrateur" value="ADMIN" />
              <el-option label="Infirmier d'État" value="INFIRMIER" />
            </el-select>
          </el-form-item>
        </el-col>
      </el-row>

      <el-form-item label="Spécialités">
        <el-select
          v-model="form.specialty_ids"
          multiple
          filterable
          style="width: 100%"
          placeholder="Sélectionner des spécialités"
          :loading="specialtiesLoading"
        >
          <el-option
            v-for="s in specialties"
            :key="s.id!"
            :label="`${s.title_prefix ? s.title_prefix + ' - ' : ''}${s.name}`"
            :value="s.id!"
          />
        </el-select>
      </el-form-item>
      <!-- ==================== Contrat ==================== -->
      <el-divider content-position="left">Contrat</el-divider>

      <el-row :gutter="16">
        <el-col :span="8">
          <el-form-item label="Type de contrat" prop="type_contrat">
            <el-select
              v-model="form.type_contrat"
              style="width: 100%"
              @change="onTypeContratChange"
            >
              <el-option label="CDI" value="CDI" />
              <el-option label="CDD" value="CDD" />
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="8">
          <el-form-item label="Date début contrat" prop="date_debut_contrat">
            <el-date-picker
              v-model="form.date_debut_contrat"
              type="date"
              style="width: 100%"
              placeholder="jj/mm/aaaa"
              format="DD/MM/YYYY"
              value-format="YYYY-MM-DD"
            />
          </el-form-item>
        </el-col>
        <el-col :span="8">
          <el-form-item label="Date fin contrat" prop="date_fin_contrat">
            <el-date-picker
              v-model="form.date_fin_contrat"
              type="date"
              style="width: 100%"
              placeholder="jj/mm/aaaa"
              format="DD/MM/YYYY"
              value-format="YYYY-MM-DD"
              :disabled="form.type_contrat === 'CDI'"
            />
          </el-form-item>
        </el-col>
      </el-row>

      <!-- ==================== Compte ==================== -->
      <el-divider content-position="left">Compte</el-divider>

      <el-form-item label="Mot de passe" prop="password">
        <el-input
          v-model="form.password"
          type="password"
          show-password
          placeholder="Défaut : changeme"
        />
      </el-form-item>

      <el-form-item v-if="!form.id" prop="sendEmail">
        <el-checkbox v-model="form.sendEmail">
          Envoyer un email de bienvenue avec les identifiants
        </el-checkbox>
      </el-form-item>
    </el-form>

    <!-- ==================== Pièces jointes ==================== -->
    <el-divider />
    <UserAttachmentsSection v-if="form.id" :userId="form.id" />

    <template #footer>
      <el-button @click="dialogVisible = false">Annuler</el-button>
      <el-button type="primary" @click="onSubmit">
        {{ form.id ? 'Valider' : 'Créer' }}
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { reactive, ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import type { UserDto } from '@/composables/useUsers'
import { useSpecialties } from '@/composables/useSpecialties'
import { useMedicalServices } from '@/composables/useMedicalServices'
import { useSites } from '@/composables/useSites'
import { useMedicalUnits } from '@/composables/useMedicalUnits'
import { useFonctions } from '@/composables/useFonctions'
import { WEST_AFRICAN_COUNTRY_CODES } from '@/utils/phone-codes'
import { Camera, Delete } from '@element-plus/icons-vue'

defineProps<{ title: string }>()

const emits = defineEmits<{
  (
    e: 'submitAction',
    formRef: FormInstance | undefined,
    form: UserDto & {
      specialty_ids: number[]
      service_ids: number[]
      site_ids: number[]
      medical_unit_ids: number[]
      fonction_id?: number | null
    },
  ): void
}>()

const dialogVisible = ref(false)
const formRef = ref<FormInstance>()
const fileInputRef = ref<HTMLInputElement>()

// --- Composables ---
const {
  specialties,
  loading: specialtiesLoading,
  fetchSpecialties,
} = useSpecialties()
const {
  services,
  loading: servicesLoading,
  fetchServices: fetchMedicalServices,
} = useMedicalServices()
const { sites, loading: sitesLoading, fetchSites } = useSites()
const {
  units: medicalUnits,
  loading: unitsLoading,
  fetchUnits: fetchMedicalUnits,
} = useMedicalUnits()
const { fonctions, fetchFonctions: fetchFonctionsList } = useFonctions()

onMounted(async () => {
  await Promise.all([
    fetchSpecialties(),
    fetchMedicalServices(),
    fetchSites(),
    fetchMedicalUnits(true),
    fetchFonctionsList(),
  ])
})

// --- Form state ---
const form = reactive({
  id: undefined as number | undefined,
  nom: '',
  prenom: '',
  email: '',
  role: 'MEDECIN' as string,
  service: '',
  password: 'changeme',
  sendEmail: false,
  photo: null as string | null,
  telephone: '',
  telephone_country_code: '+224',
  fonction: '',
  fonction_id: null as number | null,
  specialty_ids: [] as number[],
  service_ids: [] as number[],
  site_ids: [] as number[],
  medical_unit_ids: [] as number[],
  date_debut_contrat: null as string | null,
  date_fin_contrat: null as string | null,
  type_contrat: 'CDI' as 'CDD' | 'CDI',
})

// --- Validation ---
const validateDateFinContrat = (
  _rule: unknown,
  value: string | null,
  callback: (error?: Error) => void,
) => {
  if (form.type_contrat === 'CDD') {
    if (!value) {
      callback(new Error('La date de fin est requise pour un CDD'))
      return
    }
    if (form.date_debut_contrat && value < form.date_debut_contrat) {
      callback(
        new Error('La date de fin doit être postérieure à la date de début'),
      )
      return
    }
  }
  callback()
}

const rules: FormRules = {
  nom: [
    { required: true, message: 'Le nom est requis', trigger: 'blur' },
    { max: 100, message: 'Maximum 100 caractères', trigger: 'blur' },
  ],
  prenom: [
    { required: true, message: 'Le prénom est requis', trigger: 'blur' },
    { max: 100, message: 'Maximum 100 caractères', trigger: 'blur' },
  ],
  email: [
    { required: true, message: "L'email est requis", trigger: 'blur' },
    { type: 'email', message: 'Email invalide', trigger: 'blur' },
    { max: 255, message: 'Maximum 255 caractères', trigger: 'blur' },
  ],
  role: [
    { required: true, message: 'Le rôle est requis', trigger: 'change' },
  ],
  password: [
    { min: 4, message: 'Minimum 4 caractères', trigger: 'blur' },
  ],
  type_contrat: [
    { required: true, message: 'Le type de contrat est requis', trigger: 'change' },
  ],
  date_debut_contrat: [
    { required: true, message: 'La date de début est requise', trigger: 'change' },
  ],
  date_fin_contrat: [
    { validator: validateDateFinContrat, trigger: 'change' },
  ],
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
  reader.onload = () => {
    form.photo = reader.result as string
  }
  reader.readAsDataURL(file)
}

function removePhoto() {
  form.photo = null
  if (fileInputRef.value) {
    fileInputRef.value.value = ''
  }
}

// --- Contrat ---
function onTypeContratChange(val: 'CDD' | 'CDI') {
  if (val === 'CDI') {
    form.date_fin_contrat = null
  }
  formRef.value?.clearValidate('date_fin_contrat')
}

// --- Dialog lifecycle ---
function open(user?: UserDto) {
  dialogVisible.value = true

  // Reset to defaults first
  form.nom = ''
  form.prenom = ''
  form.email = ''
  form.role = 'MEDECIN'
  form.service = ''
  form.password = 'changeme'
  form.photo = null
  form.telephone = ''
  form.telephone_country_code = '+224'
  form.fonction = ''
  form.fonction_id = null
  form.specialty_ids = []
  form.service_ids = []
  form.site_ids = []
  form.medical_unit_ids = []
  form.date_debut_contrat = null
  form.date_fin_contrat = null
  form.type_contrat = 'CDI'

  // Remove id for new users (so spread doesn't include undefined)
  delete (form as any).id

  if (user) {
    form.id = user.id
    form.nom = user.nom ?? ''
    form.prenom = user.prenom ?? ''
    form.email = user.email ?? ''
    form.role = user.role ?? 'MEDECIN'
    form.service = user.service ?? ''
    form.photo = user.photo ?? null
    form.telephone = user.telephone ?? ''
    form.telephone_country_code = user.telephone_country_code ?? '+224'
    form.fonction = user.fonction ?? ''
    form.fonction_id = user.fonction_id ?? null
    form.type_contrat = (user.type_contrat as 'CDD' | 'CDI') ?? 'CDI'
    form.date_debut_contrat = user.date_debut_contrat ?? null
    form.date_fin_contrat = user.date_fin_contrat ?? null

    // Extract IDs from resolved relation objects (populated by users:list)
    if (user.specialties?.length) {
      form.specialty_ids = user.specialties.map((s) => s.id!)
    }
    if (user.services?.length) {
      form.service_ids = user.services.map((s) => s.id!)
    }
    if (user.sites?.length) {
      form.site_ids = user.sites.map((s) => s.id!)
    }
    if (user.medical_units?.length) {
      form.medical_unit_ids = user.medical_units.map((m) => m.id!)
    }
  }
}

function close() {
  dialogVisible.value = false
}

function onClosed() {
  formRef.value?.resetFields()
}

function onSubmit() {
  if (!formRef.value) return
  emits('submitAction', formRef.value, form as any)
}

defineExpose({ open, close })
</script>

<style scoped>
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
</style>
