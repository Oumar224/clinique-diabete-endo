<template>
  <el-dialog
    v-model="visible"
    class="cde-dialog"
    title="Encaisser un paiement"
    width="520px"
    :close-on-click-modal="false"
    @closed="onClosed"
  >
    <div
      v-if="vente"
      class="cde-summary-lines"
    >
      <div class="cde-kv">
        <span class="cde-kv__label">Patient</span>
        <span class="cde-kv__value">{{ patientLabel }}</span>
      </div>
      <div class="cde-kv">
        <span class="cde-kv__label">Vente</span>
        <span class="cde-kv__value">#{{ vente.id }}<template v-if="vente.dateVente"> — {{ formatDate(vente.dateVente) }}</template></span>
      </div>
      <div class="cde-kv">
        <span class="cde-kv__label">Total</span>
        <span class="cde-kv__value">{{ formatCurrency(vente.montantTotal) }}</span>
      </div>
      <div class="cde-kv">
        <span class="cde-kv__label">Déjà payé</span>
        <span class="cde-kv__value">{{ formatCurrency(vente.montantPaye) }}</span>
      </div>
      <div class="cde-kv">
        <span class="cde-kv__label">Reste à payer</span>
        <span class="cde-kv__value cde-kv__value--strong cde-danger">{{ formatCurrency(vente.reste) }}</span>
      </div>
    </div>

    <el-alert
      v-if="submitError"
      type="error"
      :closable="false"
      show-icon
      :title="submitError"
      class="cde-alert cde-alert--danger"
    />

    <el-form
      v-if="vente && maxMontant > 0"
      label-position="top"
      @submit.prevent
    >
      <el-form-item
        label="Montant encaissé (GNF)"
        required
        :error="montantError"
      >
        <el-input-number
          v-model="montant"
          :min="1"
          :max="maxMontant"
          :step="1000"
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
            v-for="mode in modes"
            :key="mode.value"
            :label="mode.label"
            :value="mode.value"
          />
        </el-select>
      </el-form-item>
      <el-form-item
        label="Date du paiement"
        required
      >
        <el-date-picker
          v-model="datePaiement"
          type="date"
          value-format="YYYY-MM-DD"
          :clearable="false"
          style="width: 100%"
        />
      </el-form-item>
      <el-form-item label="Référence (optionnel)">
        <el-input
          v-model="reference"
          maxlength="80"
          placeholder="N° de transaction, chèque…"
        />
      </el-form-item>
    </el-form>

    <div
      v-else-if="vente && maxMontant === 0"
      class="cde-empty"
    >
      Cette vente est entièrement réglée.
    </div>

    <template #footer>
      <el-button @click="visible = false">
        Annuler
      </el-button>
      <el-button
        type="primary"
        :loading="saving"
        :disabled="!canSubmit"
        @click="submit"
      >
        Encaisser
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { useCurrency } from '@/currency/useCurrency'
import { useAuth } from '@/composables/useAuth'
import { formatDate } from '@/utils/date'
import {
  MODES_PAIEMENT,
  usePharmacieComptabilite,
  type ModePaiement,
  type VentePharmacieDto,
} from '@/composables/usePharmacieComptabilite'

const emit = defineEmits<{
  saved: [vente: VentePharmacieDto]
}>()

const { formatCurrency } = useCurrency()
const { user } = useAuth()
const { encaisser, saving } = usePharmacieComptabilite()

const modes = MODES_PAIEMENT

const visible = ref(false)
const vente = ref<VentePharmacieDto | null>(null)
const montant = ref(0)
const modePaiement = ref<ModePaiement>('espèces')
const datePaiement = ref(new Date().toISOString().slice(0, 10))
const reference = ref('')
const submitError = ref('')

const patientLabel = computed(() => {
  const p = vente.value?.patient
  if (!p) return 'Patient non renseigné'
  return `${p.prenom ?? ''} ${p.nom ?? ''}`.trim() || 'Patient non renseigné'
})

const maxMontant = computed(() => Math.max(0, vente.value?.reste ?? 0))

/** Message de validation du montant saisi (null si le montant est valide). */
const montantError = computed(() => {
  if (vente.value == null) return undefined
  if (montant.value == null || Number.isNaN(montant.value)) return 'Saisissez un montant.'
  if (montant.value <= 0) return 'Le montant doit être supérieur à 0.'
  if (montant.value > maxMontant.value) return 'Le montant ne peut pas dépasser le reste dû.'
  return undefined
})

const canSubmit = computed(() =>
  vente.value != null
  && montant.value > 0
  && montant.value <= maxMontant.value
  && !!datePaiement.value
  && !!modePaiement.value,
)

/**
 * Ouvre le dialogue pour une vente à crédit ou partiellement payée.
 *
 * @param target - Vente à encaisser.
 */
function open(target: VentePharmacieDto) {
  vente.value = target
  montant.value = Math.max(0, target.reste)
  modePaiement.value = 'espèces'
  datePaiement.value = new Date().toISOString().slice(0, 10)
  reference.value = ''
  submitError.value = ''
  visible.value = true
}

/** Enregistre l'encaissement via `dispensation:encaisser`. */
async function submit() {
  if (!vente.value || !canSubmit.value) return
  submitError.value = ''
  try {
    const result = await encaisser({
      delivranceId: vente.value.id,
      montant: Math.round(montant.value),
      modePaiement: modePaiement.value,
      datePaiement: datePaiement.value,
      reference: reference.value.trim() || undefined,
      createdBy: user.value?.id,
    })
    ElMessage.success('Paiement enregistré')
    emit('saved', result)
    visible.value = false
  } catch (e) {
    submitError.value = (e as Error).message || "L'encaissement a échoué."
  }
}

function onClosed() {
  vente.value = null
  montant.value = 0
  reference.value = ''
  submitError.value = ''
}

defineExpose({ open })
</script>

