<template>
  <div class="sejour-view">
    <h3 class="sejour-view__title">Patient et séjour</h3>

    <el-row :gutter="24">
      <el-col :span="12">
        <el-card class="sejour-view__card">
          <template #header>
            <span><strong>Séjour en cours</strong></span>
          </template>
          <el-descriptions :column="1" border size="small">
            <el-descriptions-item label="N° Séjour">{{ mockSejour.numeroSejour }}</el-descriptions-item>
            <el-descriptions-item label="Date d'entrée">{{ mockSejour.dateEntree }}</el-descriptions-item>
            <el-descriptions-item label="Mode d'admission">
              <el-tag :type="modeAdmissionType" size="small">
                {{ modeLabel }}
              </el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="Unité de soins">{{ mockSejour.uniteSoins }}</el-descriptions-item>
            <el-descriptions-item label="Chambre / Lit">{{ mockSejour.chambre }} / Lit {{ mockSejour.lit }}</el-descriptions-item>
            <el-descriptions-item label="Statut">
              <el-tag :type="statutType(mockSejour.statut)" size="small">{{ statutLabel }}</el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="Médecin référent">Dr. Diallo</el-descriptions-item>
          </el-descriptions>
        </el-card>
      </el-col>

      <el-col :span="12">
        <el-card class="sejour-view__card">
          <template #header>
            <span><strong>Informations administratives</strong></span>
          </template>
          <el-descriptions :column="1" border size="small">
            <el-descriptions-item label="NIP">{{ mockPatient.nip || '—' }}</el-descriptions-item>
            <el-descriptions-item label="N° SS / INS">{{ mockPatient.nir || '—' }}</el-descriptions-item>
            <el-descriptions-item label="Assurance / Mutuelle">{{ mockPatient.assuranceMutuelle || '—' }}</el-descriptions-item>
            <el-descriptions-item label="Consentement études">
              <el-tag size="small">{{ mockPatient.consentementEtude || 'Non précisé' }}</el-tag>
            </el-descriptions-item>
          </el-descriptions>
        </el-card>
      </el-col>
    </el-row>

    <el-card class="sejour-view__card" style="margin-top:16px">
      <template #header>
        <span><strong>Mouvements du patient</strong></span>
      </template>
      <el-timeline>
        <el-timeline-item
          v-for="(mvt, idx) in mouvements"
          :key="idx"
          :timestamp="mvt.date"
          :type="mvt.type"
          placement="top"
          size="large"
        >
          <p><strong>{{ mvt.action }}</strong></p>
          <p style="font-size:13px;color:var(--cd-gray-600)">{{ mvt.details }}</p>
        </el-timeline-item>
      </el-timeline>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const mockSejour = {
  numeroSejour: 'SJ-2026-04521',
  dateEntree: '26/06/2026 à 14h32',
  modeAdmission: 'urgences' as const,
  uniteSoins: 'Cardiologie A',
  chambre: '301',
  lit: '2',
  statut: 'en_cours' as const,
}

const mockPatient = {
  nip: 'M260658ABC12',
  nir: '1 58 03 45 027 012',
  assuranceMutuelle: 'CNSS',
  consentementEtude: 'Oui',
}

const mouvements: Array<{ date: string; action: string; details: string; type: 'primary' | 'success' | 'warning' | 'danger' | 'info' }> = [
  { date: '26/06/2026 14h32', action: 'Admission aux Urgences', details: 'Arrivée pour douleur thoracique', type: 'danger' },
  { date: '26/06/2026 16h00', action: 'Transfert en Cardiologie A', details: 'Hospitalisation pour insuffisance cardiaque', type: 'primary' },
  { date: '26/06/2026 18h30', action: 'Installation chambre 301, Lit 2', details: 'Prise en charge IDE effectuée', type: 'success' },
]

const MODE_LABELS: Record<string, string> = {
  urgences: 'Urgences',
  programmee: 'Programmée',
  transfert: 'Transfert',
}

const STATUT_LABELS: Record<string, string> = {
  en_cours: 'En cours',
  cloture: 'Clôturé',
  transfert: 'Transféré',
}

const modeLabel = computed(() => MODE_LABELS[mockSejour.modeAdmission] || mockSejour.modeAdmission)
const statutLabel = computed(() => STATUT_LABELS[mockSejour.statut] || mockSejour.statut)
const modeAdmissionType = computed<'danger' | 'success'>(() => mockSejour.modeAdmission === 'urgences' ? 'danger' : 'success')

function statutType(s: string): 'success' | 'warning' | 'danger' | 'info' {
  switch (s) {
    case 'en_cours': return 'success'
    case 'cloture': return 'info'
    case 'transfert': return 'warning'
    default: return 'info'
  }
}
</script>

<style scoped>
.sejour-view__title {
  font-size: 16px;
  font-weight: 600;
  color: var(--cd-gray-900);
  margin-bottom: 16px;
}
.sejour-view__card {
  height: 100%;
}
</style>
