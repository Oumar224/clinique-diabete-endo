<template>
  <el-dialog
    v-model="visible"
    :title="apportId == null ? 'Nouvel apport' : 'Modifier l’apport'"
    width="560px"
    :close-on-click-modal="false"
    @closed="onClosed"
  >
    <el-alert
      v-if="submitError"
      class="cde-alert cde-alert--danger"
      type="error"
      :closable="false"
      show-icon
      :title="submitError"
    />

    <el-form
      ref="formRef"
      :model="form"
      :rules="rules"
      label-position="top"
      @submit.prevent
    >
      <el-row :gutter="12">
        <el-col
          :xs="24"
          :sm="12"
        >
          <el-form-item
            label="Type d'apport"
            prop="type"
          >
            <el-select
              v-model="form.type"
              :disabled="apportId != null"
              style="width: 100%"
            >
              <el-option
                label="Fonds propres"
                value="fonds_propres"
              />
              <el-option
                label="Dette"
                value="dette"
              />
            </el-select>
          </el-form-item>
        </el-col>
        <el-col
          :xs="24"
          :sm="12"
        >
          <el-form-item label="Référence">
            <el-input
              :model-value="reference"
              disabled
              placeholder="Générée automatiquement"
            />
          </el-form-item>
        </el-col>
      </el-row>

      <el-form-item
        label="Libellé"
        prop="libelle"
      >
        <el-input
          v-model="form.libelle"
          maxlength="120"
          show-word-limit
          placeholder="Ex : Apport associé, emprunt fournisseur…"
        />
      </el-form-item>

      <el-row :gutter="12">
        <el-col
          :xs="24"
          :sm="12"
        >
          <el-form-item
            label="Montant (GNF)"
            prop="montant"
          >
            <el-input-number
              v-model="form.montant"
              :min="1"
              :step="1000"
              :precision="0"
              controls-position="right"
              style="width: 100%"
            />
          </el-form-item>
        </el-col>
        <el-col
          :xs="24"
          :sm="12"
        >
          <el-form-item
            label="Date de l'apport"
            prop="dateApport"
          >
            <el-date-picker
              v-model="form.dateApport"
              type="date"
              value-format="YYYY-MM-DD"
              :clearable="false"
              style="width: 100%"
            />
          </el-form-item>
        </el-col>
      </el-row>

      <el-form-item label="Mode de paiement">
        <el-select
          v-model="form.modePaiement"
          style="width: 100%"
        >
          <el-option
            v-for="mode in MODES_PAIEMENT"
            :key="mode.value"
            :label="mode.label"
            :value="mode.value"
          />
        </el-select>
      </el-form-item>

      <el-form-item label="Notes">
        <el-input
          v-model="form.notes"
          type="textarea"
          :rows="2"
          maxlength="300"
          show-word-limit
          placeholder="Conditions, échéance, justificatif…"
        />
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button @click="visible = false">
        Annuler
      </el-button>
      <el-button
        type="primary"
        :loading="saving"
        @click="submit"
      >
        {{ apportId == null ? 'Créer l’apport' : 'Enregistrer' }}
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import { MODES_PAIEMENT, type ModePaiement } from '@/composables/useSalaires'
import {
  useApports,
  type ApportDto,
  type ApportType,
} from '@/composables/useApports'

const emit = defineEmits<{
  saved: [apport: ApportDto]
}>()

const { createApport, updateApport, saving, error } = useApports()

const visible = ref(false)
const apportId = ref<number | null>(null)
const reference = ref('')
const formRef = ref<FormInstance>()
const submitError = ref('')

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

const form = reactive({
  type: 'fonds_propres' as ApportType,
  libelle: '',
  montant: 0 as number | null,
  dateApport: todayIso(),
  modePaiement: 'espèces' as ModePaiement,
  notes: '',
})

const rules: FormRules = {
  type: [{ required: true, message: "Le type d'apport est requis", trigger: 'change' }],
  libelle: [{ required: true, message: 'Le libellé est requis', trigger: 'blur' }],
  montant: [
    { required: true, message: 'Le montant est requis', trigger: 'change' },
    {
      validator: (_rule, value, callback) => {
        if (value == null) return callback()
        if (!Number.isInteger(value) || value <= 0) {
          return callback(new Error('Le montant doit être un entier strictement positif'))
        }
        callback()
      },
      trigger: 'change',
    },
  ],
  dateApport: [{ required: true, message: "La date de l'apport est requise", trigger: 'change' }],
}

/**
 * Ouvre le dialogue en création ou en modification.
 *
 * @param target - Apport à modifier. Absent pour créer.
 */
function open(target?: ApportDto) {
  submitError.value = ''
  if (target?.id != null) {
    apportId.value = target.id
    reference.value = target.reference ?? ''
    form.type = target.type ?? 'fonds_propres'
    form.libelle = target.libelle ?? ''
    form.montant = target.montant ?? 0
    form.dateApport = target.dateApport ?? todayIso()
    form.modePaiement = target.modePaiement ?? 'espèces'
    form.notes = target.notes ?? ''
  } else {
    apportId.value = null
    reference.value = ''
    form.type = 'fonds_propres'
    form.libelle = ''
    form.montant = 0
    form.dateApport = todayIso()
    form.modePaiement = 'espèces'
    form.notes = ''
  }
  visible.value = true
}

/** Valide puis enregistre l'apport. */
async function submit() {
  submitError.value = ''
  if (!formRef.value) return
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid || form.montant == null) return

  const payload = {
    libelle: form.libelle.trim(),
    montant: Math.trunc(form.montant),
    dateApport: form.dateApport,
    modePaiement: form.modePaiement,
    notes: form.notes.trim() || null,
  }

  const saved = apportId.value == null
    ? await createApport({ ...payload, type: form.type })
    : await updateApport({ id: apportId.value, ...payload })

  if (!saved) {
    submitError.value = error.value || "Enregistrement de l'apport impossible."
    return
  }
  ElMessage.success(apportId.value == null ? 'Apport créé' : 'Apport mis à jour')
  emit('saved', saved)
  visible.value = false
}

function onClosed() {
  formRef.value?.resetFields()
  apportId.value = null
  reference.value = ''
  submitError.value = ''
}

defineExpose({ open })
</script>
