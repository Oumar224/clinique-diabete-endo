<template>
  <el-dialog
    v-model="visible"
    title="Ajustement de stock"
    width="480px"
    :close-on-click-modal="false"
    @closed="onClosed"
  >
    <el-form
      ref="formRef"
      :model="form"
      :rules="rules"
      label-position="top"
    >
      <el-form-item label="Article">
        <el-input :model-value="articleLabel" disabled />
      </el-form-item>
      <el-form-item :label="lotLabel" prop="lotId">
        <el-select v-model="form.lotId" clearable placeholder="Stock global" style="width:100%">
          <el-option
            v-for="lot in lots"
            :key="lot.id ?? lot.numeroLot"
            :label="`Lot ${lot.numeroLot ?? lot.id} — ${lot.quantite ?? 0}`"
            :value="lot.id!"
          />
        </el-select>
        <div v-if="activeLots.length > 1" class="ajustement-dialog__hint">Plusieurs lots actifs : choisissez le lot à ajuster.</div>
      </el-form-item>
      <el-form-item label="Quantité constatée" prop="quantiteNouvelle">
        <el-input-number v-model="form.quantiteNouvelle" :min="0" style="width:100%" />
      </el-form-item>
      <el-form-item label="Motif" prop="motif">
        <el-input v-model="form.motif" type="textarea" :rows="2" placeholder="Motif obligatoire (inventaire, erreur de saisie...)" maxlength="500" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="visible = false">Annuler</el-button>
      <el-button type="primary" :loading="submitting" :disabled="activeLots.length === 0 || (activeLots.length > 1 && form.lotId == null)" @click="submit">Confirmer</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { ElMessage } from 'element-plus'
import type { FormInstance } from 'element-plus'
import { useStock, type StockLotDto } from '@/composables/useStock'
import { useAuth } from '@/composables/useAuth'

const emit = defineEmits<{
  saved: []
}>()

const { ajustementStock } = useStock()
const { user } = useAuth()

const visible = ref(false)
const submitting = ref(false)
const medicamentId = ref<number | null>(null)
const articleLabel = ref('')
const lots = ref<StockLotDto[]>([])
const formRef = ref<FormInstance>()

const form = reactive({
  lotId: null as number | null,
  quantiteNouvelle: 0 as number | null,
  motif: '',
})

const rules = {
  lotId: [{
    validator: (_rule: unknown, value: unknown, callback: (error?: Error) => void) => {
      if (activeLots.value.length > 1 && value == null) callback(new Error('Choisissez le lot à ajuster'))
      else callback()
    },
    trigger: 'change',
  }],
  quantiteNouvelle: [{ required: true, message: 'La quantité constatée est requise', trigger: 'change' }],
  motif: [{ required: true, message: 'Le motif est requis', trigger: 'blur' }],
}

const activeLots = computed(() => lots.value.filter(l => (l.quantite ?? 0) > 0))

const lotLabel = computed(() =>
  lots.value.length === 0
    ? 'Lot (aucun lot)'
    : lots.value.length === 1
      ? 'Lot (vide = ce lot unique)'
      : 'Lot (requis, plusieurs lots)',
)

function open(params: { medicamentId: number; label: string; lots: StockLotDto[] }) {
  medicamentId.value = params.medicamentId
  articleLabel.value = params.label
  lots.value = params.lots
  form.lotId = null
  form.quantiteNouvelle = 0
  form.motif = ''
  visible.value = true
}

function close() {
  visible.value = false
}

async function submit() {
  if (!formRef.value || medicamentId.value == null) return
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid || form.quantiteNouvelle == null || !form.motif.trim()) return
  submitting.value = true
  try {
    const lot = await ajustementStock({
      medicamentId: medicamentId.value,
      lotId: form.lotId ?? undefined,
      quantiteNouvelle: form.quantiteNouvelle,
      motif: form.motif.trim(),
      userId: user.value?.id,
    })
    if (lot) {
      ElMessage.success('Ajustement enregistré')
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
.ajustement-dialog__hint {
  font-size: 11px;
  color: var(--el-text-color-secondary);
  margin-top: 4px;
}
</style>
