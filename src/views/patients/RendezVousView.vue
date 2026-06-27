<template>
  <div class="rdv-view">
    <h3 class="rdv-view__title">Rendez-vous du patient</h3>

    <div class="rdv-view__actions">
      <el-button type="primary" size="small" :icon="Plus">Planifier un rendez-vous</el-button>
    </div>

    <div class="rdv-view__timeline">
      <el-timeline>
        <el-timeline-item
          v-for="(rdv, idx) in mockRdv"
          :key="idx"
          :timestamp="rdv.date + ' — ' + rdv.heure"
          :type="rdvStatutType(rdv.statut)"
          placement="top"
          size="large"
        >
          <div class="rdv-item">
            <div class="rdv-item__info">
              <strong>{{ rdv.type }}</strong>
              <span class="rdv-item__service">{{ rdv.service }}</span>
              <span class="rdv-item__medecin">{{ rdv.medecin }}</span>
            </div>
            <el-tag :type="rdvStatutType(rdv.statut)" size="small">
              {{ statutLabel(rdv.statut) }}
            </el-tag>
          </div>
          <p v-if="rdv.notes" style="font-size:13px;color:var(--cd-gray-600);margin-top:4px">{{ rdv.notes }}</p>
        </el-timeline-item>
      </el-timeline>

      <el-empty v-if="mockRdv.length === 0" description="Aucun rendez-vous" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { Plus } from '@element-plus/icons-vue'

interface Rdv {
  date: string
  heure: string
  type: string
  service: string
  medecin: string
  statut: 'confirme' | 'annule' | 'manque'
  notes?: string
}

const mockRdv: Rdv[] = [
  { date: '15/07/2026', heure: '09h30', type: 'Consultation de contrôle', service: 'Cardiologie', medecin: 'Dr. Diallo', statut: 'confirme', notes: 'Contrôle post-hospitalisation' },
  { date: '22/07/2026', heure: '11h00', type: 'Écho-doppler cardiaque', service: 'Imagerie', medecin: 'Dr. Camara', statut: 'confirme' },
  { date: '05/08/2026', heure: '08h45', type: 'Consultation diabétologie', service: 'Endocrinologie', medecin: 'Dr. Sylla', statut: 'confirme' },
  { date: '10/06/2026', heure: '14h00', type: 'Prise de sang', service: 'Laboratoire', medecin: '', statut: 'manque', notes: 'Patient non venu' },
  { date: '20/05/2026', heure: '10h00', type: 'Consultation ophtalmologie', service: 'Ophtalmologie', medecin: 'Dr. Barry', statut: 'annule', notes: 'Reporté par le patient' },
]

function rdvStatutType(s: string): 'primary' | 'success' | 'warning' | 'danger' | 'info' {
  switch (s) {
    case 'confirme': return 'primary'
    case 'annule': return 'danger'
    case 'manque': return 'warning'
    default: return 'info'
  }
}

function statutLabel(s: string): string {
  switch (s) {
    case 'confirme': return 'Confirmé'
    case 'annule': return 'Annulé'
    case 'manque': return 'Manqué'
    default: return s
  }
}
</script>

<style scoped>
.rdv-view__title {
  font-size: 16px;
  font-weight: 600;
  color: var(--cd-gray-900);
  margin-bottom: 16px;
}
.rdv-view__actions {
  margin-bottom: 24px;
}
.rdv-item {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}
.rdv-item__info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.rdv-item__service {
  font-size: 13px;
  color: var(--cd-gray-600);
}
.rdv-item__medecin {
  font-size: 13px;
  color: var(--cd-primary);
}
</style>
