<template>
  <el-dialog
    v-model="visible"
    class="cde-dialog"
    :title="isEdit ? 'Modifier la facture' : 'Nouvelle facture'"
    width="760px"
    @closed="resetForm"
  >
    <div
      v-if="isEdit"
      class="invoice-edit-context"
    >
      <span class="invoice-edit-context__ref">{{ editingNumero || 'Facture' }}</span>
      <span class="invoice-edit-context__patient">{{ editingPatient }}</span>
      <span class="invoice-edit-context__hint">Modifiable tant qu’aucun paiement n’a été encaissé.</span>
    </div>

    <el-form
      ref="formRef"
      :model="form"
      :rules="rules"
      label-width="130px"
    >
      <el-form-item
        v-if="contextPatientId == null && !isEdit"
        label="Patient"
        prop="patient_id"
      >
        <el-select
          v-model="form.patient_id"
          filterable
          remote
          :remote-method="searchPatients"
          :loading="searching"
          placeholder="Rechercher un patient..."
          style="width: 100%"
          @visible-change="onPatientDropdown"
        >
          <el-option
            v-for="p in patientOptions"
            :key="p.id"
            :label="`${getCiviliteLabel(p.civilite)} ${p.prenom} ${p.nom} — ${p.nir}`"
            :value="p.id"
          />
        </el-select>
      </el-form-item>
      <el-row :gutter="12">
        <el-col :span="12">
          <el-form-item
            label="Date"
            prop="date"
          >
            <el-date-picker
              v-model="form.date"
              type="date"
              value-format="YYYY-MM-DD"
              style="width: 100%"
              :disabled="isEdit"
            />
          </el-form-item>
        </el-col>
        <el-col :span="6">
          <el-form-item
            label="Remise %"
            label-width="80px"
          >
            <el-input-number
              v-model="form.remise_pct"
              :min="0"
              :max="100"
              :precision="1"
              style="width:100%"
            />
          </el-form-item>
        </el-col>
        <el-col :span="6">
          <el-form-item
            label="TVA %"
            label-width="60px"
          >
            <el-input-number
              v-model="form.tva_pct"
              :min="0"
              :max="100"
              :precision="1"
              style="width:100%"
            />
          </el-form-item>
        </el-col>
      </el-row>
      <el-row :gutter="12">
        <el-col :span="14">
          <el-form-item label="Assurance">
            <el-select
              v-model="form.assurance_id"
              clearable
              placeholder="Aucune (patient payant)"
              style="width:100%"
              @change="onAssuranceChange"
            >
              <el-option
                v-for="a in assuranceOptions"
                :key="a.id"
                :label="`${a.name} (${a.code})`"
                :value="a.id"
              />
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="10">
          <el-form-item
            v-if="form.assurance_id"
            label="Prise en charge %"
            label-width="130px"
          >
            <el-input-number
              v-model="form.taux_prise_en_charge"
              :min="0"
              :max="100"
              :precision="0"
              style="width:100%"
            />
          </el-form-item>
        </el-col>
      </el-row>

      <el-divider content-position="left">
        Lignes de facturation
      </el-divider>

      <div class="invoice-items">
        <div
          v-for="(item, index) in form.items"
          :key="index"
          class="invoice-items__row"
        >
          <el-select
            v-model="item.type"
            style="width:140px"
            @change="(v:string)=>onItemTypeChange(index, v)"
          >
            <el-option
              label="Consultation"
              value="consultation"
            />
            <el-option
              label="Acte"
              value="acte"
            />
            <el-option
              label="Médicament"
              value="medicament"
            />
            <el-option
              label="Autre"
              value="autre"
            />
          </el-select>
          <el-select
            v-if="item.type === 'acte'"
            :model-value="(item as any)._acteId ?? null"
            filterable
            clearable
            :loading="actesLoading"
            placeholder="Sélectionner un acte..."
            style="width:200px"
            @change="(v:number|null)=>onActeSelect(index, v as number)"
          >
            <el-option
              v-for="a in actesFacturables"
              :key="a.id"
              :label="`${a.code} — ${a.label} (${Math.round(a.prixStandard).toLocaleString('fr-FR')} ${currencyDef.symbol})`"
              :value="a.id"
            />
          </el-select>
          <el-input
            v-else
            v-model="item.libelle"
            placeholder="Libellé"
            style="width:200px"
          />
          <el-input-number
            v-model="item.quantite"
            :min="1"
            style="width:80px"
            @change="() => recalcItem(index)"
            @input="() => recalcItem(index)"
          />
          <el-input-number
            v-model="item.prix_unitaire"
            :min="0"
            :precision="0"
            style="width:120px"
            @change="() => recalcItem(index)"
            @input="() => recalcItem(index)"
          />
          <span class="invoice-items__montant">{{ Math.round(item.montant).toLocaleString('fr-FR') }} {{ currencyDef.symbol }}</span>
          <span
            v-if="item.type === 'acte' && (item as any)._acteId"
            class="invoice-items__frozen"
            title="Prix recopié du tarif STANDARD au moment de la sélection — modifiable librement"
          >Prix figé</span>
          <el-button
            text
            type="danger"
            :icon="Delete"
            @click="removeItem(index)"
          />
        </div>
        <el-empty
          v-if="actesLoaded && actesFacturables.length === 0 && form.items.some(i => i.type === 'acte')"
          description="Aucun acte avec tarif STANDARD — voir Paramètres › Tarifs"
          :image-size="60"
        />
      </div>

      <el-button
        type="primary"
        text
        :icon="Plus"
        @click="addItem"
      >
        Ajouter une ligne
      </el-button>

      <el-divider />
      <div class="invoice-total">
        <div>Sous-total : {{ totals.sousTotal.toLocaleString('fr-FR') }} {{ currencyDef.symbol }}</div>
        <div v-if="form.remise_pct">
          Remise ({{ form.remise_pct }} %) : −{{ Math.round(totals.remiseMontant).toLocaleString('fr-FR') }} {{ currencyDef.symbol }}
        </div>
        <div v-if="form.tva_pct">
          TVA ({{ form.tva_pct }} %) : +{{ Math.round(totals.tvaMontant).toLocaleString('fr-FR') }} {{ currencyDef.symbol }}
        </div>
        <div><strong>Total TTC : {{ totals.total.toLocaleString('fr-FR') }} {{ currencyDef.symbol }}</strong></div>
        <div
          v-if="form.assurance_id"
          class="invoice-total__assurance"
        >
          Part assurance ({{ form.taux_prise_en_charge }} %) : {{ partAssurance.toLocaleString('fr-FR') }} {{ currencyDef.symbol }} —
          <strong>Part patient : {{ partPatient.toLocaleString('fr-FR') }} {{ currencyDef.symbol }}</strong>
        </div>
      </div>

      <el-form-item label="Notes">
        <RichTextEditor
          v-model="form.notes"
          :rows="2"
        />
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button @click="visible = false">
        Annuler
      </el-button>
      <el-button
        type="primary"
        :loading="saving"
        @click="submit"
      >
        {{ isEdit ? 'Enregistrer' : 'Créer la facture' }}
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { Plus, Delete } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { useCurrency } from '@/currency/useCurrency'
import type { Invoice, InvoiceItem } from '@/composables/useInvoices'
import { computeTotals } from '@/composables/useInvoices'
import { getCiviliteLabel } from '@/utils/civilite'
import RichTextEditor from '@/components/patients/RichTextEditor.vue'
import { useInsurances } from '@/composables/useInsurances'
import { useActesFacturables } from '@/composables/useActesFacturables'

/**
 * Ligne locale : `_acteId`/`_tarifId` = snapshot prix en mémoire, tandis que
 * `acte_id` est persisté dans `invoice_item` pour l'attribution du chiffre
 * d'affaires (migration 110).
 */
export type LocalInvoiceItem = InvoiceItem & { _acteId?: number | null; _tarifId?: number | null }

/**
 * Contexte « dossier patient » : quand `patientId` est fourni (facturation
 * depuis `/patients/:id/factures`), le patient est déjà connu → le sélecteur
 * est masqué et la facture est liée à cet identifiant. Depuis Comptabilité,
 * aucune prop n'est passée : le sélecteur reste affiché tel quel.
 */
const props = withDefaults(defineProps<{ patientId?: number | null }>(), { patientId: null })

const emit = defineEmits<{ created: []; updated: [] }>()

const contextPatientId = computed<number | null>(() => {
  const id = props.patientId
  return Number.isInteger(id) && (id as number) > 0 ? (id as number) : null
})

const { currencyDef } = useCurrency()
const { fetchActiveInsurances } = useInsurances()
const {
  actesFacturables,
  loading: actesLoading,
  loaded: actesLoaded,
  ensureLoaded: ensureActesLoaded,
  findById: findActeById,
} = useActesFacturables()

const visible = ref(false)
/** Facture en cours de modification (`null` = création). */
const editingId = ref<number | null>(null)
const editingNumero = ref('')
const editingPatient = ref('')
const isEdit = computed(() => editingId.value != null)
const saving = ref(false)
const searching = ref(false)
const formRef = ref<any>(null)
const patientOptions = ref<any[]>([])
const assuranceOptions = ref<Array<{ id: number; name: string; code: string }>>([])

const form = reactive({
  patient_id: null as number | null,
  date: new Date().toISOString().slice(0, 10),
  notes: '',
  remise_pct: 0,
  tva_pct: 0,
  assurance_id: null as number | null,
  taux_prise_en_charge: 80,
  items: [] as LocalInvoiceItem[],
})

const rules = {
  patient_id: [{ required: true, message: 'Veuillez sélectionner un patient', trigger: 'change' }],
  date: [{ required: true, message: 'Veuillez sélectionner une date', trigger: 'change' }],
}

const totals = computed(() => computeTotals(form.items, form.remise_pct, form.tva_pct))
const partAssurance = computed(() => {
  if (!form.assurance_id) return 0
  return Math.round((totals.value.total * form.taux_prise_en_charge) / 100)
})
const partPatient = computed(() => totals.value.total - partAssurance.value)

onMounted(async () => {
  assuranceOptions.value = (await fetchActiveInsurances()) as any[]
})

function onAssuranceChange() {
  if (!form.assurance_id) form.taux_prise_en_charge = 80
}

function addItem() {
  form.items.push({
    libelle: '',
    quantite: 1,
    prix_unitaire: 0,
    montant: 0,
    type: 'consultation',
  })
}

function removeItem(index: number) {
  form.items.splice(index, 1)
}

function recalcItem(index: number) {
  const item = form.items[index] as LocalInvoiceItem
  const qte = Math.max(1, Number(item.quantite) || 1)
  const pu = Math.max(0, Number(item.prix_unitaire) || 0)
  item.montant = qte * pu
}

function onItemTypeChange(index: number, type: string) {
  const item = form.items[index] as LocalInvoiceItem
  // Toujours purger le snapshot catalogue quand on change de type (Phase 1 : mémoire seule).
  item._acteId = null
  item._tarifId = null
  item.acte_id = null
  if (type === 'acte') {
    // Reset en attente de sélection catalogue ; charge lazy sans bloquer.
    item.libelle = ''
    item.prix_unitaire = 0
    recalcItem(index)
    void ensureActesLoaded()
    return
  }
  const defaults: Record<string, { libelle: string; prix_unitaire: number }> = {
    consultation: { libelle: 'Consultation', prix_unitaire: 0 },
    medicament: { libelle: '', prix_unitaire: 0 },
    autre: { libelle: '', prix_unitaire: 0 },
  }
  const d = defaults[type] || defaults.autre
  if (!item.libelle || item.libelle === defaults.consultation.libelle || item.libelle === '') {
    item.libelle = d.libelle
  }
  item.prix_unitaire = d.prix_unitaire
  recalcItem(index)
}

/**
 * Sélection catalogue : prefill snapshot (libellé + prix STANDARD), montant = qté × PU.
 * Le prix reste éditable après prefill — hint « Prix figé » affiché dans la ligne.
 */
function onActeSelect(index: number, acteId: number | null) {
  const item = form.items[index] as LocalInvoiceItem
  if (acteId == null) {
    item._acteId = null
    item._tarifId = null
    item.acte_id = null
    item.libelle = ''
    item.prix_unitaire = 0
    recalcItem(index)
    return
  }
  const acte = findActeById(acteId)
  if (!acte) return
  item._acteId = acte.id
  item._tarifId = acte.tarifId ?? null
  item.acte_id = String(acte.id)
  item.libelle = `${acte.code} — ${acte.label}`
  item.prix_unitaire = acte.prixStandard
  recalcItem(index)
}

async function searchPatients(query: string) {
  if (contextPatientId.value != null) return
  if (!query) return
  searching.value = true
  try {
    if (window.electronAPI) {
      const result = await window.electronAPI.invoke('patients:list', { search: query }) as { success: boolean; data: any[] }
      patientOptions.value = result.data
    }
  } finally {
    searching.value = false
  }
}

async function onPatientDropdown(open: boolean) {
  if (contextPatientId.value != null) return
  if (open && patientOptions.value.length === 0) {
    try {
      if (window.electronAPI) {
        const result = await window.electronAPI.invoke('patients:list', {}) as { success: boolean; data: any[] }
        patientOptions.value = result.data
      }
    } catch {
      patientOptions.value = []
    }
  }
}

async function submit() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return
  if (form.items.length === 0) {
    ElMessage.warning('Ajoutez au moins une ligne de facturation')
    return
  }

  if (!form.patient_id || form.patient_id <= 0) {
    ElMessage.error('Patient non valide. Sélectionnez un patient valide.')
    return
  }

  // Phase 1 : bloque save si ligne acte sans sélection catalogue (libellé/prix manquants).
  for (let i = 0; i < form.items.length; i++) {
    const it = form.items[i] as LocalInvoiceItem
    if (it.type === 'acte' && (!it.libelle || !(it.prix_unitaire > 0))) {
      ElMessage.error(`Ligne ${i + 1} : sélectionnez un acte du catalogue (libellé + prix requis)`)
      return
    }
  }

  // Lignes envoyées au DTO : `_acteId`/`_tarifId` restent locaux.
  const mappedItems = form.items.map((raw) => {
    const item = raw as LocalInvoiceItem
    const quantite = Math.max(1, item.quantite)
    const prix_unitaire = Math.max(0, item.prix_unitaire)
    const out: InvoiceItem = {
      libelle: item.libelle,
      quantite,
      prix_unitaire,
      montant: quantite * prix_unitaire,
      type: item.type,
      acte_id: item.type === 'acte' ? (item.acte_id ?? null) : null,
    }
    if (item.id !== undefined) out.id = item.id
    if (item.invoice_id !== undefined) out.invoice_id = item.invoice_id
    return out
  })

  saving.value = true
  try {
    if (window.electronAPI) {
      if (isEdit.value) {
        const result = await window.electronAPI.invoke('invoices:update', {
          id: editingId.value,
          notes: form.notes || undefined,
          remise_pct: form.remise_pct || 0,
          tva_pct: form.tva_pct || 0,
          assurance_id: form.assurance_id,
          taux_prise_en_charge: form.assurance_id ? form.taux_prise_en_charge : undefined,
          items: mappedItems,
        }) as { success: boolean; data: any }
        if (result.success) {
          ElMessage.success(`Facture ${result.data.numero} modifiée — Total ${totals.value.total.toLocaleString('fr-FR')} GNF`)
          visible.value = false
          emit('updated')
        } else {
          ElMessage.error((result as any).message || 'Erreur lors de la modification de la facture')
        }
        return
      }

      const result = await window.electronAPI.invoke('invoices:create', {
        patient_id: form.patient_id,
        date: form.date,
        notes: form.notes || undefined,
        remise_pct: form.remise_pct || 0,
        tva_pct: form.tva_pct || 0,
        assurance_id: form.assurance_id ?? undefined,
        taux_prise_en_charge: form.assurance_id ? form.taux_prise_en_charge : undefined,
        items: mappedItems,
      }) as { success: boolean; data: any }
      if (result.success) {
        ElMessage.success(`Facture ${result.data.numero} créée — Total ${totals.value.total.toLocaleString('fr-FR')} GNF`)
        visible.value = false
        emit('created')
      } else {
        ElMessage.error((result as any).message || 'Erreur lors de la création de la facture')
      }
    }
  } catch (e) {
    ElMessage.error(`Erreur: ${(e instanceof Error ? e.message : String(e))}`)
  } finally {
    saving.value = false
  }
}

function resetForm() {
  editingId.value = null
  editingNumero.value = ''
  editingPatient.value = ''
  form.patient_id = contextPatientId.value
  form.date = new Date().toISOString().slice(0, 10)
  form.notes = ''
  form.remise_pct = 0
  form.tva_pct = 0
  form.assurance_id = null
  form.taux_prise_en_charge = 80
  form.items = []
  formRef.value?.resetFields()
}

async function open() {
  // Contexte dossier patient : l'id est connu avant l'ouverture, donc pré-rempli
  // avant d'activer le dialogue (aucune liste distante requise).
  if (contextPatientId.value != null) {
    form.patient_id = contextPatientId.value
  }
  visible.value = true
  // Catalogue lazy à l'ouverture (cache mémoire ensuite) + assurances en parallèle.
  const [assurances] = await Promise.all([
    fetchActiveInsurances(),
    ensureActesLoaded(),
  ])
  assuranceOptions.value = assurances as any[]
  if (form.items.length === 0) addItem()
}

/**
 * Ouvre le dialogue en mode modification. L'appelant fournit la facture
 * DÉTAILLÉE (`getInvoice(id)`), car les lignes d'une liste ne contiennent ni
 * `items` ni `payments`.
 */
async function openEdit(invoice: Invoice) {
  editingId.value = invoice.id ?? null
  editingNumero.value = invoice.numero ?? ''
  const patientNom = [invoice.patient_prenom, invoice.patient_nom].filter(Boolean).join(' ').trim()
  editingPatient.value = patientNom || `Patient n°${invoice.patient_id ?? '—'}`

  const [assurances] = await Promise.all([
    fetchActiveInsurances(),
    ensureActesLoaded(),
  ])
  assuranceOptions.value = assurances as any[]

  form.patient_id = invoice.patient_id ?? null
  form.date = invoice.date ?? new Date().toISOString().slice(0, 10)
  form.notes = invoice.notes ?? ''
  form.remise_pct = invoice.remise_pct ?? 0
  form.tva_pct = invoice.tva_pct ?? 0
  form.assurance_id = invoice.assurance_id ?? null
  // Le taux n'est pas stocké : on le déduit de la répartition existante.
  form.taux_prise_en_charge = invoice.montant_total
    ? Math.round(((invoice.part_assurance ?? 0) / invoice.montant_total) * 100)
    : 80
  form.items = (invoice.items ?? []).map((item) => {
    const quantite = Math.max(1, item.quantite ?? 1)
    const prixUnitaire = Math.max(0, item.prix_unitaire ?? 0)
    return {
      libelle: item.libelle,
      quantite,
      prix_unitaire: prixUnitaire,
      montant: item.montant ?? quantite * prixUnitaire,
      type: item.type,
      acte_id: item.acte_id ?? null,
      _acteId: item.acte_id ? Number(item.acte_id) : null,
      _tarifId: null,
    } as LocalInvoiceItem
  })
  if (form.items.length === 0) addItem()

  formRef.value?.clearValidate?.()
  visible.value = true
}

defineExpose({ open, openEdit })
</script>

<style scoped>
.invoice-edit-context {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 6px 12px;
  margin-bottom: 16px;
  padding: 8px 12px;
  border: 1px solid var(--cd-border, #E2E8F0);
  border-left: 3px solid var(--cde-accent-strong, #0A5F5E);
  border-radius: 8px;
  background: var(--cde-surface-muted, #F8FAFC);
  font-size: 13px;
}

.invoice-edit-context__ref {
  font-weight: 700;
  color: var(--cde-accent-strong, #0A5F5E);
}

.invoice-edit-context__patient {
  font-weight: 600;
  color: #0F172A;
}

.invoice-edit-context__hint {
  margin-left: auto;
  font-size: 11.5px;
  color: var(--cd-text-muted, #64748B);
}

.invoice-items {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 8px;
}

.invoice-items__row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.invoice-items__montant {
  min-width: 100px;
  text-align: right;
  font-weight: 600;
  font-size: 14px;
}

.invoice-items__frozen {
  font-size: 11px;
  color: var(--cde-warning);
  background: var(--cde-warning-tint);
  border: 1px solid color-mix(in srgb, var(--cde-warning) 20%, transparent);
  border-radius: 4px;
  padding: 1px 6px;
  white-space: nowrap;
}

.invoice-total {
  text-align: right;
  font-size: 14px;
  margin-bottom: 16px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.invoice-total__assurance {
  color: var(--cd-primary-dark);
}
</style>
