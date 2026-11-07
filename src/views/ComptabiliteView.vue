<template>
  <div class="comptabilite cde">
    <header class="cde-page-head">
      <div>
        <h1 class="cde-page-title">
          Comptabilité &amp; Caisse
        </h1>
        <p class="cde-page-sub">
          {{ canManage ? 'Factures, salaires, dépenses et apports en francs guinéens (GNF).' : 'Émettez, encaissez et suivez les factures en francs guinéens (GNF).' }}
        </p>
      </div>
      <div
        v-if="canManage"
        class="cde-head-actions"
      >
        <span class="cde-field-label">Période</span>
        <el-date-picker
          v-model="summaryPeriod"
          class="comptabilite__period"
          type="month"
          value-format="YYYY-MM"
          :clearable="false"
          placeholder="Mois"
          aria-label="Période de la synthèse"
          @change="loadSummary"
        />
      </div>
    </header>

    <template v-if="canManage">
      <section
        class="cde-summary comptabilite__summary"
        aria-label="Synthèse de la période"
      >
        <div class="cde-summary__item">
          <span class="cde-summary__label">Solde caisse</span>
          <span class="cde-summary__value summary-card__value">{{ caisse ? formatCurrency(caisse.solde) : '—' }}</span>
        </div>
        <div class="cde-summary__item">
          <span class="cde-summary__label">Encaissements</span>
          <span class="cde-summary__value summary-card__value">{{ caisse ? formatCurrency(caisse.entrees) : '—' }}</span>
        </div>
        <div class="cde-summary__item">
          <span class="cde-summary__label">Créances</span>
          <span class="cde-summary__value summary-card__value">{{ pharmacie ? formatCurrency(pharmacie.creances ?? 0) : '—' }}</span>
        </div>
        <div class="cde-summary__item">
          <span class="cde-summary__label">Dépenses crédit</span>
          <span class="cde-summary__value summary-card__value cde-summary__value--danger">{{ depensesSynthese ? formatCurrency(depensesSynthese.totalCredit) : '—' }}</span>
        </div>
      </section>

      <el-alert
        v-if="summaryError"
        class="cde-alert"
        type="warning"
        :closable="false"
        show-icon
        :title="summaryError"
      >
        <template #default>
          <el-button
            text
            type="primary"
            size="small"
            :loading="summaryLoading"
            @click="loadSummary"
          >
            Réessayer
          </el-button>
        </template>
      </el-alert>
    </template>

    <el-tabs
      v-if="canManage"
      v-model="activeTab"
      class="cde-tabs"
    >
      <el-tab-pane
        label="Factures"
        name="factures"
      >
        <FacturesTab />
      </el-tab-pane>
      <el-tab-pane
        label="Salaires"
        name="salaires"
        lazy
      >
        <SalairesTab />
      </el-tab-pane>
      <el-tab-pane
        label="Dépenses"
        name="depenses"
        lazy
      >
        <DepensesTab />
      </el-tab-pane>
      <el-tab-pane
        label="Apports"
        name="apports"
        lazy
      >
        <ApportsTab @changed="loadSummary" />
      </el-tab-pane>
      <el-tab-pane
        label="Pharmacie"
        name="pharmacie"
        lazy
      >
        <PharmacieComptabiliteTab />
      </el-tab-pane>
      <el-tab-pane
        label="Laboratoire"
        name="laboratoire"
        lazy
      >
        <LaboratoireComptabiliteTab />
      </el-tab-pane>
    </el-tabs>

    <FacturesTab v-else />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { ipcInvoke } from '@/utils/ipc'
import { useAuth } from '@/composables/useAuth'
import { useCurrency } from '@/currency/useCurrency'
import FacturesTab from '@/components/comptabilite/FacturesTab.vue'
import SalairesTab from '@/components/comptabilite/SalairesTab.vue'
import DepensesTab from '@/components/comptabilite/DepensesTab.vue'
import ApportsTab from '@/components/comptabilite/ApportsTab.vue'
import PharmacieComptabiliteTab from '@/components/comptabilite/PharmacieComptabiliteTab.vue'
import LaboratoireComptabiliteTab from '@/components/comptabilite/LaboratoireComptabiliteTab.vue'

interface CaisseSynthese {
  entrees: number
  sorties: number
  solde: number
  count: number
}

interface PharmacieSynthese {
  creances?: number
}

interface DepenseSynthese {
  total: number
  totalPaye: number
  totalCredit: number
  count: number
}

const { user } = useAuth()
const { formatCurrency, loadCurrency } = useCurrency()

const activeTab = ref('factures')
const summaryPeriod = ref(currentMonth())
const caisse = ref<CaisseSynthese | null>(null)
const pharmacie = ref<PharmacieSynthese | null>(null)
const depensesSynthese = ref<DepenseSynthese | null>(null)
const summaryLoading = ref(false)
const summaryError = ref('')

const canManage = computed(() => ['ADMIN', 'COMPTABLE'].includes(user.value?.role ?? ''))

function currentMonth(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function monthRange(periode: string): { dateDebut: string; dateFin: string } {
  const [year, month] = periode.split('-').map(Number)
  const lastDay = new Date(year, month, 0).getDate()
  return {
    dateDebut: `${periode}-01`,
    dateFin: `${periode}-${String(lastDay).padStart(2, '0')}`,
  }
}

onMounted(async () => {
  await loadCurrency()
  if (canManage.value) await loadSummary()
})

async function loadSummary() {
  if (!canManage.value) return
  summaryLoading.value = true
  summaryError.value = ''
  const range = monthRange(summaryPeriod.value)

  const [caisseResult, pharmacieResult, depensesResult] = await Promise.allSettled([
    ipcInvoke<CaisseSynthese>('caisse:synthese', range, { silent: true }),
    ipcInvoke<PharmacieSynthese>('dispensation:synthese-comptable', range, { silent: true }),
    ipcInvoke<DepenseSynthese>('depense:synthese', range, { silent: true }),
  ])

  caisse.value = caisseResult.status === 'fulfilled' ? caisseResult.value : null
  pharmacie.value = pharmacieResult.status === 'fulfilled' ? pharmacieResult.value : null
  depensesSynthese.value = depensesResult.status === 'fulfilled' ? depensesResult.value : null

  const failed = [caisseResult, pharmacieResult, depensesResult].filter((r) => r.status === 'rejected').length
  if (failed === 3) summaryError.value = 'Synthèse comptable indisponible pour cette période.'
  else if (failed > 0) summaryError.value = 'Certaines synthèses sont indisponibles pour cette période.'

  summaryLoading.value = false
}
</script>

<style scoped>
.comptabilite {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.comptabilite__period {
  width: 142px;
}

.comptabilite__period :deep(.el-input__wrapper) {
  min-height: 28px;
}
</style>
