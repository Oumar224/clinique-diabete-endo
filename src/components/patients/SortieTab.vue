<template>
  <el-form label-position="top" class="tab-form">
    <el-divider content-position="left">Clôture Administrative</el-divider>
    <el-row :gutter="16">
      <el-col :span="6">
        <el-form-item label="Date de sortie">
          <el-date-picker v-model="data.dateSortie" type="date" value-format="YYYY-MM-DD" style="width:100%" @change="emitChange" />
        </el-form-item>
      </el-col>
      <el-col :span="8">
        <el-form-item label="Destination de sortie">
          <el-select v-model="data.destinationSortie" placeholder="Sélectionner" style="width:100%" @change="emitChange">
            <el-option label="Retour domicile" value="Retour domicile" />
            <el-option label="Autre site AP-HP" value="Autre site AP-HP" />
            <el-option label="HAD" value="HAD" />
          </el-select>
        </el-form-item>
      </el-col>
    </el-row>

    <el-divider content-position="left">Clôture Médicale</el-divider>
    <el-row :gutter="16">
      <el-col :span="16">
        <el-form-item label="Conclusion de sortie">
          <el-input v-model="data.conclusionSortie" type="textarea" :rows="4" placeholder="Résumé de sortie indispensable pour le médecin traitant..." @input="emitChange" />
        </el-form-item>
      </el-col>
    </el-row>

    <el-divider content-position="left">Suivi et Planification des Soins</el-divider>
    <div v-for="(rdv, idx) in sortedRdvs" :key="rdv._key" class="rdv-card">
      <div class="rdv-card__header">
        <span class="rdv-card__title">RDV #{{ idx + 1 }}</span>
        <el-button text type="danger" size="small" @click="removeRdv(rdv)">Supprimer</el-button>
      </div>
      <el-row :gutter="16">
        <el-col :span="5">
          <el-form-item label="Date du RDV">
            <el-date-picker v-model="rdv.date" type="date" value-format="YYYY-MM-DD" style="width:100%" @change="emitChange" />
          </el-form-item>
        </el-col>
        <el-col :span="4">
          <el-form-item label="Heure">
            <el-time-picker v-model="rdv.heure" value-format="HH:mm" style="width:100%" @change="emitChange" />
          </el-form-item>
        </el-col>
        <el-col :span="6">
          <el-form-item label="Intitulé / Spécialité">
            <el-input v-model="rdv.intitule" placeholder="BCH CONSULT CHIR VASC TH" @input="emitChange" />
          </el-form-item>
        </el-col>
        <el-col :span="6">
          <el-form-item label="Lieu / Praticien">
            <el-input v-model="rdv.lieuPraticien" placeholder="Bichat / LRB HDJ Centre Diabète" @input="emitChange" />
          </el-form-item>
        </el-col>
      </el-row>
    </div>
    <el-button type="primary" text size="small" @click="addRdv">
      + Ajouter un RDV de suivi
    </el-button>
  </el-form>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { SortieData } from '@/types/crh-diabete'

const props = defineProps<{
  data: SortieData
}>()

const emit = defineEmits<{
  change: []
}>()

const sortedRdvs = computed(() => {
  return [...props.data.rdvSuivi].sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date)
    return (a.heure || '').localeCompare(b.heure || '')
  })
})

function addRdv() {
  props.data.rdvSuivi.push({
    _key: crypto.randomUUID(),
    date: '',
    heure: '',
    intitule: '',
    lieuPraticien: '',
  })
  emit('change')
}

function removeRdv(rdv: { _key: string }) {
  const idx = props.data.rdvSuivi.findIndex(r => r._key === rdv._key)
  if (idx !== -1) {
    props.data.rdvSuivi.splice(idx, 1)
    emit('change')
  }
}

function emitChange() {
  emit('change')
}
</script>

<style scoped>
.rdv-card {
  border: 1px solid var(--el-border-color-light);
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 12px;
  background: var(--el-color-primary-light-9);
}
.rdv-card__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}
.rdv-card__title {
  font-weight: 600;
  font-size: 13px;
}
</style>
