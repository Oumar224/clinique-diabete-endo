<template>
  <el-form label-position="top" class="tab-form">
    <el-divider content-position="left">Événements réglementaires</el-divider>
    <el-row :gutter="16">
      <el-col :span="6">
        <el-form-item label="Information du patient / famille">
          <el-checkbox v-model="data.infoPatientFamille" @change="emitChange">Oui</el-checkbox>
        </el-form-item>
      </el-col>
      <el-col :span="6">
        <el-form-item label="Administration de produits sanguins">
          <el-checkbox v-model="data.produitsSanguins" @change="emitChange">Oui</el-checkbox>
        </el-form-item>
      </el-col>
      <el-col :span="6">
        <el-form-item label="Porteur / Contact BMR ou BHRe">
          <el-checkbox v-model="data.bmrBhre" @change="emitChange">Oui</el-checkbox>
        </el-form-item>
      </el-col>
    </el-row>

    <el-divider content-position="left">Journal de l'Évolution</el-divider>
    <el-row :gutter="16">
      <el-col :span="16">
        <el-form-item label="Saisie chronologique">
          <el-input
            ref="journalRef"
            v-model="data.journalEvolution"
            type="textarea"
            :rows="8"
            placeholder="Décrivez l'évolution du patient..."
            @keydown.enter.prevent="handleEnterKey"
          />
        </el-form-item>
        <div class="journal-hint">
          <el-tag size="small" type="info" effect="plain">Entrée</el-tag>
          <span class="journal-hint__text">pour horodater une nouvelle ligne</span>
        </div>
      </el-col>
    </el-row>
  </el-form>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { EvolutionMedicaleData } from '@/types/crh-diabete'

const props = defineProps<{
  data: EvolutionMedicaleData
}>()

const emit = defineEmits<{
  change: []
}>()

const journalRef = ref<HTMLInputElement | null>(null)

function handleEnterKey(e: Event | KeyboardEvent) {
  const textarea = e.target as HTMLTextAreaElement
  if (!textarea) return

  const now = new Date()
  const timestamp = `[${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}] `

  const start = textarea.selectionStart
  const end = textarea.selectionEnd
  const before = props.data.journalEvolution.substring(0, start)
  const after = props.data.journalEvolution.substring(end)

  props.data.journalEvolution = before + '\n' + timestamp + after

  emit('change')

  requestAnimationFrame(() => {
    textarea.selectionStart = textarea.selectionEnd = start + 1 + timestamp.length
  })
}

function emitChange() {
  emit('change')
}
</script>

<style scoped>
.journal-hint {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 4px;
}
.journal-hint__text {
  font-size: 11px;
  color: var(--el-text-color-secondary);
}
</style>
