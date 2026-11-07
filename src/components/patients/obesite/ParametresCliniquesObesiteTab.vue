<!-- eslint-disable vue/no-mutating-props -- Les sous-blocs history-collapse (Vitals) écrivent volontairement dans l'objet réactif partagé data et émettent change directement (cf. BilanInitialTab.vue) -->
<template>
  <el-form label-position="top" class="tab-form">
    <StagedCollapsibleSection
      :ref="setSectionRef('examen')"
      title="Paramètres cliniques à l'admission"
      :keys="['examenPhysique']"
      :model-value="data"
      :readonly="props.readonly"
      @save="emit('change')"
    >
      <template #default="{ draft }">
        <el-row :gutter="16">
          <el-col :span="6">
            <el-form-item label="Glycémie à jeun (g/L)">
              <div class="field-history">
                <el-input-number v-model="draft.examenPhysique.glycemieJeun" :min="0" :max="8" :step="0.01" :precision="2" controls-position="right" style="width:100%" :disabled="props.readonly" />
                <button
                  type="button"
                  class="history-th-btn history-field-btn"
                  @click.stop="forwardHistory('bilanInitial.examenPhysique.glycemieJeun')"
                  :aria-label="'Voir historique Glycémie à jeun'"
                  :title="'Voir historique Glycémie à jeun'"
                >
                  <el-icon :size="14" class="history-th-icon" aria-hidden="true"><Clock /></el-icon>
                </button>
              </div>
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="Glycémie post-prandiale (g/L)">
              <div class="field-history">
                <el-input-number v-model="draft.examenPhysique.glycemiePostPrandiale" :min="0" :max="8" :step="0.01" :precision="2" controls-position="right" style="width:100%" :disabled="props.readonly" />
                <button
                  type="button"
                  class="history-th-btn history-field-btn"
                  @click.stop="forwardHistory('bilanInitial.examenPhysique.glycemiePostPrandiale')"
                  :aria-label="'Voir historique Glycémie post-prandiale'"
                  :title="'Voir historique Glycémie post-prandiale'"
                >
                  <el-icon :size="14" class="history-th-icon" aria-hidden="true"><Clock /></el-icon>
                </button>
              </div>
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="Cétonémie (mmol/L)">
              <div class="field-history">
                <el-input-number v-model="draft.examenPhysique.cetonemie" :min="0" :max="30" :step="0.1" :precision="1" controls-position="right" style="width:100%" :disabled="props.readonly" />
                <button
                  type="button"
                  class="history-th-btn history-field-btn"
                  @click.stop="forwardHistory('bilanInitial.examenPhysique.cetonemie')"
                  :aria-label="'Voir historique Cétonémie'"
                  :title="'Voir historique Cétonémie'"
                >
                  <el-icon :size="14" class="history-th-icon" aria-hidden="true"><Clock /></el-icon>
                </button>
              </div>
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="Cétonurie">
              <div class="field-history">
                <el-select v-model="draft.examenPhysique.cetonurie" placeholder="—" clearable style="width:100%" :disabled="props.readonly">
                  <el-option label="+" value="+" />
                  <el-option label="++" value="++" />
                  <el-option label="+++ ou plus" value="+++" />
                </el-select>
                <button
                  type="button"
                  class="history-th-btn history-field-btn"
                  @click.stop="forwardHistory('bilanInitial.examenPhysique.cetonurie')"
                  :aria-label="'Voir historique Cétonurie'"
                  :title="'Voir historique Cétonurie'"
                >
                  <el-icon :size="14" class="history-th-icon" aria-hidden="true"><Clock /></el-icon>
                </button>
              </div>
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="16">
          <el-col :span="6">
            <el-form-item label="Glycosurie">
              <div class="field-history">
                <el-select v-model="draft.examenPhysique.glycosurie" placeholder="—" clearable style="width:100%" :disabled="props.readonly">
                  <el-option label="+" value="+" />
                  <el-option label="++" value="++" />
                  <el-option label="+++ ou plus" value="+++" />
                </el-select>
                <button
                  type="button"
                  class="history-th-btn history-field-btn"
                  @click.stop="forwardHistory('bilanInitial.examenPhysique.glycosurie')"
                  :aria-label="'Voir historique Glycosurie'"
                  :title="'Voir historique Glycosurie'"
                >
                  <el-icon :size="14" class="history-th-icon" aria-hidden="true"><Clock /></el-icon>
                </button>
              </div>
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="TA Systolique (mmHg)">
              <div class="field-history">
                <el-input-number v-model="draft.examenPhysique.taSystolique" :min="0" :max="300" controls-position="right" style="width:100%" :disabled="props.readonly" />
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
                <el-input-number v-model="draft.examenPhysique.taDiastolique" :min="0" :max="200" controls-position="right" style="width:100%" :disabled="props.readonly" />
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
                <el-input-number v-model="draft.examenPhysique.frequenceCardiaque" :min="0" :max="300" controls-position="right" style="width:100%" :disabled="props.readonly" />
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
        </el-row>

        <el-row :gutter="16">
          <el-col :span="6">
            <el-form-item label="Température (°C)">
              <div class="field-history">
                <el-input-number v-model="draft.examenPhysique.temperature" :min="32" :max="42" :step="0.1" controls-position="right" style="width:100%" :disabled="props.readonly" />
                <button
                  type="button"
                  class="history-th-btn history-field-btn"
                  @click.stop="forwardHistory('bilanInitial.examenPhysique.temperature')"
                  :aria-label="'Voir historique Température'"
                  :title="'Voir historique Température'"
                >
                  <el-icon :size="14" class="history-th-icon" aria-hidden="true"><Clock /></el-icon>
                </button>
              </div>
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="SaO₂ (%)">
              <div class="field-history">
                <el-input-number v-model="draft.examenPhysique.saO2" :min="0" :max="100" :step="1" :precision="0" controls-position="right" style="width:100%" :disabled="props.readonly" />
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
          <el-col :span="6">
            <el-form-item label="Poids (kg)">
              <div class="field-history">
                <el-input-number v-model="draft.examenPhysique.poids" :min="0" :max="300" :step="0.1" :precision="1" controls-position="right" style="width:100%" :disabled="props.readonly" />
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
                <el-input-number v-model="draft.examenPhysique.taille" :min="0" :max="250" :step="0.5" :precision="1" controls-position="right" style="width:100%" :disabled="props.readonly" />
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
            <el-form-item label="IMC (kg/m²)">
              <div class="field-history">
                <el-input :model-value="imcAuto(draft.examenPhysique.poids, draft.examenPhysique.taille) ?? '—'" disabled />
                <button
                  type="button"
                  class="history-th-btn history-field-btn"
                  @click.stop="forwardHistory('bilanInitial.examenPhysique.imc')"
                  :aria-label="'Voir historique IMC'"
                  :title="'Voir historique IMC'"
                >
                  <el-icon :size="14" class="history-th-icon" aria-hidden="true"><Clock /></el-icon>
                </button>
              </div>
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="Tour de taille (cm)">
              <div class="field-history">
                <el-input-number v-model="draft.examenPhysique.tourTaille" :min="0" :max="300" :step="0.5" :precision="1" controls-position="right" style="width:100%" :disabled="props.readonly" />
                <button
                  type="button"
                  class="history-th-btn history-field-btn"
                  @click.stop="forwardHistory('bilanInitial.examenPhysique.tourTaille')"
                  :aria-label="'Voir historique Tour de taille'"
                  :title="'Voir historique Tour de taille'"
                >
                  <el-icon :size="14" class="history-th-icon" aria-hidden="true"><Clock /></el-icon>
                </button>
              </div>
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="Tour de hanche (cm)">
              <div class="field-history">
                <el-input-number v-model="draft.examenPhysique.tourHanche" :min="0" :max="300" :step="0.5" :precision="1" controls-position="right" style="width:100%" :disabled="props.readonly" />
                <button
                  type="button"
                  class="history-th-btn history-field-btn"
                  @click.stop="forwardHistory('bilanInitial.examenPhysique.tourHanche')"
                  :aria-label="'Voir historique Tour de hanche'"
                  :title="'Voir historique Tour de hanche'"
                >
                  <el-icon :size="14" class="history-th-icon" aria-hidden="true"><Clock /></el-icon>
                </button>
              </div>
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="Ratio TT/TH">
              <div class="field-history">
                <el-input :model-value="ratioTTTH(draft.examenPhysique.tourTaille, draft.examenPhysique.tourHanche) ?? '—'" disabled />
                <button
                  type="button"
                  class="history-th-btn history-field-btn"
                  @click.stop="forwardHistory('bilanInitial.examenPhysique.ratioTTTH')"
                  :aria-label="'Voir historique Ratio TT/TH'"
                  :title="'Voir historique Ratio TT/TH'"
                >
                  <el-icon :size="14" class="history-th-icon" aria-hidden="true"><Clock /></el-icon>
                </button>
              </div>
            </el-form-item>
          </el-col>
        </el-row>
      </template>
    </StagedCollapsibleSection>

    <div class="section-preview">
      <FormPreview
        title="Paramètres cliniques à l'admission"
        variant="compact"
        :hide-header="true"
        :fields="examenPreviewFields"
        @edit="() => openSection('examen')"
      />
    </div>

    <CollapsibleSection
      title="Historique des paramètres cliniques"
      :default-open="true"
    >
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
          <el-row :gutter="16">
            <el-col :span="6">
              <el-form-item label="Glycémie à jeun (g/L)">
                <el-input-number v-model="data.examenPhysique.glycemieJeun" :min="0" :max="8" :step="0.01" :precision="2" controls-position="right" style="width:100%" :disabled="props.readonly" @change="emitChange" />
              </el-form-item>
            </el-col>
            <el-col :span="6">
              <el-form-item label="Glycémie post-prandiale (g/L)">
                <el-input-number v-model="data.examenPhysique.glycemiePostPrandiale" :min="0" :max="8" :step="0.01" :precision="2" controls-position="right" style="width:100%" :disabled="props.readonly" @change="emitChange" />
              </el-form-item>
            </el-col>
            <el-col :span="6">
              <el-form-item label="TA Systolique (mmHg)">
                <el-input-number v-model="data.examenPhysique.taSystolique" :min="0" :max="300" controls-position="right" style="width:100%" :disabled="props.readonly" @change="emitChange" />
              </el-form-item>
            </el-col>
            <el-col :span="6">
              <el-form-item label="TA Diastolique (mmHg)">
                <el-input-number v-model="data.examenPhysique.taDiastolique" :min="0" :max="200" controls-position="right" style="width:100%" :disabled="props.readonly" @change="emitChange" />
              </el-form-item>
            </el-col>
          </el-row>
          <el-row :gutter="16">
            <el-col :span="6">
              <el-form-item label="Fréquence cardiaque (bpm)">
                <el-input-number v-model="data.examenPhysique.frequenceCardiaque" :min="0" :max="300" controls-position="right" style="width:100%" :disabled="props.readonly" @change="emitChange" />
              </el-form-item>
            </el-col>
            <el-col :span="6">
              <el-form-item label="Température (°C)">
                <el-input-number v-model="data.examenPhysique.temperature" :min="32" :max="42" :step="0.1" controls-position="right" style="width:100%" :disabled="props.readonly" @change="emitChange" />
              </el-form-item>
            </el-col>
            <el-col :span="6">
              <el-form-item label="SaO₂ (%)">
                <el-input-number v-model="data.examenPhysique.saO2" :min="0" :max="100" :step="1" :precision="0" controls-position="right" style="width:100%" :disabled="props.readonly" @change="emitChange" />
              </el-form-item>
            </el-col>
            <el-col :span="6">
              <el-form-item label="Cétonémie (mmol/L)">
                <el-input-number v-model="data.examenPhysique.cetonemie" :min="0" :max="30" :step="0.1" :precision="1" controls-position="right" style="width:100%" :disabled="props.readonly" @change="emitChange" />
              </el-form-item>
            </el-col>
          </el-row>
          <el-row :gutter="16">
            <el-col :span="6">
              <el-form-item label="Cétonurie">
                <el-select v-model="data.examenPhysique.cetonurie" placeholder="—" clearable style="width:100%" :disabled="props.readonly" @change="emitChange">
                  <el-option label="+" value="+" />
                  <el-option label="++" value="++" />
                  <el-option label="+++ ou plus" value="+++" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="6">
              <el-form-item label="Glycosurie">
                <el-select v-model="data.examenPhysique.glycosurie" placeholder="—" clearable style="width:100%" :disabled="props.readonly" @change="emitChange">
                  <el-option label="+" value="+" />
                  <el-option label="++" value="++" />
                  <el-option label="+++ ou plus" value="+++" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="6">
              <el-form-item label="Poids (kg)">
                <el-input-number v-model="data.examenPhysique.poids" :min="0" :max="300" :step="0.1" :precision="1" controls-position="right" style="width:100%" :disabled="props.readonly" @change="emitChange" />
              </el-form-item>
            </el-col>
            <el-col :span="6">
              <el-form-item label="Taille (cm)">
                <el-input-number v-model="data.examenPhysique.taille" :min="0" :max="250" :step="0.5" :precision="1" controls-position="right" style="width:100%" :disabled="props.readonly" @change="emitChange" />
              </el-form-item>
            </el-col>
          </el-row>
          <el-row :gutter="16">
            <el-col :span="6">
              <el-form-item label="IMC (kg/m²)">
                <el-input :model-value="imcDisplay" disabled />
              </el-form-item>
            </el-col>
            <el-col :span="6">
              <el-form-item label="Tour de taille (cm)">
                <el-input-number v-model="data.examenPhysique.tourTaille" :min="0" :max="300" :step="0.5" :precision="1" controls-position="right" style="width:100%" :disabled="props.readonly" @change="emitChange" />
              </el-form-item>
            </el-col>
            <el-col :span="6">
              <el-form-item label="Tour de hanche (cm)">
                <el-input-number v-model="data.examenPhysique.tourHanche" :min="0" :max="300" :step="0.5" :precision="1" controls-position="right" style="width:100%" :disabled="props.readonly" @change="emitChange" />
              </el-form-item>
            </el-col>
            <el-col :span="6">
              <el-form-item label="Ratio TT/TH">
                <el-input :model-value="ratioDisplay" disabled />
              </el-form-item>
            </el-col>
          </el-row>
          <p class="history-collapse__hint">Les valeurs actuelles des paramètres cliniques seront enregistrées avec la date et l'heure courantes.</p>
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
              <th><button type="button" class="history-th-btn" @click.stop="forwardHistory('bilanInitial.examenPhysique.glycemieJeun')" :aria-label="'Voir historique Glycémie à jeun'" :title="'Voir historique Glycémie à jeun'">Glycémie à jeun (g/L) <el-icon :size="14" class="history-th-icon" aria-hidden="true"><Clock /></el-icon></button></th>
              <th><button type="button" class="history-th-btn" @click.stop="forwardHistory('bilanInitial.examenPhysique.glycemiePostPrandiale')" :aria-label="'Voir historique Glycémie post-prandiale'" :title="'Voir historique Glycémie post-prandiale'">Glycémie PP (g/L) <el-icon :size="14" class="history-th-icon" aria-hidden="true"><Clock /></el-icon></button></th>
              <th><button type="button" class="history-th-btn" @click.stop="forwardHistory('bilanInitial.examenPhysique.taSystolique')" :aria-label="'Voir historique TA systolique'" :title="'Voir historique TA systolique'">TA Syst (mmHg) <el-icon :size="14" class="history-th-icon" aria-hidden="true"><Clock /></el-icon></button></th>
              <th><button type="button" class="history-th-btn" @click.stop="forwardHistory('bilanInitial.examenPhysique.taDiastolique')" :aria-label="'Voir historique TA diastolique'" :title="'Voir historique TA diastolique'">TA Diast (mmHg) <el-icon :size="14" class="history-th-icon" aria-hidden="true"><Clock /></el-icon></button></th>
              <th><button type="button" class="history-th-btn" @click.stop="forwardHistory('bilanInitial.examenPhysique.poids')" :aria-label="'Voir historique Poids'" :title="'Voir historique Poids'">Poids (kg) <el-icon :size="14" class="history-th-icon" aria-hidden="true"><Clock /></el-icon></button></th>
              <th><button type="button" class="history-th-btn" @click.stop="forwardHistory('bilanInitial.examenPhysique.taille')" :aria-label="'Voir historique Taille'" :title="'Voir historique Taille'">Taille (cm) <el-icon :size="14" class="history-th-icon" aria-hidden="true"><Clock /></el-icon></button></th>
              <th><button type="button" class="history-th-btn" @click.stop="forwardHistory('bilanInitial.examenPhysique.imc')" :aria-label="'Voir historique IMC'" :title="'Voir historique IMC'">IMC (kg/m²) <el-icon :size="14" class="history-th-icon" aria-hidden="true"><Clock /></el-icon></button></th>
              <th><button type="button" class="history-th-btn" @click.stop="forwardHistory('bilanInitial.examenPhysique.tourTaille')" :aria-label="'Voir historique Tour de taille'" :title="'Voir historique Tour de taille'">Tour de taille (cm) <el-icon :size="14" class="history-th-icon" aria-hidden="true"><Clock /></el-icon></button></th>
              <th><button type="button" class="history-th-btn" @click.stop="forwardHistory('bilanInitial.examenPhysique.tourHanche')" :aria-label="'Voir historique Tour de hanche'" :title="'Voir historique Tour de hanche'">Tour de hanche (cm) <el-icon :size="14" class="history-th-icon" aria-hidden="true"><Clock /></el-icon></button></th>
              <th><button type="button" class="history-th-btn" @click.stop="forwardHistory('bilanInitial.examenPhysique.ratioTTTH')" :aria-label="'Voir historique Ratio TT/TH'" :title="'Voir historique Ratio TT/TH'">Ratio TT/TH <el-icon :size="14" class="history-th-icon" aria-hidden="true"><Clock /></el-icon></button></th>
              <th />
            </tr>
          </thead>
          <tbody>
            <tr v-if="!sortedVitalHistory.length">
              <td colspan="12" class="history-table__empty">Aucune mesure enregistrée</td>
            </tr>
            <tr v-for="entry in sortedVitalHistory" :key="entry._key">
              <td class="history-table__date">{{ formatDateTime(entry.date) }}</td>
              <td>{{ entry.glycemieJeun ?? '—' }}</td>
              <td>{{ entry.glycemiePostPrandiale ?? '—' }}</td>
              <td>{{ entry.taSystolique ?? '—' }}</td>
              <td>{{ entry.taDiastolique ?? '—' }}</td>
              <td>{{ entry.poids ?? '—' }}</td>
              <td>{{ entry.taille ?? '—' }}</td>
              <td>{{ entryImc(entry) ?? '—' }}</td>
              <td>{{ entry.tourTaille ?? '—' }}</td>
              <td>{{ entry.tourHanche ?? '—' }}</td>
              <td>{{ entryRatio(entry) ?? '—' }}</td>
              <td class="history-table__actions">
                <el-button v-if="!props.readonly" size="small" type="primary" title="Modifier" @click="editVitalEntry(entry._key)"><el-icon><Edit /></el-icon></el-button>
                <el-button v-if="!props.readonly" size="small" type="danger" title="Supprimer" @click="deleteVitalEntry(entry._key)"><el-icon><Delete /></el-icon></el-button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </CollapsibleSection>
  </el-form>
</template>

<script setup lang="ts">
/* eslint-disable vue/no-mutating-props -- Écritures volontaires dans l'objet réactif partagé data (sub-bloc history-collapse + vitalSignsHistory) déclenchées par émission explicite de 'change' */
import { ref, computed, nextTick } from 'vue'
import { Plus, ArrowDown, Delete, Edit, Clock } from '@element-plus/icons-vue'
import { ElMessageBox } from 'element-plus'
import type { CrcObesiteFormData, VitalSignsObesiteEntry, ParametresCliniquesObesite } from '@/types/crc-obesite'
import { imcAuto, ratioTTTH } from '@/utils/apports-alimentaires'
import { calcIMC } from '@/utils/medical-calculations'
import FormPreview, { type FormPreviewField } from '@/components/common/FormPreview.vue'
import CollapsibleSection from '@/components/common/CollapsibleSection.vue'
import StagedCollapsibleSection from '@/components/common/StagedCollapsibleSection.vue'

const FIELD_PREFIX = 'bilanInitial'

const props = defineProps<{
  data: CrcObesiteFormData['bilanInitial']
  readonly?: boolean
  patientId?: string
}>()

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

const examenPreviewFields = computed<FormPreviewField[]>(() => {
  const d = props.data.examenPhysique
  const imc = imcAuto(d.poids, d.taille)
  const ratio = ratioTTTH(d.tourTaille, d.tourHanche)
  return [
    { label: 'Glycémie à jeun', value: fmtNum(d.glycemieJeun, 'g/L'), key: `${FIELD_PREFIX}.examenPhysique.glycemieJeun` },
    { label: 'Glycémie post-prandiale', value: fmtNum(d.glycemiePostPrandiale, 'g/L'), key: `${FIELD_PREFIX}.examenPhysique.glycemiePostPrandiale` },
    { label: 'Cétonémie', value: fmtNum(d.cetonemie, 'mmol/L'), key: `${FIELD_PREFIX}.examenPhysique.cetonemie` },
    { label: 'Cétonurie', value: d.cetonurie || null, key: `${FIELD_PREFIX}.examenPhysique.cetonurie` },
    { label: 'Glycosurie', value: d.glycosurie || null, key: `${FIELD_PREFIX}.examenPhysique.glycosurie` },
    { label: 'TA Systolique', value: fmtNum(d.taSystolique, 'mmHg'), key: `${FIELD_PREFIX}.examenPhysique.taSystolique` },
    { label: 'TA Diastolique', value: fmtNum(d.taDiastolique, 'mmHg'), key: `${FIELD_PREFIX}.examenPhysique.taDiastolique` },
    { label: 'Fréquence cardiaque', value: fmtNum(d.frequenceCardiaque, 'bpm'), key: `${FIELD_PREFIX}.examenPhysique.frequenceCardiaque` },
    { label: 'Température', value: fmtNum(d.temperature, '°C'), key: `${FIELD_PREFIX}.examenPhysique.temperature` },
    { label: 'SaO₂', value: fmtNum(d.saO2, '%'), key: `${FIELD_PREFIX}.examenPhysique.saO2` },
    { label: 'Poids', value: fmtNum(d.poids, 'kg'), key: `${FIELD_PREFIX}.examenPhysique.poids` },
    { label: 'Taille', value: fmtNum(d.taille, 'cm'), key: `${FIELD_PREFIX}.examenPhysique.taille` },
    { label: 'IMC', value: imc != null ? `${imc} kg/m²` : null, key: `${FIELD_PREFIX}.examenPhysique.imc` },
    { label: 'Tour de taille', value: fmtNum(d.tourTaille, 'cm'), key: `${FIELD_PREFIX}.examenPhysique.tourTaille` },
    { label: 'Tour de hanche', value: fmtNum(d.tourHanche, 'cm'), key: `${FIELD_PREFIX}.examenPhysique.tourHanche` },
    { label: 'Ratio TT/TH', value: ratio != null ? String(ratio) : null, key: `${FIELD_PREFIX}.examenPhysique.ratioTTTH` },
  ]
})

const imcDisplay = computed(() => {
  const v = imcAuto(props.data.examenPhysique.poids, props.data.examenPhysique.taille)
  return v != null ? String(v) : '—'
})

const ratioDisplay = computed(() => {
  const v = ratioTTTH(props.data.examenPhysique.tourTaille, props.data.examenPhysique.tourHanche)
  return v != null ? String(v) : '—'
})

const vitalFormOpen = ref(false)
const vitalEditingKey = ref<string | null>(null)

const sortedVitalHistory = computed(() =>
  [...(props.data.vitalSignsHistory || [])].sort((a, b) => b.date.localeCompare(a.date)),
)

function generateKey() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
}

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

function entryImc(entry: VitalSignsObesiteEntry) {
  return calcIMC(entry.poids, entry.taille)
}

function entryRatio(entry: VitalSignsObesiteEntry) {
  return ratioTTTH(entry.tourTaille, entry.tourHanche)
}

function snapshotExamen(): ParametresCliniquesObesite {
  const src = props.data.examenPhysique
  return {
    glycemieJeun: src.glycemieJeun,
    glycemiePostPrandiale: src.glycemiePostPrandiale,
    cetonemie: src.cetonemie,
    cetonurie: src.cetonurie,
    glycosurie: src.glycosurie,
    taSystolique: src.taSystolique,
    taDiastolique: src.taDiastolique,
    frequenceCardiaque: src.frequenceCardiaque,
    temperature: src.temperature,
    saO2: src.saO2,
    poids: src.poids,
    taille: src.taille,
    tourTaille: src.tourTaille,
    tourHanche: src.tourHanche,
  }
}

function saveVitalEntry() {
  if (props.readonly) return
  if (!props.data.vitalSignsHistory) props.data.vitalSignsHistory = []
  const record = snapshotExamen()
  if (vitalEditingKey.value) {
    const idx = props.data.vitalSignsHistory.findIndex(e => e._key === vitalEditingKey.value)
    if (idx !== -1) props.data.vitalSignsHistory[idx] = { ...props.data.vitalSignsHistory[idx], ...record }
    vitalEditingKey.value = null
  } else {
    props.data.vitalSignsHistory.push({ _key: generateKey(), date: currentIsoDateTime(), ...record })
  }
  vitalFormOpen.value = false
  emit('change')
}

function editVitalEntry(key: string) {
  if (props.readonly) return
  const entry = (props.data.vitalSignsHistory || []).find(e => e._key === key)
  if (!entry) return
  vitalEditingKey.value = key
  const src = props.data.examenPhysique
  src.glycemieJeun = entry.glycemieJeun
  src.glycemiePostPrandiale = entry.glycemiePostPrandiale
  src.cetonemie = entry.cetonemie
  src.cetonurie = entry.cetonurie
  src.glycosurie = entry.glycosurie
  src.taSystolique = entry.taSystolique
  src.taDiastolique = entry.taDiastolique
  src.frequenceCardiaque = entry.frequenceCardiaque
  src.temperature = entry.temperature
  src.saO2 = entry.saO2
  src.poids = entry.poids
  src.taille = entry.taille
  src.tourTaille = entry.tourTaille
  src.tourHanche = entry.tourHanche
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
  const idx = (props.data.vitalSignsHistory || []).findIndex(e => e._key === key)
  if (idx !== -1) props.data.vitalSignsHistory.splice(idx, 1)
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
