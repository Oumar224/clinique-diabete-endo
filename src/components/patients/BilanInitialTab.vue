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
        :hide-header="true"
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
        :hide-header="true"
        :fields="traitementPreviewFields"
        @edit="() => openSection('traitement')"
      />
    </div>

    <!-- Examen clinique: section non-stagée (keys=[] → dirty toujours false) ; vitals/Glasgow/douleur gérés via mutation directe + history-tables -->
    <CollapsibleSection
      :ref="setSectionRef('examen')"
      title="Examen clinique à l'entrée"
      :default-open="true"
    >
      <template #default>
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
                <el-form-item label="Ouverture des yeux">
                  <el-radio-group v-model="data.glasgow.ouvertureYeux" @change="emitChange">
                    <el-radio :value="1">Aucune (1)</el-radio>
                    <el-radio :value="2">À la douleur (2)</el-radio>
                    <el-radio :value="3">À la demande (3)</el-radio>
                    <el-radio :value="4">Spontanée (4)</el-radio>
                  </el-radio-group>
                </el-form-item>
              </el-col>
              <el-col :span="7">
                <el-form-item label="Réponse verbale">
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
                <el-form-item label="Réponse motrice">
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

        <div class="history-table-toolbar">
          <el-button size="small" :icon="TrendCharts" @click="forwardMultiHistory('glasgow')">Voir courbes</el-button>
        </div>
        <div class="history-table-wrap">
          <table class="history-table">
            <thead>
              <tr>
                <th>Date / Heure</th>
                <th><button type="button" class="history-th-btn" @click.stop="forwardHistory('bilanInitial.glasgow.ouvertureYeux')" :aria-label="'Voir historique Ouverture yeux'" :title="'Voir historique Ouverture yeux'">Ouverture yeux <el-icon :size="14" class="history-th-icon" aria-hidden="true"><Clock /></el-icon></button></th>
                <th><button type="button" class="history-th-btn" @click.stop="forwardHistory('bilanInitial.glasgow.reponseVerbale')" :aria-label="'Voir historique Réponse verbale'" :title="'Voir historique Réponse verbale'">Réponse verbale <el-icon :size="14" class="history-th-icon" aria-hidden="true"><Clock /></el-icon></button></th>
                <th><button type="button" class="history-th-btn" @click.stop="forwardHistory('bilanInitial.glasgow.reponseMotrice')" :aria-label="'Voir historique Réponse motrice'" :title="'Voir historique Réponse motrice'">Réponse motrice <el-icon :size="14" class="history-th-icon" aria-hidden="true"><Clock /></el-icon></button></th>
                <th><button type="button" class="history-th-btn" @click.stop="forwardHistory('bilanInitial.glasgow.score')" :aria-label="'Voir historique Score de Glasgow'" :title="'Voir historique Score de Glasgow'">Score <el-icon :size="14" class="history-th-icon" aria-hidden="true"><Clock /></el-icon></button></th>
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
                <el-form-item label="Score de douleur (EVA)">
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

        <div class="history-table-toolbar">
          <el-button size="small" :icon="TrendCharts" @click="forwardMultiHistory('douleur')">Voir courbes</el-button>
        </div>
        <div class="history-table-wrap">
          <table class="history-table">
            <thead>
              <tr>
                <th>Date / Heure</th>
                <th><button type="button" class="history-th-btn" @click.stop="forwardHistory('bilanInitial.scoreDouleur')" :aria-label="'Voir historique Score de douleur'" :title="'Voir historique Score de douleur'">Score / 10 <el-icon :size="14" class="history-th-icon" aria-hidden="true"><Clock /></el-icon></button></th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="!sortedDouleurHistory.length">
                <td colspan="3" class="history-table__empty">Aucune mesure enregistrée</td>
              </tr>
              <tr v-for="entry in sortedDouleurHistory" :key="entry._key">
                <td class="history-table__date">{{ formatDateTime(entry.date) }}</td>
                <td class="history-table__score">{{ entry.score }} / 10</td>
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
                <el-form-item label="TA Systolique (mmHg)">
                  <el-input-number v-model="data.examenPhysique.taSystolique" :min="0" :max="300" controls-position="right" style="width:100%" @change="emitChange" />
                </el-form-item>
              </el-col>
              <el-col :span="4">
                <el-form-item label="TA Diastolique (mmHg)">
                  <el-input-number v-model="data.examenPhysique.taDiastolique" :min="0" :max="200" controls-position="right" style="width:100%" @change="emitChange" />
                </el-form-item>
              </el-col>
              <el-col :span="4">
                <el-form-item label="Fréquence cardiaque (bpm)">
                  <el-input-number v-model="data.examenPhysique.frequenceCardiaque" :min="0" :max="300" controls-position="right" style="width:100%" @change="emitChange" />
                </el-form-item>
              </el-col>
              <el-col :span="4">
                <el-form-item label="Température (°C)">
                  <el-input-number v-model="data.examenPhysique.temperature" :min="32" :max="42" :step="0.1" controls-position="right" style="width:100%" @change="emitChange" />
                </el-form-item>
              </el-col>
              <el-col :span="4">
                <el-form-item label="Glycémie (g/L)">
                  <el-input-number v-model="data.examenPhysique.glycemie" :min="0" :max="8" :step="0.01" :precision="2" controls-position="right" style="width:100%" @change="emitChange" />
                </el-form-item>
              </el-col>
              <el-col :span="4">
                <el-form-item label="Cétominurie">
                  <el-select v-model="data.examenPhysique.cetonurie" placeholder="—" clearable style="width:100%" @change="emitChange">
                    <el-option label="+" value="+" />
                    <el-option label="++" value="++" />
                    <el-option label="+++ ou plus" value="+++" />
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col :span="4">
                <el-form-item label="Glucosurie">
                  <el-select v-model="data.examenPhysique.glucosurie" placeholder="—" clearable style="width:100%" @change="emitChange">
                    <el-option label="+" value="+" />
                    <el-option label="++" value="++" />
                    <el-option label="+++ ou plus" value="+++" />
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col :span="4">
                <el-form-item label="Cétonémie (mmol/L)">
                  <el-input-number v-model="data.examenPhysique.cetonemie" :min="0" :max="30" :step="0.1" :precision="1" controls-position="right" style="width:100%" @change="emitChange" />
                </el-form-item>
              </el-col>
              <el-col :span="4">
                <el-form-item label="Poids (kg)">
                  <el-input-number v-model="data.examenPhysique.poids" :min="0" :max="300" :step="0.1" :precision="1" controls-position="right" style="width:100%" @change="emitChange" />
                </el-form-item>
              </el-col>
              <el-col :span="4">
                <el-form-item label="Taille (cm)">
                  <el-input-number v-model="data.examenPhysique.taille" :min="0" :max="250" :step="0.5" :precision="1" controls-position="right" style="width:100%" @change="emitChange" />
                </el-form-item>
              </el-col>
              <el-col :span="4">
                <el-form-item label="IMC (kg/m²)">
                  <el-input :model-value="imcDisplay" disabled />
                </el-form-item>
              </el-col>
              <el-col :span="4">
                <el-form-item label="SaO₂ (%)">
                  <el-input-number v-model="data.examenPhysique.saO2" :min="0" :max="100" :step="1" :precision="0" controls-position="right" style="width:100%" @change="emitChange" />
                </el-form-item>
              </el-col>
              <el-col :span="4">
                <el-form-item label="Diurèse (ml)">
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

        <div class="history-table-toolbar">
          <el-button size="small" :icon="TrendCharts" @click="forwardMultiHistory('vitals')">Voir courbes</el-button>
        </div>
        <div class="history-table-wrap">
          <table class="history-table">
            <thead>
              <tr>
                <th>Date / Heure</th>
                <th><button type="button" class="history-th-btn" @click.stop="forwardHistory('bilanInitial.examenPhysique.taSystolique')" :aria-label="'Voir historique TA systolique'" :title="'Voir historique TA systolique'">TA Syst (mmHg) <el-icon :size="14" class="history-th-icon" aria-hidden="true"><Clock /></el-icon></button></th>
                <th><button type="button" class="history-th-btn" @click.stop="forwardHistory('bilanInitial.examenPhysique.taDiastolique')" :aria-label="'Voir historique TA diastolique'" :title="'Voir historique TA diastolique'">TA Diast (mmHg) <el-icon :size="14" class="history-th-icon" aria-hidden="true"><Clock /></el-icon></button></th>
                <th><button type="button" class="history-th-btn" @click.stop="forwardHistory('bilanInitial.examenPhysique.frequenceCardiaque')" :aria-label="'Voir historique Fréquence cardiaque'" :title="'Voir historique Fréquence cardiaque'">FC (bpm) <el-icon :size="14" class="history-th-icon" aria-hidden="true"><Clock /></el-icon></button></th>
                <th><button type="button" class="history-th-btn" @click.stop="forwardHistory('bilanInitial.examenPhysique.temperature')" :aria-label="'Voir historique Température'" :title="'Voir historique Température'">T° (°C) <el-icon :size="14" class="history-th-icon" aria-hidden="true"><Clock /></el-icon></button></th>
                <th><button type="button" class="history-th-btn" @click.stop="forwardHistory('bilanInitial.examenPhysique.glycemie')" :aria-label="'Voir historique Glycémie'" :title="'Voir historique Glycémie'">Glycémie (g/L) <el-icon :size="14" class="history-th-icon" aria-hidden="true"><Clock /></el-icon></button></th>
                <th><button type="button" class="history-th-btn" @click.stop="forwardHistory('bilanInitial.examenPhysique.cetonurie')" :aria-label="'Voir historique Cétominurie'" :title="'Voir historique Cétominurie'">Cétominurie <el-icon :size="14" class="history-th-icon" aria-hidden="true"><Clock /></el-icon></button></th>
                <th><button type="button" class="history-th-btn" @click.stop="forwardHistory('bilanInitial.examenPhysique.glucosurie')" :aria-label="'Voir historique Glucosurie'" :title="'Voir historique Glucosurie'">Glucosurie <el-icon :size="14" class="history-th-icon" aria-hidden="true"><Clock /></el-icon></button></th>
                <th><button type="button" class="history-th-btn" @click.stop="forwardHistory('bilanInitial.examenPhysique.cetonemie')" :aria-label="'Voir historique Cétonémie'" :title="'Voir historique Cétonémie'">Cétonémie (mmol/L) <el-icon :size="14" class="history-th-icon" aria-hidden="true"><Clock /></el-icon></button></th>
                <th><button type="button" class="history-th-btn" @click.stop="forwardHistory('bilanInitial.examenPhysique.poids')" :aria-label="'Voir historique Poids'" :title="'Voir historique Poids'">Poids (kg) <el-icon :size="14" class="history-th-icon" aria-hidden="true"><Clock /></el-icon></button></th>
                <th><button type="button" class="history-th-btn" @click.stop="forwardHistory('bilanInitial.examenPhysique.taille')" :aria-label="'Voir historique Taille'" :title="'Voir historique Taille'">Taille (cm) <el-icon :size="14" class="history-th-icon" aria-hidden="true"><Clock /></el-icon></button></th>
                <th><button type="button" class="history-th-btn" @click.stop="forwardHistory('bilanInitial.examenPhysique.imc')" :aria-label="'Voir historique IMC'" :title="'Voir historique IMC'">IMC (kg/m²) <el-icon :size="14" class="history-th-icon" aria-hidden="true"><Clock /></el-icon></button></th>
                <th><button type="button" class="history-th-btn" @click.stop="forwardHistory('bilanInitial.examenPhysique.saO2')" :aria-label="'Voir historique SaO2'" :title="'Voir historique SaO2'">SaO₂ (%) <el-icon :size="14" class="history-th-icon" aria-hidden="true"><Clock /></el-icon></button></th>
                <th><button type="button" class="history-th-btn" @click.stop="forwardHistory('bilanInitial.examenPhysique.diurese')" :aria-label="'Voir historique Diurèse'" :title="'Voir historique Diurèse'">Diurèse (ml) <el-icon :size="14" class="history-th-icon" aria-hidden="true"><Clock /></el-icon></button></th>
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

      </template>
    </CollapsibleSection>

    <StagedCollapsibleSection
      :ref="setSectionRef('examenPhysique')"
      title="Examen physique"
      :keys="['examenPhysiqueTexte']"
      :model-value="data"
      :readonly="props.readonly"
      @save="emit('change')"
    >
      <template #default="{ draft }">
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
        title="Examen physique"
        variant="compact"
        :hide-header="true"
        :fields="examenPhysiquePreviewFields"
        @edit="() => openSection('examenPhysique')"
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
        :hide-header="true"
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
        :hide-header="true"
        :fields="projetSoinPreviewFields"
        @edit="() => openSection('projetSoin')"
      />
    </div>
  </el-form>
</template>

<script setup lang="ts">
/* eslint-disable vue/no-mutating-props -- Écritures volontaires dans l'objet réactif partagé data (sub-blocks history-collapse + sync vitals) déclenchées par émission explicite de 'change' */
import { ref, computed, watch, inject, nextTick, type Ref } from 'vue'
import { Plus, ArrowDown, Delete, Edit, Clock, TrendCharts } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { BilanInitialData } from '@/types/crh-diabete'
import { useCrhDiabeteCalculations } from '@/composables/useCrhDiabeteCalculations'
import { getVitalSignsItemsList, saveVitalSignsItem, deleteVitalSignsItem, type VitalSignsItemRecord } from '@/composables/useVitalSigns'
import { isRichTextEmpty } from '@/utils/rich-text'
import FormPreview, { type FormPreviewField } from '@/components/common/FormPreview.vue'
import RichTextEditor from '@/components/patients/RichTextEditor.vue'
import CollapsibleSection from '@/components/common/CollapsibleSection.vue'
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
  'open-history': [path: string]
  'open-multi-history': [group: string]
}>()

function forwardHistory(path: string) {
  emit('open-history', path)
}

function forwardMultiHistory(group: string) {
  emit('open-multi-history', group)
}

function metaFor(key: string): string | null {
  return props.fieldMeta?.[key] ?? null
}

type SectionExpose = InstanceType<typeof StagedCollapsibleSection> | InstanceType<typeof CollapsibleSection>
const sectionRefs = ref<Record<string, SectionExpose | null>>({})

function setSectionRef(key: string) {
  return (el: unknown) => {
    sectionRefs.value[key] = el as SectionExpose | null
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
    hideLabel: true,
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
    hideLabel: true,
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
    hideLabel: true,
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
    hideLabel: true,
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
    hideLabel: true,
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
  const key = String(item.id)
  const existing = (props.data.vitalSignsHistory || []).find((e) => e._key === key) as unknown as Record<string, unknown> | undefined
  const existingTaille = existing?.taille as number | null | undefined
  return {
    _key: key,
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
    // La table vitaux DB n'a pas de colonne taille : on préserve la taille
    // déjà saisie localement (Fiche anthropo / Bilan) au lieu de forcer null.
    taille: existingTaille ?? null,
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
    // Merge : préserve les entrées locales (Fiche anthropo / saisies manuelles
    // avec _key non numérique) que le remplacement brut écrasait, et garde
    // la taille déjà saisie sur les entrées liées.
    const mappedKeys = new Set(mapped.map((e) => e._key))
    const localOnly = (props.data.vitalSignsHistory || []).filter((e) => !mappedKeys.has(e._key))
    const merged = [...mapped, ...localOnly]
    const historyChanged = JSON.stringify(merged) !== JSON.stringify(props.data.vitalSignsHistory || [])
    const prefilled = prefillVitalExamenPhysique(items)
    if ((historyChanged || prefilled) && vitalSyncInProgress) {
      // Parent (CrhDiabeteForm) consumes this flag so sync-driven writes are
      // not recorded as user-modified fields in meta.champs (S6).
      vitalSyncInProgress.value = true
      // Self-heal: clear the flag even if the parent watcher never fires for this batch.
      queueMicrotask(() => { vitalSyncInProgress.value = false })
    }
    if (historyChanged) {
      props.data.vitalSignsHistory = merged
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
      // La DB ne stocke pas la taille : on ré-applique la taille saisie dans le formulaire.
      ;(mapped as unknown as Record<string, unknown>).taille = record.taille ?? null
      const idx = props.data.vitalSignsHistory.findIndex(e => e._key === mapped._key)
      if (idx !== -1) props.data.vitalSignsHistory[idx] = mapped
      else props.data.vitalSignsHistory.push(mapped)
      vitalEditingKey.value = null
      vitalFormOpen.value = false
      ElMessage.success('Mesure enregistrée')
      emitChange()
      src.taSystolique = null
      src.taDiastolique = null
      src.frequenceCardiaque = null
      src.temperature = null
      src.glycemie = null
      src.cetonurie = null
      src.glucosurie = null
      src.cetonemie = null
      src.poids = null
      src.saO2 = null
      src.diurese = null
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
  src.taSystolique = null
  src.taDiastolique = null
  src.frequenceCardiaque = null
  src.temperature = null
  src.glycemie = null
  src.cetonurie = null
  src.glucosurie = null
  src.cetonemie = null
  src.poids = null
  src.saO2 = null
  src.diurese = null
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
  props.data.scoreDouleur = null
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
  props.data.glasgow.ouvertureYeux = null as unknown as number
  props.data.glasgow.reponseVerbale = null as unknown as number
  props.data.glasgow.reponseMotrice = null as unknown as number
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

.section-preview {
  margin: 8px 0 16px;
}

.glasgow-result {
  background: var(--cde-surface-tint);
  border: 1px solid var(--cde-border);
  border-radius: 6px;
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

/* History table */
.history-table-toolbar {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 6px;
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
  color: var(--cde-muted);
  font-style: italic;
  padding: 16px 10px;
}
</style>
