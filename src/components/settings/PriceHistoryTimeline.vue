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
            <el-tag size="small" type="info">{{ entry.code_tarif }}</el-tag>
          </span>
        </div>
      </el-timeline-item>
    </el-timeline>
    <el-empty v-else description="Aucun historique de prix" :image-size="80" />
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
  padding: 12px 0;
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
  font-size: 14px;
  font-weight: 500;
}

.pht__new {
  color: var(--cd-primary);
  font-weight: 700;
}

.pht__meta {
  display: flex;
  align-items: center;
}
</style>
