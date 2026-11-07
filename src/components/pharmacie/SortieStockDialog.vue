<template>
  <el-dialog
    v-model="visible"
    title="Sortie manuelle de stock"
    width="480px"
    :close-on-click-modal="false"
    @closed="onClosed"
  >
    <el-form
      v-if="stockTotal > 0"
      ref="formRef"
      :model="form"
      :rules="rules"
      label-position="top"
    >
      <el-form-item label="Article">
        <el-input :model-value="`${articleLabel} (stock : ${stockTotal})`" disabled />
      </el-form-item>
      <el-form-item label="Quantité" prop="quantite">
        <el-input-number v-model="form.quantite" :min="1" :max="stockTotal" :step="1" :precision="0" style="width:100%" />
        <div class="sortie-dialog__hint">Quantité entière requise ≥1 (les décimaux sont refusés)</div>
      </el-form-item>
      <el-form-item label="Motif" prop="motif">
        <el-input v-model="form.motif" type="textarea" :rows="2" placeholder="Motif obligatoire (casse, don, périmé...)" maxlength="500" />
      </el-form-item>
    </el-form>
    <div v-else class="cde-empty">
      Aucun stock disponible pour cet article.
    </div>
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
import { useStock } from '@/composables/useStock'
import { useAuth } from '@/composables/useAuth'

const emit = defineEmits<{
  saved: []
}>()

const { sortieManuelle } = useStock()
const { user } = useAuth()

const visible = ref(false)
const submitting = ref(false)
const medicamentId = ref<number | null>(null)
const articleLabel = ref('')
const stockTotal = ref(0)
const formRef = ref<FormInstance>()

const form = reactive({
  quantite: 1 as number | null,
  motif: '',
})

const rules = {
  quantite: [
    { required: true, message: 'La quantité est requise', trigger: 'change' },
    {
      validator: (_rule: unknown, value: unknown, callback: (error?: Error) => void) => {
        if (value == null) return callback()
        if (typeof value !== 'number' || !Number.isInteger(value) || value < 1 || value > stockTotal.value) {
          if (typeof value === 'number' && (!Number.isInteger(value) || value < 1)) {
            return callback(new Error('Quantité entière ≥ 1 requise'))
          }
          return callback(new Error('Quantité > stock disponible'))
        }
        callback()
      },
      trigger: 'change',
    },
  ],
  motif: [{ required: true, message: 'Le motif est requis', trigger: 'blur' }],
}

function open(params: { medicamentId: number; label: string; stockTotal: number }) {
  if (params.stockTotal <= 0) return
  medicamentId.value = params.medicamentId
  articleLabel.value = params.label
  stockTotal.value = params.stockTotal
  form.quantite = 1
  form.motif = ''
  visible.value = true
}

function close() {
  visible.value = false
}

async function submit() {
  if (!formRef.value || medicamentId.value == null) return
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid || form.quantite == null || !form.motif.trim()) return
  submitting.value = true
  try {
    const ok = await sortieManuelle({
      medicamentId: medicamentId.value,
      quantite: form.quantite,
      motif: form.motif.trim(),
      userId: user.value?.id,
    })
    if (ok) {
      ElMessage.success('Sortie de stock enregistrée')
      emit('saved')
      visible.value = false
    }
  } finally {
    submitting.value = false
  }
}

function onClosed() {
  medicamentId.value = null
  formRef.value?.resetFields()
}

defineExpose({ open, close })
</script>

<style scoped>
.sortie-dialog__hint {
  font-size: 11px;
  color: var(--el-text-color-secondary);
  margin-top: 4px;
}
</style>
