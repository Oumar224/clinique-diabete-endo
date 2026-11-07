<template>
  <el-form label-position="top" class="tab-form">
    <StagedCollapsibleSection
      :ref="setSectionRef('ressenti')"
      title="Ressenti et consultations"
      :keys="['ressentiPoids', 'consultations', 'consultationsAutres']"
      :model-value="data"
      :readonly="props.readonly"
      @save="emit('change')"
    >
      <template #default="{ draft }">
        <el-row :gutter="16">
          <el-col :span="24">
            <el-form-item label="Comment vivez-vous votre poids au quotidien au regard des autres ?">
              <el-input v-model="draft.ressentiPoids" type="textarea" :rows="3" placeholder="Décrire le ressenti du poids au quotidien…" :disabled="props.readonly" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="24">
            <el-form-item label="Avez-vous déjà consulté ?">
              <el-checkbox-group v-model="draft.consultations" :disabled="props.readonly">
                <el-checkbox value="psychologue">Psychologue</el-checkbox>
                <el-checkbox value="nutritionniste">Nutritionniste</el-checkbox>
                <el-checkbox value="autre">Autre personnel de santé</el-checkbox>
              </el-checkbox-group>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row v-if="draft.consultations && draft.consultations.includes('autre')" :gutter="16">
          <el-col :span="24">
            <el-form-item label="Autre consultation (préciser)">
              <el-input v-model="draft.consultationsAutres" placeholder="Préciser…" :disabled="props.readonly" />
            </el-form-item>
          </el-col>
        </el-row>
      </template>
    </StagedCollapsibleSection>

    <div class="section-preview">
      <FormPreview
        title="Ressenti et consultations"
        variant="compact"
        :hide-header="true"
        :fields="ressentiPreviewFields"
        @edit="() => openSection('ressenti')"
      />
    </div>

    <StagedCollapsibleSection
      :ref="setSectionRef('contexte')"
      title="Stress et contexte social"
      :keys="['stressNiveau', 'situationProfessionnelle', 'soutienMaison', 'difficulteAchatFruitsLegumes']"
      :model-value="data"
      :readonly="props.readonly"
      @save="emit('change')"
    >
      <template #default="{ draft }">
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="Niveau de stress, anxiété, dépression (0-10)">
              <div class="stress-field">
                <el-slider v-model="draft.stressNiveau" :min="0" :max="10" :step="1" :disabled="props.readonly" style="flex:1" />
                <el-input-number v-model="draft.stressNiveau" :min="0" :max="10" :step="1" :precision="0" controls-position="right" style="width:120px" :disabled="props.readonly" />
              </div>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="Situation professionnelle">
              <el-select v-model="draft.situationProfessionnelle" placeholder="Sélectionner" clearable style="width:100%" :disabled="props.readonly">
                <el-option label="Travail posté" value="travail_poste" />
                <el-option label="Sédentaire" value="sedentaire" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="Qui vous soutient à la maison ?">
              <el-input v-model="draft.soutienMaison" placeholder="Qui vous soutient à la maison…" :disabled="props.readonly" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="Difficulté à acheter fruits/légumes ?">
              <el-radio-group v-model="draft.difficulteAchatFruitsLegumes" :disabled="props.readonly">
                <el-radio :value="true">Oui</el-radio>
                <el-radio :value="false">Non</el-radio>
              </el-radio-group>
            </el-form-item>
          </el-col>
        </el-row>
      </template>
    </StagedCollapsibleSection>

    <div class="section-preview">
      <FormPreview
        title="Stress et contexte social"
        variant="compact"
        :hide-header="true"
        :fields="contextePreviewFields"
        @edit="() => openSection('contexte')"
      />
    </div>

    <StagedCollapsibleSection
      :ref="setSectionRef('objectifs')"
      title="Objectifs réalistes"
      :keys="['poidsCible', 'tourTailleCible', 'tourHancheCible', 'delaiMois', 'delaiAnnee']"
      :model-value="objectifs"
      :readonly="props.readonly"
      @save="emit('change')"
    >
      <template #default="{ draft }">
        <el-row :gutter="16">
          <el-col :span="8">
            <el-form-item label="Poids cible (kg)">
              <el-input-number v-model="draft.poidsCible" :min="0" :max="300" :step="0.1" :precision="1" controls-position="right" style="width:100%" :disabled="props.readonly" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="Tour de taille cible (cm)">
              <el-input-number v-model="draft.tourTailleCible" :min="0" :max="300" :step="0.5" :precision="1" controls-position="right" style="width:100%" :disabled="props.readonly" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="Tour de hanche cible (cm)">
              <el-input-number v-model="draft.tourHancheCible" :min="0" :max="300" :step="0.5" :precision="1" controls-position="right" style="width:100%" :disabled="props.readonly" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="En combien de temps ? (mois)">
              <el-input-number v-model="draft.delaiMois" :min="0" :max="120" :step="1" :precision="0" controls-position="right" style="width:100%" :disabled="props.readonly" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="En combien de temps ? (année) — nombre d'années">
              <el-input-number v-model="draft.delaiAnnee" :min="0" :max="20" :step="1" :precision="0" controls-position="right" style="width:100%" :disabled="props.readonly" />
            </el-form-item>
          </el-col>
        </el-row>
      </template>
    </StagedCollapsibleSection>

    <div class="section-preview">
      <FormPreview
        title="Objectifs réalistes"
        variant="compact"
        :hide-header="true"
        :fields="objectifsPreviewFields"
        @edit="() => openSection('objectifs')"
      />
    </div>
  </el-form>
</template>

<script setup lang="ts">
import { ref, computed, nextTick } from 'vue'
import type { CrcObesiteFormData } from '@/types/crc-obesite'
import FormPreview, { type FormPreviewField } from '@/components/common/FormPreview.vue'
import StagedCollapsibleSection from '@/components/common/StagedCollapsibleSection.vue'

const FIELD_PREFIX = 'psySocial'
const OBJECTIFS_PREFIX = 'objectifsPonderaux'

const props = defineProps<{
  data: CrcObesiteFormData['psySocial']
  objectifs: CrcObesiteFormData['objectifsPonderaux']
  readonly?: boolean
}>()

const emit = defineEmits<{
  change: []
}>()

const sectionRefs = ref<Record<string, InstanceType<typeof StagedCollapsibleSection> | null>>({})

function setSectionRef(key: string) {
  return (el: unknown) => {
    sectionRefs.value[key] = el as InstanceType<typeof StagedCollapsibleSection> | null
  }
}

async function openSection(key: string) {
  const section = sectionRefs.value[key]
  if (section && typeof section.open === 'function') {
    section.open()
  }
  await nextTick()
  sectionRefs.value[key]?.$el?.scrollIntoView?.({ behavior: 'smooth', block: 'start' })
}

const CONSULTATIONS_LABELS: Record<string, string> = {
  psychologue: 'Psychologue',
  nutritionniste: 'Nutritionniste',
  autre: 'Autre personnel de santé',
}

const SITUATION_LABELS: Record<string, string> = {
  travail_poste: 'Travail posté',
  sedentaire: 'Sédentaire',
}

const ressentiPreviewFields = computed<FormPreviewField[]>(() => [
  { label: 'Ressenti du poids', value: props.data.ressentiPoids || null, key: `${FIELD_PREFIX}.ressentiPoids` },
  {
    label: 'Consultations déjà eues',
    value: (props.data.consultations || []).length
      ? (props.data.consultations || []).map((c) => CONSULTATIONS_LABELS[c] ?? c).join(', ')
      : null,
    key: `${FIELD_PREFIX}.consultations`,
  },
  { label: 'Autre consultation', value: props.data.consultationsAutres || null, key: `${FIELD_PREFIX}.consultationsAutres` },
])

const contextePreviewFields = computed<FormPreviewField[]>(() => [
  { label: 'Niveau de stress', value: props.data.stressNiveau != null ? `${props.data.stressNiveau} / 10` : null, key: `${FIELD_PREFIX}.stressNiveau` },
  {
    label: 'Situation professionnelle',
    value: props.data.situationProfessionnelle ? (SITUATION_LABELS[props.data.situationProfessionnelle] ?? props.data.situationProfessionnelle) : null,
    key: `${FIELD_PREFIX}.situationProfessionnelle`,
  },
  { label: 'Soutien à la maison', value: props.data.soutienMaison || null, key: `${FIELD_PREFIX}.soutienMaison` },
  { label: 'Difficulté à acheter fruits/légumes ?', value: props.data.difficulteAchatFruitsLegumes ? 'Oui' : null, key: `${FIELD_PREFIX}.difficulteAchatFruitsLegumes` },
])

const objectifsPreviewFields = computed<FormPreviewField[]>(() => {
  const o = props.objectifs
  return [
    { label: 'Poids cible', value: o.poidsCible != null ? `${o.poidsCible} kg` : null, key: `${OBJECTIFS_PREFIX}.poidsCible` },
    { label: 'Tour de taille cible', value: o.tourTailleCible != null ? `${o.tourTailleCible} cm` : null, key: `${OBJECTIFS_PREFIX}.tourTailleCible` },
    { label: 'Tour de hanche cible', value: o.tourHancheCible != null ? `${o.tourHancheCible} cm` : null, key: `${OBJECTIFS_PREFIX}.tourHancheCible` },
    { label: 'Délai (mois)', value: o.delaiMois != null ? `${o.delaiMois} mois` : null, key: `${OBJECTIFS_PREFIX}.delaiMois` },
    { label: 'Délai (années)', value: o.delaiAnnee != null ? `${o.delaiAnnee} année(s)` : null, key: `${OBJECTIFS_PREFIX}.delaiAnnee` },
  ]
})
</script>

<style scoped>
.section-preview {
  margin: 8px 0 16px;
}
.stress-field {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
}
</style>
