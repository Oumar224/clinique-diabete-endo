<template>
  <div class="commandes-tab">
    <div class="cde-toolbar">
      <div class="cde-filters">
        <div class="cde-filter cde-toolbar__search">
          <span class="cde-filter__label">Recherche</span>
          <el-input
            v-model="search"
            placeholder="Rechercher un bon ou un fournisseur…"
            clearable
            :prefix-icon="Search"
            class="cde-toolbar__search-input"
          />
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
              v-for="option in statutOptions"
              :key="option.value"
              :label="option.label"
              :value="option.value"
            />
          </el-select>
        </div>
        <div class="cde-filter">
          <span class="cde-filter__label">Fournisseur</span>
          <el-select
            v-model="fournisseurId"
            clearable
            filterable
            placeholder="Tous"
            class="cde-toolbar__select"
            aria-label="Filtrer par fournisseur"
          >
            <el-option
              v-for="option in fournisseurOptions"
              :key="option.value"
              :label="option.label"
              :value="option.value"
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
          Nouveau bon
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

    <div class="cde-table-wrap">
      <el-table
        v-loading="loading"
        :data="commandes"
        size="small"
        style="width: 100%"
        aria-label="Bons de commande pharmacie"
        class="commandes-tab__table"
        @row-click="onRowClick"
      >
        <el-table-column
          label="N°"
          min-width="150"
        >
          <template #default="{ row }">
            <span class="commandes-tab__numero">{{ row.numero || `#${row.id}` }}</span>
            <span
              v-if="row.urgence"
              class="cde-badge cde-badge--danger commandes-tab__urgence"
            >
              Urgent
            </span>
          </template>
        </el-table-column>
        <el-table-column
          label="Fournisseur"
          min-width="170"
        >
          <template #default="{ row }">
            {{ row.fournisseurNom || '—' }}
          </template>
        </el-table-column>
        <el-table-column
          label="Commandé le"
          width="110"
        >
          <template #default="{ row }">
            {{ formatDate(row.dateCommande) }}
          </template>
        </el-table-column>
        <el-table-column
          label="Prévue le"
          width="110"
        >
          <template #default="{ row }">
            {{ formatDate(row.datePrevue) }}
          </template>
        </el-table-column>
        <el-table-column
          label="Lignes"
          width="80"
          align="right"
        >
          <template #default="{ row }">
            <span class="cde-num">{{ row.totalLignes ?? 0 }}</span>
          </template>
        </el-table-column>
        <el-table-column
          label="Qté cmd"
          width="90"
          align="right"
        >
          <template #default="{ row }">
            <span class="cde-num">{{ row.totalQuantiteCommandee ?? 0 }}</span>
          </template>
        </el-table-column>
        <el-table-column
          label="Qté livrée"
          width="100"
          align="right"
        >
          <template #default="{ row }">
            <span class="cde-num">{{ row.totalQuantiteLivree ?? 0 }}</span>
          </template>
        </el-table-column>
        <el-table-column
          label="Statut"
          width="120"
        >
          <template #default="{ row }">
            <span :class="badgeClass(statutTone(row.statut))">
              {{ statutLabel(row.statut) }}
            </span>
          </template>
        </el-table-column>
        <el-table-column
          label="Actions"
          width="120"
          align="right"
        >
          <template #default="{ row }">
            <span
              class="commandes-tab__actions"
              @click.stop
            >
              <el-dropdown
                trigger="click"
                @command="(command: DropdownCommand) => handleCommand(command)"
              >
                <el-button
                  text
                  size="small"
                  title="Actions"
                >
                  Actions
                  <el-icon><ArrowDown /></el-icon>
                </el-button>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item
                      v-if="isBrouillon(row)"
                      :command="{ action: 'edit', row }"
                    >
                      Modifier
                    </el-dropdown-item>
                    <el-dropdown-item
                      v-if="isBrouillon(row)"
                      :command="{ action: 'envoyer', row }"
                    >
                      Envoyer au fournisseur
                    </el-dropdown-item>
                    <el-dropdown-item
                      v-if="canReceptionner(row)"
                      :command="{ action: 'receptionner', row }"
                    >
                      Réceptionner
                    </el-dropdown-item>
                    <el-dropdown-item
                      v-if="canCloturer(row)"
                      :command="{ action: 'cloturer', row }"
                    >
                      Clôturer
                    </el-dropdown-item>
                    <el-dropdown-item
                      v-if="canAnnuler(row)"
                      :command="{ action: 'annuler', row }"
                      divided
                    >
                      Annuler le bon
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
            </span>
          </template>
        </el-table-column>
        <template #empty>
          <div class="cde-empty">
            Aucun bon de commande pour ces critères.
          </div>
        </template>
      </el-table>
    </div>

    <div class="cde-footer">
      <span class="cde-muted">{{ commandes.length }} bon(s) de commande</span>
    </div>

    <CommandeFormDialog
      ref="formDialogRef"
      @saved="onSaved"
    />
    <CommandeDetailDialog ref="detailDialogRef" />
    <ReceptionCommandeDialog
      ref="receptionDialogRef"
      @saved="onSaved"
    />
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ArrowDown, Plus, Refresh, Search } from '@element-plus/icons-vue'
import { formatDate } from '@/utils/date'
import { useFournisseurs } from '@/composables/useFournisseurs'
import CommandeFormDialog from './CommandeFormDialog.vue'
import CommandeDetailDialog from './CommandeDetailDialog.vue'
import ReceptionCommandeDialog from './ReceptionCommandeDialog.vue'
import {
  COMMANDE_STATUT_LABEL,
  COMMANDE_STATUT_TONE,
  useCommandes,
  type CommandeDto,
  type CommandeStatut,
  type CommandeListFiltres,
} from '@/composables/useCommandes'

/** Commande envoyée à la liste déroulante d'actions. */
interface DropdownCommand {
  action: 'edit' | 'envoyer' | 'receptionner' | 'cloturer' | 'annuler' | 'delete'
  row: CommandeDto
}

const { commandes, loading, error, clearError, fetchCommandes, envoyerCommande, cloturerCommande, annulerCommande, deleteCommande } = useCommandes()
const { fournisseurOptions, fetchFournisseurs } = useFournisseurs()

const formDialogRef = ref<InstanceType<typeof CommandeFormDialog> | null>(null)
const detailDialogRef = ref<InstanceType<typeof CommandeDetailDialog> | null>(null)
const receptionDialogRef = ref<InstanceType<typeof ReceptionCommandeDialog> | null>(null)

const search = ref('')
const statut = ref<CommandeStatut | null>(null)
const fournisseurId = ref<number | null>(null)
const dateDebut = ref('')
const dateFin = ref('')

const statutOptions = (Object.keys(COMMANDE_STATUT_LABEL) as CommandeStatut[]).map((value) => ({
  value,
  label: COMMANDE_STATUT_LABEL[value],
}))

let searchTimer: ReturnType<typeof setTimeout> | undefined

/** Charge la liste avec les filtres courants. */
async function load() {
  clearError()
  const filtres: CommandeListFiltres = {}
  const trimmed = search.value.trim()
  if (trimmed) filtres.search = trimmed
  if (statut.value) filtres.statut = statut.value
  if (fournisseurId.value != null) filtres.fournisseurId = fournisseurId.value
  if (dateDebut.value) filtres.dateDebut = dateDebut.value
  if (dateFin.value) filtres.dateFin = dateFin.value
  await fetchCommandes(filtres)
}

watch([statut, fournisseurId, dateDebut, dateFin], load)
watch(search, () => {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(load, 250)
})

/**
 * Ouvre le formulaire de création ou de modification.
 *
 * @param target - Bon à modifier, absent pour créer.
 */
function openForm(target?: CommandeDto) {
  formDialogRef.value?.open(target)
}

/**
 * Ouvre la fiche détaillée d'un bon.
 *
 * @param row - Bon sélectionné.
 */
function openDetail(row: CommandeDto) {
  if (row.id == null) return
  detailDialogRef.value?.open(row.id)
}

/**
 * Ouvre la fiche détaillée au clic sur une ligne de la liste.
 *
 * @param row - Bon sélectionné.
 */
function onRowClick(row: CommandeDto) {
  openDetail(row)
}

/**
 * Ouvre le dialogue de réception.
 *
 * @param row - Bon à réceptionner.
 */
function openReception(row: CommandeDto) {
  receptionDialogRef.value?.open(row)
}

/**
 * Exécute l'action choisie dans la liste déroulante.
 *
 * @param command - Action et bon concerné.
 */
async function handleCommand(command: DropdownCommand) {
  const { action, row } = command
  if (row.id == null) return
  if (action === 'edit') {
    openForm(row)
    return
  }
  if (action === 'receptionner') {
    openReception(row)
    return
  }
  if (action === 'envoyer') {
    const updated = await envoyerCommande(row.id)
    if (updated) ElMessage.success('Bon envoyé au fournisseur')
    else ElMessage.error(error.value || "Envoi impossible")
    await load()
    return
  }
  if (action === 'cloturer') {
    const updated = await cloturerCommande(row.id)
    if (updated) ElMessage.success('Bon clôturé')
    else ElMessage.error(error.value || 'Clôture impossible')
    await load()
    return
  }
  if (action === 'annuler') {
    if (!await confirm(`Annuler le bon ${row.numero || `#${row.id}`} ?`, 'Annuler le bon')) return
    const updated = await annulerCommande(row.id)
    if (updated) ElMessage.success('Bon annulé')
    else ElMessage.error(error.value || 'Annulation impossible')
    await load()
    return
  }
  if (action === 'delete') {
    if (!await confirm(`Supprimer définitivement le bon ${row.numero || `#${row.id}`} ?`, 'Supprimer le bon')) return
    const ok = await deleteCommande(row.id)
    if (ok) ElMessage.success('Bon supprimé')
    else ElMessage.error(error.value || 'Suppression impossible')
    await load()
  }
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

/** Recharge la liste après une création ou une réception. */
async function onSaved() {
  await load()
}

/**
 * Libellé d'un statut.
 *
 * @param value - Statut éventuellement absent.
 */
function statutLabel(value: CommandeStatut | undefined): string {
  return value ? COMMANDE_STATUT_LABEL[value] : '—'
}

/**
 * Ton de badge d'un statut.
 *
 * @param value - Statut éventuellement absent.
 */
function statutTone(value: CommandeStatut | undefined): string {
  return value ? COMMANDE_STATUT_TONE[value] : 'muted'
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

function isBrouillon(row: CommandeDto): boolean {
  return row.statut === 'brouillon'
}

function canReceptionner(row: CommandeDto): boolean {
  return row.statut === 'envoyee' || row.statut === 'partielle'
}

function canCloturer(row: CommandeDto): boolean {
  return row.statut === 'envoyee' || row.statut === 'partielle' || row.statut === 'livree'
}

function canAnnuler(row: CommandeDto): boolean {
  return row.statut === 'brouillon' || row.statut === 'envoyee'
}

function canDelete(row: CommandeDto): boolean {
  return row.statut === 'brouillon' || row.statut === 'annulee'
}

onMounted(async () => {
  await fetchFournisseurs({ actif: true }).catch(() => undefined)
  await load()
})
</script>

<style scoped>
.commandes-tab {
  min-width: 0;
}

.commandes-tab__numero {
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.commandes-tab__urgence {
  margin-left: 6px;
}

/* La ligne entière ouvre le détail : curseur explicite + zone d'actions
   neutralisée (le menu ne doit pas déclencher l'ouverture). */
.commandes-tab__table :deep(.el-table__body tr) {
  cursor: pointer;
}

.commandes-tab__actions {
  display: inline-flex;
  justify-content: flex-end;
}

.cde-alert {
  margin-bottom: 8px;
}
</style>
