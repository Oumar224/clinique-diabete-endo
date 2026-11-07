<template>
  <el-dialog
    v-model="visible"
    class="cde-dialog"
    title="Payer les salaires en masse"
    width="min(600px, 94vw)"
    append-to-body
    destroy-on-close
    :close-on-click-modal="false"
  >
    <div class="paiement-bulk">
      <div class="cde-summary-lines">
        <div class="cde-kv">
          <span class="cde-kv__label">Employés à payer</span>
          <span class="cde-kv__value">{{ unpaidRows.length }}</span>
        </div>
        <div class="cde-kv">
          <span class="cde-kv__label">Total des nets</span>
          <span class="cde-kv__value cde-kv__value--strong">{{ formatCurrency(totalNets) }}</span>
        </div>
        <div class="cde-kv">
          <span class="cde-kv__label">Période</span>
          <span class="cde-kv__value">{{ periode }}</span>
        </div>
      </div>

      <el-alert
        v-if="unpaidRows.length === 0"
        type="info"
        :closable="false"
        show-icon
        title="Tous les salaires de cette période sont déjà payés."
        style="margin-bottom: 16px"
      />

      <el-form
        label-position="top"
        @submit.prevent
      >
        <el-form-item
          label="Budget disponible (GNF)"
          required
        >
          <el-input-number
            v-model="montantDisponible"
            :min="0"
            :step="5000"
            :precision="0"
            controls-position="right"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item
          label="Mode de paiement"
          required
        >
          <el-select
            v-model="modePaiement"
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
        <el-form-item
          label="Date de paiement"
          required
        >
          <el-date-picker
            v-model="datePaiement"
            type="date"
            value-format="YYYY-MM-DD"
            style="width: 100%"
          />
        </el-form-item>
      </el-form>

      <el-alert
        v-if="result"
        :type="result.paid > 0 ? 'success' : 'warning'"
        :closable="false"
        show-icon
        :title="`${result.paid} salaire(s) payé(s) — ${formatCurrency(result.totalPaye)}`"
      >
        <template #default>
          <p class="paiement-bulk__result">
            {{ result.skipped }} non payé(s) faute de budget. Reste : {{ formatCurrency(result.reste) }}.
          </p>
        </template>
      </el-alert>

      <p
        v-if="formError"
        class="paiement-bulk__error"
        role="alert"
      >
        {{ formError }}
      </p>
    </div>

    <template #footer>
      <el-button @click="visible = false">
        {{ result ? 'Fermer' : 'Annuler' }}
      </el-button>
      <el-button
        type="primary"
        :loading="saving"
        :disabled="unpaidRows.length === 0 || !!result"
        @click="pay"
      >
        Lancer les paiements
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { MODES_PAIEMENT, useSalaires } from '@/composables/useSalaires'
import type { ModePaiement, PayerBulkResult, SalairePaieRow } from '@/composables/useSalaires'
import { useCurrency } from '@/currency/useCurrency'

const emit = defineEmits<{ paid: [] }>()
const { payerBulk } = useSalaires()
const { formatCurrency } = useCurrency()

const visible = ref(false)
const saving = ref(false)
const formError = ref('')
const periode = ref('')
const rows = ref<SalairePaieRow[]>([])
const montantDisponible = ref(0)
const modePaiement = ref<ModePaiement>('espèces')
const datePaiement = ref(todayIso())
const result = ref<PayerBulkResult | null>(null)

const unpaidRows = computed(() => rows.value.filter((row) => !row.paye && row.config != null))
const totalNets = computed(() => unpaidRows.value.reduce((sum, row) => sum + Number(row.montantNet ?? 0), 0))

function todayIso(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Ouvre le dialogue avec les lignes de paie de la période. */
function open(targetPeriode: string, paieRows: SalairePaieRow[]) {
  periode.value = targetPeriode
  rows.value = paieRows
  montantDisponible.value = paieRows.reduce(
    (sum, row) => sum + (row.paye || row.config == null ? 0 : Number(row.montantNet ?? 0)),
    0,
  )
  modePaiement.value = 'espèces'
  datePaiement.value = todayIso()
  result.value = null
  formError.value = ''
  visible.value = true
}

async function pay() {
  if (!datePaiement.value) {
    formError.value = 'Sélectionnez une date de paiement valide.'
    return
  }
  if (!Number.isFinite(montantDisponible.value) || montantDisponible.value < 0) {
    formError.value = 'Le budget doit être un montant positif.'
    return
  }

  saving.value = true
  formError.value = ''
  try {
    result.value = await payerBulk({
      periode: periode.value,
      montantDisponible: Math.round(montantDisponible.value),
      modePaiement: modePaiement.value,
      datePaiement: datePaiement.value,
    })
    ElMessage.success(`${result.value.paid} salaire(s) payé(s)`)
    emit('paid')
  } catch {
    // ipcInvoke affiche déjà l'erreur backend.
  } finally {
    saving.value = false
  }
}

defineExpose({ open })
</script>

<style scoped>
.paiement-bulk__result {
  margin: 4px 0 0;
  font-size: 12px;
}

.paiement-bulk__error {
  margin: 12px 0 0;
  color: var(--cd-alert-red);
  font-size: 13px;
}

</style>
