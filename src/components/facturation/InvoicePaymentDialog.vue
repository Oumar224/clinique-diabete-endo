<template>
  <el-dialog v-model="visible" title="Ajouter un paiement" width="500px">
    <div v-if="invoice" class="payment-info">
      <div class="payment-info__row">
        <span class="payment-info__label">Facture :</span>
        <span class="payment-info__value">{{ invoice.numero }}</span>
      </div>
      <div class="payment-info__row">
        <span class="payment-info__label">Patient :</span>
        <span class="payment-info__value">{{ invoice.patient_prenom }} {{ invoice.patient_nom }}</span>
      </div>
      <div class="payment-info__row">
        <span class="payment-info__label">Total :</span>
        <span class="payment-info__value">{{ formatCurrency(invoice.montant_total) }}</span>
      </div>
      <div class="payment-info__row">
        <span class="payment-info__label">Restant :</span>
        <span class="payment-info__value payment-info__value--danger">{{ formatCurrency(invoice.montant_restant) }}</span>
      </div>
    </div>

    <el-form ref="formRef" :model="form" :rules="rules" label-width="120px" style="margin-top:16px">
      <el-form-item label="Montant" prop="montant">
        <el-input-number v-model="form.montant" :min="1" :max="invoice?.montant_restant || 0" style="width:100%" />
      </el-form-item>
      <el-form-item label="Mode" prop="mode_paiement">
        <el-select v-model="form.mode_paiement" style="width:100%">
          <el-option label="Espèces" value="espèces" />
          <el-option label="Carte bancaire" value="carte_bancaire" />
          <el-option label="Chèque" value="chèque" />
          <el-option label="Virement" value="virement" />
          <el-option label="Autre" value="autre" />
        </el-select>
      </el-form-item>
      <el-form-item label="Date" prop="date_paiement">
        <el-date-picker v-model="form.date_paiement" type="date" value-format="YYYY-MM-DD" style="width:100%" />
      </el-form-item>
      <el-form-item label="Référence">
        <el-input v-model="form.reference" placeholder="N° chèque, ref virement..." />
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button @click="visible = false">Annuler</el-button>
      <el-button type="primary" :loading="saving" @click="submit">Enregistrer le paiement</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { ElMessage } from 'element-plus'
import { useCurrency } from '@/currency/useCurrency'
import type { Invoice, InvoicePayment } from '@/composables/useInvoices'

const emit = defineEmits<{ paid: [] }>()

const { formatCurrency } = useCurrency()

const visible = ref(false)
const saving = ref(false)
const formRef = ref<any>(null)
const invoice = ref<Invoice | null>(null)

const form = reactive({
  montant: 0,
  mode_paiement: 'espèces' as InvoicePayment['mode_paiement'],
  date_paiement: new Date().toISOString().slice(0, 10),
  reference: '',
})

const rules = {
  montant: [{ required: true, type: 'number', min: 1, message: 'Montant invalide', trigger: 'blur' }],
  mode_paiement: [{ required: true, message: 'Sélectionnez un mode de paiement', trigger: 'change' }],
  date_paiement: [{ required: true, message: 'Sélectionnez une date', trigger: 'change' }],
}

async function submit() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid || !invoice.value?.id) return

  saving.value = true
  try {
    if (window.electronAPI) {
      const result = await window.electronAPI.invoke('invoices:add-payment', {
        invoice_id: invoice.value.id,
        montant: form.montant,
        mode_paiement: form.mode_paiement,
        date_paiement: form.date_paiement,
        reference: form.reference || undefined,
      }) as { success: boolean; data: any }
      if (result.success) {
        ElMessage.success('Paiement enregistré')
        visible.value = false
        emit('paid')
      }
    }
  } catch (e) {
    ElMessage.error((e as Error).message)
  } finally {
    saving.value = false
  }
}

function open(inv: Invoice) {
  invoice.value = inv
  form.montant = inv.montant_restant
  form.mode_paiement = 'espèces'
  form.date_paiement = new Date().toISOString().slice(0, 10)
  form.reference = ''
  visible.value = true
}

defineExpose({ open })
</script>

<style scoped>
.payment-info {
  background: var(--cd-gray-50);
  border-radius: 8px;
  padding: 12px 16px;
}

.payment-info__row {
  display: flex;
  justify-content: space-between;
  padding: 4px 0;
  font-size: 14px;
}

.payment-info__label {
  color: var(--cd-gray-400);
}

.payment-info__value {
  font-weight: 600;
}

.payment-info__value--danger {
  color: var(--cd-secondary);
}
</style>
