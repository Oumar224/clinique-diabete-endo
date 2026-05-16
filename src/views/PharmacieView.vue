<template>
  <div class="pharmacie">
    <div class="pharmacie__header">
      <h1 class="pharmacie__title">Pharmacie & Stock</h1>
      <div class="pharmacie__actions">
        <el-input
          v-model="searchText"
          placeholder="Rechercher un médicament..."
          clearable
          style="width: 280px"
        >
          <template #prepend><el-icon><Search /></el-icon></template>
        </el-input>
        <el-button type="primary" :icon="Plus">Ajouter au stock</el-button>
      </div>
    </div>

    <el-table
      :data="filteredList"
      style="width: 100%"
      :header-cell-style="{ background: '#0E5C5B', color: '#ffffff', fontWeight: 600 }"
    >
      <el-table-column prop="dci" label="DCI" />
      <el-table-column prop="commercial" label="Nom commercial" />
      <el-table-column prop="dosage" label="Dosage" width="100" />
      <el-table-column prop="forme" label="Forme" width="100" />
      <el-table-column prop="stock" label="Stock" width="80" align="center">
        <template #default="{ row }">
          <el-tag :type="row.stock <= row.seuil ? 'danger' : 'success'" size="small">
            {{ row.stock }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="seuil" label="Seuil" width="70" align="center" />
      <el-table-column label="Péremption" width="110">
        <template #default="{ row }">
          <el-tag
            :type="isPerime(row.peremption) ? 'danger' : 'info'"
            size="small"
          >
            {{ row.peremption }}
          </el-tag>
        </template>
      </el-table-column>
    </el-table>

    <el-empty v-if="filteredList.length === 0" description="Aucun médicament trouvé" />

    <el-row justify="center" style="margin-top: 20px">
      <el-pagination
        @current-change="(v:number)=>paginator.currPage=v"
        :current-page="paginator.currPage"
        background
        layout="prev, pager, next"
        :page-size="paginator.pageSize"
        :page-count="paginator.totalPage"
      />
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { Search, Plus } from '@element-plus/icons-vue'

const searchText = ref('')

const paginator = reactive({ totalPage: 0, currPage: 1, pageSize: 7 })

const stock = ref([
  { dci: 'Metformine', commercial: 'Glucophage', dosage: '500mg', forme: 'Comprimé', stock: 120, seuil: 30, peremption: '12/2026' },
  { dci: 'Insuline Glargine', commercial: 'Lantus', dosage: '100UI/ml', forme: 'Solution', stock: 15, seuil: 20, peremption: '08/2026' },
  { dci: 'Metformine', commercial: 'Glucophage LP', dosage: '1000mg', forme: 'Comprimé LP', stock: 80, seuil: 30, peremption: '03/2027' },
  { dci: 'Sitagliptine', commercial: 'Januvia', dosage: '100mg', forme: 'Comprimé', stock: 5, seuil: 15, peremption: '01/2026' },
  { dci: 'Gliclazide', commercial: 'Diamicron', dosage: '60mg', forme: 'Comprimé', stock: 45, seuil: 20, peremption: '09/2026' },
])

const filteredList = computed(() => {
  const result = stock.value?.filter((item: any) =>
    Object.keys(item).some(key =>
      String((item as any)[key])?.toLowerCase().includes(searchText.value.toLowerCase())
    )
  ) || []
  paginator.totalPage = Math.ceil(result.length / paginator.pageSize)
  return result.slice((paginator.currPage - 1) * paginator.pageSize, paginator.currPage * paginator.pageSize)
})

function isPerime(date: string): boolean {
  const [m, y] = date.split('/').map(Number)
  const peremption = new Date(y, m)
  const seuil = new Date()
  seuil.setMonth(seuil.getMonth() + 1)
  return peremption < seuil
}
</script>

<style scoped>
.pharmacie__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
}

.pharmacie__title {
  font-size: 22px;
  font-weight: 700;
  color: var(--cd-gray-900);
}

.pharmacie__actions {
  display: flex;
  align-items: center;
  gap: 12px;
}
</style>
