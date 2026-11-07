<template>
  <el-dialog
    v-model="visible"
    class="cde-dialog"
    title="Marquer la dépense comme payée"
    width="min(480px, 94vw)"
    append-to-body
    destroy-on-close
    :close-on-click-modal="false"
  >
    <div class="depense-paiement">
      <div class="cde-summary-lines">
        <div class="cde-kv">
          <span class="cde-kv__label">Dépense</span>
          <span class="cde-kv__value">{{ libelle }}</span>
        </div>
        <div class="cde-kv">
          <span class="cde-kv__label">Montant</span>
          <span class="cde-kv__value cde-kv__value--strong">{{ formatCurrency(montant) }}</span>
        </div>
      </div>

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
      </el-form>

      <p
        v-if="formError"
        class="depense-paiement__error"
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
        @click="confirm"
      >
        Confirmer
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { useDepenses } from '@/composables/useDepenses'
import type { Depense } from '@/composables/useDepenses'
import { MODES_PAIEMENT } from '@/composables/useSalaires'
import type { ModePaiement } from '@/composables/useSalaires'
import { useCurrency } from '@/currency/useCurrency'

const emit = defineEmits<{ paid: [] }>()
const { marquerPayee } = useDepenses()
const { formatCurrency } = useCurrency()

const visible = ref(false)
const saving = ref(false)
const formError = ref('')
const depenseId = ref<number | null>(null)
const libelle = ref('')
const montant = ref(0)
const modePaiement = ref<ModePaiement>('espèces')
const datePaiement = ref(todayIso())

function todayIso(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Ouvre le dialogue pour une dépense à crédit. */
function open(depense: Depense) {
  depenseId.value = depense.id ?? null
  libelle.value = depense.libelle ?? ''
  montant.value = Number(depense.montant ?? 0)
  modePaiement.value = 'espèces'
  datePaiement.value = todayIso()
  formError.value = ''
  visible.value = true
}

async function confirm() {
  if (depenseId.value == null) return
  if (!datePaiement.value) {
    formError.value = 'Sélectionnez une date de paiement valide.'
    return
  }

  saving.value = true
  formError.value = ''
  try {
    await marquerPayee(depenseId.value, {
      modePaiement: modePaiement.value,
      datePaiement: datePaiement.value,
    })
    ElMessage.success('Dépense marquée comme payée')
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
.depense-paiement__error {
  margin: 0;
  color: var(--cd-alert-red);
  font-size: 13px;
}
</style>
