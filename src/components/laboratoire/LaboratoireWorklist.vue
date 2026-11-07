<template>
  <div class="labo-worklist">
    <p class="labo-worklist__hint">
      Toutes les demandes d'examen du laboratoire. Les demandes internes proviennent du
      dossier clinique du patient ; seules les demandes externes sont créées ici.
    </p>

    <div class="cde-toolbar">
      <div class="cde-filters">
        <div class="cde-filter cde-toolbar__search">
          <span class="cde-filter__label">Recherche</span>
          <el-input
            v-model="search"
            placeholder="N°, patient…"
            clearable
            :prefix-icon="Search"
            class="cde-toolbar__search-input"
            @keyup.enter="emit('refresh')"
            @clear="emit('refresh')"
          />
        </div>
        <div class="cde-filter">
          <span class="cde-filter__label">Statut</span>
          <el-select
            v-model="statut"
            class="cde-toolbar__select"
            @change="emit('refresh')"
          >
            <el-option
              label="Tous"
              value="tous"
            />
            <el-option
              v-for="(label, value) in LABO_STATUT_LABEL"
              :key="value"
              :label="label"
              :value="value"
            />
          </el-select>
        </div>
        <div class="cde-filter">
          <span class="cde-filter__label">Priorité</span>
          <el-select
            v-model="priorite"
            class="cde-toolbar__select"
            clearable
            placeholder="Toutes"
            @change="emit('refresh')"
          >
            <el-option
              label="Normale"
              value="normale"
            />
            <el-option
              label="Urgente"
              value="urgente"
            />
          </el-select>
        </div>
        <div class="cde-filter">
          <span class="cde-filter__label">Origine</span>
          <el-select
            v-model="origine"
            class="cde-toolbar__select"
            @change="emit('refresh')"
          >
            <el-option
              label="Toutes"
              value="toutes"
            />
            <el-option
              label="Dossier patient (interne)"
              value="interne"
            />
            <el-option
              label="Externe (à la volée)"
              value="externe"
            />
          </el-select>
        </div>
      </div>
      <div class="cde-toolbar__actions">
        <el-button
          :icon="Refresh"
          @click="emit('refresh')"
        >
          Actualiser
        </el-button>
        <el-button
          type="primary"
          :icon="Plus"
          @click="emit('create')"
        >
          Nouvelle demande externe
        </el-button>
      </div>
    </div>

    <div class="cde-table-wrap">
      <el-table
        v-loading="loading"
        :data="rows"
        size="small"
        style="width: 100%"
        aria-label="Demandes du laboratoire"
        @row-dblclick="(row: LaboDemande) => emit('detail', row)"
      >
        <el-table-column
          label="N°"
          width="150"
        >
          <template #default="{ row }">
            <span class="labo__numero">{{ row.numero || '—' }}</span>
          </template>
        </el-table-column>
        <el-table-column
          label="Date"
          width="100"
        >
          <template #default="{ row }">
            {{ row.plannedDate || '—' }}
          </template>
        </el-table-column>
        <el-table-column
          label="Heure"
          width="80"
        >
          <template #default="{ row }">
            {{ formatHeure(row.plannedHour) }}
          </template>
        </el-table-column>
        <el-table-column
          label="Patient"
          min-width="180"
        >
          <template #default="{ row }">
            <template v-if="row.patientExterne">
              {{ row.externePrenom }} {{ row.externeNom }}
            </template>
            <template v-else>
              {{ row.patientPrenom }} {{ row.patientNom }}
            </template>
          </template>
        </el-table-column>
        <el-table-column
          label="Origine"
          width="110"
        >
          <template #default="{ row }">
            <el-tag
              size="small"
              :type="row.patientExterne ? 'warning' : 'info'"
              effect="plain"
            >
              {{ row.patientExterne ? 'Externe' : 'Interne' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column
          label="Examen"
          min-width="160"
        >
          <template #default="{ row }">
            {{ row.examenLabel || (row.examIds?.length ? `${row.examIds.length} examen(s)` : '—') }}
          </template>
        </el-table-column>
        <el-table-column
          label="Priorité"
          width="100"
        >
          <template #default="{ row }">
            <el-tag
              size="small"
              :type="row.priorite === 'urgente' ? 'danger' : 'info'"
              effect="plain"
            >
              {{ row.priorite === 'urgente' ? 'Urgente' : 'Normale' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column
          label="Statut"
          width="110"
        >
          <template #default="{ row }">
            <el-tag
              size="small"
              :type="LABO_STATUT_TYPE[(row.statut as LaboStatut) || 'en_attente']"
              effect="plain"
            >
              {{ LABO_STATUT_LABEL[(row.statut as LaboStatut) || 'en_attente'] }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column
          label="Prélèvement"
          width="130"
        >
          <template #default="{ row }">
            <span v-if="row.prelevementAt">{{ row.prelevementType || 'Prélevé' }}</span>
            <span
              v-else
              class="labo__muted"
            >—</span>
          </template>
        </el-table-column>
        <el-table-column
          label="Paiement"
          width="130"
        >
          <template #default="{ row }">
            <template v-if="row.patientExterne">
              <el-tag
                size="small"
                :type="row.statutPaiement === 'paye' ? 'success' : row.statutPaiement === 'exonere' ? 'info' : 'warning'"
                effect="plain"
              >
                {{ LABO_PAIEMENT_LABEL[(row.statutPaiement as LaboStatutPaiement) || 'non_paye'] }}
              </el-tag>
              <div
                v-if="row.montant != null"
                class="labo__paiement-detail"
              >
                {{ formatMontant(row.montantPaye ?? 0) }} / {{ formatMontant(row.montant) }}
              </div>
            </template>
            <span
              v-else
              class="labo__muted"
            >Facturé au dossier</span>
          </template>
        </el-table-column>
        <el-table-column
          label="Actions"
          width="300"
          fixed="right"
        >
          <template #default="{ row }">
            <el-button
              v-if="row.statut === 'en_attente'"
              link
              type="primary"
              size="small"
              @click="emit('prelever', row)"
            >
              Prélever
            </el-button>
            <el-button
              v-if="row.statut !== 'annule' && row.statut !== 'realise'"
              link
              type="success"
              size="small"
              @click="emit('resultats', row)"
            >
              Résultats
            </el-button>
            <el-button
              v-if="canCashier && row.patientExterne && row.statutPaiement !== 'paye' && row.statutPaiement !== 'exonere' && (row.montant ?? 0) > 0"
              link
              type="warning"
              size="small"
              @click="emit('payer', row)"
            >
              Encaisser
            </el-button>
            <el-button
              v-if="row.statut !== 'annule' && row.statut !== 'realise'"
              link
              type="danger"
              size="small"
              @click="emit('annuler', row)"
            >
              Annuler
            </el-button>
            <el-button
              link
              size="small"
              @click="emit('recu', row)"
            >
              Reçu
            </el-button>
            <el-button
              link
              size="small"
              @click="emit('detail', row)"
            >
              Détail
            </el-button>
          </template>
        </el-table-column>
        <template #empty>
          <el-empty
            description="Aucune demande de laboratoire"
            :image-size="70"
          />
        </template>
      </el-table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Plus, Refresh, Search } from '@element-plus/icons-vue'
import {
  LABO_PAIEMENT_LABEL,
  LABO_STATUT_LABEL,
  LABO_STATUT_TYPE,
  type LaboDemande,
  type LaboStatut,
  type LaboStatutPaiement,
} from '@/composables/useLaboratoire'

defineProps<{
  rows: LaboDemande[]
  loading: boolean
  canCashier: boolean
}>()

const search = defineModel<string>('search', { required: true })
const statut = defineModel<LaboStatut | 'tous'>('statut', { required: true })
const priorite = defineModel<'' | 'normale' | 'urgente'>('priorite', { required: true })
const origine = defineModel<'toutes' | 'interne' | 'externe'>('origine', { required: true })

const emit = defineEmits<{
  refresh: []
  create: []
  detail: [row: LaboDemande]
  prelever: [row: LaboDemande]
  resultats: [row: LaboDemande]
  payer: [row: LaboDemande]
  annuler: [row: LaboDemande]
  recu: [row: LaboDemande]
}>()

function formatMontant(value: number): string {
  return `${new Intl.NumberFormat('fr-FR').format(value)} GNF`
}

/** Affiche une heure planifiée (`9` → `09:00`). */
function formatHeure(value?: number | null): string {
  if (value == null) return '—'
  return `${String(value).padStart(2, '0')}:00`
}
</script>

<style scoped>
.labo-worklist__hint {
  margin: 0 0 12px;
  font-size: 12px;
  color: var(--cd-gray-500, #909399);
}

.labo__numero {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 12px;
}

.labo__muted {
  color: var(--cd-gray-400, #c0c4cc);
}

.labo__paiement-detail {
  margin-top: 2px;
  font-size: 10px;
  color: var(--cd-gray-500, #909399);
  white-space: nowrap;
}
</style>
