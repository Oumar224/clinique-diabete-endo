<template>
  <el-dialog
    v-model="visible"
    class="cde-dialog"
    title="Ajouter un paiement"
    width="540px"
    @closed="resetResult"
  >
    <div
      v-if="invoice"
      class="cde-summary-lines"
    >
      <div class="cde-kv">
        <span class="cde-kv__label">Facture</span>
        <span class="cde-kv__value">{{ invoice.numero }}</span>
      </div>
      <div class="cde-kv">
        <span class="cde-kv__label">Patient</span>
        <span class="cde-kv__value">{{ invoice.patient_prenom }} {{ invoice.patient_nom }}</span>
      </div>
      <div class="cde-kv">
        <span class="cde-kv__label">Total</span>
        <span class="cde-kv__value">{{ formatCurrency(invoice.montant_total) }}</span>
      </div>
      <div
        v-if="invoice.assurance_nom"
        class="cde-kv"
      >
        <span class="cde-kv__label">Assurance</span>
        <span class="cde-kv__value">{{ invoice.assurance_nom }} — part patient {{ formatCurrency(invoice.part_patient ?? invoice.montant_total) }}</span>
      </div>
      <div class="cde-kv">
        <span class="cde-kv__label">Restant</span>
        <span class="cde-kv__value cde-kv__value--strong cde-danger">{{ formatCurrency(invoice.montant_restant) }}</span>
      </div>
    </div>

    <div
      v-if="lastRecu"
      class="recu-success"
    >
      <el-alert
        type="success"
        :closable="false"
        show-icon
      >
        <template #title>
          Reçu {{ lastRecu.numero_recu }} enregistré — {{ formatCurrency(lastRecu.montant) }}
        </template>
      </el-alert>
      <div class="recu-success__actions">
        <el-button
          type="primary"
          :icon="Printer"
          @click="printRecu"
        >
          Imprimer le reçu {{ lastRecu.numero_recu }}
        </el-button>
        <el-button
          :icon="Download"
          @click="downloadRecuPdf"
        >
          Télécharger PDF
        </el-button>
      </div>
    </div>

    <el-form
      v-if="!lastRecu && canPay"
      ref="formRef"
      :model="form"
      :rules="rules"
      label-width="120px"
      style="margin-top:16px"
    >
      <el-form-item
        label="Montant"
        prop="montant"
      >
        <el-input-number
          v-model="form.montant"
          :min="1"
          :max="invoice?.montant_restant || 0"
          :precision="0"
          style="width:100%"
        />
      </el-form-item>
      <el-form-item
        label="Mode"
        prop="mode_paiement"
      >
        <el-select
          v-model="form.mode_paiement"
          style="width:100%"
        >
          <el-option
            label="Espèces"
            value="espèces"
          />
          <el-option
            label="Mobile Money"
            value="mobile_money"
          />
          <el-option
            label="Carte bancaire"
            value="carte_bancaire"
          />
          <el-option
            label="Chèque"
            value="chèque"
          />
          <el-option
            label="Virement"
            value="virement"
          />
          <el-option
            label="Assurance"
            value="assurance"
          />
          <el-option
            label="Autre"
            value="autre"
          />
        </el-select>
      </el-form-item>
      <el-form-item
        label="Date"
        prop="date_paiement"
      >
        <el-date-picker
          v-model="form.date_paiement"
          type="date"
          value-format="YYYY-MM-DD"
          style="width:100%"
        />
      </el-form-item>
      <el-form-item label="Référence">
        <el-input
          v-model="form.reference"
          placeholder="N° chèque, ref virement, ref Mobile Money..."
        />
      </el-form-item>
    </el-form>

    <div
      v-else-if="!lastRecu && invoice?.status === 'annulé'"
      class="cde-empty"
    >
      Cette facture est annulée.
    </div>
    <div
      v-else-if="!lastRecu && invoice"
      class="cde-empty"
    >
      Cette facture est entièrement réglée.
    </div>

    <template #footer>
      <el-button @click="visible = false">
        Fermer
      </el-button>
      <el-button
        v-if="!lastRecu && canPay"
        type="primary"
        :loading="saving"
        @click="submit"
      >
        Enregistrer le paiement
      </el-button>
    </template>

    <ReceiptPrintView ref="receiptRef" />
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, ref, reactive } from 'vue'
import { ElMessage } from 'element-plus'
import { Printer, Download } from '@element-plus/icons-vue'
import { useCurrency } from '@/currency/useCurrency'
import { useExport } from '@/composables/useExport'
import type { Invoice, InvoicePayment } from '@/composables/useInvoices'
import ReceiptPrintView from '@/components/comptabilite/ReceiptPrintView.vue'

const emit = defineEmits<{ paid: [] }>()

const { formatCurrency } = useCurrency()
const { exportReceiptPdf } = useExport()

const visible = ref(false)
const saving = ref(false)
const formRef = ref<any>(null)
const receiptRef = ref<InstanceType<typeof ReceiptPrintView> | null>(null)
const invoice = ref<Invoice | null>(null)
const lastRecu = ref<InvoicePayment | null>(null)

const form = reactive({
  montant: 0,
  mode_paiement: 'espèces' as InvoicePayment['mode_paiement'],
  date_paiement: new Date().toISOString().slice(0, 10),
  reference: '',
})

const canPay = computed(() =>
  invoice.value != null
  && invoice.value.status !== 'annulé'
  && (invoice.value.montant_restant ?? 0) >= 1,
)

const rules = {
  montant: [{ required: true, type: 'number', min: 1, message: 'Montant invalide', trigger: 'blur' }],
  mode_paiement: [{ required: true, message: 'Sélectionnez un mode de paiement', trigger: 'change' }],
  date_paiement: [{ required: true, message: 'Sélectionnez une date', trigger: 'change' }],
}

function resetResult() {
  lastRecu.value = null
  invoice.value = null
  form.montant = 0
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
      }) as { success: boolean; data: Invoice }
      if (result.success) {
        const payments = result.data.payments ?? []
        lastRecu.value = payments[payments.length - 1] ?? null
        ElMessage.success(`Paiement enregistré — Reçu ${lastRecu.value?.numero_recu ?? ''}`)
        invoice.value = result.data
        emit('paid')
      }
    }
  } catch (e) {
    ElMessage.error((e as Error).message)
  } finally {
    saving.value = false
  }
}

async function printRecu() {
  if (!lastRecu.value) return
  await receiptRef.value?.openByPayment(lastRecu.value.id!)
}

async function downloadRecuPdf() {
  if (!lastRecu.value) return
  if (lastRecu.value.id) await exportReceiptPdf({ payment_id: lastRecu.value.id })
  else if (lastRecu.value.numero_recu) await exportReceiptPdf({ numero_recu: lastRecu.value.numero_recu })
}

function open(inv: Invoice) {
  invoice.value = inv
  lastRecu.value = null
  form.montant = Math.max(0, Math.floor(inv.montant_restant ?? 0))
  form.mode_paiement = 'espèces'
  form.date_paiement = new Date().toISOString().slice(0, 10)
  form.reference = ''
  visible.value = true
}

defineExpose({ open })
</script>

<style scoped>
.recu-success {
  margin-top: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.recu-success__actions {
  display: flex;
  gap: 8px;
}
</style>
