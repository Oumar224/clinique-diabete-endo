<template>
  <el-dialog
    v-model="visible"
    :title="editingId ? 'Modifier l\'acte' : 'Nouvel acte'"
    width="520px"
    :close-on-click-modal="false"
    @closed="onClosed"
  >
    <el-form
      ref="formRef"
      :model="form"
      :rules="rules"
      label-width="120px"
      label-position="top"
    >
      <el-row :gutter="16">
        <el-col :span="12">
          <el-form-item label="Code" prop="code">
            <el-input
              v-model="form.code"
              placeholder="Ex: CONS-001"
              maxlength="50"
              @input="form.code = form.code.toUpperCase()"
            />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="Service" prop="service_id">
            <el-select :model-value="form.service_id" @update:model-value="form.service_id = $event" placeholder="Sélectionner" style="width: 100%">
              <el-option
                v-for="s in servicesList"
                :key="s.id"
                :label="s.name"
                :value="s.id!"
              />
            </el-select>
          </el-form-item>
        </el-col>
      </el-row>
      <el-form-item label="Libellé" prop="label">
        <el-input v-model="form.label" placeholder="Ex: Consultation générale" />
      </el-form-item>
      <el-row :gutter="16">
        <el-col :span="12">
          <el-form-item label="Prix" prop="price">
            <el-input-number
              v-model="form.price"
              :min="0"
              :step="1000"
              controls-position="right"
              style="width: 100%"
            />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="Devise" prop="currency_code">
            <el-select v-model="form.currency_code" style="width: 100%">
              <el-option
                v-for="c in currenciesList"
                :key="c.code"
                :label="`${c.code} (${c.symbol})`"
                :value="c.code"
              />
            </el-select>
          </el-form-item>
        </el-col>
      </el-row>
    </el-form>
    <template #footer>
      <el-button @click="visible = false">Annuler</el-button>
      <el-button type="primary" :loading="submitting" @click="submit">Confirmer</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { ElMessage } from 'element-plus'
import type { FormInstance } from 'element-plus'
import { useMedicalActs, type MedicalActDto } from '@/composables/useMedicalActs'
import { useMedicalServices } from '@/composables/useMedicalServices'
import { useCurrencies } from '@/composables/useCurrencies'

const emit = defineEmits<{
  saved: []
}>()

const { createAct, updateAct } = useMedicalActs()
const { services } = useMedicalServices()
const { currencies } = useCurrencies()

const servicesList = computed(() => services.value)
const currenciesList = computed(() => currencies.value)

const visible = ref(false)
const submitting = ref(false)
const editingId = ref<number | null>(null)
const formRef = ref<FormInstance>()

const form = reactive({
  code: '',
  label: '',
  service_id: undefined as number | undefined,
  price: 0,
  currency_code: 'GNF',
})

const rules = {
  code: [
    { required: true, message: 'Le code est requis', trigger: 'blur' },
    { max: 50, message: 'Maximum 50 caractères', trigger: 'blur' },
  ],
  label: [
    { required: true, message: 'Le libellé est requis', trigger: 'blur' },
  ],
  service_id: [
    { required: true, message: 'Le service est requis', trigger: 'change' },
  ],
  price: [
    { required: true, message: 'Le prix est requis', trigger: 'blur' },
  ],
}

function open(act?: MedicalActDto) {
  editingId.value = null
  form.code = ''
  form.label = ''
  form.service_id = undefined
  form.price = 0
  form.currency_code = 'GNF'
  if (act) {
    editingId.value = act.id ?? null
    form.code = act.code || ''
    form.label = act.label || ''
    form.service_id = act.service_id
    form.price = act.price
    form.currency_code = act.currency_code || 'GNF'
  }
  visible.value = true
}

function close() {
  visible.value = false
}

async function submit() {
  if (!formRef.value) return
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return
  submitting.value = true
  try {
    let result: MedicalActDto | null = null
    if (editingId.value) {
      result = await updateAct(editingId.value, {
        code: form.code,
        label: form.label,
        price: form.price,
        service_id: form.service_id!,
        currency_code: form.currency_code,
      })
      if (result) ElMessage.success('Acte modifié')
    } else {
      result = await createAct({
        code: form.code,
        label: form.label,
        price: form.price,
        service_id: form.service_id!,
        currency_code: form.currency_code,
      })
      if (result) ElMessage.success('Acte créé')
    }
    if (result) {
      emit('saved')
      visible.value = false
    }
  } catch {
    ElMessage({ type: 'error', message: "Erreur lors de l'enregistrement" })
  } finally {
    submitting.value = false
  }
}

function onClosed() {
  editingId.value = null
  formRef.value?.resetFields()
}

defineExpose({ open, close })
</script>
