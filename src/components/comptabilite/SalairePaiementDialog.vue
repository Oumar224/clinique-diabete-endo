<template>
  <el-dialog
    v-model="visible"
    class="cde-dialog"
    title="Payer le salaire"
    width="min(520px, 94vw)"
    append-to-body
    destroy-on-close
    :close-on-click-modal="false"
  >
    <div class="salaire-paiement">
      <div class="cde-summary-lines">
        <div class="cde-kv">
          <span class="cde-kv__label">Employé</span>
          <span class="cde-kv__value">{{ employeeLabel }}</span>
        </div>
        <div class="cde-kv">
          <span class="cde-kv__label">Période</span>
          <span class="cde-kv__value">{{ periode }}</span>
        </div>
        <div class="cde-kv">
          <span class="cde-kv__label">Net à payer</span>
          <span class="cde-kv__value cde-kv__value--strong">{{ formatCurrency(montantNet) }}</span>
        </div>
      </div>

      <el-alert
        v-if="!hasConfig"
        type="warning"
        :closable="false"
        show-icon
        title="Aucune configuration"
        description="Configurez le salaire de cet employé avant de le payer."
        style="margin-bottom: 16px"
      />

      <el-form
        label-position="top"
        @submit.prevent
      >
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
        <el-form-item label="Référence (optionnel)">
          <el-input
            v-model="reference"
            placeholder="N° de virement, reçu…"
            maxlength="120"
          />
        </el-form-item>
      </el-form>

      <p
        v-if="formError"
        class="salaire-paiement__error"
        role="alert"
      >
        {{ formError }}
      </p>
    </div>

    <template #footer>
      <el-button @click="visible = false">
        Annuler
      </el-button>
      <el-button
        type="primary"
        :loading="saving"
        :disabled="!hasConfig"
        @click="pay"
      >
        Confirmer le paiement
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { MODES_PAIEMENT, useSalaires } from '@/composables/useSalaires'
import type { ModePaiement, SalairePaieRow } from '@/composables/useSalaires'
import { useCurrency } from '@/currency/useCurrency'

const emit = defineEmits<{ paid: [] }>()
const { payer } = useSalaires()
const { formatCurrency } = useCurrency()

const visible = ref(false)
const saving = ref(false)
const formError = ref('')
const employeeLabel = ref('')
const periode = ref('')
const userId = ref(0)
const montantNet = ref(0)
const hasConfig = ref(false)
const modePaiement = ref<ModePaiement>('espèces')
const datePaiement = ref(todayIso())
const reference = ref('')

const canSubmit = computed(() => hasConfig.value && !!datePaiement.value && !saving.value)

function todayIso(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Ouvre le dialogue de paiement pour une ligne de paie. */
function open(row: SalairePaieRow, targetPeriode: string) {
  userId.value = row.userId
  periode.value = targetPeriode
  employeeLabel.value = `${row.prenom} ${row.nom}`.trim()
  montantNet.value = Number(row.montantNet ?? 0)
  hasConfig.value = row.config != null
  modePaiement.value = 'espèces'
  datePaiement.value = todayIso()
  reference.value = ''
  formError.value = ''
  visible.value = true
}

async function pay() {
  if (!canSubmit.value) {
    formError.value = 'Sélectionnez une date de paiement valide.'
    return
  }
  saving.value = true
  formError.value = ''
  try {
    await payer({
      userId: userId.value,
      periode: periode.value,
      modePaiement: modePaiement.value,
      datePaiement: datePaiement.value,
      reference: reference.value.trim() || undefined,
    })
    ElMessage.success(`Salaire payé : ${formatCurrency(montantNet.value)}`)
    visible.value = false
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
.salaire-paiement__error {
  margin: 0;
  color: var(--cd-alert-red);
  font-size: 13px;
}

</style>
