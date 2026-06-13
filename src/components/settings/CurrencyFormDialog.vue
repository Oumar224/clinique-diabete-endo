<template>
  <el-dialog
    v-model="visible"
    :title="editingCode ? 'Modifier la devise' : 'Ajouter une devise'"
    width="450px"
    :close-on-click-modal="false"
    @closed="onClosed"
  >
    <el-form
      ref="formRef"
      :model="form"
      :rules="rules"
      label-width="110px"
      label-position="top"
    >
      <el-form-item label="Code" prop="code">
        <el-input
          v-model="form.code"
          :disabled="!!editingCode"
          maxlength="10"
          placeholder="Ex: USD"
          style="text-transform: uppercase"
          @input="form.code = form.code.toUpperCase()"
        />
      </el-form-item>
      <el-form-item label="Nom" prop="name">
        <el-input v-model="form.name" placeholder="Ex: Dollar US" />
      </el-form-item>
      <el-form-item label="Symbole" prop="symbol">
        <el-input v-model="form.symbol" placeholder="Ex: $" maxlength="5" />
      </el-form-item>
      <el-form-item label="Décimales" prop="decimals">
        <el-input-number v-model="form.decimals" :min="0" :max="3" controls-position="right" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="visible = false">Annuler</el-button>
      <el-button type="primary" :loading="submitting" @click="submit">Confirmer</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { ElMessage } from 'element-plus'
import type { FormInstance } from 'element-plus'
import { useCurrencies, type CurrencyDto } from '@/composables/useCurrencies'

const emit = defineEmits<{
  saved: []
}>()

const { createCurrency, updateCurrency } = useCurrencies()

const visible = ref(false)
const submitting = ref(false)
const editingCode = ref<string | null>(null)
const formRef = ref<FormInstance>()

const form = reactive({
  code: '',
  name: '',
  symbol: '',
  decimals: 0,
})

const rules = {
  code: [
    { required: true, message: 'Le code est requis', trigger: 'blur' },
    { max: 10, message: 'Maximum 10 caractères', trigger: 'blur' },
    { pattern: /^[A-Z]{3}$/, message: 'Le code doit être composé de 3 lettres majuscules', trigger: 'blur' },
  ],
  name: [
    { required: true, message: 'Le nom est requis', trigger: 'blur' },
  ],
  symbol: [
    { required: true, message: 'Le symbole est requis', trigger: 'blur' },
  ],
  decimals: [
    { required: true, message: 'Le nombre de décimales est requis', trigger: 'blur' },
  ],
}

function open(currency?: { code: string; name: string; symbol: string; decimals: number }) {
  editingCode.value = null
  form.code = ''
  form.name = ''
  form.symbol = ''
  form.decimals = 0
  if (currency) {
    editingCode.value = currency.code
    form.code = currency.code
    form.name = currency.name
    form.symbol = currency.symbol
    form.decimals = currency.decimals
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
    let result: CurrencyDto | null = null
    if (editingCode.value) {
      result = await updateCurrency(editingCode.value, { name: form.name, symbol: form.symbol, decimals: form.decimals })
      if (result) ElMessage.success('Devise modifiée')
    } else {
      result = await createCurrency({ code: form.code, name: form.name, symbol: form.symbol, decimals: form.decimals })
      if (result) ElMessage.success('Devise créée')
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
  editingCode.value = null
  formRef.value?.resetFields()
}

defineExpose({ open, close })
</script>
