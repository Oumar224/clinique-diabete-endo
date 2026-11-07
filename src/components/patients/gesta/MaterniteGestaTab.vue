<!-- MaterniteGestaTab — CRC Diabète gestationnel : données maternelles,
  paramètres prégestationnels / du jour, historique des mesures, facteurs de risque.
  Même pattern que ParametresCliniquesObesiteTab : StagedCollapsibleSection pour
  l'édition (draft isolé, `change` émis au `save`), CollapsibleSection pour
  l'historique (écritures directes dans `bilan.examenPhysique` + tableau
  `vitalSignsHistory`, `change` émis immédiatement). Les IMC et la prise de
  poids sont toujours calculés (jamais stockés).
-->
<!-- eslint-disable vue/no-mutating-props -- les sous-blocs history-collapse écrivent volontairement dans les objets réactifs partagés (bilan.examenPhysique / vitalSignsHistory) et émettent change directement (cf. ParametresCliniquesObesiteTab.vue) -->
<template>
  <el-form label-position="top" class="tab-form">
    <StagedCollapsibleSection
      :ref="setSectionRef('pregestationnels')"
      title="Paramètres prégestationnels"
      :keys="['pregestationnels']"
      :model-value="maternelles"
      :readonly="readonly"
      @save="emit('change')"
    >
      <template #default="{ draft }">
        <el-row :gutter="16">
          <el-col :span="6">
            <el-form-item label="Gestité">
              <el-input-number
                v-model="draft.pregestationnels.gestite"
                :min="0"
                :precision="0"
                controls-position="right"
                style="width:100%"
                :disabled="readonly"
              />
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="Parité">
              <el-input-number
                v-model="draft.pregestationnels.parite"
                :min="0"
                :precision="0"
                controls-position="right"
                style="width:100%"
                :disabled="readonly"
              />
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="Césarienne">
              <el-input-number
                v-model="draft.pregestationnels.cesarienne"
                :min="0"
                :precision="0"
                controls-position="right"
                style="width:100%"
                :disabled="readonly"
              />
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="Fausse couche">
              <el-input-number
                v-model="draft.pregestationnels.fausseCouche"
                :min="0"
                :precision="0"
                controls-position="right"
                style="width:100%"
                :disabled="readonly"
              />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="16">
          <el-col :span="8">
            <el-form-item label="DDR">
              <el-date-picker
                v-model="draft.pregestationnels.ddr"
                type="date"
                value-format="YYYY-MM-DD"
                format="DD/MM/YYYY"
                style="width: 100%"
                :disabled="readonly"
                @change="autoDpa(draft.pregestationnels)"
              />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="DPA">
              <el-date-picker
                v-model="draft.pregestationnels.dpa"
                type="date"
                value-format="YYYY-MM-DD"
                format="DD/MM/YYYY"
                style="width: 100%"
                :disabled="readonly"
              />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="Poids prégestationnel (kg)">
              <el-input-number
                v-model="draft.pregestationnels.poidsPregestationnel"
                :min="0"
                :step="0.1"
                :precision="1"
                controls-position="right"
                style="width:100%"
                :disabled="readonly"
              />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="16">
          <el-col :span="24">
            <el-form-item label="IMC prégestationnel (kg/m²) — calculé">
              <el-input
                :model-value="imcPreDisplay(draft.pregestationnels.poidsPregestationnel, bilan.examenPhysique.taille)"
                disabled
              />
            </el-form-item>
          </el-col>
        </el-row>
      </template>
    </StagedCollapsibleSection>

    <div class="section-preview">
      <FormPreview
        title="Paramètres prégestationnels"
        variant="compact"
        :fields="pregestationnelsPreviewFields"
        @edit="() => openSection('pregestationnels')"
      />
    </div>

    <StagedCollapsibleSection
      :ref="setSectionRef('jour')"
      title="Paramètres du jour"
      :keys="['examenPhysique']"
      :model-value="bilan"
      :readonly="readonly"
      @save="emit('change')"
    >
      <template #default="{ draft }">
        <el-row :gutter="16">
          <el-col :span="6">
            <el-form-item label="Terme (SA)">
              <div class="field-history">
                <el-input-number
                  v-model="draft.examenPhysique.termeSa"
                  :min="0"
                  :precision="0"
                  controls-position="right"
                  style="width:100%"
                  :disabled="readonly"
                />
                <button
                  type="button"
                  class="history-th-btn history-field-btn"
                  @click.stop="forwardHistory('bilanInitial.examenPhysique.termeSa')"
                  :aria-label="'Voir historique Terme'"
                  :title="'Voir historique Terme'"
                >
                  <el-icon :size="14" class="history-th-icon" aria-hidden="true"><Clock /></el-icon>
                </button>
              </div>
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="Terme (jours)">
              <div class="field-history">
                <el-input-number
                  v-model="draft.examenPhysique.termeJours"
                  :min="0"
                  :max="6"
                  :precision="0"
                  controls-position="right"
                  style="width:100%"
                  :disabled="readonly"
                />
                <button
                  type="button"
                  class="history-th-btn history-field-btn"
                  @click.stop="forwardHistory('bilanInitial.examenPhysique.termeJours')"
                  :aria-label="'Voir historique Terme (jours)'"
                  :title="'Voir historique Terme (jours)'"
                >
                  <el-icon :size="14" class="history-th-icon" aria-hidden="true"><Clock /></el-icon>
                </button>
              </div>
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="Poids (kg)">
              <div class="field-history">
                <el-input-number
                  v-model="draft.examenPhysique.poids"
                  :min="0"
                  :step="0.1"
                  :precision="1"
                  controls-position="right"
                  style="width:100%"
                  :disabled="readonly"
                />
                <button
                  type="button"
                  class="history-th-btn history-field-btn"
                  @click.stop="forwardHistory('bilanInitial.examenPhysique.poids')"
                  :aria-label="'Voir historique Poids'"
                  :title="'Voir historique Poids'"
                >
                  <el-icon :size="14" class="history-th-icon" aria-hidden="true"><Clock /></el-icon>
                </button>
              </div>
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="Taille (cm)">
              <div class="field-history">
                <el-input-number
                  v-model="draft.examenPhysique.taille"
                  :min="0"
                  :step="0.5"
                  :precision="1"
                  controls-position="right"
                  style="width:100%"
                  :disabled="readonly"
                />
                <button
                  type="button"
                  class="history-th-btn history-field-btn"
                  @click.stop="forwardHistory('bilanInitial.examenPhysique.taille')"
                  :aria-label="'Voir historique Taille'"
                  :title="'Voir historique Taille'"
                >
                  <el-icon :size="14" class="history-th-icon" aria-hidden="true"><Clock /></el-icon>
                </button>
              </div>
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="16">
          <el-col :span="6">
            <el-form-item label="TA Systolique (mmHg)">
              <div class="field-history">
                <el-input-number
                  v-model="draft.examenPhysique.taSystolique"
                  :min="0"
                  :max="300"
                  controls-position="right"
                  style="width:100%"
                  :disabled="readonly"
                />
                <button
                  type="button"
                  class="history-th-btn history-field-btn"
                  @click.stop="forwardHistory('bilanInitial.examenPhysique.taSystolique')"
                  :aria-label="'Voir historique TA systolique'"
                  :title="'Voir historique TA systolique'"
                >
                  <el-icon :size="14" class="history-th-icon" aria-hidden="true"><Clock /></el-icon>
                </button>
              </div>
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="TA Diastolique (mmHg)">
              <div class="field-history">
                <el-input-number
                  v-model="draft.examenPhysique.taDiastolique"
                  :min="0"
                  :max="200"
                  controls-position="right"
                  style="width:100%"
                  :disabled="readonly"
                />
                <button
                  type="button"
                  class="history-th-btn history-field-btn"
                  @click.stop="forwardHistory('bilanInitial.examenPhysique.taDiastolique')"
                  :aria-label="'Voir historique TA diastolique'"
                  :title="'Voir historique TA diastolique'"
                >
                  <el-icon :size="14" class="history-th-icon" aria-hidden="true"><Clock /></el-icon>
                </button>
              </div>
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="Fréquence cardiaque (bpm)">
              <div class="field-history">
                <el-input-number
                  v-model="draft.examenPhysique.frequenceCardiaque"
                  :min="0"
                  :max="300"
                  controls-position="right"
                  style="width:100%"
                  :disabled="readonly"
                />
                <button
                  type="button"
                  class="history-th-btn history-field-btn"
                  @click.stop="forwardHistory('bilanInitial.examenPhysique.frequenceCardiaque')"
                  :aria-label="'Voir historique Fréquence cardiaque'"
                  :title="'Voir historique Fréquence cardiaque'"
                >
                  <el-icon :size="14" class="history-th-icon" aria-hidden="true"><Clock /></el-icon>
                </button>
              </div>
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="SaO₂ (%)">
              <div class="field-history">
                <el-input-number
                  v-model="draft.examenPhysique.saO2"
                  :min="0"
                  :max="100"
                  :precision="0"
                  controls-position="right"
                  style="width:100%"
                  :disabled="readonly"
                />
                <button
                  type="button"
                  class="history-th-btn history-field-btn"
                  @click.stop="forwardHistory('bilanInitial.examenPhysique.saO2')"
                  :aria-label="'Voir historique SaO2'"
                  :title="'Voir historique SaO2'"
                >
                  <el-icon :size="14" class="history-th-icon" aria-hidden="true"><Clock /></el-icon>
                </button>
              </div>
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="16">
          <el-col :span="8">
            <el-form-item label="IMC prégestationnel (kg/m²) — calculé">
              <div class="field-history">
                <el-input
                  :model-value="imcPreDisplay(maternelles.pregestationnels.poidsPregestationnel, draft.examenPhysique.taille)"
                  disabled
                />
                <button
                  type="button"
                  class="history-th-btn history-field-btn"
                  @click.stop="forwardHistory('bilanInitial.examenPhysique.imc')"
                  :aria-label="'Voir historique IMC prégestationnel'"
                  :title="'Voir historique IMC prégestationnel'"
                >
                  <el-icon :size="14" class="history-th-icon" aria-hidden="true"><Clock /></el-icon>
                </button>
              </div>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="IMC actuel (kg/m²) — calculé">
              <div class="field-history">
                <el-input
                  :model-value="imcActDisplay(draft.examenPhysique.poids, draft.examenPhysique.taille)"
                  disabled
                />
                <button
                  type="button"
                  class="history-th-btn history-field-btn"
                  @click.stop="forwardHistory('bilanInitial.examenPhysique.imc')"
                  :aria-label="'Voir historique IMC actuel'"
                  :title="'Voir historique IMC actuel'"
                >
                  <el-icon :size="14" class="history-th-icon" aria-hidden="true"><Clock /></el-icon>
                </button>
              </div>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="Prise de poids (kg) — calculée">
              <el-input
                :model-value="prisePoidsDisplay(draft.examenPhysique.poids, maternelles.pregestationnels.poidsPregestationnel)"
                disabled
              />
            </el-form-item>
          </el-col>
        </el-row>
      </template>
    </StagedCollapsibleSection>

    <div class="section-preview">
      <FormPreview
        title="Paramètres du jour"
        variant="compact"
        :fields="jourPreviewFields"
        @edit="() => openSection('jour')"
      />
    </div>

    <CollapsibleSection
      title="Historique des mesures"
      :default-open="true"
    >
      <div class="history-collapse">
        <div class="history-collapse__header" @click="vitalFormOpen = !vitalFormOpen">
          <div class="history-collapse__header-left">
            <el-icon class="history-collapse__header-icon"><Plus /></el-icon>
            <span class="history-collapse__title">{{ vitalEditingKey ? 'Modifier la mesure' : 'Enregistrer une mesure' }}</span>
            <el-badge v-if="(bilan.vitalSignsHistory || []).length" :value="(bilan.vitalSignsHistory || []).length" class="history-collapse__badge" />
          </div>
          <el-icon class="history-collapse__arrow" :class="{ 'history-collapse__arrow--open': vitalFormOpen }">
            <ArrowDown />
          </el-icon>
        </div>
        <div v-show="vitalFormOpen" class="history-collapse__body">
          <el-row :gutter="16">
            <el-col :span="6">
              <el-form-item label="Terme (SA)">
                <el-input-number v-model="bilan.examenPhysique.termeSa" :min="0" :precision="0" controls-position="right" style="width:100%" :disabled="readonly" @change="emitChange" />
              </el-form-item>
            </el-col>
            <el-col :span="6">
              <el-form-item label="Terme (jours)">
                <el-input-number v-model="bilan.examenPhysique.termeJours" :min="0" :max="6" :precision="0" controls-position="right" style="width:100%" :disabled="readonly" @change="emitChange" />
              </el-form-item>
            </el-col>
            <el-col :span="6">
              <el-form-item label="Poids (kg)">
                <el-input-number v-model="bilan.examenPhysique.poids" :min="0" :step="0.1" :precision="1" controls-position="right" style="width:100%" :disabled="readonly" @change="emitChange" />
              </el-form-item>
            </el-col>
            <el-col :span="6">
              <el-form-item label="Taille (cm)">
                <el-input-number v-model="bilan.examenPhysique.taille" :min="0" :step="0.5" :precision="1" controls-position="right" style="width:100%" :disabled="readonly" @change="emitChange" />
              </el-form-item>
            </el-col>
          </el-row>
          <el-row :gutter="16">
            <el-col :span="6">
              <el-form-item label="TA Systolique (mmHg)">
                <el-input-number v-model="bilan.examenPhysique.taSystolique" :min="0" :max="300" controls-position="right" style="width:100%" :disabled="readonly" @change="emitChange" />
              </el-form-item>
            </el-col>
            <el-col :span="6">
              <el-form-item label="TA Diastolique (mmHg)">
                <el-input-number v-model="bilan.examenPhysique.taDiastolique" :min="0" :max="200" controls-position="right" style="width:100%" :disabled="readonly" @change="emitChange" />
              </el-form-item>
            </el-col>
            <el-col :span="6">
              <el-form-item label="Fréquence cardiaque (bpm)">
                <el-input-number v-model="bilan.examenPhysique.frequenceCardiaque" :min="0" :max="300" controls-position="right" style="width:100%" :disabled="readonly" @change="emitChange" />
              </el-form-item>
            </el-col>
            <el-col :span="6">
              <el-form-item label="SaO₂ (%)">
                <el-input-number v-model="bilan.examenPhysique.saO2" :min="0" :max="100" :precision="0" controls-position="right" style="width:100%" :disabled="readonly" @change="emitChange" />
              </el-form-item>
            </el-col>
          </el-row>
          <el-row :gutter="16">
            <el-col :span="8">
              <el-form-item label="IMC actuel (kg/m²) — calculé">
                <el-input :model-value="imcActuelDisplay" disabled />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="IMC prégestationnel (kg/m²) — calculé">
                <el-input :model-value="imcPregestationnelDisplay" disabled />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="Prise de poids (kg) — calculée">
                <el-input :model-value="prisePoidsComputedDisplay" disabled />
              </el-form-item>
            </el-col>
          </el-row>
          <p class="history-collapse__hint">Les valeurs actuelles des paramètres du jour seront enregistrées avec la date et l'heure courantes.</p>
          <div class="history-collapse__actions">
            <el-button type="primary" :disabled="readonly" @click="saveVitalEntry">Enregistrer</el-button>
            <el-button @click="cancelVitalEdit">Annuler</el-button>
          </div>
        </div>
      </div>

      <div class="history-table-wrap">
        <table class="history-table">
          <thead>
            <tr>
              <th>Date / Heure</th>
              <th><button type="button" class="history-th-btn" @click.stop="forwardHistory('bilanInitial.examenPhysique.termeSa')" :aria-label="'Voir historique Terme'" :title="'Voir historique Terme'">Terme <el-icon :size="14" class="history-th-icon" aria-hidden="true"><Clock /></el-icon></button></th>
              <th><button type="button" class="history-th-btn" @click.stop="forwardHistory('bilanInitial.examenPhysique.poids')" :aria-label="'Voir historique Poids'" :title="'Voir historique Poids'">Poids (kg) <el-icon :size="14" class="history-th-icon" aria-hidden="true"><Clock /></el-icon></button></th>
              <th><button type="button" class="history-th-btn" @click.stop="forwardHistory('bilanInitial.examenPhysique.taille')" :aria-label="'Voir historique Taille'" :title="'Voir historique Taille'">Taille (cm) <el-icon :size="14" class="history-th-icon" aria-hidden="true"><Clock /></el-icon></button></th>
              <th><button type="button" class="history-th-btn" @click.stop="forwardHistory('bilanInitial.examenPhysique.imc')" :aria-label="'Voir historique IMC'" :title="'Voir historique IMC'">IMC (kg/m²) <el-icon :size="14" class="history-th-icon" aria-hidden="true"><Clock /></el-icon></button></th>
              <th><button type="button" class="history-th-btn" @click.stop="forwardHistory('bilanInitial.examenPhysique.taSystolique')" :aria-label="'Voir historique TA'" :title="'Voir historique TA'">TA (mmHg) <el-icon :size="14" class="history-th-icon" aria-hidden="true"><Clock /></el-icon></button></th>
              <th><button type="button" class="history-th-btn" @click.stop="forwardHistory('bilanInitial.examenPhysique.frequenceCardiaque')" :aria-label="'Voir historique Fréquence cardiaque'" :title="'Voir historique Fréquence cardiaque'">FC (bpm) <el-icon :size="14" class="history-th-icon" aria-hidden="true"><Clock /></el-icon></button></th>
              <th><button type="button" class="history-th-btn" @click.stop="forwardHistory('bilanInitial.examenPhysique.saO2')" :aria-label="'Voir historique SaO2'" :title="'Voir historique SaO2'">SaO₂ (%) <el-icon :size="14" class="history-th-icon" aria-hidden="true"><Clock /></el-icon></button></th>
              <th>Prise de poids (kg)</th>
              <th />
            </tr>
          </thead>
          <tbody>
            <tr v-if="!sortedVitalHistory.length">
              <td colspan="10" class="history-table__empty">Aucune mesure enregistrée</td>
            </tr>
            <tr v-for="entry in sortedVitalHistory" :key="entry._key">
              <td class="history-table__date">{{ formatDateTime(entry.date) }}</td>
              <td>{{ entryTerme(entry) ?? '—' }}</td>
              <td>{{ entry.poids ?? '—' }}</td>
              <td>{{ entry.taille ?? '—' }}</td>
              <td>{{ entryImc(entry) ?? '—' }}</td>
              <td>{{ entryTa(entry) ?? '—' }}</td>
              <td>{{ entry.frequenceCardiaque ?? '—' }}</td>
              <td>{{ entry.saO2 ?? '—' }}</td>
              <td>{{ entryPrisePoids(entry) ?? '—' }}</td>
              <td class="history-table__actions">
                <el-button v-if="!readonly" size="small" type="primary" title="Modifier" @click="editVitalEntry(entry._key)"><el-icon><Edit /></el-icon></el-button>
                <el-button v-if="!readonly" size="small" type="danger" title="Supprimer" @click="deleteVitalEntry(entry._key)"><el-icon><Delete /></el-icon></el-button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </CollapsibleSection>

    <StagedCollapsibleSection
      :ref="setSectionRef('facteurs')"
      title="Facteurs de risque"
      :keys="['facteursRisque', 'facteursRisqueAutres']"
      :model-value="maternelles"
      :readonly="readonly"
      @save="emit('change')"
    >
      <template #default="{ draft }">
        <el-form-item label="Facteurs de risque">
          <el-checkbox-group v-model="draft.facteursRisque" :disabled="readonly">
            <el-checkbox value="age35">{{ FACTEUR_RISQUE_LABELS.age35 }}</el-checkbox>
            <el-checkbox value="surpoids_obesite">{{ FACTEUR_RISQUE_LABELS.surpoids_obesite }}</el-checkbox>
            <el-checkbox value="atcd_dg">{{ FACTEUR_RISQUE_LABELS.atcd_dg }}</el-checkbox>
            <el-checkbox value="atcd_macrosomie">{{ FACTEUR_RISQUE_LABELS.atcd_macrosomie }}</el-checkbox>
            <el-checkbox value="diabete_familial_1er">{{ FACTEUR_RISQUE_LABELS.diabete_familial_1er }}</el-checkbox>
            <el-checkbox value="autre">{{ FACTEUR_RISQUE_LABELS.autre }}</el-checkbox>
          </el-checkbox-group>
        </el-form-item>
        <el-form-item label="Autres facteurs de risque">
          <el-input
            v-model="draft.facteursRisqueAutres"
            type="textarea"
            :rows="2"
            :disabled="readonly"
            placeholder="Préciser les autres facteurs de risque…"
          />
        </el-form-item>
      </template>
    </StagedCollapsibleSection>

    <div class="section-preview">
      <FormPreview
        title="Facteurs de risque"
        variant="compact"
        :fields="facteursPreviewFields"
        @edit="() => openSection('facteurs')"
      />
    </div>
  </el-form>
</template>

<script setup lang="ts">
/* eslint-disable vue/no-mutating-props -- Écritures volontaires dans les objets réactifs partagés (bilan.examenPhysique / vitalSignsHistory) déclenchées par émission explicite de 'change' */
import { ref, computed, nextTick } from 'vue'
import { Plus, ArrowDown, Delete, Edit, Clock } from '@element-plus/icons-vue'
import { ElMessageBox } from 'element-plus'
import type {
  CrcGestaFormData,
  ParametresJourGesta,
  VitalSignsGestaEntry,
} from '@/types/crc-gesta'
import { FACTEUR_RISQUE_LABELS } from '@/types/crc-gesta'
import {
  imcPregestationnel,
  imcActuel,
  prisePoids,
  dpaDepuisDdr,
} from '@/utils/gesta-calculations'
import { calcIMC } from '@/utils/medical-calculations'
import { formatDate } from '@/utils/date'
import FormPreview from '@/components/common/FormPreview.vue'
import type { FormPreviewField } from '@/components/common/FormPreview.vue'
import CollapsibleSection from '@/components/common/CollapsibleSection.vue'
import StagedCollapsibleSection from '@/components/common/StagedCollapsibleSection.vue'

const props = withDefaults(defineProps<{
  maternelles: CrcGestaFormData['donneesMaternelles']
  bilan: CrcGestaFormData['bilanInitial']
  readonly?: boolean
  patientId?: string
}>(), {
  readonly: false,
})

const emit = defineEmits<{
  change: []
  'open-history': [path: string]
}>()

function forwardHistory(path: string) {
  emit('open-history', path)
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

function fmtNum(value: number | null, unit: string): string | null {
  return value == null ? null : `${value} ${unit}`
}

function imcPreDisplay(poidsPre: number | null, taille: number | null): string {
  const v = imcPregestationnel(poidsPre, taille)
  return v != null ? String(v) : '—'
}

function imcActDisplay(poids: number | null, taille: number | null): string {
  const v = imcActuel(poids, taille)
  return v != null ? String(v) : '—'
}

function prisePoidsDisplay(poidsActuel: number | null, poidsPre: number | null): string {
  const v = prisePoids(poidsActuel, poidsPre)
  return v != null ? String(v) : '—'
}

function autoDpa(pregestationnels: { ddr: string; dpa: string }) {
  if (!pregestationnels.dpa) {
    const computed = dpaDepuisDdr(pregestationnels.ddr)
    if (computed) pregestationnels.dpa = computed
  }
}

const imcPregestationnelDisplay = computed(() =>
  imcPreDisplay(
    props.maternelles.pregestationnels.poidsPregestationnel,
    props.bilan.examenPhysique.taille,
  ),
)

const imcActuelDisplay = computed(() =>
  imcActDisplay(props.bilan.examenPhysique.poids, props.bilan.examenPhysique.taille),
)

const prisePoidsComputedDisplay = computed(() =>
  prisePoidsDisplay(
    props.bilan.examenPhysique.poids,
    props.maternelles.pregestationnels.poidsPregestationnel,
  ),
)

const pregestationnelsPreviewFields = computed<FormPreviewField[]>(() => {
  const p = props.maternelles.pregestationnels
  const imc = imcPregestationnel(p.poidsPregestationnel, props.bilan.examenPhysique.taille)
  return [
    { label: 'Gestité', value: p.gestite },
    { label: 'Parité', value: p.parite },
    { label: 'Césarienne', value: p.cesarienne },
    { label: 'Fausse couche', value: p.fausseCouche },
    { label: 'DDR', value: p.ddr ? formatDate(p.ddr) : '' },
    { label: 'DPA', value: p.dpa ? formatDate(p.dpa) : '' },
    { label: 'Poids prégestationnel', value: fmtNum(p.poidsPregestationnel, 'kg') },
    { label: 'IMC prégestationnel', value: imc != null ? `${imc} kg/m²` : '' },
  ]
})

const jourPreviewFields = computed<FormPreviewField[]>(() => {
  const d = props.bilan.examenPhysique
  const terme = d.termeSa != null
    ? `${d.termeSa} SA${d.termeJours ? ` + ${d.termeJours} j` : ''}`
    : ''
  const imcPre = imcPregestationnel(
    props.maternelles.pregestationnels.poidsPregestationnel,
    d.taille,
  )
  const imcAct = imcActuel(d.poids, d.taille)
  const prise = prisePoids(d.poids, props.maternelles.pregestationnels.poidsPregestationnel)
  return [
    { label: 'Terme', value: terme },
    { label: 'Poids', value: fmtNum(d.poids, 'kg') },
    { label: 'Taille', value: fmtNum(d.taille, 'cm') },
    { label: 'TA Systolique', value: fmtNum(d.taSystolique, 'mmHg') },
    { label: 'TA Diastolique', value: fmtNum(d.taDiastolique, 'mmHg') },
    { label: 'Fréquence cardiaque', value: fmtNum(d.frequenceCardiaque, 'bpm') },
    { label: 'SaO₂', value: fmtNum(d.saO2, '%') },
    { label: 'IMC prégestationnel', value: imcPre != null ? `${imcPre} kg/m²` : '' },
    { label: 'IMC actuel', value: imcAct != null ? `${imcAct} kg/m²` : '' },
    { label: 'Prise de poids', value: prise != null ? `${prise} kg` : '' },
  ]
})

const facteursPreviewFields = computed<FormPreviewField[]>(() => [
  {
    label: 'Facteurs de risque',
    value: props.maternelles.facteursRisque?.length
      ? props.maternelles.facteursRisque.map(f => FACTEUR_RISQUE_LABELS[f] ?? f).join(', ')
      : '',
  },
  { label: 'Autres facteurs de risque', value: props.maternelles.facteursRisqueAutres },
])

const vitalFormOpen = ref(false)
const vitalEditingKey = ref<string | null>(null)

const sortedVitalHistory = computed(() =>
  [...(props.bilan.vitalSignsHistory || [])].sort((a, b) => b.date.localeCompare(a.date)),
)

function currentIsoDateTime() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}T${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function formatDateTime(isoStr: string) {
  if (!isoStr) return '—'
  const d = new Date(isoStr)
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
    + ' ' + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

function entryImc(entry: VitalSignsGestaEntry) {
  return calcIMC(entry.poids, entry.taille)
}

function entryTerme(entry: VitalSignsGestaEntry) {
  if (entry.termeSa == null) return null
  return `${entry.termeSa} SA${entry.termeJours ? ` + ${entry.termeJours} j` : ''}`
}

function entryTa(entry: VitalSignsGestaEntry) {
  if (entry.taSystolique == null && entry.taDiastolique == null) return null
  return `${entry.taSystolique ?? '—'} / ${entry.taDiastolique ?? '—'}`
}

function entryPrisePoids(entry: VitalSignsGestaEntry) {
  return prisePoids(entry.poids, props.maternelles.pregestationnels.poidsPregestationnel)
}

function snapshotExamen(): ParametresJourGesta {
  const src = props.bilan.examenPhysique
  return {
    termeSa: src.termeSa,
    termeJours: src.termeJours,
    poids: src.poids,
    taille: src.taille,
    taSystolique: src.taSystolique,
    taDiastolique: src.taDiastolique,
    frequenceCardiaque: src.frequenceCardiaque,
    saO2: src.saO2,
  }
}

function saveVitalEntry() {
  if (props.readonly) return
  if (!props.bilan.vitalSignsHistory) props.bilan.vitalSignsHistory = []
  const record = snapshotExamen()
  if (vitalEditingKey.value) {
    const idx = props.bilan.vitalSignsHistory.findIndex(e => e._key === vitalEditingKey.value)
    if (idx !== -1) props.bilan.vitalSignsHistory[idx] = { ...props.bilan.vitalSignsHistory[idx], ...record }
    vitalEditingKey.value = null
  } else {
    props.bilan.vitalSignsHistory.push({ _key: crypto.randomUUID(), date: currentIsoDateTime(), ...record })
  }
  vitalFormOpen.value = false
  emit('change')
}

function editVitalEntry(key: string) {
  if (props.readonly) return
  const entry = (props.bilan.vitalSignsHistory || []).find(e => e._key === key)
  if (!entry) return
  vitalEditingKey.value = key
  const src = props.bilan.examenPhysique
  src.termeSa = entry.termeSa
  src.termeJours = entry.termeJours
  src.poids = entry.poids
  src.taille = entry.taille
  src.taSystolique = entry.taSystolique
  src.taDiastolique = entry.taDiastolique
  src.frequenceCardiaque = entry.frequenceCardiaque
  src.saO2 = entry.saO2
  vitalFormOpen.value = true
}

function cancelVitalEdit() {
  vitalEditingKey.value = null
  vitalFormOpen.value = false
}

async function deleteVitalEntry(key: string) {
  if (props.readonly) return
  try {
    await ElMessageBox.confirm('Supprimer cette mesure ?', 'Confirmation', {
      type: 'warning', confirmButtonText: 'Supprimer', cancelButtonText: 'Annuler',
    })
  } catch { return }
  const idx = (props.bilan.vitalSignsHistory || []).findIndex(e => e._key === key)
  if (idx !== -1) props.bilan.vitalSignsHistory.splice(idx, 1)
  emit('change')
}

function emitChange() {
  emit('change')
}
</script>

<style scoped lang="scss">
.section-preview {
  margin: 8px 0 16px;
}
.field-history {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
}
.field-history :deep(.el-input),
.field-history :deep(.el-input-number),
.field-history :deep(.el-select) {
  flex: 1 1 auto;
  min-width: 0;
}
.history-field-btn {
  flex-shrink: 0;
  width: auto;
}
.history-th-btn {
  background: none;
  border: 0;
  font: inherit;
  color: inherit;
  padding: 0;
  text-align: left;
  width: 100%;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  white-space: nowrap;
}
.history-th-btn:hover .history-th-icon {
  opacity: 0.7;
}
.history-th-btn:focus-visible {
  outline: 2px solid var(--el-color-primary);
  outline-offset: 1px;
  border-radius: 4px;
}
.history-th-icon {
  cursor: pointer;
  color: var(--el-color-primary);
  vertical-align: middle;
  margin-left: 4px;
}
.history-th-icon:hover {
  opacity: 0.7;
}
.history-collapse {
  border: 1px solid var(--cde-border);
  border-radius: 6px;
  overflow: hidden;
  margin-bottom: 16px;
}
.history-collapse__header {
  background: var(--cde-header-bg);
  color: var(--cde-header-text);
  border-left: 3px solid var(--cde-accent);
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
  background: var(--cde-accent-tint);
  border: 1px solid var(--cde-border);
}
.history-collapse__arrow { transition: transform 0.25s ease; font-size: 14px; }
.history-collapse__arrow--open { transform: rotate(180deg); }
.history-collapse__body { padding: 14px; background: var(--cde-surface); }
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
.history-table-wrap {
  margin-bottom: 16px;
  overflow-x: auto;
}
.history-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
  background: var(--cde-surface);
  border: 1px solid var(--cde-border);
  border-radius: 6px;
  overflow: hidden;
}
.history-table thead th {
  background: var(--cde-header-bg);
  color: var(--cde-header-text);
  font-weight: 600;
  text-transform: uppercase;
  font-size: 10px;
  letter-spacing: 0.3px;
  padding: 8px 10px;
  text-align: left;
  border-bottom: 1px solid var(--cde-border);
  white-space: nowrap;
}
.history-table tbody td {
  padding: 7px 10px;
  border-bottom: 1px solid var(--cde-border-soft);
  color: var(--cde-muted);
}
.history-table tbody tr:last-child td {
  border-bottom: none;
}
.history-table tbody tr:hover {
  background: var(--cde-surface-tint);
}
.history-table__date {
  font-weight: 600;
  color: var(--cde-accent-strong);
  white-space: nowrap;
}
.history-table__actions {
  white-space: nowrap;
  text-align: right;
}
.history-table__empty {
  text-align: center;
  color: var(--cde-muted);
  font-style: italic;
  padding: 16px 10px;
}
</style>
