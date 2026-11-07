<template>
  <div class="dispositifs cde">
    <div class="cde-page-toolbar">
      <div class="cde-page-actions">
        <el-button type="primary" :icon="Plus" @click="onAjouter">Ajouter</el-button>
      </div>
    </div>

    <div class="cde-table-card">
      <div class="cde-table-wrap">
        <el-table :data="dispositifs" size="small" style="width:100%" v-loading="dispositifsLoading">
          <el-table-column prop="datePose" label="Date de pose" width="130" />
          <el-table-column prop="type" label="Type d'accès" />
          <el-table-column prop="aspect" label="Aspect" width="130">
            <template #default="{ row }">
              <span class="cde-badge" :class="aspectClass(row.aspect)">{{ row.aspect }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="volumeMl" label="Volume (mL)" width="120" align="right">
            <template #default="{ row }">
              <span class="cde-num">{{ row.volumeMl != null ? row.volumeMl + ' mL' : '—' }}</span>
            </template>
          </el-table-column>
          <el-table-column label="Actions" width="100" align="center">
            <template #default="scope">
              <el-button text type="primary" size="small" :icon="Edit" aria-label="Modifier" @click="onModifier" />
              <el-button text type="danger" size="small" :icon="Delete" aria-label="Supprimer" @click="onSupprimer((scope as any).row)" />
            </template>
          </el-table-column>
        </el-table>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { Plus, Edit, Delete } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useDispositifs } from '@/composables/useDispositifs'
import type { Dispositif } from '@/types/soins'

const route = useRoute()

const patientId = computed<number | null>(() => {
  const id = Number(route.params.id)
  return Number.isFinite(id) ? id : null
})

const { dispositifs, loading: dispositifsLoading, fetchDispositifs, addDispositif, removeDispositif } = useDispositifs()

async function loadDispositifs() {
  const pid = patientId.value
  if (!pid) return
  await fetchDispositifs(pid)
}

function aspectClass(aspect: string): string {
  switch (aspect) {
    case 'Sain': return 'cde-badge--success'
    case 'Rouge': return 'cde-badge--warning'
    case 'Douloureux': return 'cde-badge--danger'
    default: return 'cde-badge--warning'
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

    const newDispositif = await addDispositif({
      patientId: pid,
      type: formValues.trim(),
      datePose: new Date().toLocaleDateString('fr-FR'),
      aspect: 'Sain',
      volumeMl: null,
    })
    if (newDispositif) {
      dispositifs.value.push(newDispositif)
    }
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
    await removeDispositif(row.id)
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
