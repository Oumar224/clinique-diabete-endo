<template>
  <div class="apports-tab">
    <div class="cde-toolbar">
      <div class="cde-filters">
        <div class="cde-filter cde-toolbar__search">
          <span class="cde-filter__label">Recherche</span>
          <el-input
            v-model="search"
            placeholder="Rechercher une référence ou un libellé…"
            clearable
            :prefix-icon="Search"
            class="cde-toolbar__search-input"
          />
        </div>
        <div class="cde-filter">
          <span class="cde-filter__label">Type</span>
          <el-select
            v-model="type"
            clearable
            placeholder="Tous"
            class="cde-toolbar__select"
            aria-label="Filtrer par type d'apport"
          >
            <el-option
              v-for="(label, value) in APPORT_TYPE_LABEL"
              :key="value"
              :label="label"
              :value="value"
            />
          </el-select>
        </div>
        <div class="cde-filter">
          <span class="cde-filter__label">Statut</span>
          <el-select
            v-model="statut"
            clearable
            placeholder="Tous"
            class="cde-toolbar__select"
            aria-label="Filtrer par statut"
          >
            <el-option
              v-for="(label, value) in APPORT_STATUT_LABEL"
              :key="value"
              :label="label"
              :value="value"
            />
          </el-select>
        </div>
        <div class="cde-filter">
          <span class="cde-filter__label">Du</span>
          <el-date-picker
            v-model="dateDebut"
            type="date"
            value-format="YYYY-MM-DD"
            placeholder="Date début"
            class="cde-toolbar__date"
            aria-label="Date de début"
          />
        </div>
        <div class="cde-filter">
          <span class="cde-filter__label">Au</span>
          <el-date-picker
            v-model="dateFin"
            type="date"
            value-format="YYYY-MM-DD"
            placeholder="Date fin"
            class="cde-toolbar__date"
            aria-label="Date de fin"
          />
        </div>
      </div>
      <div class="cde-toolbar__actions">
        <el-button
          :icon="Refresh"
          :loading="loading"
          @click="load"
        >
          Rafraîchir
        </el-button>
        <el-button
          type="primary"
          :icon="Plus"
          @click="openForm()"
        >
          Nouvel apport
        </el-button>
      </div>
    </div>

    <el-alert
      v-if="error"
      class="cde-alert"
      type="warning"
      :closable="false"
      show-icon
      :title="error"
    >
      <template #default>
        <el-button
          text
          type="primary"
          size="small"
          :loading="loading"
          @click="load"
        >
          Réessayer
        </el-button>
      </template>
    </el-alert>

    <section
      class="cde-summary"
      aria-label="Synthèse des apports"
    >
      <div class="cde-summary__item">
        <span class="cde-summary__label">Total apports (brut)</span>
        <span class="cde-summary__value">{{ formatMontant(totaux.total) }}</span>
        <span class="cde-summary__sub">GNF</span>
      </div>
      <div class="cde-summary__item">
        <span class="cde-summary__label">Fonds propres</span>
        <span class="cde-summary__value">{{ formatMontant(totaux.fondsPropres) }}</span>
        <span class="cde-summary__sub">GNF</span>
      </div>
      <div class="cde-summary__item">
        <span class="cde-summary__label">Dettes ouvertes</span>
        <span class="cde-summary__value cde-summary__value--danger">{{ formatMontant(totaux.resteDettes) }}</span>
        <span class="cde-summary__sub">{{ totaux.dettesOuvertes }} dette(s)</span>
      </div>
      <div class="cde-summary__item">
        <span class="cde-summary__label">Remboursé</span>
        <span class="cde-summary__value">{{ formatMontant(totaux.rembourse) }}</span>
        <span class="cde-summary__sub">GNF</span>
      </div>
    </section>

    <div class="cde-table-wrap">
      <el-table
        v-loading="loading"
        :data="apports"
        size="small"
        row-key="id"
        style="width: 100%"
        aria-label="Apports de trésorerie"
      >
        <el-table-column
          type="expand"
          width="34"
        >
          <template #default="scope">
            <div
              v-if="scope.row"
              class="apports-tab__remboursements"
            >
              <div
                v-if="(scope.row.remboursements?.length ?? 0) === 0"
                class="cde-muted apports-tab__no-remboursement"
              >
                Aucun remboursement enregistré.
              </div>
              <el-table
                v-else
                :data="scope.row.remboursements"
                size="small"
                style="width: 100%"
                aria-label="Remboursements de l'apport"
              >
                <el-table-column
                  label="Date"
                  width="120"
                >
                  <template #default="{ row: remboursement }">
                    {{ formatDate(remboursement.dateRemboursement) }}
                  </template>
                </el-table-column>
                <el-table-column
                  label="Montant (GNF)"
                  width="140"
                  align="right"
                >
                  <template #default="{ row: remboursement }">
                    <span class="cde-num">{{ formatMontant(remboursement.montant) }}</span>
                  </template>
                </el-table-column>
                <el-table-column
                  label="Mode"
                  width="130"
                >
                  <template #default="{ row: remboursement }">
                    {{ modeLabel(remboursement.modePaiement) }}
                  </template>
                </el-table-column>
                <el-table-column
                  label="Référence"
                  min-width="150"
                >
                  <template #default="{ row: remboursement }">
                    {{ remboursement.reference || '—' }}
                  </template>
                </el-table-column>
                <el-table-column
                  label="Notes"
                  min-width="160"
                >
                  <template #default="{ row: remboursement }">
                    <span class="cde-muted">{{ remboursement.notes || '—' }}</span>
                  </template>
                </el-table-column>
                <el-table-column
                  label=""
                  width="80"
                  align="right"
                >
                  <template #default="{ row: remboursement }">
                    <el-button
                      text
                      size="small"
                      type="danger"
                      :disabled="saving"
                      title="Supprimer ce remboursement"
                      @click="removeRemboursement(remboursement.id)"
                    >
                      Supprimer
                    </el-button>
                  </template>
                </el-table-column>
              </el-table>
            </div>
          </template>
        </el-table-column>
        <el-table-column
          label="Référence"
          min-width="150"
        >
          <template #default="{ row }">
            <span class="apports-tab__reference">{{ row.reference || `#${row.id}` }}</span>
          </template>
        </el-table-column>
        <el-table-column
          label="Type"
          width="120"
        >
          <template #default="{ row }">
            <span :class="row.type === 'dette' ? 'cde-badge cde-badge--warning' : 'cde-badge cde-badge--info'">
              {{ typeLabel(row.type) }}
            </span>
          </template>
        </el-table-column>
        <el-table-column
          label="Libellé"
          min-width="220"
        >
          <template #default="{ row }">
            {{ row.libelle || '—' }}
          </template>
        </el-table-column>
        <el-table-column
          label="Date"
          width="110"
        >
          <template #default="{ row }">
            {{ formatDate(row.dateApport) }}
          </template>
        </el-table-column>
        <el-table-column
          label="Montant (GNF)"
          width="140"
          align="right"
        >
          <template #default="{ row }">
            <span class="cde-num">{{ formatMontant(row.montant) }}</span>
          </template>
        </el-table-column>
        <el-table-column
          label="Remboursé (GNF)"
          width="145"
          align="right"
        >
          <template #default="{ row }">
            <span class="cde-num">{{ formatMontant(row.montantRembourse ?? 0) }}</span>
          </template>
        </el-table-column>
        <el-table-column
          label="Reste (GNF)"
          width="135"
          align="right"
        >
          <template #default="{ row }">
            <span :class="['cde-num', { 'cde-danger': (row.resteARembourser ?? 0) > 0 }]">
              {{ formatMontant(row.resteARembourser ?? 0) }}
            </span>
          </template>
        </el-table-column>
        <el-table-column
          label="Statut"
          width="110"
        >
          <template #default="{ row }">
            <span :class="badgeClass(statutTone(row.statut))">
              {{ statutLabel(row.statut) }}
            </span>
          </template>
        </el-table-column>
        <el-table-column
          label="Actions"
          width="130"
          align="right"
        >
          <template #default="{ row }">
            <el-dropdown
              trigger="click"
              @command="(command: DropdownCommand) => handleCommand(command)"
            >
              <el-button
                text
                size="small"
                type="primary"
                title="Actions sur l'apport"
              >
                Actions
                <el-icon><ArrowDown /></el-icon>
              </el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item
                    v-if="canEdit(row)"
                    :command="{ action: 'edit', row }"
                  >
                    Modifier
                  </el-dropdown-item>
                  <el-dropdown-item
                    v-if="canRembourser(row)"
                    :command="{ action: 'rembourser', row }"
                  >
                    Rembourser
                  </el-dropdown-item>
                  <el-dropdown-item
                    v-if="canAnnuler(row)"
                    :command="{ action: 'annuler', row }"
                    divided
                  >
                    Annuler l'apport
                  </el-dropdown-item>
                  <el-dropdown-item
                    v-if="canDelete(row)"
                    :command="{ action: 'delete', row }"
                  >
                    Supprimer
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </template>
        </el-table-column>
        <template #empty>
          <div class="cde-empty">
            Aucun apport pour ces critères.
          </div>
        </template>
      </el-table>
    </div>

    <div class="cde-footer">
      <span class="cde-muted">{{ apports.length }} apport(s) — montants sur la sélection</span>
    </div>

    <ApportFormDialog
      ref="formDialogRef"
      @saved="onSaved"
    />
    <ApportRemboursementDialog
      ref="remboursementDialogRef"
      @saved="onSaved"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ArrowDown, Plus, Refresh, Search } from '@element-plus/icons-vue'
import { formatDate } from '@/utils/date'
import { formatMontant } from '@/components/comptabilite/format'
import { MODES_PAIEMENT } from '@/composables/useSalaires'
import ApportFormDialog from './ApportFormDialog.vue'
import ApportRemboursementDialog from './ApportRemboursementDialog.vue'
import {
  APPORT_STATUT_LABEL,
  APPORT_STATUT_TONE,
  APPORT_TYPE_LABEL,
  useApports,
  type ApportDto,
  type ApportStatut,
  type ApportType,
} from '@/composables/useApports'

const emit = defineEmits<{ changed: [] }>()

/** Commande envoyée à la liste déroulante d'actions. */
interface DropdownCommand {
  action: 'edit' | 'rembourser' | 'annuler' | 'delete'
  row: ApportDto
}

const {
  apports,
  loading,
  saving,
  error,
  clearError,
  fetchApports,
  annulerApport,
  deleteApport,
  deleteRemboursement,
} = useApports()

const formDialogRef = ref<InstanceType<typeof ApportFormDialog> | null>(null)
const remboursementDialogRef = ref<InstanceType<typeof ApportRemboursementDialog> | null>(null)

const search = ref('')
const type = ref<ApportType | null>(null)
const statut = ref<ApportStatut | null>(null)
const dateDebut = ref('')
const dateFin = ref('')

let searchTimer: ReturnType<typeof setTimeout> | undefined

const totaux = computed(() => {
  const actifs = apports.value.filter((apport) => apport.statut !== 'annule')
  const dettes = actifs.filter((apport) => apport.type === 'dette')
  return {
    total: actifs.reduce((sum, apport) => sum + (apport.montant ?? 0), 0),
    fondsPropres: actifs
      .filter((apport) => apport.type === 'fonds_propres')
      .reduce((sum, apport) => sum + (apport.montant ?? 0), 0),
    resteDettes: dettes.reduce((sum, apport) => sum + (apport.resteARembourser ?? 0), 0),
    dettesOuvertes: dettes.filter((apport) => (apport.resteARembourser ?? 0) > 0).length,
    rembourse: actifs.reduce((sum, apport) => sum + (apport.montantRembourse ?? 0), 0),
  }
})

/** Charge la liste avec les filtres courants. */
async function load() {
  clearError()
  const filtres: {
    type?: ApportType
    statut?: ApportStatut
    dateDebut?: string
    dateFin?: string
    search?: string
  } = {}
  const trimmed = search.value.trim()
  if (trimmed) filtres.search = trimmed
  if (type.value) filtres.type = type.value
  if (statut.value) filtres.statut = statut.value
  if (dateDebut.value) filtres.dateDebut = dateDebut.value
  if (dateFin.value) filtres.dateFin = dateFin.value
  await fetchApports(filtres)
}

watch([type, statut, dateDebut, dateFin], load)
watch(search, () => {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(load, 250)
})

/**
 * Ouvre le formulaire de création ou de modification.
 *
 * @param target - Apport à modifier, absent pour créer.
 */
function openForm(target?: ApportDto) {
  formDialogRef.value?.open(target)
}

/**
 * Exécute l'action choisie dans la liste déroulante.
 *
 * @param command - Action et apport concerné.
 */
async function handleCommand(command: DropdownCommand) {
  const { action, row } = command
  if (row.id == null) return
  if (action === 'edit') {
    openForm(row)
    return
  }
  if (action === 'rembourser') {
    remboursementDialogRef.value?.open(row)
    return
  }
  if (action === 'annuler') {
    if (!await confirm(`Annuler l'apport ${row.reference || `#${row.id}`} ?`, "Annuler l'apport")) return
    const updated = await annulerApport(row.id)
    if (updated) ElMessage.success('Apport annulé')
    else ElMessage.error(error.value || 'Annulation impossible')
    if (updated) emit('changed')
    await load()
    return
  }
  if (action === 'delete') {
    if (!await confirm(`Supprimer définitivement l'apport ${row.reference || `#${row.id}`} ?`, "Supprimer l'apport")) return
    const ok = await deleteApport(row.id)
    if (ok) ElMessage.success('Apport supprimé')
    else ElMessage.error(error.value || 'Suppression impossible')
    if (ok) emit('changed')
    await load()
  }
}

/**
 * Supprime un remboursement après confirmation.
 *
 * @param id - Identifiant du remboursement.
 */
async function removeRemboursement(id: number | undefined) {
  if (id == null) return
  if (!await confirm('Supprimer ce remboursement ? Le statut de la dette sera recalculé.', 'Supprimer le remboursement')) return
  const updated = await deleteRemboursement(id)
  if (updated) ElMessage.success('Remboursement supprimé')
  else ElMessage.error(error.value || 'Suppression impossible')
  if (updated) emit('changed')
  await load()
}

/**
 * Demande une confirmation destructive.
 *
 * @param message - Message de confirmation.
 * @param title - Titre de la boîte.
 */
async function confirm(message: string, title: string): Promise<boolean> {
  try {
    await ElMessageBox.confirm(message, title, {
      confirmButtonText: 'Confirmer',
      cancelButtonText: 'Annuler',
      type: 'warning',
    })
    return true
  } catch {
    return false
  }
}

/** Recharge la liste et notifie le parent après un enregistrement réussi. */
async function onSaved() {
  emit('changed')
  await load()
}

function canEdit(row: ApportDto): boolean {
  return row.statut === 'ouvert'
}

function canRembourser(row: ApportDto): boolean {
  return row.type === 'dette' && row.statut === 'ouvert' && (row.resteARembourser ?? 0) > 0
}

function canAnnuler(row: ApportDto): boolean {
  return row.statut === 'ouvert' && (row.montantRembourse ?? 0) === 0
}

function canDelete(row: ApportDto): boolean {
  return row.statut === 'annule'
}

/**
 * Libellé d'un type d'apport.
 *
 * @param value - Type éventuellement absent.
 */
function typeLabel(value: ApportType | undefined): string {
  return value ? APPORT_TYPE_LABEL[value] : '—'
}

/**
 * Libellé d'un statut.
 *
 * @param value - Statut éventuellement absent.
 */
function statutLabel(value: ApportStatut | undefined): string {
  return value ? APPORT_STATUT_LABEL[value] : '—'
}

/**
 * Ton de badge d'un statut.
 *
 * @param value - Statut éventuellement absent.
 */
function statutTone(value: ApportStatut | undefined): string {
  return value ? APPORT_STATUT_TONE[value] : 'muted'
}

/**
 * Classe CSS d'un badge.
 *
 * @param tone - Ton du badge.
 */
function badgeClass(tone: string): string {
  const allowed = ['success', 'warning', 'danger', 'info', 'muted']
  return `cde-badge cde-badge--${allowed.includes(tone) ? tone : 'muted'}`
}

/**
 * Libellé d'un mode de paiement.
 *
 * @param value - Mode éventuellement absent.
 */
function modeLabel(value: string | undefined): string {
  return MODES_PAIEMENT.find((mode) => mode.value === value)?.label ?? '—'
}

onMounted(load)

onBeforeUnmount(() => {
  if (searchTimer) clearTimeout(searchTimer)
})
</script>

<style scoped>
.apports-tab {
  min-width: 0;
}

.apports-tab__reference {
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.apports-tab__remboursements {
  padding: 6px 12px 10px 42px;
  background: var(--cde-surface-alt, #fafafa);
}

.apports-tab__no-remboursement {
  font-size: 12px;
  padding: 4px 0;
}
</style>
