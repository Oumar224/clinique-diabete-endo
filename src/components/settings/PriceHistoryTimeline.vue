<template>
  <div class="pht">
    <el-timeline v-if="history.length > 0">
      <el-timeline-item
        v-for="entry in history"
        :key="entry.id"
        :timestamp="formatDate(entry.date_application)"
        placement="top"
      >
        <div class="pht__entry">
          <span class="pht__price">
            <span class="pht__new">{{ format(entry.prix_unitaire) }}</span>
          </span>
          <span class="pht__meta">
            <span class="cde-badge cde-badge--muted">{{ entry.code_tarif }}</span>
          </span>
        </div>
      </el-timeline-item>
    </el-timeline>
    <div v-else class="cde-empty">
      Aucun historique de prix.
    </div>
  </div>
</template>

<script setup lang="ts">
import { useCurrencies } from '@/composables/useCurrencies'
import { formatDate } from '@/utils/date'

export interface PriceHistoryEntry {
  id: number
  acte_id: number
  code_tarif: string
  prix_unitaire: number
  date_application: string
}

defineProps<{
  history: PriceHistoryEntry[]
}>()

const { formatCurrency } = useCurrencies()

function format(amount: number | null): string {
  if (amount === null) return '\u2014'
  return formatCurrency(amount)
}
</script>

<style scoped>
.pht {
  padding: 10px 12px;
}

.pht__entry {
  display: flex;
  align-items: center;
  gap: 8px;
}

.pht__price {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
}

.pht__new {
  color: var(--cd-gray-900);
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.pht__meta {
  display: flex;
  align-items: center;
}
</style>
