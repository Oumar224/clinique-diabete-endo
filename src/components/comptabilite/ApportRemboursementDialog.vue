<template>
  <el-dialog
    v-model="visible"
    title="Rembourser la dette"
    width="520px"
    :close-on-click-modal="false"
    @closed="onClosed"
  >
    <div
      v-if="apport"
      class="cde-summary-lines remboursement__meta"
    >
      <div class="cde-kv">
        <span class="cde-kv__label">Référence</span>
        <span class="cde-kv__value">{{ apport.reference || `#${apport.id}` }}</span>
      </div>
      <div class="cde-kv">
        <span class="cde-kv__label">Libellé</span>
        <span class="cde-kv__value">{{ apport.libelle || '—' }}</span>
      </div>
      <div class="cde-kv">
        <span class="cde-kv__label">Montant de la dette</span>
        <span class="cde-kv__value">{{ formatMontant(apport.montant) }} GNF</span>
      </div>
      <div class="cde-kv">
        <span class="cde-kv__label">Déjà remboursé</span>
        <span class="cde-kv__value">{{ formatMontant(apport.montantRembourse ?? 0) }} GNF</span>
      </div>
      <div class="cde-kv">
        <span class="cde-kv__label">Reste dû</span>
        <span class="cde-kv__value cde-kv__value--strong cde-danger">{{ formatMontant(reste) }} GNF</span>
      </div>
    </div>

    <el-alert
      v-if="submitError"
      class="cde-alert cde-alert--danger"
      type="error"
      :closable="false"
      show-icon
      :title="submitError"
    />

    <el-form
      v-if="apport && reste > 0"
      label-position="top"
      @submit.prevent
    >
      <el-form-item
        label="Montant remboursé (GNF)"
        required
      >
        <el-input-number
          v-model="montant"
          :min="1"
          :max="reste"
          :step="1000"
          :precision="0"
          controls-position="right"
          style="width: 100%"
        />
      </el-form-item>
      <el-row :gutter="12">
        <el-col
          :xs="24"
          :sm="12"
        >
          <el-form-item
            label="Date"
            required
          >
            <el-date-picker
              v-model="dateRemboursement"
              type="date"
              value-format="YYYY-MM-DD"
              :clearable="false"
              style="width: 100%"
            />
          </el-form-item>
        </el-col>
        <el-col
          :xs="24"
          :sm="12"
        >
          <el-form-item label="Mode de paiement">
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
        </el-col>
      </el-row>
      <el-form-item label="Référence du paiement">
        <el-input
          v-model="reference"
          maxlength="80"
          placeholder="N° de transaction, chèque…"
        />
      </el-form-item>
      <el-form-item label="Notes">
        <el-input
          v-model="notes"
          type="textarea"
          :rows="2"
          maxlength="300"
          show-word-limit
        />
      </el-form-item>
    </el-form>

    <div
      v-else-if="apport"
      class="cde-empty"
    >
      Cette dette est entièrement remboursée.
    </div>

    <template #footer>
      <el-button @click="visible = false">
        Annuler
      </el-button>
      <el-button
        v-if="apport && reste > 0"
        type="primary"
        :loading="saving"
        :disabled="!canSubmit"
        @click="submit"
      >
        Rembourser
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { formatMontant } from '@/components/comptabilite/format'
import { MODES_PAIEMENT, type ModePaiement } from '@/composables/useSalaires'
import { useApports, type ApportDto } from '@/composables/useApports'

const emit = defineEmits<{
  saved: [apport: ApportDto]
}>()

const { rembourserApport, saving, error } = useApports()

const visible = ref(false)
const apport = ref<ApportDto | null>(null)
const montant = ref(0)
const dateRemboursement = ref(todayIso())
const modePaiement = ref<ModePaiement>('espèces')
const reference = ref('')
const notes = ref('')
const submitError = ref('')

const reste = computed(() => Math.max(0, apport.value?.resteARembourser ?? 0))

const canSubmit = computed(() =>
  apport.value != null
  && montant.value > 0
  && montant.value <= reste.value
  && !!dateRemboursement.value,
)

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

/**
 * Ouvre le dialogue de remboursement.
 *
 * @param target - Dette à rembourser.
 */
function open(target: ApportDto) {
  apport.value = target
  montant.value = Math.max(0, target.resteARembourser ?? 0)
  dateRemboursement.value = todayIso()
  modePaiement.value = 'espèces'
  reference.value = ''
  notes.value = ''
  submitError.value = ''
  visible.value = true
}

/** Enregistre le remboursement. */
async function submit() {
  if (apport.value?.id == null || !canSubmit.value) return
  submitError.value = ''
  const updated = await rembourserApport(apport.value.id, {
    montant: Math.trunc(montant.value),
    dateRemboursement: dateRemboursement.value,
    modePaiement: modePaiement.value,
    reference: reference.value.trim() || null,
    notes: notes.value.trim() || null,
  })
  if (!updated) {
    submitError.value = error.value || 'Remboursement impossible.'
    return
  }
  ElMessage.success('Remboursement enregistré')
  emit('saved', updated)
  visible.value = false
}

function onClosed() {
  apport.value = null
  montant.value = 0
  reference.value = ''
  notes.value = ''
  submitError.value = ''
}

defineExpose({ open })
</script>

<style scoped>
.remboursement__meta {
  margin-bottom: 10px;
}
</style>
