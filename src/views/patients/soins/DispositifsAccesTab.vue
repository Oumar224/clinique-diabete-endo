<template>
  <div class="dispositifs">
    <div class="dispositifs__header">
      <h3>Dispositifs et voies d'abord</h3>
      <el-button type="primary" size="small" :icon="Plus" @click="onAjouter">Ajouter</el-button>
    </div>

    <el-table :data="dispositifs" size="small" style="width:100%" v-loading="loading">
      <el-table-column prop="type" label="Type d'accès" />
      <el-table-column prop="datePose" label="Date de pose" width="130" />
      <el-table-column prop="aspect" label="Aspect" width="130">
        <template #default="{ row }">
          <el-tag :type="aspectType(row.aspect)" size="small">{{ row.aspect }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="volumeMl" label="Volume (mL)" width="120" align="right">
        <template #default="{ row }">
          {{ row.volumeMl != null ? row.volumeMl + ' mL' : '—' }}
        </template>
      </el-table-column>
      <el-table-column label="Actions" width="100" align="center">
        <template #default="scope">
          <el-button text type="primary" size="small" :icon="Edit" aria-label="Modifier" @click="onModifier" />
          <el-button text type="danger" size="small" :icon="Delete" aria-label="Supprimer" @click="onSupprimer((scope as any).row)" />
        </template>
      </el-table-column>
    </el-table>

    <el-empty v-if="dispositifs.length === 0" description="Aucun dispositif" :image-size="60" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { Plus, Edit, Delete } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getDispositifs, ajouterDispositif, supprimerDispositif } from '@/api/dispositifs'
import type { Dispositif } from '@/types/soins'

const route = useRoute()

const patientId = computed<number | null>(() => {
  const id = Number(route.params.id)
  return Number.isFinite(id) ? id : null
})

const dispositifs = ref<Dispositif[]>([])
const loading = ref(false)

async function loadDispositifs() {
  const pid = patientId.value
  if (!pid) return
  loading.value = true
  try {
    dispositifs.value = await getDispositifs(pid)
  } catch (e) {
    ElMessage.error(`Erreur de chargement: ${(e as Error).message}`)
  } finally {
    loading.value = false
  }
}

function aspectType(aspect: string): 'success' | 'warning' | 'danger' {
  switch (aspect) {
    case 'Sain': return 'success'
    case 'Rouge': return 'warning'
    case 'Douloureux': return 'danger'
    default: return 'warning'
  }
}

async function onAjouter() {
  const pid = patientId.value
  if (!pid) {
    ElMessage.warning('Aucun patient sélectionné')
    return
  }

  try {
    const { value: formValues } = await ElMessageBox.prompt(
      'Type de dispositif (ex: Cathéter périphérique, Sonde urinaire)',
      'Nouveau dispositif',
      { inputPlaceholder: 'Type...' },
    )
    if (!formValues?.trim()) return

    const newDispositif = await ajouterDispositif({
      patientId: pid,
      type: formValues.trim(),
      datePose: new Date().toLocaleDateString('fr-FR'),
      aspect: 'Sain',
      volumeMl: null,
    })
    dispositifs.value.push(newDispositif)
    ElMessage.success('Dispositif ajouté')
  } catch (err: unknown) {
    if (err === 'cancel' || err === 'close') return
    const msg = err instanceof Error ? err.message : String(err)
    ElMessage.error(`Erreur: ${msg}`)
  }
}

function onModifier() {
  ElMessage.info('Fonctionnalité de modification à venir')
}

async function onSupprimer(row: Dispositif) {
  try {
    await ElMessageBox.confirm(
      `Supprimer le dispositif "${row.type}" posé le ${row.datePose} ?`,
      'Confirmation',
      { confirmButtonText: 'Oui, supprimer', cancelButtonText: 'Annuler', type: 'warning' },
    )
    await supprimerDispositif(row.id)
    dispositifs.value = dispositifs.value.filter(d => d.id !== row.id)
    ElMessage.success('Dispositif supprimé')
  } catch (err: unknown) {
    if (err === 'cancel' || err === 'close') return
    const msg = err instanceof Error ? err.message : String(err)
    ElMessage.error(`Erreur: ${msg}`)
  }
}

onMounted(() => { loadDispositifs() })
</script>

<style scoped>
.dispositifs__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}
.dispositifs__header h3 {
  font-size: 16px;
  font-weight: 600;
  color: var(--cd-gray-900);
}
</style>
