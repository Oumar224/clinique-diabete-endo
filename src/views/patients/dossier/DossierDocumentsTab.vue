<template>
  <div class="dossier-section">
    <div class="dossier-section__header">
      <h3 class="dossier-section__title">Documents importés</h3>
      <el-button type="primary" size="small" :icon="Upload">Importer</el-button>
    </div>
    <el-upload
      class="dossier-upload"
      drag
      multiple
      :show-file-list="false"
      :auto-upload="false"
    >
      <el-icon :size="40" class="dossier-upload__icon"><UploadFilled /></el-icon>
      <div class="dossier-upload__text">
        Déposez des fichiers PDF ou images ici
      </div>
    </el-upload>
    <el-table :data="mockDocuments" style="width:100%;margin-top:16px" size="small">
      <el-table-column prop="nom" label="Nom" />
      <el-table-column prop="date" label="Date" width="110" />
      <el-table-column prop="auteur" label="Auteur" width="140" />
      <el-table-column prop="type" label="Type" width="120" />
      <el-table-column label="Actions" width="80" align="center">
        <el-button text type="primary" size="small" :icon="Download" aria-label="Télécharger" />
      </el-table-column>
    </el-table>
  </div>
</template>

<script setup lang="ts">
import { Upload, UploadFilled, Download } from '@element-plus/icons-vue'

const mockDocuments = [
  { nom: 'CR-IRM_Cardiaque.pdf', date: '2026-06-10', auteur: 'Dr. Diallo', type: 'Compte-rendu' },
  { nom: 'Courrier_Cardiologue.pdf', date: '2026-05-28', auteur: 'Dr. Camara', type: 'Courrier' },
]
</script>

<style scoped>
.dossier-section__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}
.dossier-section__title {
  font-size: 15px;
  font-weight: 600;
  color: var(--cd-gray-900);
}
.dossier-upload {
  border: 2px dashed var(--cd-gray-200);
  border-radius: 8px;
  padding: 32px;
  text-align: center;
  cursor: pointer;
  transition: border-color 0.2s;
}
.dossier-upload:hover {
  border-color: var(--cd-primary);
}
.dossier-upload__icon {
  color: var(--cd-gray-400);
  margin-bottom: 8px;
}
.dossier-upload__text {
  font-size: 14px;
  color: var(--cd-gray-600);
}
</style>
