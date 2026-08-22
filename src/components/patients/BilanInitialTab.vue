<template>
  <!-- eslint-disable vue/no-mutating-props -- Les sous-blocs history-collapse (Glasgow/Douleur/Vitals) écrivent volontairement dans l'objet réactif partagé data et émettent change directement -->
  <el-form label-position="top" class="tab-form">
    <StagedCollapsibleSection
      :ref="setSectionRef('histoire')"
      title="Histoire récente"
      :keys="['histoireRecent']"
      :model-value="data"
      :readonly="props.readonly"
      @save="emit('change')"
    >
      <template #default="{ draft }">
        <el-row :gutter="16">
          <el-col :span="24">
            <el-form-item label="Histoire récente de la maladie">
              <RichTextEditor v-model="draft.histoireRecent" :rows="5" placeholder="Écrire brièvement l'histoire récente de la maladie..." />
            </el-form-item>
          </el-col>
        </el-row>
      </template>
    </StagedCollapsibleSection>

    <div class="section-preview">
      <FormPreview
        title="Histoire récente"
        variant="compact"
        :fields="histoirePreviewFields"
        @edit="() => openSection('histoire')"
      />
    </div>

    <StagedCollapsibleSection
      :ref="setSectionRef('traitement')"
      title="Traitement à l'entrée"
      :keys="['traitementEntree']"
      :model-value="data"
      :readonly="props.readonly"
      @save="emit('change')"
    >
      <template #default="{ draft }">
        <el-row :gutter="16">
          <el-col :span="24">
            <el-form-item label="">
              <RichTextEditor v-model="draft.traitementEntree" :rows="3" placeholder="Décrire le traitement en cours à l'entrée..." />
            </el-form-item>
          </el-col>
        </el-row>
      </template>
    </StagedCollapsibleSection>

    <div class="section-preview">
      <FormPreview
        title="Traitement à l'entrée"
        variant="compact"
        :fields="traitementPreviewFields"
        @edit="() => openSection('traitement')"
      />
    </div>

    <StagedCollapsibleSection
      :ref="setSectionRef('examen')"
      title="Examen clinique à l'entrée"
      :keys="['examenPhysiqueTexte']"
      :model-value="data"
      :readonly="props.readonly"
      :default-open="true"
      @save="emit('change')"
    >
      <template #default="{ draft }">
        <h4 class="examen-subtitle">1. Score de Glasgow</h4>

        <div class="history-collapse">
          <div class="history-collapse__header" @click="glasgowFormOpen = !glasgowFormOpen">
            <div class="history-collapse__header-left">
              <el-icon class="history-collapse__header-icon"><Plus /></el-icon>
              <span class="history-collapse__title">{{ glasgowEditingKey ? "Modifier l'évaluation" : 'Enregistrer une évaluation' }}</span>
              <el-badge v-if="(data.glasgowHistory || []).length" :value="(data.glasgowHistory || []).length" class="history-collapse__badge" />
            </div>
            <el-icon class="history-collapse__arrow" :class="{ 'history-collapse__arrow--open': glasgowFormOpen }">
              <ArrowDown />
            </el-icon>
          </div>
          <div v-show="glasgowFormOpen" class="history-collapse__body">
            <el-row :gutter="16">
              <el-col :span="6">
                <el-form-item label="Ouverture des yeux" data-history-path="bilanInitial.glasgow.ouvertureYeux">
                  <el-radio-group v-model="data.glasgow.ouvertureYeux" @change="emitChange">
                    <el-radio :value="1">Aucune (1)</el-radio>
                    <el-radio :value="2">À la douleur (2)</el-radio>
                    <el-radio :value="3">À la demande (3)</el-radio>
                    <el-radio :value="4">Spontanée (4)</el-radio>
                  </el-radio-group>
                </el-form-item>
              </el-col>
              <el-col :span="7">
                <el-form-item label="Réponse verbale" data-history-path="bilanInitial.glasgow.reponseVerbale">
                  <el-radio-group v-model="data.glasgow.reponseVerbale" @change="emitChange">
                    <el-radio :value="1">Aucune (1)</el-radio>
                    <el-radio :value="2">Incompréhensible (2)</el-radio>
                    <el-radio :value="3">Inappropriée (3)</el-radio>
                    <el-radio :value="4">Confuse (4)</el-radio>
                    <el-radio :value="5">Orientée (5)</el-radio>
                  </el-radio-group>
                </el-form-item>
              </el-col>
              <el-col :span="7">
                <el-form-item label="Réponse motrice" data-history-path="bilanInitial.glasgow.reponseMotrice">
                  <el-radio-group v-model="data.glasgow.reponseMotrice" @change="emitChange">
                    <el-radio :value="1">Aucune (1)</el-radio>
                    <el-radio :value="2">Extension (2)</el-radio>
                    <el-radio :value="3">Flexion (3)</el-radio>
                    <el-radio :value="4">Évitement (4)</el-radio>
                    <el-radio :value="5">Localise (5)</el-radio>
                    <el-radio :value="6">Obéit aux ordres (6)</el-radio>
                  </el-radio-group>
                </el-form-item>
              </el-col>
              <el-col :span="4">
                <div class="glasgow-result">
                  <div class="glasgow-result__score">
                    <span class="glasgow-result__label">Score Glasgow</span>
                    <span class="glasgow-result__value">{{ glasgowScore != null ? glasgowScore + ' / 15' : '— / 15' }}</span>
                  </div>
                  <el-tag :type="glasgowInterpretationType" effect="dark" class="glasgow-result__tag">
                    {{ glasgowLabel }}
                  </el-tag>
                </div>
              </el-col>
            </el-row>
            <p class="history-collapse__hint">Le score Glasgow actuel sera enregistré avec la date et l'heure courantes.</p>
            <div class="history-collapse__actions">
              <el-button type="primary" @click="saveGlasgowEntry">Enregistrer</el-button>
              <el-button @click="cancelGlasgowEdit">Annuler</el-button>
            </div>
          </div>
        </div>

        <div class="history-table-wrap">
          <table class="history-table">
            <thead>
              <tr>
                <th>Date / Heure</th>
                <th>Ouverture yeux</th>
                <th>Réponse verbale</th>
                <th>Réponse motrice</th>
                <th>Score</th>
                <th>Interprétation</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="!sortedGlasgowHistory.length">
                <td colspan="7" class="history-table__empty">Aucune évaluation enregistrée</td>
              </tr>
              <tr v-for="entry in sortedGlasgowHistory" :key="entry._key">
                <td class="history-table__date">{{ formatDateTime(entry.date) }}</td>
                <td>{{ entry.ouvertureYeux }}</td>
                <td>{{ entry.reponseVerbale }}</td>
                <td>{{ entry.reponseMotrice }}</td>
                <td class="history-table__score">{{ calcEntryScore(entry) }} / 15</td>
                <td>
                  <el-tag :type="glasgowInterpretation(calcEntryScore(entry)).type" effect="plain" size="small">
                    {{ glasgowInterpretation(calcEntryScore(entry)).label }}
                  </el-tag>
                </td>
                <td class="history-table__actions">
                  <el-button size="small" type="primary" title="Modifier" @click="editGlasgowEntry(entry._key)"><el-icon><Edit /></el-icon></el-button>
                  <el-button size="small" type="danger" title="Supprimer" @click="deleteGlasgowEntry(entry._key)"><el-icon><Delete /></el-icon></el-button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <h4 class="examen-subtitle">2. Score de douleur à l'entrée</h4>

        <div class="history-collapse">
          <div class="history-collapse__header" @click="douleurFormOpen = !douleurFormOpen">
            <div class="history-collapse__header-left">
              <el-icon class="history-collapse__header-icon"><Plus /></el-icon>
              <span class="history-collapse__title">{{ douleurEditingKey ? 'Modifier la mesure' : 'Enregistrer une mesure' }}</span>
              <el-badge v-if="(data.douleurHistory || []).length" :value="(data.douleurHistory || []).length" class="history-collapse__badge" />
            </div>
            <el-icon class="history-collapse__arrow" :class="{ 'history-collapse__arrow--open': douleurFormOpen }">
              <ArrowDown />
            </el-icon>
          </div>
          <div v-show="douleurFormOpen" class="history-collapse__body">
            <el-row :gutter="16">
              <el-col :span="8">
                <el-form-item label="Score de douleur (EVA)" data-history-path="bilanInitial.scoreDouleur">
                  <el-input-number v-model="data.scoreDouleur" :min="0" :max="10" controls-position="right" style="width:100%" @change="emitChange" />
                </el-form-item>
              </el-col>
            </el-row>
            <p class="history-collapse__hint">Le score de douleur actuel sera enregistré avec la date et l'heure courantes.</p>
            <div class="history-collapse__actions">
              <el-button type="primary" @click="saveDouleurEntry">Enregistrer</el-button>
              <el-button @click="cancelDouleurEdit">Annuler</el-button>
            </div>
          </div>
        </div>

        <div class="history-table-wrap">
          <table class="history-table">
            <thead>
              <tr>
                <th>Date / Heure</th>
                <th>Score</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="!sortedDouleurHistory.length">
                <td colspan="3" class="history-table__empty">Aucune mesure enregistrée</td>
              </tr>
              <tr v-for="entry in sortedDouleurHistory" :key="entry._key">
                <td class="history-table__date">{{ formatDateTime(entry.date) }}</td>
                <td class="history-table__score">{{ entry.score }}</td>
                <td class="history-table__actions">
                  <el-button size="small" type="primary" title="Modifier" @click="editDouleurEntry(entry._key)"><el-icon><Edit /></el-icon></el-button>
                  <el-button size="small" type="danger" title="Supprimer" @click="deleteDouleurEntry(entry._key)"><el-icon><Delete /></el-icon></el-button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <h4 class="examen-subtitle">3. Paramètres vitaux à l'admission</h4>

        <div class="history-collapse">
          <div class="history-collapse__header" @click="vitalFormOpen = !vitalFormOpen">
            <div class="history-collapse__header-left">
              <el-icon class="history-collapse__header-icon"><Plus /></el-icon>
              <span class="history-collapse__title">{{ vitalEditingKey ? 'Modifier la mesure' : 'Enregistrer une mesure' }}</span>
              <el-badge v-if="(data.vitalSignsHistory || []).length" :value="(data.vitalSignsHistory || []).length" class="history-collapse__badge" />
            </div>
            <el-icon class="history-collapse__arrow" :class="{ 'history-collapse__arrow--open': vitalFormOpen }">
              <ArrowDown />
            </el-icon>
          </div>
          <div v-show="vitalFormOpen" class="history-collapse__body">
            <el-row v-if="props.linkVitalCheck" :gutter="16">
              <el-col :span="4">
                <el-form-item label="Date">
                  <el-date-picker v-model="vitalDate" type="date" value-format="YYYY-MM-DD" format="DD/MM/YYYY" style="width:100%" :disabled="!!vitalEditingKey" :disabled-date="disableFutureDates" />
                </el-form-item>
              </el-col>
              <el-col :span="4">
                <el-form-item label="Heure">
                  <el-select v-model="vitalHour" style="width:100%" :disabled="!!vitalEditingKey">
                    <el-option v-for="h in vitalHourOptions" :key="h" :label="`${String(h).padStart(2, '0')}h`" :value="h" />
                  </el-select>
                </el-form-item>
              </el-col>
            </el-row>
            <el-row :gutter="16">
              <el-col :span="4">
                <el-form-item label="TA Systolique (mmHg)" data-history-path="bilanInitial.examenPhysique.taSystolique">
                  <el-input-number v-model="data.examenPhysique.taSystolique" :min="0" :max="300" controls-position="right" style="width:100%" @change="emitChange" />
                </el-form-item>
              </el-col>
              <el-col :span="4">
                <el-form-item label="TA Diastolique (mmHg)" data-history-path="bilanInitial.examenPhysique.taDiastolique">
                  <el-input-number v-model="data.examenPhysique.taDiastolique" :min="0" :max="200" controls-position="right" style="width:100%" @change="emitChange" />
                </el-form-item>
              </el-col>
              <el-col :span="4">
                <el-form-item label="Fréquence cardiaque (bpm)" data-history-path="bilanInitial.examenPhysique.frequenceCardiaque">
                  <el-input-number v-model="data.examenPhysique.frequenceCardiaque" :min="0" :max="300" controls-position="right" style="width:100%" @change="emitChange" />
                </el-form-item>
              </el-col>
              <el-col :span="4">
                <el-form-item label="Température (°C)" data-history-path="bilanInitial.examenPhysique.temperature">
                  <el-input-number v-model="data.examenPhysique.temperature" :min="32" :max="42" :step="0.1" controls-position="right" style="width:100%" @change="emitChange" />
                </el-form-item>
              </el-col>
              <el-col :span="4">
                <el-form-item label="Glycémie (g/L)" data-history-path="bilanInitial.examenPhysique.glycemie">
                  <el-input-number v-model="data.examenPhysique.glycemie" :min="0" :max="8" :step="0.01" :precision="2" controls-position="right" style="width:100%" @change="emitChange" />
                </el-form-item>
              </el-col>
              <el-col :span="4">
                <el-form-item label="Cétominurie" data-history-path="bilanInitial.examenPhysique.cetonurie">
                  <el-select v-model="data.examenPhysique.cetonurie" placeholder="—" clearable style="width:100%" @change="emitChange">
                    <el-option label="+" value="+" />
                    <el-option label="++" value="++" />
                    <el-option label="+++ ou plus" value="+++" />
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col :span="4">
                <el-form-item label="Glucosurie" data-history-path="bilanInitial.examenPhysique.glucosurie">
                  <el-select v-model="data.examenPhysique.glucosurie" placeholder="—" clearable style="width:100%" @change="emitChange">
                    <el-option label="+" value="+" />
                    <el-option label="++" value="++" />
                    <el-option label="+++ ou plus" value="+++" />
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col :span="4">
                <el-form-item label="Cétonémie (mmol/L)" data-history-path="bilanInitial.examenPhysique.cetonemie">
                  <el-input-number v-model="data.examenPhysique.cetonemie" :min="0" :max="30" :step="0.1" :precision="1" controls-position="right" style="width:100%" @change="emitChange" />
                </el-form-item>
              </el-col>
              <el-col :span="4">
                <el-form-item label="Poids (kg)" data-history-path="bilanInitial.examenPhysique.poids">
                  <el-input-number v-model="data.examenPhysique.poids" :min="0" :max="300" :step="0.1" :precision="1" controls-position="right" style="width:100%" @change="emitChange" />
                </el-form-item>
              </el-col>
              <el-col :span="4">
                <el-form-item label="Taille (cm)" data-history-path="bilanInitial.examenPhysique.taille">
                  <el-input-number v-model="data.examenPhysique.taille" :min="0" :max="250" :step="0.5" :precision="1" controls-position="right" style="width:100%" @change="emitChange" />
                </el-form-item>
              </el-col>
              <el-col :span="4">
                <el-form-item label="IMC (kg/m²)" data-history-path="bilanInitial.examenPhysique.imc">
                  <el-input :model-value="imcDisplay" disabled />
                </el-form-item>
              </el-col>
              <el-col :span="4">
                <el-form-item label="SaO₂ (%)" data-history-path="bilanInitial.examenPhysique.saO2">
                  <el-input-number v-model="data.examenPhysique.saO2" :min="0" :max="100" :step="1" :precision="0" controls-position="right" style="width:100%" @change="emitChange" />
                </el-form-item>
              </el-col>
              <el-col :span="4">
                <el-form-item label="Diurèse (ml)" data-history-path="bilanInitial.examenPhysique.diurese">
                  <el-input-number v-model="data.examenPhysique.diurese" :min="0" :max="10000" :step="50" :precision="0" controls-position="right" style="width:100%" @change="emitChange" />
                </el-form-item>
              </el-col>
            </el-row>
            <p class="history-collapse__hint">{{ linkVitalCheck ? "Les valeurs seront enregistrées pour la date et l'heure sélectionnées." : "Les valeurs actuelles des paramètres vitaux seront enregistrées avec la date et l'heure courantes." }}</p>
            <div class="history-collapse__actions">
              <el-button type="primary" :disabled="props.readonly" @click="saveVitalEntry">Enregistrer</el-button>
              <el-button @click="cancelVitalEdit">Annuler</el-button>
            </div>
          </div>
        </div>

        <div class="history-table-wrap">
          <table class="history-table">
            <thead>
              <tr>
                <th>Date / Heure</th>
                <th>TA Syst (mmHg)</th>
                <th>TA Diast (mmHg)</th>
                <th>FC (bpm)</th>
                <th>T° (°C)</th>
                <th>Glycémie (g/L)</th>
                <th>Cétominurie</th>
                <th>Glucosurie</th>
                <th>Cétonémie (mmol/L)</th>
                <th>Poids (kg)</th>
                <th>Taille (cm)</th>
                <th>IMC (kg/m²)</th>
                <th>SaO₂ (%)</th>
                <th>Diurèse (ml)</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="!sortedVitalHistory.length">
                <td colspan="15" class="history-table__empty">Aucune mesure enregistrée</td>
              </tr>
              <tr v-for="entry in sortedVitalHistory" :key="entry._key">
                <td class="history-table__date">{{ formatDateTime(entry.date) }}</td>
                <td>{{ entry.taSystolique ?? '—' }}</td>
                <td>{{ entry.taDiastolique ?? '—' }}</td>
                <td>{{ entry.frequenceCardiaque ?? '—' }}</td>
                <td>{{ entry.temperature ?? '—' }}</td>
                <td>{{ entry.glycemie ?? '—' }}</td>
                <td>{{ entry.cetonurie ?? '—' }}</td>
                <td>{{ entry.glucosurie ?? '—' }}</td>
                <td>{{ entry.cetonemie ?? '—' }}</td>
                <td>{{ entry.poids ?? '—' }}</td>
                <td>{{ entry.taille ?? '—' }}</td>
                <td>{{ entryImc(entry) ?? '—' }}</td>
                <td>{{ entry.saO2 ?? '—' }}</td>
                <td>{{ entry.diurese ?? '—' }}</td>
                <td class="history-table__actions">
                  <el-button size="small" type="primary" title="Modifier" @click="editVitalEntry(entry._key)"><el-icon><Edit /></el-icon></el-button>
                  <el-button size="small" type="danger" title="Supprimer" @click="deleteVitalEntry(entry._key)"><el-icon><Delete /></el-icon></el-button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <h4 class="examen-subtitle">4. Examen physique</h4>

        <el-row :gutter="16">
          <el-col :span="24">
            <el-form-item label="Examen physique">
              <RichTextEditor v-model="draft.examenPhysiqueTexte" :rows="3" placeholder="Décrire l'examen physique à l'entrée..." />
            </el-form-item>
          </el-col>
        </el-row>
      </template>
    </StagedCollapsibleSection>

    <div class="section-preview">
      <FormPreview
        title="Examen clinique à l'entrée"
        variant="compact"
        :fields="examenPhysiquePreviewFields"
        @edit="() => openSection('examen')"
      />
    </div>

    <StagedCollapsibleSection
      :ref="setSectionRef('conclusion')"
      title="Conclusion à l'entrée"
      :keys="['conclusionEntree']"
      :model-value="data"
      :readonly="props.readonly"
      @save="emit('change')"
    >
      <template #default="{ draft }">
        <el-row :gutter="16">
          <el-col :span="24">
            <el-form-item label="">
              <RichTextEditor v-model="draft.conclusionEntree" :rows="3" placeholder="Conclusion à l'admission..." />
            </el-form-item>
          </el-col>
        </el-row>
      </template>
    </StagedCollapsibleSection>

    <div class="section-preview">
      <FormPreview
        title="Conclusion à l'entrée"
        variant="compact"
        :fields="conclusionPreviewFields"
        @edit="() => openSection('conclusion')"
      />
    </div>

    <StagedCollapsibleSection
      :ref="setSectionRef('projetSoin')"
      title="Projet de soin pendant l'hospitalisation"
      :keys="['projetSoin']"
      :model-value="data"
      :readonly="props.readonly"
      @save="emit('change')"
    >
      <template #default="{ draft }">
        <el-row :gutter="16">
          <el-col :span="24">
            <el-form-item label="">
              <RichTextEditor v-model="draft.projetSoin" :rows="3" placeholder="Décrire le projet de soin pendant l'hospitalisation..." />
            </el-form-item>
          </el-col>
        </el-row>
      </template>
    </StagedCollapsibleSection>

    <div class="section-preview">
      <FormPreview
        title="Projet de soin"
        variant="compact"
        :fields="projetSoinPreviewFields"
        @edit="() => openSection('projetSoin')"
      />
    </div>
  </el-form>
</template>

<script setup lang="ts">
/* eslint-disable vue/no-mutating-props -- Écritures volontaires dans l'objet réactif partagé data (sub-blocks history-collapse + sync vitals) déclenchées par émission explicite de 'change' */
import { ref, computed, watch, inject, nextTick, type Ref } from 'vue'
import { Plus, ArrowDown, Delete, Edit } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { BilanInitialData } from '@/types/crh-diabete'
import { useCrhDiabeteCalculations } from '@/composables/useCrhDiabeteCalculations'
import { getVitalSignsItemsList, saveVitalSignsItem, deleteVitalSignsItem, type VitalSignsItemRecord } from '@/composables/useVitalSigns'
import { isRichTextEmpty } from '@/utils/rich-text'
import FormPreview, { type FormPreviewField } from '@/components/common/FormPreview.vue'
import RichTextEditor from '@/components/patients/RichTextEditor.vue'
import StagedCollapsibleSection from '@/components/common/StagedCollapsibleSection.vue'

const FIELD_PREFIX = 'bilanInitial'

const props = defineProps<{
  data: BilanInitialData
  fieldMeta?: Record<string, string>
  patientId?: number | null
  dateDebut?: string
  dateFin?: string
  linkVitalCheck?: boolean
  readonly?: boolean
}>()

const emit = defineEmits<{
  change: []
}>()

function metaFor(key: string): string | null {
  return props.fieldMeta?.[key] ?? null
}

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

function richValue(html: string | null | undefined): string | undefined {
  return isRichTextEmpty(html) ? undefined : (html as string)
}

const histoirePreviewFields = computed<FormPreviewField[]>(() => [
  {
    label: 'Histoire récente de la maladie',
    value: richValue(props.data.histoireRecent),
    rich: true,
    key: `${FIELD_PREFIX}.histoireRecent`,
    updatedAt: metaFor(`${FIELD_PREFIX}.histoireRecent`),
    tracked: !!props.fieldMeta,
  },
])

const traitementPreviewFields = computed<FormPreviewField[]>(() => [
  {
    label: "Traitement à l'entrée",
    value: richValue(props.data.traitementEntree),
    rich: true,
    key: `${FIELD_PREFIX}.traitementEntree`,
    updatedAt: metaFor(`${FIELD_PREFIX}.traitementEntree`),
    tracked: !!props.fieldMeta,
  },
])

const examenPhysiquePreviewFields = computed<FormPreviewField[]>(() => [
  {
    label: 'Examen physique',
    value: richValue(props.data.examenPhysiqueTexte),
    rich: true,
    key: `${FIELD_PREFIX}.examenPhysiqueTexte`,
    updatedAt: metaFor(`${FIELD_PREFIX}.examenPhysiqueTexte`),
    tracked: !!props.fieldMeta,
  },
])

const conclusionPreviewFields = computed<FormPreviewField[]>(() => [
  {
    label: "Conclusion à l'entrée",
    value: richValue(props.data.conclusionEntree),
    rich: true,
    key: `${FIELD_PREFIX}.conclusionEntree`,
    updatedAt: metaFor(`${FIELD_PREFIX}.conclusionEntree`),
    tracked: !!props.fieldMeta,
  },
])

const projetSoinPreviewFields = computed<FormPreviewField[]>(() => [
  {
    label: "Projet de soin pendant l'hospitalisation",
    value: richValue(props.data.projetSoin),
    rich: true,
    key: `${FIELD_PREFIX}.projetSoin`,
    updatedAt: metaFor(`${FIELD_PREFIX}.projetSoin`),
    tracked: !!props.fieldMeta,
  },
])

const { calcGlasgowScore, glasgowInterpretation, calcIMC } = useCrhDiabeteCalculations()

const glasgowScore = computed(() => {
  return calcGlasgowScore(
    props.data.glasgow.ouvertureYeux,
    props.data.glasgow.reponseVerbale,
    props.data.glasgow.reponseMotrice,
  )
})

const glasgowInterpretationType = computed(() => glasgowInterpretation(glasgowScore.value).type)
const glasgowLabel = computed(() => glasgowInterpretation(glasgowScore.value).label)

const imcDisplay = computed(() => {
  const v = calcIMC(props.data.examenPhysique.poids, props.data.examenPhysique.taille)
  return v != null ? String(v) : '—'
})

const glasgowFormOpen = ref(false)
const douleurFormOpen = ref(false)
const vitalFormOpen = ref(false)
const glasgowEditingKey = ref<string | null>(null)
const douleurEditingKey = ref<string | null>(null)
const vitalEditingKey = ref<string | null>(null)
const vitalDate = ref(todayISO())
const vitalHour = ref(defaultVitalHour())
const vitalLoading = ref(false)
const vitalMutationInFlight = ref(false)
let vitalSyncEpoch = 0
const vitalSyncInProgress = inject<Ref<boolean> | undefined>('vitalSyncInProgress', undefined)
const vitalHourOptions = Array.from({ length: 17 }, (_, i) => 6 + i)

const sortedVitalHistory = computed(() =>
  [...(props.data.vitalSignsHistory || [])].sort((a, b) => b.date.localeCompare(a.date)),
)
const sortedGlasgowHistory = computed(() =>
  [...(props.data.glasgowHistory || [])].sort((a, b) => b.date.localeCompare(a.date)),
)
const sortedDouleurHistory = computed(() =>
  [...(props.data.douleurHistory || [])].sort((a, b) => b.date.localeCompare(a.date)),
)

function generateKey() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
}

function currentIsoDateTime() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}T${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function todayISO() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function disableFutureDates(date: Date) {
  return date.getTime() > Date.now()
}

function defaultVitalHour() {
  const h = new Date().getHours()
  return h >= 6 && h <= 22 ? h : 8
}

function formatDateTime(isoStr: string) {
  if (!isoStr) return '—'
  const d = new Date(isoStr)
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
    + ' ' + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

function calcEntryScore(entry: { ouvertureYeux: number; reponseVerbale: number; reponseMotrice: number }) {
  return calcGlasgowScore(entry.ouvertureYeux, entry.reponseVerbale, entry.reponseMotrice)
}

function entryImc(entry: { poids: number | null; taille: number | null }) {
  return calcIMC(entry.poids, entry.taille)
}

function toVitalHistoryEntry(item: VitalSignsItemRecord) {
  return {
    _key: String(item.id),
    date: `${item.date}T${String(item.hour).padStart(2, '0')}:00:00`,
    hour: item.hour,
    taSystolique: item.taSystolique,
    taDiastolique: item.taDiastolique,
    frequenceCardiaque: item.frequenceCardiaque,
    temperature: item.temperature,
    glycemie: item.glycemie,
    cetonurie: item.cetonurie,
    glucosurie: item.glucosurie,
    cetonemie: item.cetonemie,
    poids: item.poids,
    saO2: item.saO2,
    diurese: item.diurese,
    taille: null,
  }
}

async function syncVitalHistory() {
  if (!props.linkVitalCheck || props.readonly || !props.patientId) return
  if (vitalMutationInFlight.value) return
  const epoch = vitalSyncEpoch
  vitalLoading.value = true
  try {
    // S2: never end the window before today, so a measure dated today still
    // shows in the CRH grid even after the patient has been discharged.
    const end = props.dateFin && props.dateFin >= todayISO() ? props.dateFin : todayISO()
    const items = await getVitalSignsItemsList(props.patientId, props.dateDebut || '', end)
    if (epoch !== vitalSyncEpoch) return
    const mapped = items.map(toVitalHistoryEntry)
    const historyChanged = JSON.stringify(mapped) !== JSON.stringify(props.data.vitalSignsHistory || [])
    const prefilled = prefillVitalExamenPhysique(items)
    if ((historyChanged || prefilled) && vitalSyncInProgress) {
      // Parent (CrhDiabeteForm) consumes this flag so sync-driven writes are
      // not recorded as user-modified fields in meta.champs (S6).
      vitalSyncInProgress.value = true
      // Self-heal: clear the flag even if the parent watcher never fires for this batch.
      queueMicrotask(() => { vitalSyncInProgress.value = false })
    }
    if (historyChanged) {
      props.data.vitalSignsHistory = mapped
    }
  } catch (e) {
    // Keep existing history on sync failure, but surface the error for diagnostics.
    console.warn('[BilanInitialTab] sync vital history failed:', (e as Error)?.message)
  } finally {
    vitalLoading.value = false
  }
}

function prefillVitalExamenPhysique(items: VitalSignsItemRecord[]) {
  if (!props.dateDebut) return false
  const admissionDayItems = items.filter(i => i.date === props.dateDebut)
  if (!admissionDayItems.length) return false
  const latest = admissionDayItems.reduce((a, b) => (b.hour > a.hour ? b : a))
  const src = props.data.examenPhysique
  const allEmpty = src.taSystolique == null && src.taDiastolique == null
    && src.frequenceCardiaque == null && src.temperature == null
    && src.glycemie == null && src.cetonurie == null
    && src.glucosurie == null && src.cetonemie == null
    && src.poids == null && src.taille == null
    && src.saO2 == null && src.diurese == null
  if (!allEmpty) return false
  src.taSystolique = latest.taSystolique
  src.taDiastolique = latest.taDiastolique
  src.frequenceCardiaque = latest.frequenceCardiaque
  src.temperature = latest.temperature
  src.glycemie = latest.glycemie
  src.cetonurie = latest.cetonurie
  src.glucosurie = latest.glucosurie
  src.cetonemie = latest.cetonemie
  src.poids = latest.poids
  src.saO2 = latest.saO2
  src.diurese = latest.diurese
  return true
}

watch(
  () => [props.patientId, props.dateDebut, props.dateFin, props.linkVitalCheck],
  syncVitalHistory,
  { immediate: true },
)

async function saveVitalEntry() {
  if (props.readonly) return
  const src = props.data.examenPhysique
  if (!props.data.vitalSignsHistory) props.data.vitalSignsHistory = []
  const record = {
    taSystolique: src.taSystolique,
    taDiastolique: src.taDiastolique,
    frequenceCardiaque: src.frequenceCardiaque,
    temperature: src.temperature,
    glycemie: src.glycemie,
    cetonurie: src.cetonurie,
    glucosurie: src.glucosurie,
    cetonemie: src.cetonemie,
    poids: src.poids,
    taille: src.taille,
    saO2: src.saO2 ?? null,
    diurese: src.diurese ?? null,
  }
  if (props.linkVitalCheck && props.patientId) {
    vitalMutationInFlight.value = true
    try {
      const saved = await saveVitalSignsItem(props.patientId, {
        date: vitalDate.value,
        hour: vitalHour.value,
        taSystolique: record.taSystolique,
        taDiastolique: record.taDiastolique,
        frequenceCardiaque: record.frequenceCardiaque,
        temperature: record.temperature,
        glycemie: record.glycemie,
        cetonurie: record.cetonurie,
        glucosurie: record.glucosurie,
        cetonemie: record.cetonemie,
        saO2: record.saO2,
        diurese: record.diurese,
        poids: record.poids,
      })
      vitalSyncEpoch += 1
      const mapped = toVitalHistoryEntry(saved)
      const idx = props.data.vitalSignsHistory.findIndex(e => e._key === mapped._key)
      if (idx !== -1) props.data.vitalSignsHistory[idx] = mapped
      else props.data.vitalSignsHistory.push(mapped)
      vitalEditingKey.value = null
      vitalFormOpen.value = false
      ElMessage.success('Mesure enregistrée')
      emitChange()
    } catch (e) {
      ElMessage.error(`Erreur lors de l'enregistrement: ${(e as Error).message}`)
    } finally {
      vitalMutationInFlight.value = false
    }
    return
  }
  if (vitalEditingKey.value) {
    const idx = props.data.vitalSignsHistory.findIndex(e => e._key === vitalEditingKey.value)
    if (idx !== -1) props.data.vitalSignsHistory[idx] = { ...props.data.vitalSignsHistory[idx], ...record }
    vitalEditingKey.value = null
  } else {
    props.data.vitalSignsHistory.push({ _key: generateKey(), date: currentIsoDateTime(), ...record })
  }
  vitalFormOpen.value = false
  emitChange()
}

function editVitalEntry(key: string) {
  if (props.readonly) return
  const entry = (props.data.vitalSignsHistory || []).find(e => e._key === key)
  if (!entry) return
  vitalEditingKey.value = key
  props.data.examenPhysique.taSystolique = entry.taSystolique
  props.data.examenPhysique.taDiastolique = entry.taDiastolique
  props.data.examenPhysique.frequenceCardiaque = entry.frequenceCardiaque
  props.data.examenPhysique.temperature = entry.temperature
  props.data.examenPhysique.glycemie = entry.glycemie
  props.data.examenPhysique.cetonurie = entry.cetonurie
  props.data.examenPhysique.glucosurie = entry.glucosurie
  props.data.examenPhysique.cetonemie = entry.cetonemie
  props.data.examenPhysique.poids = entry.poids
  props.data.examenPhysique.saO2 = entry.saO2 ?? null
  props.data.examenPhysique.diurese = entry.diurese ?? null
  if (props.linkVitalCheck) {
    if (entry.taille != null) props.data.examenPhysique.taille = entry.taille
    vitalDate.value = entry.date.slice(0, 10)
    vitalHour.value = entry.hour ?? defaultVitalHour()
  } else {
    props.data.examenPhysique.taille = entry.taille
  }
  vitalFormOpen.value = true
}

function cancelVitalEdit() {
  vitalEditingKey.value = null
  vitalFormOpen.value = false
  vitalDate.value = todayISO()
  vitalHour.value = defaultVitalHour()
  props.data.examenPhysique.saO2 = null
  props.data.examenPhysique.diurese = null
}

async function deleteVitalEntry(key: string) {
  if (props.readonly) return
  try {
    await ElMessageBox.confirm('Supprimer cette mesure ?', 'Confirmation', {
      type: 'warning', confirmButtonText: 'Supprimer', cancelButtonText: 'Annuler',
    })
  } catch { return }
  try {
    if (props.linkVitalCheck && props.patientId) {
      const id = Number(key)
      if (Number.isInteger(id) && id > 0) {
        vitalMutationInFlight.value = true
        try {
          await deleteVitalSignsItem(id)
          vitalSyncEpoch += 1
        } finally {
          vitalMutationInFlight.value = false
        }
      }
    }
    const idx = (props.data.vitalSignsHistory || []).findIndex(e => e._key === key)
    if (idx !== -1) props.data.vitalSignsHistory.splice(idx, 1)
    emitChange()
  } catch (e) {
    if (props.linkVitalCheck) {
      ElMessage.error(`Erreur lors de la suppression: ${(e as Error).message}`)
    }
  }
}

function saveDouleurEntry() {
  if (props.data.scoreDouleur == null) return
  if (!props.data.douleurHistory) props.data.douleurHistory = []
  if (douleurEditingKey.value) {
    const idx = props.data.douleurHistory.findIndex(e => e._key === douleurEditingKey.value)
    if (idx !== -1) props.data.douleurHistory[idx] = { ...props.data.douleurHistory[idx], score: props.data.scoreDouleur }
    douleurEditingKey.value = null
  } else {
    props.data.douleurHistory.push({
      _key: generateKey(),
      date: currentIsoDateTime(),
      score: props.data.scoreDouleur,
    })
  }
  douleurFormOpen.value = false
  emitChange()
}

function editDouleurEntry(key: string) {
  const entry = (props.data.douleurHistory || []).find(e => e._key === key)
  if (!entry) return
  douleurEditingKey.value = key
  props.data.scoreDouleur = entry.score
  douleurFormOpen.value = true
}

function cancelDouleurEdit() {
  douleurEditingKey.value = null
  douleurFormOpen.value = false
}

async function deleteDouleurEntry(key: string) {
  try {
    await ElMessageBox.confirm('Supprimer cette mesure ?', 'Confirmation', {
      type: 'warning', confirmButtonText: 'Supprimer', cancelButtonText: 'Annuler',
    })
    const idx = (props.data.douleurHistory || []).findIndex(e => e._key === key)
    if (idx !== -1) props.data.douleurHistory.splice(idx, 1)
    emitChange()
  } catch { /* cancelled */ }
}

function saveGlasgowEntry() {
  const src = props.data.glasgow
  if (!props.data.glasgowHistory) props.data.glasgowHistory = []
  const record = {
    ouvertureYeux: src.ouvertureYeux,
    reponseVerbale: src.reponseVerbale,
    reponseMotrice: src.reponseMotrice,
  }
  if (glasgowEditingKey.value) {
    const idx = props.data.glasgowHistory.findIndex(e => e._key === glasgowEditingKey.value)
    if (idx !== -1) props.data.glasgowHistory[idx] = { ...props.data.glasgowHistory[idx], ...record }
    glasgowEditingKey.value = null
  } else {
    props.data.glasgowHistory.push({ _key: generateKey(), date: currentIsoDateTime(), ...record })
  }
  glasgowFormOpen.value = false
  emitChange()
}

function editGlasgowEntry(key: string) {
  const entry = (props.data.glasgowHistory || []).find(e => e._key === key)
  if (!entry) return
  glasgowEditingKey.value = key
  props.data.glasgow.ouvertureYeux = entry.ouvertureYeux
  props.data.glasgow.reponseVerbale = entry.reponseVerbale
  props.data.glasgow.reponseMotrice = entry.reponseMotrice
  glasgowFormOpen.value = true
}

function cancelGlasgowEdit() {
  glasgowEditingKey.value = null
  glasgowFormOpen.value = false
}

async function deleteGlasgowEntry(key: string) {
  try {
    await ElMessageBox.confirm('Supprimer cette évaluation ?', 'Confirmation', {
      type: 'warning', confirmButtonText: 'Supprimer', cancelButtonText: 'Annuler',
    })
    const idx = (props.data.glasgowHistory || []).findIndex(e => e._key === key)
    if (idx !== -1) props.data.glasgowHistory.splice(idx, 1)
    emitChange()
  } catch { /* cancelled */ }
}

function emitChange() {
  emit('change')
}
</script>

<style scoped lang="scss">
.el-form-item[data-history-path]:hover {
  cursor: default;
}

.section-preview {
  margin: 8px 0 16px;
}

.glasgow-result {
  background: var(--el-color-primary-light-9);
  border: 1px solid var(--el-border-color-light);
  border-radius: 8px;
  padding: 12px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.glasgow-result__score {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.glasgow-result__label {
  font-size: 11px;
  color: var(--el-text-color-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.glasgow-result__value {
  font-size: 22px;
  font-weight: 700;
  color: var(--el-text-color-primary);
}

.glasgow-result__tag {
  font-size: 11px;
}

.examen-subtitle {
  margin: 14px 0 6px;
  font-size: 13px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

/* History collapse */
.history-collapse {
  border: 1px solid var(--cd-gray-200);
  border-radius: 6px;
  overflow: hidden;
  margin-bottom: 16px;
}
.history-collapse__header {
  background: linear-gradient(135deg, var(--cd-primary), #2E86C1);
  color: #fff;
  padding: 10px 14px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  user-select: none;
  transition: opacity 0.15s;
}
.history-collapse__header:hover { opacity: 0.92; }
.history-collapse__header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}
.history-collapse__header-icon { font-size: 16px; }
.history-collapse__title { font-size: 13px; font-weight: 600; }
.history-collapse__badge :deep(.el-badge__content) {
  background: rgba(255, 255, 255, 0.3);
  border: none;
}
.history-collapse__arrow { transition: transform 0.25s ease; font-size: 14px; }
.history-collapse__arrow--open { transform: rotate(180deg); }
.history-collapse__body { padding: 14px; background: #fff; }
.history-collapse__hint {
  font-size: 11px;
  color: var(--cd-gray-400);
  margin: 0 0 8px;
  font-style: italic;
}
.history-collapse__actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  margin-top: 12px;
  padding-top: 10px;
  border-top: 1px solid var(--cd-gray-100);
}

/* History table */
.history-table-wrap {
  margin-bottom: 16px;
  overflow-x: auto;
}
.history-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
  background: #fff;
  border: 1px solid var(--cd-gray-200);
  border-radius: 6px;
  overflow: hidden;
}
.history-table thead th {
  background: var(--cd-primary-lighter);
  color: var(--cd-primary);
  font-weight: 600;
  text-transform: uppercase;
  font-size: 10px;
  letter-spacing: 0.3px;
  padding: 8px 10px;
  text-align: left;
  border-bottom: 1px solid var(--cd-gray-200);
  white-space: nowrap;
}
.history-table tbody td {
  padding: 7px 10px;
  border-bottom: 1px solid var(--cd-gray-100);
  color: var(--cd-gray-600);
}
.history-table tbody tr:last-child td {
  border-bottom: none;
}
.history-table tbody tr:hover {
  background: var(--cd-primary-lighter);
}
.history-table__date {
  font-weight: 600;
  color: var(--cd-primary);
  white-space: nowrap;
}
.history-table__score {
  font-weight: 700;
  color: var(--cd-gray-900);
}
.history-table__actions {
  white-space: nowrap;
  text-align: right;
}
.history-table__empty {
  text-align: center;
  color: var(--cd-gray-400);
  font-style: italic;
  padding: 16px 10px;
}
</style>
