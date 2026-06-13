<template>
  <div class="pht">
    <el-timeline v-if="history.length > 0">
      <el-timeline-item
        v-for="entry in history"
        :key="entry.id"
        :timestamp="formatDate(entry.changed_at)"
        placement="top"
      >
        <div class="pht__entry">
          <span v-if="entry.old_price !== null" class="pht__price">
            <span class="pht__old">{{ format(entry.old_price) }}</span>
            <el-icon class="pht__arrow"><ArrowRight /></el-icon>
            <span class="pht__new">{{ format(entry.new_price) }}</span>
          </span>
          <span v-else class="pht__price">
            <span class="pht__new">{{ format(entry.new_price) }}</span>
            <span class="pht__initial">(Prix initial)</span>
          </span>
          <span v-if="entry.change_reason && entry.change_reason !== 'Prix initial'" class="pht__reason">
            {{ entry.change_reason }}
          </span>
        </div>
      </el-timeline-item>
    </el-timeline>
    <el-empty v-else description="Aucun historique — prix d'origine" :image-size="80" />
  </div>
</template>

<script setup lang="ts">
import { ArrowRight } from '@element-plus/icons-vue'
import type { ActPriceHistoryDto } from '@/composables/useMedicalActs'
import { useCurrencies } from '@/composables/useCurrencies'

defineProps<{
  history: ActPriceHistoryDto[]
}>()

const { formatCurrency } = useCurrencies()

function format(amount: number | null): string {
  if (amount === null) return '—'
  return formatCurrency(amount)
}

function formatDate(dateStr: string): string {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
</script>

<style scoped>
.pht {
  padding: 12px 0;
}

.pht__entry {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.pht__price {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  font-weight: 500;
}

.pht__old {
  color: var(--cd-secondary);
  text-decoration: line-through;
}

.pht__new {
  color: var(--cd-primary);
  font-weight: 700;
}

.pht__arrow {
  color: var(--cd-gray-400);
  font-size: 14px;
}

.pht__initial {
  font-size: 12px;
  color: var(--cd-gray-400);
  font-weight: 400;
  margin-left: 4px;
}

.pht__reason {
  font-size: 12px;
  color: var(--cd-gray-400);
}
</style>
