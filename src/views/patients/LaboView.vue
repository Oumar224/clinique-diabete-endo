<template>
  <div class="labo-view">
    <h3 class="labo-view__title">Résultats d'analyses biologiques</h3>

    <div class="labo-view__filter">
      <el-date-picker
        v-model="dateRange"
        type="daterange"
        range-separator="→"
        start-placeholder="Date début"
        end-placeholder="Date fin"
        size="small"
      />
    </div>

    <el-table :data="mockResultats" style="width:100%" size="small" default-expand-all>
      <el-table-column type="expand" width="40">
        <template #default="{ row }">
          <el-table :data="row.parametres" size="small" style="margin:8px 0">
            <el-table-column prop="libelle" label="Paramètre" width="200" />
            <el-table-column prop="valeur" label="Valeur" width="100" align="right">
              <template #default="{ row: p }">
                <span :class="{ 'labo-hors-norme': p.horsNorme }">
                  {{ p.valeur }}
                  <template v-if="p.horsNorme">
                    <el-tooltip :content="p.tooltip" placement="right">
                      <span class="labo-fleche">{{ p.fleche === 'up' ? ' ↑' : ' ↓' }}</span>
                    </el-tooltip>
                  </template>
                </span>
              </template>
            </el-table-column>
            <el-table-column prop="unite" label="Unité" width="80" />
            <el-table-column label="Seuils" width="140">
              <template #default="{ row: p }">
                {{ p.seuilBas }} — {{ p.seuilHaut }}
              </template>
            </el-table-column>
          </el-table>
        </template>
      </el-table-column>
      <el-table-column prop="datePrelevement" label="Prélèvement" width="120" />
      <el-table-column prop="dateResultat" label="Résultat" width="120" />
      <el-table-column prop="analyse" label="Analyse" width="150" />
      <el-table-column prop="laboratoire" label="Laboratoire" />
    </el-table>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const dateRange = ref(null)

interface Parametre {
  code: string
  libelle: string
  valeur: number
  unite: string
  seuilBas: number
  seuilHaut: number
  horsNorme: boolean
  fleche: 'up' | 'down'
  tooltip: string
}

interface Resultat {
  datePrelevement: string
  dateResultat: string
  analyse: string
  laboratoire: string
  parametres: Parametre[]
}

const mockResultats: Resultat[] = [
  {
    datePrelevement: '26/06/2026', dateResultat: '27/06/2026', analyse: 'NFS', laboratoire: 'Labo Central',
    parametres: [
      { code: 'HB', libelle: 'Hémoglobine', valeur: 10.2, unite: 'g/dL', seuilBas: 12, seuilHaut: 16, horsNorme: true, fleche: 'down', tooltip: 'Valeur basse: risque d\'anémie' },
      { code: 'GB', libelle: 'Globules blancs', valeur: 7200, unite: '/mm³', seuilBas: 4000, seuilHaut: 10000, horsNorme: false, fleche: 'up', tooltip: '' },
      { code: 'PLQ', libelle: 'Plaquettes', valeur: 250000, unite: '/mm³', seuilBas: 150000, seuilHaut: 400000, horsNorme: false, fleche: 'up', tooltip: '' },
    ],
  },
  {
    datePrelevement: '26/06/2026', dateResultat: '27/06/2026', analyse: 'Ionogramme', laboratoire: 'Labo Central',
    parametres: [
      { code: 'NA', libelle: 'Sodium', valeur: 138, unite: 'mmol/L', seuilBas: 136, seuilHaut: 145, horsNorme: false, fleche: 'up', tooltip: '' },
      { code: 'K', libelle: 'Potassium', valeur: 5.4, unite: 'mmol/L', seuilBas: 3.5, seuilHaut: 5.1, horsNorme: true, fleche: 'up', tooltip: 'Hyperkaliémie légère: surveiller fonction rénale' },
      { code: 'CL', libelle: 'Chlore', valeur: 101, unite: 'mmol/L', seuilBas: 98, seuilHaut: 106, horsNorme: false, fleche: 'up', tooltip: '' },
    ],
  },
  {
    datePrelevement: '26/06/2026', dateResultat: '27/06/2026', analyse: 'Glycémie', laboratoire: 'Labo Central',
    parametres: [
      { code: 'GLY', libelle: 'Glycémie à jeun', valeur: 1.86, unite: 'g/L', seuilBas: 0.7, seuilHaut: 1.1, horsNorme: true, fleche: 'up', tooltip: 'Hyperglycémie: adapter traitement antidiabétique' },
      { code: 'HBAC', libelle: 'HbA1c', valeur: 8.2, unite: '%', seuilBas: 4, seuilHaut: 6, horsNorme: true, fleche: 'up', tooltip: 'Mauvais contrôle glycémique sur 3 mois' },
    ],
  },
]
</script>

<style scoped>
.labo-view__title {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 16px;
  color: var(--cd-gray-900);
}
.labo-view__filter {
  margin-bottom: 16px;
}
.labo-hors-norme {
  color: var(--cd-secondary);
  font-weight: 700;
}
.labo-fleche {
  font-weight: 700;
}
</style>
