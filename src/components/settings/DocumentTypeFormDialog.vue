<template>
  <el-dialog
    v-model="visible"
    :title="isEdit ? 'Modifier le type de document' : 'Nouveau type de document'"
    width="600px"
    :close-on-click-modal="false"
    @closed="handleClosed"
  >
    <el-form
      ref="formRef"
      :model="form"
      :rules="rules"
      label-width="140px"
      label-position="top"
      style="max-width: 100%"
    >
      <el-row :gutter="16">
        <el-col :span="12">
          <el-form-item label="Code" prop="code">
            <el-input v-model="form.code" placeholder="Ex: CONSULTATION_NOTE" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="Libellé" prop="label">
            <el-input v-model="form.label" placeholder="Ex: Compte rendu de consultation" />
          </el-form-item>
        </el-col>
      </el-row>

      <el-form-item label="Catégorie" prop="category">
        <el-select v-model="form.category" placeholder="Sélectionner une catégorie" allow-create filterable style="width: 100%">
          <el-option
            v-for="cat in CATEGORIES"
            :key="cat"
            :label="cat"
            :value="cat"
          />
        </el-select>
      </el-form-item>

      <el-form-item label="Types de contact supportés" prop="contactTypes">
  <el-select
    v-model="form.contactTypes"
    multiple
    placeholder="Sélectionner les types de contact"
    style="width: 100%"
  >
    <el-option label="Consultation" value="consultation" />
    <el-option label="Hospitalisation" value="hospitalisation" />
  </el-select>
</el-form-item>

      <el-form-item label="Description">
        <el-input
          v-model="form.description"
          type="textarea"
          :rows="2"
          placeholder="Description optionnelle"
        />
      </el-form-item>

      <el-form-item label="Acte médical lié">
        <el-select
          v-model="form.acteIdDeclenche"
          placeholder="Sélectionner un acte (optionnel)"
          clearable
          filterable
          style="width: 100%"
        >
          <el-option
            v-for="acte in medicalActs"
            :key="acte.id"
            :label="`${acte.code} — ${acte.label}`"
            :value="acte.id!"
          >
            <span>{{ acte.code }} — {{ acte.label }}</span>
            <span v-if="acte.service_name" style="float: right; color: var(--el-text-color-secondary); font-size: 12px">
              {{ acte.service_name }}
            </span>
          </el-option>
        </el-select>
        <div v-if="acteIdDeclenche" class="dctf__acte-preview">
          <el-tag size="small" effect="plain" type="warning">
            Acte: {{ acteLabel }}
          </el-tag>
        </div>
      </el-form-item>

      <el-form-item label="Schéma du formulaire (JSON)">
        <el-input
          v-model="formSchemaText"
          type="textarea"
          :rows="8"
          placeholder='[{"key": "reason", "label": "Motif", "type": "textarea", "required": true}]'
        />
        <div v-if="schemaError" class="dctf__schema-error">
          {{ schemaError }}
        </div>
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button @click="visible = false">Annuler</el-button>
      <el-button type="primary" :loading="saving" @click="handleSave">
        {{ isEdit ? 'Enregistrer' : 'Créer' }}
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { ElMessage } from 'element-plus'
import type { FormInstance } from 'element-plus'
import { ipcInvoke } from '@/utils/ipc'
import { useMedicalActs } from '@/composables/useMedicalActs'
import type { ClinicalDocumentTypeDTO } from '@/composables/useClinicalDocuments'

const CATEGORIES = [
  'consultation', 'lab', 'delivery', 'other',
  'Protocoles', 'Bilans', 'Comptes rendus', 'Prescriptions',
]

const emit = defineEmits<{
  saved: []
}>()

const { acts: medicalActs, fetchActs } = useMedicalActs()

const formRef = ref<FormInstance | null>(null)
const visible = ref(false)
const isEdit = ref(false)
const editId = ref<string | null>(null)
const saving = ref(false)

const form = reactive({
  code: '',
  label: '',
  category: '',
  description: '',
  acteIdDeclenche: null as number | null,
  contactTypes: [] as string[],
})

const formSchemaText = ref('')
const schemaError = ref('')

const rules = {
  code: [{ required: true, message: 'Le code est requis', trigger: 'blur' }],
  label: [{ required: true, message: 'Le libellé est requis', trigger: 'blur' }],
  category: [{ required: true, message: 'La catégorie est requise', trigger: 'change' }],
}

const acteIdDeclenche = computed(() => form.acteIdDeclenche)

const acteLabel = computed(() => {
  if (!form.acteIdDeclenche) return ''
  const acte = medicalActs.value.find(a => a.id === form.acteIdDeclenche)
  return acte ? `${acte.code} — ${acte.label}` : ''
})

async function ensureActsLoaded() {
  if (medicalActs.value.length === 0) {
    await fetchActs()
  }
}

async function open(row?: ClinicalDocumentTypeDTO) {
  await ensureActsLoaded()
  if (row) {
    isEdit.value = true
    editId.value = row.id
    form.code = row.code
    form.label = row.label
    form.category = row.category
    form.description = row.description ?? ''
    form.acteIdDeclenche = row.acteIdDeclenche ?? null
    form.contactTypes = row.contactTypes ?? []
    formSchemaText.value = JSON.stringify(row.formSchema ?? [], null, 2)
  } else {
    isEdit.value = false
    editId.value = null
    form.code = ''
    form.label = ''
    form.category = ''
    form.description = ''
    form.acteIdDeclenche = null
    form.contactTypes = []
    formSchemaText.value = '[]'
  }
  schemaError.value = ''
  visible.value = true
}

function handleClosed() {
  formRef.value?.resetFields()
}

async function handleSave() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return

  // Validate JSON schema
  let formSchema: any[] = []
  try {
    formSchema = JSON.parse(formSchemaText.value)
    if (!Array.isArray(formSchema)) throw new Error('Le schéma doit être un tableau')
    schemaError.value = ''
  } catch (e) {
    schemaError.value = `JSON invalide: ${(e as Error).message}`
    return
  }

  saving.value = true
  try {
    if (isEdit.value && editId.value) {
      await ipcInvoke('clinical-documents:update-type', {
        id: editId.value,
        code: form.code,
        label: form.label,
        category: form.category,
        description: form.description || null,
        acteIdDeclenche: form.acteIdDeclenche,
        contactTypes: form.contactTypes,
        formSchema,
      })
      ElMessage.success('Type de document modifié')
    } else {
      await ipcInvoke('clinical-documents:create-type', {
        code: form.code,
        label: form.label,
        category: form.category,
        description: form.description || null,
        acteIdDeclenche: form.acteIdDeclenche,
        contactTypes: form.contactTypes,
        formSchema,
      })
      ElMessage.success('Type de document créé')
    }
    visible.value = false
    emit('saved')
  } catch (e) {
    ElMessage.error(`Erreur: ${(e as Error).message}`)
  } finally {
    saving.value = false
  }
}

defineExpose({ open })
</script>

<style scoped>
.dctf__schema-error {
  color: var(--el-color-danger);
  font-size: 12px;
  margin-top: 4px;
}

.dctf__acte-preview {
  margin-top: 6px;
}
</style>
