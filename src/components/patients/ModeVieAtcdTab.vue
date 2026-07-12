<template>
  <el-form label-position="top" class="tab-form">
    <el-divider content-position="left">Entourage &amp; Social</el-divider>
    <el-row :gutter="16">
      <el-col :span="6">
        <el-form-item label="Situation familiale">
          <el-select v-model="data.situationFamiliale" placeholder="Sélectionner" style="width:100%" @change="emitChange">
            <el-option label="Célibataire" value="Célibataire" />
            <el-option label="Marié" value="Marié" />
            <el-option label="Divorcé" value="Divorcé" />
            <el-option label="Veuf" value="Veuf" />
          </el-select>
        </el-form-item>
      </el-col>
      <el-col :span="4">
        <el-form-item label="Isolement">
          <el-checkbox v-model="data.isolement" @change="emitChange">Oui</el-checkbox>
        </el-form-item>
      </el-col>
      <el-col :span="6">
        <el-form-item label="Hébergement / Logement">
          <el-select v-model="data.hebergement" placeholder="Sélectionner" style="width:100%" @change="emitChange">
            <el-option label="Domicile" value="Domicile" />
            <el-option label="Chez un tiers" value="Chez un tiers" />
            <el-option label="Centre" value="Centre" />
            <el-option label="SAS" value="SAS" />
          </el-select>
        </el-form-item>
      </el-col>
    </el-row>
    <el-row :gutter="16">
      <el-col :span="12">
        <el-form-item label="Commentaire de vie">
          <el-input v-model="data.commentaireVie" type="textarea" :rows="2" placeholder="A à sa charge son neveu autiste..." @input="emitChange" />
        </el-form-item>
      </el-col>
    </el-row>

    <el-divider content-position="left">Autonomie &amp; Dépendance (Grille SL)</el-divider>
    <el-row :gutter="16">
      <el-col :span="6">
        <el-form-item label="Alimentation">
          <el-radio-group v-model="data.autonomieSL.alimentation" @change="emitChange">
            <el-radio value="Autonome">Autonome</el-radio>
            <el-radio value="Aide partielle">Aide partielle</el-radio>
            <el-radio value="Dépendance totale">Dépendance totale</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-col>
      <el-col :span="6">
        <el-form-item label="Hygiène">
          <el-radio-group v-model="data.autonomieSL.hygiene" @change="emitChange">
            <el-radio value="Autonome">Autonome</el-radio>
            <el-radio value="Aide partielle">Aide partielle</el-radio>
            <el-radio value="Dépendance totale">Dépendance totale</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-col>
      <el-col :span="6">
        <el-form-item label="Habillage">
          <el-radio-group v-model="data.autonomieSL.habillage" @change="emitChange">
            <el-radio value="Autonome">Autonome</el-radio>
            <el-radio value="Aide partielle">Aide partielle</el-radio>
            <el-radio value="Dépendance totale">Dépendance totale</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-col>
    </el-row>
    <el-row :gutter="16">
      <el-col :span="6">
        <el-form-item label="Déplacement">
          <el-radio-group v-model="data.autonomieSL.deplacement" @change="emitChange">
            <el-radio value="Autonome">Autonome</el-radio>
            <el-radio value="Aide partielle">Aide partielle</el-radio>
            <el-radio value="Dépendance totale">Dépendance totale</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-col>
      <el-col :span="6">
        <el-form-item label="Continence">
          <el-radio-group v-model="data.autonomieSL.continence" @change="emitChange">
            <el-radio value="Continue">Continue</el-radio>
            <el-radio value="Incontinence partielle">Incontinence partielle</el-radio>
            <el-radio value="Incontinence totale">Incontinence totale</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-col>
      <el-col :span="4">
        <el-form-item label="Classe d'Autonomie">
          <el-input :model-value="autonomieClasse" disabled>
            <template #prefix>
              <el-icon v-if="autonomieTag.type === 'success'" style="color: var(--el-color-success);"><svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 7L5 10L12 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg></el-icon>
              <el-icon v-else-if="autonomieTag.type === 'warning'" style="color: var(--el-color-warning);"><svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1L1 13H13L7 1Z" stroke="currentColor" stroke-width="1" stroke-linecap="round"/><path d="M7 5V8" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/><circle cx="7" cy="10.5" r="0.5" fill="currentColor"/></svg></el-icon>
              <el-icon v-else style="color: var(--el-color-danger);"><svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="6" stroke="currentColor" stroke-width="1"/><path d="M7 4V8" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/><circle cx="7" cy="10" r="0.5" fill="currentColor"/></svg></el-icon>
            </template>
          </el-input>
        </el-form-item>
      </el-col>
    </el-row>

    <el-divider content-position="left">Habitus / Toxiques &amp; Droits</el-divider>
    <el-row :gutter="16">
      <el-col :span="4">
        <el-form-item label="Compréhension du français">
          <el-checkbox v-model="data.comprehensionFrancais" @change="emitChange">Oui</el-checkbox>
        </el-form-item>
      </el-col>
      <el-col :span="5">
        <el-form-item label="Prise en charge financière">
          <el-select v-model="data.priseEnCharge" placeholder="Sélectionner" style="width:100%" @change="emitChange">
            <el-option label="Sécu" value="Sécu" />
            <el-option label="CMU" value="CMU" />
            <el-option label="AME" value="AME" />
          </el-select>
        </el-form-item>
      </el-col>
      <el-col :span="4">
        <el-form-item label="Tabagisme">
          <el-select v-model="data.tabagisme" style="width:100%" @change="emitChange">
            <el-option label="Non-fumeur" value="Non-fumeur" />
            <el-option label="Fumeur actif" value="Fumeur actif" />
            <el-option label="Sevré" value="Sevré" />
          </el-select>
        </el-form-item>
      </el-col>
    </el-row>
    <el-row :gutter="16">
      <el-col :span="6">
        <el-form-item label="Alcool">
          <el-checkbox v-model="data.alcool" @change="emitChange">Oui</el-checkbox>
        </el-form-item>
        <el-form-item v-if="data.alcool" label="Détail consommation alcool">
          <el-input v-model="data.alcoolDetail" type="textarea" :rows="2" placeholder="3 canettes de bière/jour (2L)" @input="emitChange" />
        </el-form-item>
      </el-col>
      <el-col :span="6">
        <el-form-item label="Cannabis">
          <el-checkbox v-model="data.cannabis" @change="emitChange">Oui</el-checkbox>
        </el-form-item>
        <el-form-item v-if="data.cannabis" label="Détail consommation cannabis">
          <el-input v-model="data.cannabisDetail" type="textarea" :rows="2" placeholder="2 joints par jour, avis addictologique du 03/09/2021" @input="emitChange" />
        </el-form-item>
      </el-col>
    </el-row>

    <el-alert
      v-if="showAlerteAddicto"
      title="Avis addictologique requis"
      type="warning"
      show-icon
      :closable="false"
      style="margin-bottom:12px"
    >
      Une consommation active d'alcool ou de cannabis est renseignée. Veuillez préciser la date ou le statut de l'avis addictologique dans le détail ci-dessus.
    </el-alert>

    <el-divider content-position="left">Antécédents</el-divider>
    <el-row :gutter="16">
      <el-col :span="12">
        <el-form-item label="Allergies">
          <el-input v-model="data.allergies" type="textarea" :rows="2" placeholder="Pas d'allergie connue" @input="emitChange" />
        </el-form-item>
      </el-col>
    </el-row>
    <el-alert
      v-if="showAllergyAlert"
      title="Alerte allergie"
      type="error"
      show-icon
      :closable="false"
      style="margin-bottom:12px"
    >
      Une allergie a été renseignée. Veuillez vérifier et prendre les précautions nécessaires.
    </el-alert>
    <el-row :gutter="16">
      <el-col :span="16">
        <el-form-item label="Antécédents médicaux">
          <el-input v-model="data.antecedentsMedicaux" type="textarea" :rows="3" placeholder="Diabète de type 2 diagnostiqué en 2010 avec rétinopathie diabétique, HTA..." @input="emitChange" />
        </el-form-item>
      </el-col>
    </el-row>
  </el-form>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { ModeVieAtcdData } from '@/types/crh-diabete'
import { useCrhDiabeteCalculations } from '@/composables/useCrhDiabeteCalculations'

const props = defineProps<{
  data: ModeVieAtcdData
}>()

const emit = defineEmits<{
  change: []
}>()

const { calcAutonomieClass } = useCrhDiabeteCalculations()

const NO_ALLERGY_PHRASES = [
  "pas d'allergie connue",
  'pas d allergie connue',
  'aucune allergie',
  "pas d'allergie",
  'néant',
  'rien',
  'non',
]

const showAllergyAlert = computed(() => {
  const v = props.data.allergies?.trim().toLowerCase() || ''
  return v !== '' && !NO_ALLERGY_PHRASES.includes(v)
})

const showAlerteAddicto = computed(() => {
  return props.data.alcool || props.data.cannabis
})

const autonomieClasse = computed(() => {
  const result = calcAutonomieClass(props.data.autonomieSL)
  return result.description
})

const autonomieTag = computed(() => {
  const result = calcAutonomieClass(props.data.autonomieSL)
  if (result.classe === 'A') return { type: 'success' as const }
  if (result.classe === 'B') return { type: 'warning' as const }
  return { type: 'danger' as const }
})

function emitChange() {
  emit('change')
}
</script>
