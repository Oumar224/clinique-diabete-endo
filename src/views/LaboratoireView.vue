<template>
  <div class="labo cde">
    <div class="cde-page-head">
      <div>
        <h1 class="cde-page-title">Laboratoire</h1>
        <div class="cde-page-sub">Demandes d'examens, prélèvements, résultats et patients externes</div>
      </div>
    </div>

    <div class="labo__stats">
      <div class="labo__stat labo__stat--warning">
        <span class="labo__stat-value">{{ stats.enAttente }}</span>
        <span class="labo__stat-label">En attente</span>
      </div>
      <div class="labo__stat labo__stat--info">
        <span class="labo__stat-value">{{ stats.enCours }}</span>
        <span class="labo__stat-label">En cours</span>
      </div>
      <div class="labo__stat labo__stat--success">
        <span class="labo__stat-value">{{ stats.realise }}</span>
        <span class="labo__stat-label">Réalisées</span>
      </div>
      <div class="labo__stat labo__stat--danger">
        <span class="labo__stat-value">{{ stats.urgentes }}</span>
        <span class="labo__stat-label">Urgentes</span>
      </div>
      <div class="labo__stat">
        <span class="labo__stat-value">{{ stats.externes }}</span>
        <span class="labo__stat-label">Patients externes</span>
      </div>
    </div>

    <el-tabs v-model="activeTab" class="cde-tabs">
      <!-- ═══════════════ Demandes (internes + externes) ═══════════════ -->
      <el-tab-pane
        label="Demandes"
        name="demandes"
      >
        <LaboratoireWorklist
          v-model:search="filters.search"
          v-model:statut="filters.statut"
          v-model:priorite="filters.priorite"
          v-model:origine="origineFilter"
          :rows="demandes"
          :loading="loading"
          :can-cashier="canCashier"
          @refresh="reload"
          @create="openDemandeForm"
          @detail="openDetail"
          @prelever="prelever"
          @resultats="ouvrirSaisie"
          @payer="openPaiement"
          @annuler="annuler"
          @recu="openRecu"
        />
      </el-tab-pane>

      <!-- ═══════════════ Facturation ═══════════════ -->
      <el-tab-pane
        label="Facturation"
        name="facturation"
        lazy
      >
        <LaboratoireFacturationTab
          ref="facturationRef"
          :can-cashier="canCashier"
          @payer="openPaiement"
          @detail="openDetail"
          @recu="openRecu"
        />
      </el-tab-pane>

      <!-- ═══════════════ Stock ═══════════════ -->
      <el-tab-pane label="Stock" name="stock">
        <LaboratoireStockTab />
      </el-tab-pane>

      <!-- ═══════════════ Commandes ═══════════════ -->
      <el-tab-pane label="Commandes" name="commandes">
        <LaboratoireCommandeTab />
      </el-tab-pane>

      <!-- ═══════════════ Fournisseurs ═══════════════ -->
      <el-tab-pane label="Fournisseurs" name="fournisseurs">
        <LaboratoireFournisseurTab />
      </el-tab-pane>
    </el-tabs>

    <!-- ═══════════════ Formulaire nouvelle demande externe ═══════════════ -->
    <el-dialog
      v-model="formVisible"
      title="Nouvelle demande externe"
      width="760px"
      :close-on-click-modal="false"
    >
      <el-form label-position="top" :model="form">
        <el-alert
          class="labo__form-alert"
          type="info"
          :closable="false"
          show-icon
          title="Demande externe sans dossier patient"
          description="Pour un patient déjà suivi, créez la demande depuis son dossier clinique : elle apparaîtra automatiquement ici."
        />

        <div class="labo__form-section">
          <el-row :gutter="12">
            <el-col :span="12">
              <el-form-item label="Nom" required>
                <el-input v-model="form.externeNom" placeholder="Nom du patient" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="Prénom" required>
                <el-input v-model="form.externePrenom" placeholder="Prénom du patient" />
              </el-form-item>
            </el-col>
          </el-row>
          <el-row :gutter="12">
            <el-col :span="8">
              <el-form-item label="Sexe">
                <el-select v-model="form.externeSexe" clearable placeholder="—" style="width: 100%">
                  <el-option label="Masculin" value="M" />
                  <el-option label="Féminin" value="F" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="Date de naissance">
                <el-date-picker
                  v-model="form.externeDateNaissance"
                  type="date"
                  value-format="YYYY-MM-DD"
                  placeholder="—"
                  style="width: 100%"
                />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="Téléphone">
                <el-input v-model="form.externeTelephone" placeholder="+224…" />
              </el-form-item>
            </el-col>
          </el-row>
          <el-form-item label="Adresse">
            <el-input v-model="form.externeAdresse" placeholder="Adresse (optionnel)" />
          </el-form-item>
          <el-row :gutter="12">
            <el-col :span="12">
              <el-form-item label="Prescripteur externe">
                <el-input v-model="form.prescripteurExterneNom" placeholder="Dr…" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="Structure">
                <el-input v-model="form.prescripteurExterneStructure" placeholder="Cabinet, clinique…" />
              </el-form-item>
            </el-col>
          </el-row>
        </div>

        <el-form-item label="Analyses demandées" required>
          <el-tree-select
            v-model="form.examIds"
            :data="analysesTreeData"
            :props="{ label: 'label', children: 'children' }"
            node-key="id"
            multiple
            show-checkbox
            check-strictly
            filterable
            collapse-tags
            collapse-tags-tooltip
            placeholder="Rechercher et sélectionner des analyses"
            style="width: 100%"
          />
        </el-form-item>
        <p class="labo__prix-hint">
          Montant selon les tarifs configurés&nbsp;:
          <strong>{{ formatMontant(montantEstime) }}</strong>
        </p>

        <el-row :gutter="12">
          <el-col :span="8">
            <el-form-item label="Priorité">
              <el-select v-model="form.priorite" style="width: 100%">
                <el-option label="Normale" value="normale" />
                <el-option label="Urgente" value="urgente" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="Date prévue">
              <el-date-picker
                v-model="form.plannedDate"
                type="date"
                value-format="YYYY-MM-DD"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="Heure prévue">
              <el-select v-model="form.plannedHour" clearable placeholder="—" style="width: 100%">
                <el-option
                  v-for="h in heuresExamen"
                  :key="h"
                  :label="formatHeure(h)"
                  :value="h"
                />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item label="Motif / renseignements">
          <el-input v-model="form.motif" type="textarea" :rows="2" placeholder="Indication clinique…" />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="formVisible = false">Annuler</el-button>
        <el-button type="primary" :loading="saving" @click="submitDemande">Créer la demande</el-button>
      </template>
    </el-dialog>

    <!-- ═══════════════ Détail ═══════════════ -->
    <el-dialog v-model="detailVisible" title="Détail de la demande" width="620px">
      <el-descriptions v-if="detail" :column="2" border size="small">
        <el-descriptions-item label="N°">{{ detail.numero || '—' }}</el-descriptions-item>
        <el-descriptions-item label="Statut">
          {{ LABO_STATUT_LABEL[detail.statut || 'en_attente'] }}
        </el-descriptions-item>
        <el-descriptions-item label="Patient" :span="2">
          <template v-if="detail.patientExterne">
            {{ detail.externePrenom }} {{ detail.externeNom }} (externe)
          </template>
          <template v-else>{{ detail.patientPrenom }} {{ detail.patientNom }}</template>
        </el-descriptions-item>
        <el-descriptions-item label="Examen" :span="2">
          {{ detail.examenLabel || (detail.examIds?.length ? `${detail.examIds.length} examen(s)` : '—') }}
        </el-descriptions-item>
        <el-descriptions-item label="Priorité">{{ detail.priorite === 'urgente' ? 'Urgente' : 'Normale' }}</el-descriptions-item>
        <el-descriptions-item label="Date prévue">{{ detail.plannedDate || '—' }}</el-descriptions-item>
        <el-descriptions-item label="Heure prévue">{{ formatHeure(detail.plannedHour) }}</el-descriptions-item>
        <el-descriptions-item label="Prélèvement" :span="2">
          {{ detail.prelevementAt ? `${detail.prelevementType || 'Prélevé'} — ${detail.prelevementAt}` : 'Non prélevé' }}
        </el-descriptions-item>
        <el-descriptions-item label="Prescripteur" :span="2">
          {{ detail.prescripteurExterneNom || detail.prescripteurNom || '—' }}
        </el-descriptions-item>
        <el-descriptions-item label="Motif" :span="2">{{ detail.motif || '—' }}</el-descriptions-item>
        <el-descriptions-item label="Montant">{{ detail.montant != null ? formatMontant(detail.montant) : '—' }}</el-descriptions-item>
        <el-descriptions-item label="Paiement">
          {{ LABO_PAIEMENT_LABEL[(detail.statutPaiement as LaboStatutPaiement) || 'non_paye'] }}
        </el-descriptions-item>
        <el-descriptions-item label="Encaissé">{{ formatMontant(detail.montantPaye ?? 0) }}</el-descriptions-item>
        <el-descriptions-item label="Reste à payer">
          {{ formatMontant(Math.max(0, (detail.montant ?? 0) - (detail.montantPaye ?? 0))) }}
        </el-descriptions-item>
      </el-descriptions>

      <template v-if="paiements.length > 0">
        <h4 class="labo__section-title">Encaissements</h4>
        <el-table :data="paiements" size="small" style="width: 100%">
          <el-table-column label="Date" width="110">
            <template #default="{ row }">{{ row.datePaiement || '—' }}</template>
          </el-table-column>
          <el-table-column label="Montant" width="130">
            <template #default="{ row }">{{ formatMontant(row.montant ?? 0) }}</template>
          </el-table-column>
          <el-table-column label="Mode" width="140">
            <template #default="{ row }">
              {{ LABO_MODE_PAIEMENT_LABEL[(row.modePaiement as LaboModePaiement) || 'espece'] }}
            </template>
          </el-table-column>
          <el-table-column label="Référence" min-width="140">
            <template #default="{ row }">{{ row.reference || '—' }}</template>
          </el-table-column>
        </el-table>
      </template>

      <template #footer>
        <el-button @click="detailVisible = false">Fermer</el-button>
        <el-button
          v-if="detail"
          @click="openRecu(detail)"
        >
          Reçu
        </el-button>
        <el-button
          v-if="canCashier && detail?.patientExterne && detail.statut !== 'annule' && detail.statutPaiement !== 'paye' && detail.statutPaiement !== 'exonere' && (detail.montant ?? 0) > 0"
          type="warning"
          @click="openPaiement(detail)"
        >
          Encaisser
        </el-button>
      </template>
    </el-dialog>

    <!-- Encaissement -->
    <el-dialog v-model="paiementVisible" title="Encaissement laboratoire" width="520px" :close-on-click-modal="false">
      <el-form label-position="top" :model="paiementForm">
        <el-descriptions :column="2" border size="small" class="labo__paiement-resume">
          <el-descriptions-item label="Demande">{{ paiementRow?.numero || '—' }}</el-descriptions-item>
          <el-descriptions-item label="Patient">
            {{ paiementRow?.externePrenom }} {{ paiementRow?.externeNom }}
          </el-descriptions-item>
          <el-descriptions-item label="Montant dû">
            {{ formatMontant(paiementRow?.montant ?? 0) }}
          </el-descriptions-item>
          <el-descriptions-item label="Reste à payer">
            {{ formatMontant(paiementReste) }}
          </el-descriptions-item>
        </el-descriptions>
        <el-form-item label="Montant encaissé (GNF)" required>
          <el-input-number v-model="paiementForm.montant" :min="1" :step="1000" style="width: 100%" controls-position="right" />
        </el-form-item>
        <el-row :gutter="12">
          <el-col :span="12">
            <el-form-item label="Mode de paiement">
              <el-select v-model="paiementForm.modePaiement" style="width: 100%">
                <el-option label="Espèces" value="espece" />
                <el-option label="Mobile money" value="mobile_money" />
                <el-option label="Carte bancaire" value="carte" />
                <el-option label="Virement" value="virement" />
                <el-option label="Chèque" value="cheque" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="Date">
              <el-date-picker v-model="paiementForm.datePaiement" type="date" value-format="YYYY-MM-DD" style="width: 100%" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="Référence">
          <el-input v-model="paiementForm.reference" placeholder="N° reçu, transaction…" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="paiementVisible = false">Annuler</el-button>
        <el-button :loading="savingPaiement" @click="exonerer">Exonérer</el-button>
        <el-button type="primary" :loading="savingPaiement" @click="submitPaiement">Encaisser</el-button>
      </template>
    </el-dialog>

    <!-- Saisie des résultats -->
    <ExamValidationDialog
      v-model:visible="validationVisible"
      :exam-request-id="validationRequestId"
      :exam-ids="validationExamIds"
      @validated="onValidated"
    />

    <!-- Reçu de service (demande interne ou externe) -->
    <RecuServiceDialog
      ref="recuRef"
      service="laboratoire"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  useLaboratoire,
  LABO_STATUT_LABEL,
  LABO_PAIEMENT_LABEL,
  LABO_MODE_PAIEMENT_LABEL,
  type LaboDemande,
  type LaboStatut,
  type LaboStatutPaiement,
  type LaboModePaiement,
  type LaboPaiement,
} from '@/composables/useLaboratoire'
import { useAuth } from '@/composables/useAuth'
import { useExamTypes, type ExamTypeDto } from '@/composables/useExamTypes'
import ExamValidationDialog from '@/components/patients/ExamValidationDialog.vue'
import LaboratoireStockTab from '@/components/laboratoire/LaboratoireStockTab.vue'
import LaboratoireCommandeTab from '@/components/laboratoire/LaboratoireCommandeTab.vue'
import LaboratoireFournisseurTab from '@/components/laboratoire/LaboratoireFournisseurTab.vue'
import LaboratoireWorklist from '@/components/laboratoire/LaboratoireWorklist.vue'
import LaboratoireFacturationTab from '@/components/laboratoire/LaboratoireFacturationTab.vue'
import RecuServiceDialog from '@/components/common/RecuServiceDialog.vue'

const {
  demandes, stats, loading,
  fetchWorklist, fetchStats,
  createDemande, updateStatut, enregistrerPrelevement,
  fetchPaiements, enregistrerPaiement,
} = useLaboratoire()

// Même catalogue que le dossier patient : « Configuration Clinique > Examens ».
const { fetchAllByCategory, allTypes } = useExamTypes()

const { user } = useAuth()

const activeTab = ref<'demandes' | 'facturation' | 'stock' | 'commandes' | 'fournisseurs'>('demandes')
const canCashier = computed(() =>
  ['ADMIN', 'COMPTABLE', 'SECRETAIRE', 'MEDECIN'].includes(user.value?.role ?? ''),
)
const facturationRef = ref<InstanceType<typeof LaboratoireFacturationTab> | null>(null)
const recuRef = ref<InstanceType<typeof RecuServiceDialog> | null>(null)

/** Filtre d'origine de la worklist unique : toutes, internes ou externes. */
const origineFilter = ref<'toutes' | 'interne' | 'externe'>('toutes')

/** Heures proposées pour planifier l'examen. */
const heuresExamen = Array.from({ length: 24 }, (_, index) => index)

/** Affiche une heure planifiée (`9` → `09:00`). */
function formatHeure(value?: number | null): string {
  if (value == null) return '—'
  return `${String(value).padStart(2, '0')}:00`
}

interface TreeNode {
  id: number
  label: string
  children?: TreeNode[]
}

/** Arbre des analyses : types de la catégorie « laboratoire » et leurs examens. */
const analysesTreeData = computed<TreeNode[]>(() => buildTree(allTypes.value))

function buildTree(items: ExamTypeDto[]): TreeNode[] {
  return items
    .filter((item) => !item.parent_id)
    .map((type) => {
      const children = items.filter((item) => item.parent_id === type.id)
      return {
        id: type.id!,
        label: labelAvecPrix(type),
        children: children.length > 0
          ? children.map((child) => ({ id: child.id!, label: labelAvecPrix(child) }))
          : undefined,
      }
    })
}

/** Libellé enrichi du tarif, quand il est configuré. */
function labelAvecPrix(item: ExamTypeDto): string {
  return item.prix && item.prix > 0 ? `${item.label} — ${formatMontant(item.prix)}` : item.label
}

/** Montant prévisionnel : somme des tarifs des analyses sélectionnées. */
const montantEstime = computed(() =>
  (form.examIds ?? []).reduce((total, id) => {
    const examen = allTypes.value.find((item) => item.id === id)
    return total + (examen?.prix ?? 0)
  }, 0),
)

const filters = reactive<{
  search: string
  statut: LaboStatut | 'tous'
  priorite: '' | 'normale' | 'urgente'
}>({
  search: '',
  statut: 'tous',
  priorite: '',
})

function reload(): void {
  const payload: Parameters<typeof fetchWorklist>[0] = {
    search: filters.search,
    statut: filters.statut,
    priorite: filters.priorite || undefined,
  }
  if (origineFilter.value === 'interne') payload.patientExterne = false
  if (origineFilter.value === 'externe') payload.patientExterne = true
  fetchWorklist(payload)
  fetchStats()
}

/** Recharge la liste et la facturation après une mutation. */
function reloadAll(): void {
  reload()
  facturationRef.value?.reload()
}

// ─── Formulaire ────────────────────────────────────────────────
const formVisible = ref(false)
const saving = ref(false)
const form = reactive<LaboDemande>({
  patientExterne: true,
  patientId: null,
  externeNom: '',
  externePrenom: '',
  externeSexe: '',
  externeDateNaissance: '',
  externeTelephone: '',
  externeAdresse: '',
  prescripteurExterneNom: '',
  prescripteurExterneStructure: '',
  prescripteurExterneTelephone: '',
  examIds: [],
  priorite: 'normale',
  plannedDate: new Date().toISOString().slice(0, 10),
  plannedHour: null,
  motif: '',
})

function resetForm(): void {
  form.patientExterne = true
  form.patientId = null
  form.externeNom = ''
  form.externePrenom = ''
  form.externeSexe = ''
  form.externeDateNaissance = ''
  form.externeTelephone = ''
  form.externeAdresse = ''
  form.prescripteurExterneNom = ''
  form.prescripteurExterneStructure = ''
  form.prescripteurExterneTelephone = ''
  form.examIds = []
  form.priorite = 'normale'
  form.plannedDate = new Date().toISOString().slice(0, 10)
  form.plannedHour = null
  form.motif = ''
}

function openDemandeForm(): void {
  resetForm()
  form.patientExterne = true
  form.patientId = null
  void fetchAllByCategory('laboratoire')
  formVisible.value = true
}

function nonEmpty(value?: string): string | undefined {
  const v = value?.trim()
  return v ? v : undefined
}

async function submitDemande(): Promise<void> {
  if (!form.examIds || form.examIds.length === 0) {
    ElMessage.warning('Sélectionnez au moins un examen')
    return
  }
  if (!form.externeNom?.trim() || !form.externePrenom?.trim()) {
    ElMessage.warning('Le nom et le prénom du patient externe sont requis')
    return
  }

  const examIds = [...(form.examIds ?? [])]
  const dto: LaboDemande = {
    type: 'laboratoire',
    patientExterne: true,
    examIds,
    examenId: examIds[0],
    priorite: form.priorite,
    plannedDate: form.plannedDate || undefined,
    plannedHour: form.plannedHour ?? undefined,
    motif: nonEmpty(form.motif),
    externeNom: nonEmpty(form.externeNom),
    externePrenom: nonEmpty(form.externePrenom),
    externeSexe: nonEmpty(form.externeSexe),
    externeDateNaissance: nonEmpty(form.externeDateNaissance),
    externeTelephone: nonEmpty(form.externeTelephone),
    externeAdresse: nonEmpty(form.externeAdresse),
    prescripteurExterneNom: nonEmpty(form.prescripteurExterneNom),
    prescripteurExterneStructure: nonEmpty(form.prescripteurExterneStructure),
    prescripteurExterneTelephone: nonEmpty(form.prescripteurExterneTelephone),
  }

  saving.value = true
  try {
    const created = await createDemande(dto)
    if (!created) {
      ElMessage.error('Création impossible')
      return
    }
    ElMessage.success(`Demande ${created.numero ?? ''} créée`)
    formVisible.value = false
    reloadAll()
  } finally {
    saving.value = false
  }
}

// ─── Actions worklist ─────────────────────────────────────────
async function prelever(row: LaboDemande): Promise<void> {
  if (!row.id) return
  let type = 'Sang'
  try {
    const result = await ElMessageBox.prompt('Type de prélèvement', 'Prélèvement', {
      confirmButtonText: 'Enregistrer',
      cancelButtonText: 'Annuler',
      inputValue: row.prelevementType || 'Sang',
      inputPattern: /\S/,
      inputErrorMessage: 'Le type est requis',
    })
    type = typeof result === 'string' ? result : (result as { value?: string }).value ?? 'Sang'
  } catch {
    return
  }
  const updated = await enregistrerPrelevement(row.id, {
    prelevementType: type,
    prelevementPar: user.value?.id,
  })
  if (updated) {
    ElMessage.success('Prélèvement enregistré')
    reload()
  } else {
    ElMessage.error('Enregistrement impossible')
  }
}

async function annuler(row: LaboDemande): Promise<void> {
  if (!row.id) return
  try {
    await ElMessageBox.confirm(`Annuler la demande ${row.numero ?? ''} ?`, 'Confirmation', {
      confirmButtonText: 'Annuler la demande',
      cancelButtonText: 'Retour',
      type: 'warning',
    })
  } catch {
    return
  }
  const updated = await updateStatut(row.id, 'annule')
  if (updated) {
    ElMessage.success('Demande annulée')
    reload()
  } else {
    ElMessage.error('Annulation impossible')
  }
}

// ─── Détail ───────────────────────────────────────────────────
const detailVisible = ref(false)
const detail = ref<LaboDemande | null>(null)
const paiements = ref<LaboPaiement[]>([])

async function openDetail(row: LaboDemande): Promise<void> {
  detail.value = row
  paiements.value = []
  detailVisible.value = true
  if (row.id) paiements.value = await fetchPaiements(row.id)
}

/** Ouvre le reçu de service de la demande, qu'elle soit interne ou externe. */
function openRecu(row: LaboDemande): void {
  if (!row.id) return
  recuRef.value?.open(row.id)
}

// ─── Encaissement ─────────────────────────────────────────────
const paiementVisible = ref(false)
const savingPaiement = ref(false)
const paiementRow = ref<LaboDemande | null>(null)
const paiementForm = reactive<{
  montant: number
  modePaiement: LaboModePaiement
  datePaiement: string
  reference: string
}>({
  montant: 1,
  modePaiement: 'espece',
  datePaiement: new Date().toISOString().slice(0, 10),
  reference: '',
})

const paiementReste = computed(() => {
  const du = paiementRow.value?.montant ?? 0
  const paye = paiementRow.value?.montantPaye ?? 0
  return Math.max(0, du - paye)
})

function openPaiement(row: LaboDemande): void {
  paiementRow.value = row
  paiementForm.montant = Math.max(1, Math.max(0, (row.montant ?? 0) - (row.montantPaye ?? 0)))
  paiementForm.modePaiement = 'espece'
  paiementForm.datePaiement = new Date().toISOString().slice(0, 10)
  paiementForm.reference = ''
  paiementVisible.value = true
}

async function submitPaiement(): Promise<void> {
  if (!paiementRow.value?.id) return
  if (!paiementForm.montant || paiementForm.montant <= 0) {
    ElMessage.warning('Saisissez un montant positif')
    return
  }
  savingPaiement.value = true
  try {
    const updated = await enregistrerPaiement(paiementRow.value.id, {
      montant: paiementForm.montant,
      modePaiement: paiementForm.modePaiement,
      datePaiement: paiementForm.datePaiement,
      reference: paiementForm.reference || undefined,
      createdBy: user.value?.id,
    })
    if (!updated) {
      ElMessage.error('Encaissement impossible')
      return
    }
    ElMessage.success('Encaissement enregistré')
    paiementVisible.value = false
    detail.value = updated
    paiements.value = await fetchPaiements(updated.id!)
    reloadAll()
  } finally {
    savingPaiement.value = false
  }
}

async function exonerer(): Promise<void> {
  if (!paiementRow.value?.id) return
  try {
    await ElMessageBox.confirm(`Exonérer la demande ${paiementRow.value.numero ?? ''} ?`, 'Confirmation', {
      confirmButtonText: 'Exonérer',
      cancelButtonText: 'Retour',
      type: 'warning',
    })
  } catch {
    return
  }
  savingPaiement.value = true
  try {
    const updated = await enregistrerPaiement(paiementRow.value.id, { exonere: true })
    if (!updated) {
      ElMessage.error('Exonération impossible')
      return
    }
    ElMessage.success('Demande exonérée')
    paiementVisible.value = false
    detail.value = updated
    reloadAll()
  } finally {
    savingPaiement.value = false
  }
}

// ─── Saisie des résultats ─────────────────────────────────────
const validationVisible = ref(false)
const validationRequestId = ref(0)
const validationExamIds = ref<number[]>([])

function ouvrirSaisie(row: LaboDemande): void {
  if (!row.id) return
  validationRequestId.value = row.id
  validationExamIds.value = row.examIds && row.examIds.length > 0
    ? row.examIds
    : (row.examenId != null ? [row.examenId] : [])
  validationVisible.value = true
}

function onValidated(): void {
  validationVisible.value = false
  reload()
}

function formatMontant(value: number): string {
  return `${new Intl.NumberFormat('fr-FR').format(value)} GNF`
}

onMounted(() => {
  reload()
  void fetchAllByCategory('laboratoire')
})
</script>

<style scoped>
.labo {
  padding: 16px 20px 32px;
}

.labo__stats {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 10px;
  margin: 6px 0 14px;
}

.labo__stat {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 10px 12px;
  border: 1px solid var(--cd-border, #e4e7ed);
  border-radius: 6px;
  background: #fff;
}

.labo__stat-value {
  font-size: 22px;
  font-weight: 700;
  line-height: 1.1;
  color: var(--cd-gray-900, #303133);
}

.labo__stat-label {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--cd-gray-500, #909399);
}

.labo__stat--warning .labo__stat-value { color: #b88230; }
.labo__stat--info .labo__stat-value { color: #2e86c1; }
.labo__stat--success .labo__stat-value { color: #27ae60; }
.labo__stat--danger .labo__stat-value { color: #c0392b; }

.labo__numero {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 12px;
}

.labo__externe-tag {
  display: inline-block;
  margin-right: 4px;
  padding: 0 4px;
  border-radius: 2px;
  background: #fdf3d8;
  color: #8a6d1f;
  font-size: 10px;
  font-weight: 700;
  vertical-align: middle;
}

.labo__muted {
  color: var(--cd-gray-400, #c0c4cc);
}

.labo__form-section {
  margin-bottom: 10px;
}

.labo__paiement-detail {
  margin-top: 2px;
  font-size: 10px;
  color: var(--cd-gray-500, #909399);
  white-space: nowrap;
}

.labo__paiement-resume {
  margin-bottom: 12px;
}

.labo__section-title {
  margin: 14px 0 6px;
  font-size: 13px;
  font-weight: 600;
}

.labo__form-alert {
  margin-bottom: 14px;
}

.labo__prix-hint {
  margin: -6px 0 14px;
  font-size: 12px;
  color: var(--cd-gray-600, #606266);
}

@media (max-width: 1100px) {
  .labo__stats {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
</style>
