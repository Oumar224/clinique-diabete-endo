<template>
  <!-- eslint-disable vue/no-mutating-props -- Les blocs history-collapse (tabac/substance/anthropo/médicaments/traitement habituel/surveillance) écrivent volontairement dans les objets réactifs partagés data / bilanInitial.vitalSignsHistory et émettent 'change' (pattern Glasgow BilanInitialTab) -->
  <el-form label-position="top" class="tab-form">
    <StagedCollapsibleSection
      :ref="setSectionRef('historique')"
      title="Historique du Diabète"
      :keys="['dateDiagnostic', 'typeDiabete', 'typeDiabeteAutre', 'circonstanceDecouverte', 'anticorps', 'typeAnticorps']"
      :model-value="data"
      @save="emit('change')"
    >
      <template #default="{ draft }">
        <!-- :ref capture le slot draft (pas l'élément DOM) pour la sync durée↔date -->
        <div :ref="() => captureDraft(draft)">
          <el-row :gutter="16">
            <el-col :span="12">
              <el-form-item label="Date du diagnostic">
                <el-date-picker v-model="draft.dateDiagnostic" type="month" value-format="YYYY-MM" format="MM/YYYY" placeholder="MM/AAAA" style="width:100%" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="Durée d'évolution">
                <div class="duree-group">
                  <el-input-number v-model="dureeYears" :min="0" :max="150" :controls="false" placeholder="Ans" style="width:100%" />
                  <span class="duree-unit">ans</span>
                  <el-input-number v-model="dureeMonths" :min="0" :max="11" :controls="false" placeholder="Mois" style="width:100%" />
                  <span class="duree-unit">mois</span>
                </div>
              </el-form-item>
            </el-col>
          </el-row>
        <el-row :gutter="16">
          <el-col :span="8">
            <el-form-item label="Type de diabète">
              <el-select v-model="draft.typeDiabete" placeholder="Sélectionner" style="width:100%">
                <el-option label="Diabète type 1" value="Type 1" />
                <el-option label="Diabète type 2" value="Type 2" />
                <el-option label="Diabète gestationnel" value="Gestationnel" />
                <el-option label="Diabète secondaire" value="Secondaire" />
                <el-option label="Autre (à préciser)" value="Autre" />
              </el-select>
            </el-form-item>
            <el-form-item v-if="draft.typeDiabete === 'Autre'" label="Type de diabète (autre)">
              <el-input v-model="draft.typeDiabeteAutre" placeholder="Préciser le type de diabète" />
            </el-form-item>
          </el-col>
          <el-col :span="7">
            <el-form-item label="Anticorps">
              <el-radio-group v-model="draft.anticorps">
                <el-radio value="Positifs">Positifs</el-radio>
                <el-radio value="Négatifs">Négatifs</el-radio>
                <el-radio value="En cours">En cours</el-radio>
              </el-radio-group>
            </el-form-item>
          </el-col>
          <el-col :span="9">
            <el-form-item label="Type d'anticorps">
              <el-input v-model="draft.typeAnticorps" placeholder="Anti-GAD, anti-IA2, anti-insuline..." />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="24">
            <el-form-item label="Circonstances de découverte">
              <RichTextEditor v-model="draft.circonstanceDecouverte" :rows="2" placeholder="Circonstances de découverte du diabète..." />
            </el-form-item>
          </el-col>
        </el-row>
        </div>
      </template>
    </StagedCollapsibleSection>

    <div class="section-preview">
      <FormPreview
        title="Historique du Diabète"
        variant="compact"
        :fields="historiquePreviewFields"
        @edit="() => openSection('historique')"
      />
    </div>

    <!-- Facteurs de risque : groupe parent non-stagé (pattern BilanInitialTab « Examen clinique à l'entrée ») ; les 4 blocs enfants restent stagés indépendants -->
    <CollapsibleSection
      :ref="setSectionRef('facteursRisque')"
      title="Facteurs de risque"
      :default-open="true"
    >
      <template #default>
        <StagedCollapsibleSection
          :ref="setSectionRef('facteurs')"
          title="Facteurs"
      :keys="['dyslipidemie', 'hta', 'sas']"
      :model-value="data"
      @save="emit('change')"
    >
      <template #default="{ draft }">
        <div>
          <el-row :gutter="16">
            <el-col :span="6">
              <el-form-item label="Dyslipidémie">
                <el-checkbox v-model="draft.dyslipidemie">Oui</el-checkbox>
              </el-form-item>
            </el-col>
            <el-col :span="6">
              <el-form-item label="HTA">
                <el-checkbox v-model="draft.hta">Oui (traitée ou non)</el-checkbox>
              </el-form-item>
            </el-col>
            <el-col :span="6">
              <el-form-item label="SAOS">
                <el-select v-model="draft.sas" placeholder="—" clearable style="width:100%">
                  <el-option label="Non" value="Non" />
                  <el-option label="Oui" value="Oui" />
                  <el-option label="Non dépisté" value="Non dépisté" />
                </el-select>
              </el-form-item>
            </el-col>
          </el-row>
        </div>
      </template>
    </StagedCollapsibleSection>

    <div class="section-preview">
      <FormPreview
        title="Facteurs"
        variant="compact"
        :fields="facteursPreviewFields"
        @edit="() => openSection('facteurs')"
      />
    </div>

    <!-- Consommation de tabac : pattern Glasgow unique (history-collapse + toolbar + table).
         Pas de scalaire stagé doublon : la saisie passe par tabacBuffer -> tabacHistory. -->

    <!-- Historique tabac (parité Glasgow BilanInitialTab) : subtitle +
         collapse + toolbar + table toujours rendus dans le parent non-stagé
         Facteurs de risque. Le buffer écrit direct data (pattern Glasgow). -->
    <h4 class="examen-subtitle">1. Consommation de tabac</h4>

    <div class="history-collapse">
          <div class="history-collapse__header" @click="tabacFormOpen = !tabacFormOpen">
            <div class="history-collapse__header-left">
              <el-icon class="history-collapse__header-icon"><Plus /></el-icon>
              <span class="history-collapse__title">{{ tabacEditingKey ? 'Modifier la consommation' : 'Enregistrer une consommation' }}</span>
              <el-badge v-if="(data.tabacHistory || []).length" :value="(data.tabacHistory || []).length" class="history-collapse__badge" />
            </div>
            <el-icon class="history-collapse__arrow" :class="{ 'history-collapse__arrow--open': tabacFormOpen }">
              <ArrowDown />
            </el-icon>
          </div>
          <div v-show="tabacFormOpen" class="history-collapse__body">
            <el-row :gutter="16">
              <el-col :span="6">
                <el-form-item label="Statut tabac">
                  <el-select v-model="tabacBuffer.tabac" placeholder="—" clearable style="width:100%">
                    <el-option label="Oui" value="Oui" />
                    <el-option label="Non" value="Non" />
                  </el-select>
                </el-form-item>
              </el-col>
              <template v-if="tabacBuffer.tabac === 'Oui'">
                <el-col :span="6">
                  <el-form-item label="Quantité tabac">
                    <el-input-number v-model="tabacBuffer.tabacQuantite" :min="0" :step="1" controls-position="right" style="width:100%" />
                  </el-form-item>
                </el-col>
                <el-col :span="6">
                  <el-form-item label="Unité tabac">
                    <el-select v-model="tabacBuffer.tabacUnite" placeholder="—" clearable style="width:100%">
                      <el-option label="Cigarette(s)" value="cigarette" />
                      <el-option label="Paquet(s)" value="paquet" />
                    </el-select>
                  </el-form-item>
                </el-col>
                <el-col :span="6">
                  <el-form-item label="Rythme tabac">
                    <el-select v-model="tabacBuffer.tabacDuree" placeholder="—" clearable style="width:100%">
                      <el-option label="/jour" value="j" />
                      <el-option label="/semaine" value="semaine" />
                      <el-option label="/mois" value="mois" />
                    </el-select>
                  </el-form-item>
                </el-col>
              </template>
            </el-row>
            <el-row v-if="tabacBuffer.tabac === 'Oui'" :gutter="16">
              <el-col :span="6">
                <el-form-item label="Date début tabac">
                  <el-date-picker v-model="tabacBuffer.tabacDateDebut" type="month" value-format="YYYY-MM" format="MM/YYYY" placeholder="MM/AAAA" style="width:100%" />
                </el-form-item>
              </el-col>
              <el-col :span="6">
                <el-form-item label="Durée tabac">
                  <div class="duree-group">
                    <el-input-number v-model="tabacDureeYears" :min="0" :max="100" :controls="false" placeholder="Ans" style="width:100%" />
                    <span class="duree-unit">ans</span>
                    <el-input-number v-model="tabacDureeMonths" :min="0" :max="11" :controls="false" placeholder="Mois" style="width:100%" />
                    <span class="duree-unit">mois</span>
                  </div>
                </el-form-item>
              </el-col>
              <el-col :span="6">
                <el-form-item label="Depuis">
                  <el-input :model-value="tabacBufferDepuisDuree" disabled />
                </el-form-item>
              </el-col>
              <el-col :span="6">
                <div class="glasgow-result">
                  <div class="glasgow-result__score">
                    <span class="glasgow-result__label">PA</span>
                    <span class="glasgow-result__value">{{ tabacBufferPA }}</span>
                  </div>
                </div>
              </el-col>
            </el-row>
            <el-row v-if="tabacBuffer.tabac === 'Oui'" :gutter="16">
              <el-col :span="24">
                <el-form-item label="Commentaire tabac (mesure)">
                  <RichTextEditor v-model="tabacBuffer.tabacCommentaire" :rows="2" placeholder="Précisions sur le tabagisme (type, habitudes, sevrage...)" />
                </el-form-item>
              </el-col>
            </el-row>
            <div class="history-collapse__actions">
              <el-button type="primary" @click="saveTabacEntry">Enregistrer</el-button>
              <el-button @click="cancelTabacEdit">Annuler</el-button>
            </div>
          </div>
        </div>
    <div class="history-table-toolbar">
      <el-button size="small" :icon="TrendCharts" @click="forwardMultiHistory('ficheTabac')">Voir courbes</el-button>
    </div>
    <div class="history-table-wrap">
          <table class="history-table">
            <thead>
              <tr>
                <th>Date / Heure</th>
                <th><button type="button" class="history-th-btn" @click.stop="forwardHistory('ficheDiabete.tabac')" :aria-label="'Voir historique Statut tabac'" :title="'Voir historique Statut tabac'">Statut <el-icon :size="14" class="history-th-icon" aria-hidden="true"><Clock /></el-icon></button></th>
                <th><button type="button" class="history-th-btn" @click.stop="forwardHistory('ficheDiabete.tabacQuantite')" :aria-label="'Voir historique Quantité tabac'" :title="'Voir historique Quantité tabac'">Quantité <el-icon :size="14" class="history-th-icon" aria-hidden="true"><Clock /></el-icon></button></th>
                <th><button type="button" class="history-th-btn" @click.stop="forwardHistory('ficheDiabete.tabacDateDebut')" :aria-label="'Voir historique Depuis tabac'" :title="'Voir historique Depuis tabac'">Depuis <el-icon :size="14" class="history-th-icon" aria-hidden="true"><Clock /></el-icon></button></th>
                <th><button type="button" class="history-th-btn" @click.stop="forwardHistory('ficheDiabete.tabacPA')" :aria-label="'Voir historique PA tabac'" :title="'Voir historique PA tabac'">PA <el-icon :size="14" class="history-th-icon" aria-hidden="true"><Clock /></el-icon></button></th>
                <th><button type="button" class="history-th-btn" @click.stop="forwardHistory('ficheDiabete.tabacCommentaire')" :aria-label="'Voir historique Commentaire tabac'" :title="'Voir historique Commentaire tabac'">Commentaire <el-icon :size="14" class="history-th-icon" aria-hidden="true"><Clock /></el-icon></button></th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="!sortedTabacHistory.length">
                <td colspan="7" class="history-table__empty">Aucune consommation enregistrée</td>
              </tr>
              <tr v-for="entry in sortedTabacHistory" :key="entry._key">
                <td class="history-table__date">{{ formatDateTime(entry.date) }}</td>
                <td>{{ entry.tabac || '—' }}</td>
                <td>{{ tabacQuantiteLabel(entry) ?? '—' }}</td>
                <td>{{ tabacEntryDepuisDuree(entry) }}</td>
                <td class="history-table__score">{{ tabacEntryPA(entry) }}</td>
                <td>
                  <div v-if="!isRichTextEmpty(entry.tabacCommentaire)" v-html="entry.tabacCommentaire"></div>
                  <span v-else>—</span>
                </td>
                <td class="history-table__actions">
                  <el-button size="small" type="primary" title="Modifier" @click="editTabacEntry(entry._key)"><el-icon><Edit /></el-icon></el-button>
                  <el-button size="small" type="danger" title="Supprimer" @click="deleteTabacEntry(entry._key)"><el-icon><Delete /></el-icon></el-button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

    <!-- Autre substance : pattern Glasgow unique (history-collapse + toolbar + table).
         Pas de scalaire stagé doublon : la saisie passe par substanceBuffer -> substanceHistory. -->

    <!-- Historique substance (parité Glasgow) : subtitle +
         collapse + toolbar + table toujours rendus dans le parent non-stagé
         Facteurs de risque. -->
    <h4 class="examen-subtitle">2. Autre substance toxique</h4>

    <div class="history-collapse">
          <div class="history-collapse__header" @click="substanceFormOpen = !substanceFormOpen">
            <div class="history-collapse__header-left">
              <el-icon class="history-collapse__header-icon"><Plus /></el-icon>
              <span class="history-collapse__title">{{ substanceEditingKey ? 'Modifier la prise' : 'Enregistrer une prise' }}</span>
              <el-badge v-if="(data.substanceHistory || []).length" :value="(data.substanceHistory || []).length" class="history-collapse__badge" />
            </div>
            <el-icon class="history-collapse__arrow" :class="{ 'history-collapse__arrow--open': substanceFormOpen }">
              <ArrowDown />
            </el-icon>
          </div>
          <div v-show="substanceFormOpen" class="history-collapse__body">
            <el-row :gutter="16">
              <el-col :span="6">
                <el-form-item label="Substance (mesure)">
                  <el-select v-model="substanceBuffer.substance" placeholder="—" clearable style="width:100%">
                    <el-option label="Alcool" value="Alcool" />
                    <el-option label="Cannabis" value="Cannabis" />
                    <el-option label="Cocaïne" value="Cocaïne" />
                    <el-option label="Autre toxique" value="Autre" />
                  </el-select>
                </el-form-item>
              </el-col>
              <template v-if="substanceBuffer.substance">
                <el-col :span="6">
                  <el-form-item label="Précision (mesure)">
                    <el-input v-model="substanceBuffer.substancePrecision" placeholder="Préciser (type, fréquence...)" />
                  </el-form-item>
                </el-col>
                <el-col :span="6">
                  <el-form-item label="Quantité substance">
                    <el-input-number v-model="substanceBuffer.substanceQuantite" :min="0" :step="1" controls-position="right" style="width:100%" />
                  </el-form-item>
                </el-col>
                <el-col :span="6">
                  <el-form-item label="Unité substance">
                    <el-select v-model="substanceBuffer.substanceUnite" placeholder="—" clearable style="width:100%">
                      <el-option label="mL" value="ml" />
                      <el-option label="cL" value="cl" />
                      <el-option label="L" value="l" />
                      <el-option label="Joint(s)" value="joint" />
                      <el-option label="Autre" value="autre" />
                    </el-select>
                  </el-form-item>
                </el-col>
              </template>
            </el-row>
            <el-row v-if="substanceBuffer.substance" :gutter="16">
              <el-col :span="6">
                <el-form-item label="Rythme substance">
                  <el-select v-model="substanceBuffer.substanceDuree" placeholder="—" clearable style="width:100%">
                    <el-option label="/jour" value="j" />
                    <el-option label="/semaine" value="semaine" />
                    <el-option label="/mois" value="mois" />
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col :span="6">
                <el-form-item label="Date début substance">
                  <el-date-picker v-model="substanceBuffer.substanceDateDebut" type="month" value-format="YYYY-MM" format="MM/YYYY" placeholder="MM/AAAA" style="width:100%" />
                </el-form-item>
              </el-col>
              <el-col :span="6">
                <el-form-item label="Durée substance">
                  <div class="duree-group">
                    <el-input-number v-model="substanceDureeYears" :min="0" :max="100" :controls="false" placeholder="Ans" style="width:100%" />
                    <span class="duree-unit">ans</span>
                    <el-input-number v-model="substanceDureeMonths" :min="0" :max="11" :controls="false" placeholder="Mois" style="width:100%" />
                    <span class="duree-unit">mois</span>
                  </div>
                </el-form-item>
              </el-col>
              <el-col :span="6">
                <el-form-item label="Depuis">
                  <el-input :model-value="substanceBufferDepuisDuree" disabled />
                </el-form-item>
              </el-col>
            </el-row>
            <el-row v-if="substanceBuffer.substance" :gutter="16">
              <el-col :span="8">
                <el-form-item label="Quantité">
                  <el-input :model-value="substanceBufferQuantiteLabel ?? '—'" disabled />
                </el-form-item>
              </el-col>
              <el-col :span="16">
                <el-form-item label="Commentaire substance (mesure)">
                  <RichTextEditor v-model="substanceBuffer.substanceCommentaire" :rows="2" placeholder="Précisions sur la consommation, tolérance, dépendance..." />
                </el-form-item>
              </el-col>
            </el-row>
            <div class="history-collapse__actions">
              <el-button type="primary" @click="saveSubstanceEntry">Enregistrer</el-button>
              <el-button @click="cancelSubstanceEdit">Annuler</el-button>
            </div>
          </div>
        </div>
    <div class="history-table-toolbar">
      <el-button size="small" :icon="TrendCharts" @click="forwardMultiHistory('ficheSubstance')">Voir courbes</el-button>
    </div>
    <div class="history-table-wrap">
          <table class="history-table">
            <thead>
              <tr>
                <th>Date / Heure</th>
                <th><button type="button" class="history-th-btn" @click.stop="forwardHistory('ficheDiabete.substance')" :aria-label="'Voir historique Substance'" :title="'Voir historique Substance'">Substance <el-icon :size="14" class="history-th-icon" aria-hidden="true"><Clock /></el-icon></button></th>
                <th><button type="button" class="history-th-btn" @click.stop="forwardHistory('ficheDiabete.substancePrecision')" :aria-label="'Voir historique Précision substance'" :title="'Voir historique Précision substance'">Précision <el-icon :size="14" class="history-th-icon" aria-hidden="true"><Clock /></el-icon></button></th>
                <th><button type="button" class="history-th-btn" @click.stop="forwardHistory('ficheDiabete.substanceQuantite')" :aria-label="'Voir historique Quantité substance'" :title="'Voir historique Quantité substance'">Quantité <el-icon :size="14" class="history-th-icon" aria-hidden="true"><Clock /></el-icon></button></th>
                <th><button type="button" class="history-th-btn" @click.stop="forwardHistory('ficheDiabete.substanceDateDebut')" :aria-label="'Voir historique Depuis substance'" :title="'Voir historique Depuis substance'">Depuis <el-icon :size="14" class="history-th-icon" aria-hidden="true"><Clock /></el-icon></button></th>
                <th><button type="button" class="history-th-btn" @click.stop="forwardHistory('ficheDiabete.substanceCommentaire')" :aria-label="'Voir historique Commentaire substance'" :title="'Voir historique Commentaire substance'">Commentaire <el-icon :size="14" class="history-th-icon" aria-hidden="true"><Clock /></el-icon></button></th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="!sortedSubstanceHistory.length">
                <td colspan="7" class="history-table__empty">Aucune prise enregistrée</td>
              </tr>
              <tr v-for="entry in sortedSubstanceHistory" :key="entry._key">
                <td class="history-table__date">{{ formatDateTime(entry.date) }}</td>
                <td>{{ entry.substance || '—' }}</td>
                <td>{{ entry.substancePrecision || '—' }}</td>
                <td>{{ substanceQuantiteLabel(entry) ?? '—' }}</td>
                <td>{{ substanceEntryDepuisDuree(entry) }}</td>
                <td>
                  <div v-if="!isRichTextEmpty(entry.substanceCommentaire)" v-html="entry.substanceCommentaire"></div>
                  <span v-else>—</span>
                </td>
                <td class="history-table__actions">
                  <el-button size="small" type="primary" title="Modifier" @click="editSubstanceEntry(entry._key)"><el-icon><Edit /></el-icon></el-button>
                  <el-button size="small" type="danger" title="Supprimer" @click="deleteSubstanceEntry(entry._key)"><el-icon><Delete /></el-icon></el-button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

    <!-- Anthropométrie : pattern Glasgow unique (history-collapse + toolbar + table).
         Pas de scalaire stagé doublon : la saisie passe par anthropoBuffer -> vitalSignsHistory. -->

    <!-- Historique anthropométrie (parité Glasgow) : subtitle +
         collapse + toolbar + table toujours rendus dans le parent non-stagé
         Facteurs de risque. Buffer local + collection partagée
         bilanInitial.vitalSignsHistory + emit change. -->
    <h4 class="examen-subtitle">3. Suivi Pondéral</h4>

    <div class="history-collapse">
          <div class="history-collapse__header" @click="anthropoFormOpen = !anthropoFormOpen">
            <div class="history-collapse__header-left">
              <el-icon class="history-collapse__header-icon"><Plus /></el-icon>
              <span class="history-collapse__title">{{ anthropoEditingKey ? 'Modifier la mesure' : 'Enregistrer une mesure' }}</span>
              <el-badge v-if="(bilanInitial?.vitalSignsHistory ?? anthropoLocalHistory).length" :value="(bilanInitial?.vitalSignsHistory ?? anthropoLocalHistory).length" class="history-collapse__badge" />
            </div>
            <el-icon class="history-collapse__arrow" :class="{ 'history-collapse__arrow--open': anthropoFormOpen }">
              <ArrowDown />
            </el-icon>
          </div>
          <div v-show="anthropoFormOpen" class="history-collapse__body">
            <el-row :gutter="16">
              <el-col :span="8">
                <el-form-item label="Poids (kg)">
                  <el-input-number v-model="anthropoBuffer.poids" :min="0" :max="300" :step="0.1" :precision="1" controls-position="right" style="width:100%" />
                </el-form-item>
              </el-col>
              <el-col :span="8">
                <el-form-item label="Taille (cm)">
                  <el-input-number v-model="anthropoBuffer.taille" :min="0" :max="250" :step="0.5" :precision="1" controls-position="right" style="width:100%" />
                </el-form-item>
              </el-col>
              <el-col :span="8">
                <div class="glasgow-result">
                  <div class="glasgow-result__score">
                    <span class="glasgow-result__label">IMC</span>
                    <span class="glasgow-result__value">{{ anthropoBufferImc }}</span>
                  </div>
                </div>
              </el-col>
            </el-row>
            <div class="history-collapse__actions">
              <el-button type="primary" @click="saveAnthropoEntry">Enregistrer</el-button>
              <el-button @click="cancelAnthropoEdit">Annuler</el-button>
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
                <th><button type="button" class="history-th-btn" @click.stop="forwardHistory('bilanInitial.examenPhysique.poids')" :aria-label="'Voir historique Poids'" :title="'Voir historique Poids'">Poids (kg) <el-icon :size="14" class="history-th-icon" aria-hidden="true"><Clock /></el-icon></button></th>
                <th><button type="button" class="history-th-btn" @click.stop="forwardHistory('bilanInitial.examenPhysique.taille')" :aria-label="'Voir historique Taille'" :title="'Voir historique Taille'">Taille (cm) <el-icon :size="14" class="history-th-icon" aria-hidden="true"><Clock /></el-icon></button></th>
                <th><button type="button" class="history-th-btn" @click.stop="forwardHistory('bilanInitial.examenPhysique.imc')" :aria-label="'Voir historique IMC'" :title="'Voir historique IMC'">IMC (kg/m²) <el-icon :size="14" class="history-th-icon" aria-hidden="true"><Clock /></el-icon></button></th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="!sortedAnthropoHistory.length">
                <td colspan="5" class="history-table__empty">Aucune mesure enregistrée</td>
              </tr>
              <tr v-for="entry in sortedAnthropoHistory" :key="entry._key">
                <td class="history-table__date">{{ formatDateTime(entry.date) }}</td>
                <td>{{ entry.poids ?? '—' }}</td>
                <td>{{ entry.taille ?? '—' }}</td>
                <td class="history-table__score">{{ anthropoEntryImc(entry) ?? '—' }}</td>
                <td class="history-table__actions">
                  <el-button size="small" type="primary" title="Modifier" @click="editAnthropoEntry(entry._key)"><el-icon><Edit /></el-icon></el-button>
                  <el-button size="small" type="danger" title="Supprimer" @click="deleteAnthropoEntry(entry._key)"><el-icon><Delete /></el-icon></el-button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>
    </CollapsibleSection>


    <!-- Dernier Examen métabolique : carte non-stagée en lecture seule, alimentée
         par les résultats bio du dossier (examensComplementaires.bilanBio.results).
         Pas de :keys / staging : les valeurs ne sont pas saisies ici. -->
    <CollapsibleSection
      :ref="setSectionRef('dernierExamen')"
      title="Dernier Examen métabolique"
      :default-open="true"
    >
      <template #default>
        <div class="dernier-examen">
          <div class="dernier-examen__row">
            <span class="dernier-examen__label">HbA1c</span>
            <span class="dernier-examen__value">{{ bioRowOf(dernierExamenHbA1c) }}</span>
          </div>
          <div class="dernier-examen__row">
            <span class="dernier-examen__label">LDL-c</span>
            <span class="dernier-examen__value">{{ bioRowOf(dernierExamenLdl) }}</span>
          </div>
          <div class="dernier-examen__row">
            <span class="dernier-examen__label">HDL-c</span>
            <span class="dernier-examen__value">{{ bioRowOf(dernierExamenHdl) }}</span>
          </div>
          <div class="dernier-examen__row">
            <span class="dernier-examen__label">Triglycérides</span>
            <span class="dernier-examen__value">{{ bioRowOf(dernierExamenTriglycerides) }}</span>
          </div>
          <p class="dernier-examen__note">Valeurs issues des résultats bio (onglet Examens Complémentaires).</p>
        </div>
      </template>
    </CollapsibleSection>

    <!-- Traitement-auto surveillance glycémique : groupe parent non-stagé (pattern
         Facteurs de risque / Glasgow BilanInitialTab) ; les 3 blocs enfants
         sont historisés (buffer + toolbar + table), sans scalaire stagé doublon. -->
    <CollapsibleSection
      :ref="setSectionRef('traitement')"
      title="Traitement-auto surveillance glycémique"
      :default-open="true"
    >
      <template #default>
        <h4 class="examen-subtitle">1. Médicaments</h4>

        <div class="history-collapse">
          <div class="history-collapse__header" @click="medsFormOpen = !medsFormOpen">
            <div class="history-collapse__header-left">
              <el-icon class="history-collapse__header-icon"><Plus /></el-icon>
              <span class="history-collapse__title">{{ medsEditingKey ? 'Modifier le traitement' : 'Enregistrer un traitement' }}</span>
              <el-badge v-if="(data.medicamentsHistory || []).length" :value="(data.medicamentsHistory || []).length" class="history-collapse__badge" />
            </div>
            <el-icon class="history-collapse__arrow" :class="{ 'history-collapse__arrow--open': medsFormOpen }">
              <ArrowDown />
            </el-icon>
          </div>
          <div v-show="medsFormOpen" class="history-collapse__body">
            <el-row :gutter="16">
              <el-col :span="24">
                <el-form-item label="Traitement médicamenteux">
                  <el-checkbox-group v-model="traitementMedsModel">
                    <el-checkbox value="ADO">ADO</el-checkbox>
                    <el-checkbox value="aGLP-1">aGLP-1</el-checkbox>
                    <el-checkbox value="INSULINE">INSULINE</el-checkbox>
                    <el-checkbox value="POMPE">POMPE</el-checkbox>
                  </el-checkbox-group>
                </el-form-item>
              </el-col>
            </el-row>
            <!-- ADO -->
            <el-row v-if="traitementMedsModel.includes('ADO')" :gutter="16">
              <el-col :span="4">
                <el-form-item label="ADO – début">
                  <el-date-picker v-model="medsBuffer.adoDateDebut" type="month" value-format="YYYY-MM" format="MM/YYYY" placeholder="MM/AAAA" style="width:100%" />
                </el-form-item>
              </el-col>
              <el-col :span="4">
                <el-form-item label="Durée ADO">
                  <div class="duree-group">
                    <el-input-number v-model="adoDureeYears" :min="0" :max="100" :controls="false" placeholder="Ans" style="width:100%" />
                    <span class="duree-unit">ans</span>
                    <el-input-number v-model="adoDureeMonths" :min="0" :max="11" :controls="false" placeholder="Mois" style="width:100%" />
                    <span class="duree-unit">mois</span>
                  </div>
                </el-form-item>
              </el-col>
              <el-col :span="16">
                <el-form-item label="Commentaire ADO">
                  <RichTextEditor v-model="medsBuffer.adoCommentaire" :rows="2" placeholder="Molécules, posologie, particularités..." />
                </el-form-item>
              </el-col>
            </el-row>
            <!-- aGLP-1 -->
            <el-row v-if="traitementMedsModel.includes('aGLP-1')" :gutter="16">
              <el-col :span="4">
                <el-form-item label="aGLP-1 – début">
                  <el-date-picker v-model="medsBuffer.glp1DateDebut" type="month" value-format="YYYY-MM" format="MM/YYYY" placeholder="MM/AAAA" style="width:100%" />
                </el-form-item>
              </el-col>
              <el-col :span="4">
                <el-form-item label="Durée aGLP-1">
                  <div class="duree-group">
                    <el-input-number v-model="glp1DureeYears" :min="0" :max="100" :controls="false" placeholder="Ans" style="width:100%" />
                    <span class="duree-unit">ans</span>
                    <el-input-number v-model="glp1DureeMonths" :min="0" :max="11" :controls="false" placeholder="Mois" style="width:100%" />
                    <span class="duree-unit">mois</span>
                  </div>
                </el-form-item>
              </el-col>
              <el-col :span="16">
                <el-form-item label="Commentaire aGLP-1">
                  <RichTextEditor v-model="medsBuffer.glp1Commentaire" :rows="2" placeholder="Molécules, posologie, particularités..." />
                </el-form-item>
              </el-col>
            </el-row>
            <!-- INSULINE -->
            <el-row v-if="traitementMedsModel.includes('INSULINE')" :gutter="16">
              <el-col :span="4">
                <el-form-item label="Type d'insuline">
                  <el-select v-model="medsBuffer.insulineType" placeholder="—" clearable style="width:100%">
                    <el-option label="Multi-injections" value="multi injection" />
                    <el-option label="Basale seule" value="basale" />
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col :span="4">
                <el-form-item label="Insuline – début">
                  <el-date-picker v-model="medsBuffer.insulineDateDebut" type="month" value-format="YYYY-MM" format="MM/YYYY" placeholder="MM/AAAA" style="width:100%" />
                </el-form-item>
              </el-col>
              <el-col :span="4">
                <el-form-item label="Durée insuline">
                  <div class="duree-group">
                    <el-input-number v-model="insulineDureeYears" :min="0" :max="100" :controls="false" placeholder="Ans" style="width:100%" />
                    <span class="duree-unit">ans</span>
                    <el-input-number v-model="insulineDureeMonths" :min="0" :max="11" :controls="false" placeholder="Mois" style="width:100%" />
                    <span class="duree-unit">mois</span>
                  </div>
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="Commentaire insuline">
                  <RichTextEditor v-model="medsBuffer.insulineCommentaire" :rows="2" placeholder="Molécules, posologie, schéma (basal-bolus, mixte...)" />
                </el-form-item>
              </el-col>
            </el-row>
            <!-- POMPE -->
            <el-row v-if="traitementMedsModel.includes('POMPE')" :gutter="16">
              <el-col :span="8">
                <el-form-item label="Pompe – modèle">
                  <el-input v-model="medsBuffer.pompeType" placeholder="Ex. Omnipod 5, Medtronic 780G..." />
                </el-form-item>
              </el-col>
              <el-col :span="4">
                <el-form-item label="Pompe – début">
                  <el-date-picker v-model="medsBuffer.pompeDateDebut" type="month" value-format="YYYY-MM" format="MM/YYYY" placeholder="MM/AAAA" style="width:100%" />
                </el-form-item>
              </el-col>
              <el-col :span="4">
                <el-form-item label="Durée pompe (ans)">
                  <div class="duree-group">
                    <el-input-number v-model="pompeDureeYears" :min="0" :max="100" :controls="false" placeholder="Ans" style="width:100%" />
                    <span class="duree-unit">ans</span>
                  </div>
                </el-form-item>
              </el-col>
              <el-col :span="8">
                <el-form-item label="Commentaire pompe">
                  <RichTextEditor v-model="medsBuffer.pompeCommentaire" :rows="2" placeholder="Modèle, site, gestion des bolus..." />
                </el-form-item>
              </el-col>
            </el-row>
            <div class="history-collapse__actions">
              <el-button type="primary" @click="saveMedsEntry">Enregistrer</el-button>
              <el-button @click="cancelMedsEdit">Annuler</el-button>
            </div>
          </div>
        </div>
        <div class="history-table-toolbar">
          <el-button size="small" :icon="TrendCharts" @click="forwardMultiHistory('traitementMeds')">Voir courbes</el-button>
        </div>
        <div class="history-table-wrap">
          <table class="history-table">
            <thead>
              <tr>
                <th>Date / Heure</th>
                <th><button type="button" class="history-th-btn" @click.stop="forwardHistory('ficheDiabete.medicaments')" :aria-label="'Voir historique Médicaments'" :title="'Voir historique Médicaments'">Médicaments <el-icon :size="14" class="history-th-icon" aria-hidden="true"><Clock /></el-icon></button></th>
                <th><button type="button" class="history-th-btn" @click.stop="forwardHistory('ficheDiabete.adoDateDebut')" :aria-label="'Voir historique ADO depuis'" :title="'Voir historique ADO depuis'">ADO depuis <el-icon :size="14" class="history-th-icon" aria-hidden="true"><Clock /></el-icon></button></th>
                <th><button type="button" class="history-th-btn" @click.stop="forwardHistory('ficheDiabete.glp1DateDebut')" :aria-label="'Voir historique aGLP-1 depuis'" :title="'Voir historique aGLP-1 depuis'">aGLP-1 depuis <el-icon :size="14" class="history-th-icon" aria-hidden="true"><Clock /></el-icon></button></th>
                <th><button type="button" class="history-th-btn" @click.stop="forwardHistory('ficheDiabete.insulineDateDebut')" :aria-label="'Voir historique Insuline'" :title="'Voir historique Insuline'">Insuline <el-icon :size="14" class="history-th-icon" aria-hidden="true"><Clock /></el-icon></button></th>
                <th><button type="button" class="history-th-btn" @click.stop="forwardHistory('ficheDiabete.pompeDateDebut')" :aria-label="'Voir historique Pompe'" :title="'Voir historique Pompe'">Pompe <el-icon :size="14" class="history-th-icon" aria-hidden="true"><Clock /></el-icon></button></th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="!sortedMedicamentsHistory.length">
                <td colspan="7" class="history-table__empty">Aucun traitement enregistré</td>
              </tr>
              <tr v-for="entry in sortedMedicamentsHistory" :key="entry._key">
                <td class="history-table__date">{{ formatDateTime(entry.date) }}</td>
                <td>{{ medsLabel(entry) }}</td>
                <td>{{ medsAdoDepuis(entry) }}</td>
                <td>{{ medsGlp1Depuis(entry) }}</td>
                <td>{{ medsInsulineLabel(entry) }}</td>
                <td>{{ medsPompeLabel(entry) }}</td>
                <td class="history-table__actions">
                  <el-button size="small" type="primary" title="Modifier" @click="editMedsEntry(entry._key)"><el-icon><Edit /></el-icon></el-button>
                  <el-button size="small" type="danger" title="Supprimer" @click="deleteMedsEntry(entry._key)"><el-icon><Delete /></el-icon></el-button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <h4 class="examen-subtitle">2. Traitement habituel</h4>

        <div class="history-collapse">
          <div class="history-collapse__header" @click="habFormOpen = !habFormOpen">
            <div class="history-collapse__header-left">
              <el-icon class="history-collapse__header-icon"><Plus /></el-icon>
              <span class="history-collapse__title">{{ habEditingKey ? 'Modifier le traitement habituel' : 'Enregistrer un traitement habituel' }}</span>
              <el-badge v-if="(data.traitementHabituelHistory || []).length" :value="(data.traitementHabituelHistory || []).length" class="history-collapse__badge" />
            </div>
            <el-icon class="history-collapse__arrow" :class="{ 'history-collapse__arrow--open': habFormOpen }">
              <ArrowDown />
            </el-icon>
          </div>
          <div v-show="habFormOpen" class="history-collapse__body">
            <el-row :gutter="16">
              <el-col :span="24">
                <el-form-item label="Traitement habituel">
                  <RichTextEditor v-model="habBuffer.traitementHabituel" :rows="3" placeholder="Traitement habituel du patient (molécules, posologies, horaires)..." />
                </el-form-item>
              </el-col>
            </el-row>
            <div class="history-collapse__actions">
              <el-button type="primary" @click="saveHabEntry">Enregistrer</el-button>
              <el-button @click="cancelHabEdit">Annuler</el-button>
            </div>
          </div>
        </div>
        <div class="history-table-toolbar">
          <el-button size="small" :icon="TrendCharts" @click="forwardMultiHistory('traitementHabituel')">Voir courbes</el-button>
        </div>
        <div class="history-table-wrap">
          <table class="history-table">
            <thead>
              <tr>
                <th>Date / Heure</th>
                <th><button type="button" class="history-th-btn" @click.stop="forwardHistory('ficheDiabete.traitementHabituel')" :aria-label="'Voir historique Traitement habituel'" :title="'Voir historique Traitement habituel'">Traitement habituel <el-icon :size="14" class="history-th-icon" aria-hidden="true"><Clock /></el-icon></button></th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="!sortedTraitementHabituelHistory.length">
                <td colspan="3" class="history-table__empty">Aucun traitement habituel enregistré</td>
              </tr>
              <tr v-for="entry in sortedTraitementHabituelHistory" :key="entry._key">
                <td class="history-table__date">{{ formatDateTime(entry.date) }}</td>
                <td>
                  <div v-if="!isRichTextEmpty(entry.traitementHabituel)" v-html="entry.traitementHabituel"></div>
                  <span v-else>—</span>
                </td>
                <td class="history-table__actions">
                  <el-button size="small" type="primary" title="Modifier" @click="editHabEntry(entry._key)"><el-icon><Edit /></el-icon></el-button>
                  <el-button size="small" type="danger" title="Supprimer" @click="deleteHabEntry(entry._key)"><el-icon><Delete /></el-icon></el-button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <h4 class="examen-subtitle">3. Auto surveillance glycémique</h4>

        <div class="history-collapse">
          <div class="history-collapse__header" @click="survFormOpen = !survFormOpen">
            <div class="history-collapse__header-left">
              <el-icon class="history-collapse__header-icon"><Plus /></el-icon>
              <span class="history-collapse__title">{{ survEditingKey ? 'Modifier la surveillance' : 'Enregistrer une surveillance' }}</span>
              <el-badge v-if="(data.surveillanceHistory || []).length" :value="(data.surveillanceHistory || []).length" class="history-collapse__badge" />
            </div>
            <el-icon class="history-collapse__arrow" :class="{ 'history-collapse__arrow--open': survFormOpen }">
              <ArrowDown />
            </el-icon>
          </div>
          <div v-show="survFormOpen" class="history-collapse__body">
            <el-row :gutter="16">
              <el-col :span="6">
                <el-form-item label="Capillaire">
                  <el-select v-model="survBuffer.surveillanceCapillaire" placeholder="—" clearable style="width:100%">
                    <el-option label="Oui" value="Oui" />
                    <el-option label="Non" value="Non" />
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col :span="6">
                <el-form-item label="MCG (capteur)">
                  <el-select v-model="survBuffer.surveillanceMCG" placeholder="—" clearable style="width:100%">
                    <el-option label="Oui" value="Oui" />
                    <el-option label="Non" value="Non" />
                  </el-select>
                </el-form-item>
              </el-col>
            </el-row>
            <el-row :gutter="16">
              <el-col :span="24">
                <el-form-item label="Commentaire autosurveillance">
                  <RichTextEditor v-model="survBuffer.surveillanceCommentaire" :rows="2" placeholder="Fréquence, organisation des mesures, adaptation thérapeutique..." />
                </el-form-item>
              </el-col>
            </el-row>
            <div class="history-collapse__actions">
              <el-button type="primary" @click="saveSurvEntry">Enregistrer</el-button>
              <el-button @click="cancelSurvEdit">Annuler</el-button>
            </div>
          </div>
        </div>
        <div class="history-table-toolbar">
          <el-button size="small" :icon="TrendCharts" @click="forwardMultiHistory('surveillance')">Voir courbes</el-button>
        </div>
        <div class="history-table-wrap">
          <table class="history-table">
            <thead>
              <tr>
                <th>Date / Heure</th>
                <th><button type="button" class="history-th-btn" @click.stop="forwardHistory('ficheDiabete.surveillanceCapillaire')" :aria-label="'Voir historique Capillaire'" :title="'Voir historique Capillaire'">Capillaire <el-icon :size="14" class="history-th-icon" aria-hidden="true"><Clock /></el-icon></button></th>
                <th><button type="button" class="history-th-btn" @click.stop="forwardHistory('ficheDiabete.surveillanceMCG')" :aria-label="'Voir historique MCG'" :title="'Voir historique MCG'">MCG <el-icon :size="14" class="history-th-icon" aria-hidden="true"><Clock /></el-icon></button></th>
                <th><button type="button" class="history-th-btn" @click.stop="forwardHistory('ficheDiabete.surveillanceCommentaire')" :aria-label="'Voir historique Commentaire autosurveillance'" :title="'Voir historique Commentaire autosurveillance'">Commentaire <el-icon :size="14" class="history-th-icon" aria-hidden="true"><Clock /></el-icon></button></th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="!sortedSurveillanceHistory.length">
                <td colspan="5" class="history-table__empty">Aucune surveillance enregistrée</td>
              </tr>
              <tr v-for="entry in sortedSurveillanceHistory" :key="entry._key">
                <td class="history-table__date">{{ formatDateTime(entry.date) }}</td>
                <td>{{ entry.surveillanceCapillaire || '—' }}</td>
                <td>{{ entry.surveillanceMCG || '—' }}</td>
                <td>
                  <div v-if="!isRichTextEmpty(entry.surveillanceCommentaire)" v-html="entry.surveillanceCommentaire"></div>
                  <span v-else>—</span>
                </td>
                <td class="history-table__actions">
                  <el-button size="small" type="primary" title="Modifier" @click="editSurvEntry(entry._key)"><el-icon><Edit /></el-icon></el-button>
                  <el-button size="small" type="danger" title="Supprimer" @click="deleteSurvEntry(entry._key)"><el-icon><Delete /></el-icon></el-button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>
    </CollapsibleSection>

    <StagedCollapsibleSection
      :ref="setSectionRef('complications')"
      title="Complications Micro &amp; Macro-vasculaires"
      :keys="['retinopathie', 'creatininemie', 'neuropathie', 'podologiqueGrade', 'amputation', 'amputationDetail', 'insuffisanceCardiaque', 'ntProBNP', 'aomi', 'ischemicCritique']"
      :model-value="data"
      @save="emit('change')"
    >
      <template #default="{ draft }">
        <el-row :gutter="16">
          <el-col :span="24">
            <el-form-item label="Ophtalmologique (Rétinopathie)">
              <el-select v-model="draft.retinopathie" style="width:100%">
                <el-option label="Absente" value="Absente" />
                <el-option label="RDNP minime" value="RDNP minime" />
                <el-option label="Modérée" value="Modérée" />
                <el-option label="Proliférante" value="Proliférante" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="6">
            <el-form-item label="Créatininémie (µmol/L)">
              <el-input-number v-model="draft.creatininemie" :min="0" :max="2000" controls-position="right" style="width:100%" />
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="DFG (mL/min/1.73m²)">
              <el-input :model-value="dfgDisplayOf(draft.creatininemie)" disabled />
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="Stade IR">
              <el-input :model-value="stadeOf(dfgValueOf(draft.creatininemie))" disabled />
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="Neuropathie symptomatique">
              <el-checkbox v-model="draft.neuropathie">Oui</el-checkbox>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="Grade podologique">
              <el-select v-model="draft.podologiqueGrade" placeholder="0-3" style="width:100%">
                <el-option label="0" :value="0" />
                <el-option label="1" :value="1" />
                <el-option label="2" :value="2" />
                <el-option label="3" :value="3" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="Amputation">
              <el-checkbox v-model="draft.amputation">Oui</el-checkbox>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="24">
            <el-form-item v-if="draft.amputation" label="Détail amputation">
              <RichTextEditor v-model="draft.amputationDetail" :rows="2" placeholder="Amputation Transmétatarsienne gauche le 08/12/2025" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="Insuffisance cardiaque">
              <el-checkbox v-model="draft.insuffisanceCardiaque">Oui</el-checkbox>
            </el-form-item>
            <el-form-item v-if="draft.insuffisanceCardiaque" label="NT-proBNP (pg/mL)">
              <el-input-number v-model="draft.ntProBNP" :min="0" controls-position="right" style="width:100%" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="AOMI">
              <el-checkbox v-model="draft.aomi">Oui</el-checkbox>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="24">
            <el-form-item v-if="draft.aomi" label="Description ischémie critique">
              <RichTextEditor v-model="draft.ischemicCritique" :rows="2" placeholder="Description de l'ischémie critique..." />
            </el-form-item>
          </el-col>
        </el-row>
      </template>
    </StagedCollapsibleSection>

    <div class="section-preview">
      <FormPreview
        title="Complications Micro &amp; Macro-vasculaires"
        variant="compact"
        :fields="complicationsPreviewFields"
        @edit="() => openSection('complications')"
      />
    </div>
  </el-form>
</template>

<script setup lang="ts">
/* eslint-disable vue/no-mutating-props -- Les blocs history-collapse (tabac/substance/anthropo/médicaments/traitement habituel/surveillance) écrivent volontairement dans les objets réactifs partagés data / bilanInitial et émettent 'change' (pattern Glasgow BilanInitialTab) */
import { computed, onMounted, reactive, ref, nextTick, watch } from 'vue'
import type { Ref } from 'vue'
import type { FicheDiabeteData, ExamenPhysique, ExamensComplementairesData, BilanBioResult, BilanInitialData, SubstanceHistoryEntry, TabacHistoryEntry, VitalSignsHistoryEntry, MedicamentsHistoryEntry, TraitementHabituelHistoryEntry, SurveillanceHistoryEntry } from '@/types/crh-diabete'
import { useCrhDiabeteCalculations } from '@/composables/useCrhDiabeteCalculations'
import RichTextEditor from '@/components/patients/RichTextEditor.vue'
import StagedCollapsibleSection from '@/components/common/StagedCollapsibleSection.vue'
import CollapsibleSection from '@/components/common/CollapsibleSection.vue'
import FormPreview from '@/components/common/FormPreview.vue'
import type { FormPreviewField } from '@/components/common/FormPreview.vue'
import { ArrowDown, Clock, Delete, Edit, Plus, TrendCharts } from '@element-plus/icons-vue'
import { ElMessageBox } from 'element-plus'
import { isRichTextEmpty } from '@/utils/rich-text'
import { formatDate, localMidnightOf } from '@/utils/date'
import { latestBioValue, isHbA1c, isLdl, isHdl, isTriglycerides } from '@/utils/bio-results'
import { useExamResults } from '@/composables/useExamResults'

const FIELD_PREFIX = 'ficheDiabete'

const props = defineProps<{
  data: FicheDiabeteData
  sexe: string | null
  age: number | null
  dateEntree: string
  fieldMeta?: Record<string, string>
  /**
   * Scalaires anthropométrie legacy (poids/taille) : conservé pour compatibilité
   * ascendante (parent + tests). Non affiché — la saisie passe par
   * `bilanInitial.vitalSignsHistory` (pattern Glasgow). Seedé une fois en
   * history[0] si l'historique est vide.
   */
  examenPhysique: ExamenPhysique
  /**
   * Objet bilan initial partagé (même référence réactive que l'onglet Bilan
   * Initial) : l'historique anthropométrie écrit dans
   * `bilanInitial.vitalSignsHistory` pour éviter toute double collection.
   * Optionnel pour compatibilité ascendante (tests legacy sans la prop).
   */
  bilanInitial?: BilanInitialData | null
  /** Résultats bio du patient (dossier partagé, lu sans re-requête). */
  examensComplementaires?: ExamensComplementairesData
  patientId?: number | null
}>()

const emit = defineEmits<{
  change: []
  'open-history': [path: string]
  'open-multi-history': [group: string]
}>()

function metaFor(key: string): string | null {
  return props.fieldMeta?.[key] ?? null
}

function forwardHistory(path: string) {
  emit('open-history', path)
}

function forwardMultiHistory(group: string) {
  emit('open-multi-history', group)
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

const { calcDureeDiabete, calcDFG, calcStadeIR, calcIMC } = useCrhDiabeteCalculations()

function dureeOf(dateDiagnostic: string): string {
  return calcDureeDiabete(dateDiagnostic, props.dateEntree || undefined) || '—'
}

// ─── Durée d'évolution ↔ Date du diagnostic (sync bidirectionnelle) ───

const draftRef = ref<Record<string, any> | null>(null)

function captureDraft(draft: Record<string, any>) {
  draftRef.value = draft
}

const dureeYears = ref<number | null>(null)
const dureeMonths = ref<number | null>(null)
const isSyncingDuree = ref(false)

function dureeRefDate(): Date {
  if (!props.dateEntree) return new Date()
  // Parité stricte avec `refExpo` (electron/export-templates.ts) : un
  // `YYYY-MM-DD` nu est parsé en UTC par new Date() → en fuseau négatif le
  // mois lu en local peut reculer (2026-06-01 → 31 mai). `T00:00:00` force le
  // minuit LOCAL et conserve le mois calendaire de la date d'entrée.
  return localMidnightOf(props.dateEntree)
}

function parseDiagMonth(dateDiagnostic: string): { y: number; m: number } | null {
  const parts = dateDiagnostic ? String(dateDiagnostic).split('-') : []
  if (parts.length < 2) return null
  const y = parseInt(parts[0], 10)
  const m = parseInt(parts[1], 10)
  if (isNaN(y) || isNaN(m)) return null
  return { y, m }
}

function syncDureeFromDate() {
  const diag = draftRef.value?.dateDiagnostic
  const p = parseDiagMonth(diag)
  const ref = dureeRefDate()
  if (!p || isNaN(ref.getTime())) {
    dureeYears.value = null
    dureeMonths.value = null
    return
  }
  let years = ref.getFullYear() - p.y
  let months = ref.getMonth() + 1 - p.m
  if (months < 0) {
    years--
    months += 12
  }
  if (years < 0) years = 0
  isSyncingDuree.value = true
  dureeYears.value = years
  dureeMonths.value = months
  nextTick(() => { isSyncingDuree.value = false })
}

function syncDiagFromDuree() {
  if (isSyncingDuree.value) return
  const ref = dureeRefDate()
  if (isNaN(ref.getTime())) return
  // Défense SEV1 : ne jamais synthétiser de date depuis des refs vidées
  // (années & mois tous nuls) — aucune durée n'est exprimée, la date de début
  // du draft reste telle quelle.
  if ((dureeYears.value ?? 0) === 0 && (dureeMonths.value ?? 0) === 0) return
  let years = dureeYears.value ?? 0
  let months = dureeMonths.value ?? 0
  if (months >= 12) {
    years += Math.floor(months / 12)
    months = months % 12
  }
  const totalMonths = years * 12 + months
  let targetMonth = ref.getMonth() + 1 - totalMonths
  let targetYear = ref.getFullYear()
  while (targetMonth <= 0) {
    targetMonth += 12
    targetYear--
  }
  const ym = `${targetYear}-${String(targetMonth).padStart(2, '0')}`
  if (draftRef.value && ym !== draftRef.value.dateDiagnostic) {
    draftRef.value.dateDiagnostic = ym
  }
}

watch(() => draftRef.value?.dateDiagnostic, syncDureeFromDate)
watch([dureeYears, dureeMonths], syncDiagFromDuree)

// ─── Traitement / Auto surveillance glycémique ─────────────────────
// Pattern Glasgow (parité Facteurs de risque) : 3 buffers locaux +
// collections historisées medicamentsHistory / traitementHabituelHistory /
// surveillanceHistory + collapse + toolbar + table triée + save/edit/cancel/
// delete + emit change. Les scalaires legacy sont seedés une fois en
// history[0] (migration silencieuse).
// Sync durée↔date : années+mois pour ADO/aGLP-1/INSULINE ; années ENTIÈRES
// pour la POMPE (un mois non achevé → année inférieure).

const medsFormOpen = ref(false)
const medsEditingKey = ref<string | null>(null)
const medsBuffer = reactive({
  medicaments: [] as string[],
  adoDateDebut: '',
  adoCommentaire: '',
  glp1DateDebut: '',
  glp1Commentaire: '',
  insulineType: '',
  insulineDateDebut: '',
  insulineCommentaire: '',
  pompeType: '',
  pompeDateDebut: '',
  pompeCommentaire: '',
})

const habFormOpen = ref(false)
const habEditingKey = ref<string | null>(null)
const habBuffer = reactive({
  traitementHabituel: '',
})

const survFormOpen = ref(false)
const survEditingKey = ref<string | null>(null)
const survBuffer = reactive({
  surveillanceCapillaire: '',
  surveillanceMCG: '',
  surveillanceCommentaire: '',
})

/**
 * Modèle de la checkbox-group des médicaments, adossé au buffer (plus au
 * draft stagé) : normalise vers un tableau vide sans rien écrire tant que
 * l'utilisateur ne coche rien.
 */
const traitementMedsModel = computed<string[]>({
  get: () => {
    const m = medsBuffer.medicaments
    return Array.isArray(m) ? m : []
  },
  set: (val: string[]) => {
    medsBuffer.medicaments = val
  },
})

const adoDureeYears = ref<number | null>(null)
const adoDureeMonths = ref<number | null>(null)
const isSyncingAdoDuree = ref(false)

const glp1DureeYears = ref<number | null>(null)
const glp1DureeMonths = ref<number | null>(null)
const isSyncingGlp1Duree = ref(false)

const insulineDureeYears = ref<number | null>(null)
const insulineDureeMonths = ref<number | null>(null)
const isSyncingInsulineDuree = ref(false)

const pompeDureeYears = ref<number | null>(null)
const isSyncingPompeDuree = ref(false)

function syncTreatmentDureeFromDate(
  dateKey: string,
  yearsRef: Ref<number | null>,
  monthsRef: Ref<number | null> | null,
  syncingRef: Ref<boolean>,
) {
  const d = medsBuffer as unknown as Record<string, string>
  const p = parseDiagMonth(d?.[dateKey])
  const ref = dureeRefDate()
  if (!p || isNaN(ref.getTime())) {
    if (!syncingRef.value) {
      yearsRef.value = null
      if (monthsRef) monthsRef.value = null
    }
    return
  }
  syncingRef.value = true
  if (!monthsRef) {
    // POMPE : années ENTIÈRES révolues. Le mois d'anniversaire n'étant pas
    // encore atteint (`p.m > mois de référence`), on retire une année.
    // Ex. début 2024-06, référence 2026-06 → 2 ans (anniversaire révolu).
    const years = ref.getFullYear() - p.y - (p.m > ref.getMonth() + 1 ? 1 : 0)
    yearsRef.value = years < 0 ? null : years
    nextTick(() => { syncingRef.value = false })
    return
  }
  let years = ref.getFullYear() - p.y
  let months = ref.getMonth() + 1 - p.m
  if (months < 0) { years--; months += 12 }
  if (years < 0) {
    // Date de début postérieure à la référence (date d'entrée / aujourd'hui) → durée non rendue
    yearsRef.value = null
    monthsRef.value = null
  } else {
    yearsRef.value = years
    monthsRef.value = months
  }
  nextTick(() => { syncingRef.value = false })
}

function syncTreatmentDateFromDuree(
  dateKey: string,
  yearsRef: Ref<number | null>,
  monthsRef: Ref<number | null> | null,
  syncingRef: Ref<boolean>,
) {
  if (syncingRef.value) return
  const ref = dureeRefDate()
  if (isNaN(ref.getTime())) return
  // Défense SEV1 : refs vidées (médicament décoché → durées remises à zéro ;
  // ou date de début future → clamp) ⇒ aucune durée n'est exprimée. On ne
  // synthétise JAMAIS de date depuis des refs programmatiquement vidées : la
  // date de début du buffer est préservée telle quelle.
  if ((yearsRef.value ?? 0) === 0 && (monthsRef?.value ?? 0) === 0) return
  let ym: string
  if (monthsRef) {
    let years = yearsRef.value ?? 0
    let months = monthsRef.value ?? 0
    if (months >= 12) {
      years += Math.floor(months / 12)
      months = months % 12
    }
    const totalMonths = years * 12 + months
    let targetMonth = ref.getMonth() + 1 - totalMonths
    let targetYear = ref.getFullYear()
    while (targetMonth <= 0) {
      targetMonth += 12
      targetYear--
    }
    ym = `${targetYear}-${String(targetMonth).padStart(2, '0')}`
  } else {
    // POMPE : durée en années entières, mois de début préservé
    const start = new Date(ref)
    start.setFullYear(ref.getFullYear() - (yearsRef.value ?? 0))
    ym = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}`
  }
  const d = medsBuffer as unknown as Record<string, string>
  if (d && ym !== d[dateKey]) {
    d[dateKey] = ym
  }
}

watch(
  () => medsBuffer.adoDateDebut,
  () => syncTreatmentDureeFromDate('adoDateDebut', adoDureeYears, adoDureeMonths, isSyncingAdoDuree),
)
watch([adoDureeYears, adoDureeMonths], () => syncTreatmentDateFromDuree('adoDateDebut', adoDureeYears, adoDureeMonths, isSyncingAdoDuree))
watch(
  () => medsBuffer.glp1DateDebut,
  () => syncTreatmentDureeFromDate('glp1DateDebut', glp1DureeYears, glp1DureeMonths, isSyncingGlp1Duree),
)
watch([glp1DureeYears, glp1DureeMonths], () => syncTreatmentDateFromDuree('glp1DateDebut', glp1DureeYears, glp1DureeMonths, isSyncingGlp1Duree))
watch(
  () => medsBuffer.insulineDateDebut,
  () => syncTreatmentDureeFromDate('insulineDateDebut', insulineDureeYears, insulineDureeMonths, isSyncingInsulineDuree),
)
watch([insulineDureeYears, insulineDureeMonths], () => syncTreatmentDateFromDuree('insulineDateDebut', insulineDureeYears, insulineDureeMonths, isSyncingInsulineDuree))
watch(
  () => medsBuffer.pompeDateDebut,
  () => syncTreatmentDureeFromDate('pompeDateDebut', pompeDureeYears, null, isSyncingPompeDuree),
)
watch(pompeDureeYears, () => syncTreatmentDateFromDuree('pompeDateDebut', pompeDureeYears, null, isSyncingPompeDuree))

// Un médicament décoché → durée du groupe remise à zéro SOUS GARDE `isSyncing*`
// (le watcher inverse durée→date ne doit PAS réécrire la date de début pendant
// ce reset) : le champ date reste dans le buffer, il est simplement masqué tant
// que la case n'est pas re-cochée. L'early-return de syncTreatmentDateFromDuree
// sert de seconde protection (refs toutes nulles → aucune écriture).
watch(() => medsBuffer.medicaments, (meds: unknown) => {
  const list = Array.isArray(meds) ? meds : []
  if (!list.includes('ADO')) {
    isSyncingAdoDuree.value = true
    adoDureeYears.value = null
    adoDureeMonths.value = null
    nextTick(() => { isSyncingAdoDuree.value = false })
  }
  if (!list.includes('aGLP-1')) {
    isSyncingGlp1Duree.value = true
    glp1DureeYears.value = null
    glp1DureeMonths.value = null
    nextTick(() => { isSyncingGlp1Duree.value = false })
  }
  if (!list.includes('INSULINE')) {
    isSyncingInsulineDuree.value = true
    insulineDureeYears.value = null
    insulineDureeMonths.value = null
    nextTick(() => { isSyncingInsulineDuree.value = false })
  }
  if (!list.includes('POMPE')) {
    isSyncingPompeDuree.value = true
    pompeDureeYears.value = null
    nextTick(() => { isSyncingPompeDuree.value = false })
  }
})

// ─── Médicaments : collection + libellés table ───

function medicamentsHistoryArray(): MedicamentsHistoryEntry[] {
  const d = props.data as unknown as Record<string, unknown>
  if (!Array.isArray(d.medicamentsHistory)) d.medicamentsHistory = []
  return d.medicamentsHistory as MedicamentsHistoryEntry[]
}

const sortedMedicamentsHistory = computed(() =>
  [...((props.data.medicamentsHistory || []) as MedicamentsHistoryEntry[])]
    .sort((a, b) => String(b.date).localeCompare(String(a.date))),
)

function medsLabel(entry: MedicamentsHistoryEntry): string {
  const meds = Array.isArray(entry.medicaments) ? entry.medicaments : []
  return meds.length ? meds.join(', ') : '—'
}

function medsAdoDepuis(entry: MedicamentsHistoryEntry): string {
  return entryDepuisDuree(entry.adoDateDebut, entry.date)
}

function medsGlp1Depuis(entry: MedicamentsHistoryEntry): string {
  return entryDepuisDuree(entry.glp1DateDebut, entry.date)
}

function medsInsulineLabel(entry: MedicamentsHistoryEntry): string {
  if (!entry.insulineType && !entry.insulineDateDebut) return '—'
  const depuis = entry.insulineDateDebut ? entryDepuisDuree(entry.insulineDateDebut, entry.date) : ''
  // `entryDepuisDuree` rend '—' quand la date est absente : on ne garde que le type dans ce cas.
  if (!entry.insulineDateDebut) return entry.insulineType || '—'
  if (depuis === '—') return entry.insulineType || '—'
  return `${entry.insulineType ? `${entry.insulineType} — ` : ''}${depuis}`
}

function medsPompeLabel(entry: MedicamentsHistoryEntry): string {
  if (!entry.pompeType && !entry.pompeDateDebut) return '—'
  if (!entry.pompeDateDebut) return entry.pompeType || '—'
  const depuis = entryDepuisDuree(entry.pompeDateDebut, entry.date)
  if (depuis === '—') return entry.pompeType || '—'
  return `${entry.pompeType ? `${entry.pompeType} — ` : ''}${depuis}`
}

function resetMedsBuffer() {
  isSyncingAdoDuree.value = true
  isSyncingGlp1Duree.value = true
  isSyncingInsulineDuree.value = true
  isSyncingPompeDuree.value = true
  adoDureeYears.value = null
  adoDureeMonths.value = null
  glp1DureeYears.value = null
  glp1DureeMonths.value = null
  insulineDureeYears.value = null
  insulineDureeMonths.value = null
  pompeDureeYears.value = null
  nextTick(() => {
    isSyncingAdoDuree.value = false
    isSyncingGlp1Duree.value = false
    isSyncingInsulineDuree.value = false
    isSyncingPompeDuree.value = false
  })
  medsBuffer.medicaments = []
  medsBuffer.adoDateDebut = ''
  medsBuffer.adoCommentaire = ''
  medsBuffer.glp1DateDebut = ''
  medsBuffer.glp1Commentaire = ''
  medsBuffer.insulineType = ''
  medsBuffer.insulineDateDebut = ''
  medsBuffer.insulineCommentaire = ''
  medsBuffer.pompeType = ''
  medsBuffer.pompeDateDebut = ''
  medsBuffer.pompeCommentaire = ''
}

function syncMedsDureesFromBuffer() {
  syncTreatmentDureeFromDate('adoDateDebut', adoDureeYears, adoDureeMonths, isSyncingAdoDuree)
  syncTreatmentDureeFromDate('glp1DateDebut', glp1DureeYears, glp1DureeMonths, isSyncingGlp1Duree)
  syncTreatmentDureeFromDate('insulineDateDebut', insulineDureeYears, insulineDureeMonths, isSyncingInsulineDuree)
  syncTreatmentDureeFromDate('pompeDateDebut', pompeDureeYears, null, isSyncingPompeDuree)
}

function saveMedsEntry() {
  const arr = medicamentsHistoryArray()
  const record = {
    medicaments: [...medsBuffer.medicaments],
    adoDateDebut: medsBuffer.adoDateDebut,
    adoCommentaire: medsBuffer.adoCommentaire,
    glp1DateDebut: medsBuffer.glp1DateDebut,
    glp1Commentaire: medsBuffer.glp1Commentaire,
    insulineType: medsBuffer.insulineType,
    insulineDateDebut: medsBuffer.insulineDateDebut,
    insulineCommentaire: medsBuffer.insulineCommentaire,
    pompeType: medsBuffer.pompeType,
    pompeDateDebut: medsBuffer.pompeDateDebut,
    pompeCommentaire: medsBuffer.pompeCommentaire,
  }
  if (medsEditingKey.value) {
    const idx = arr.findIndex(e => e._key === medsEditingKey.value)
    if (idx !== -1) arr[idx] = { ...arr[idx], ...record }
    medsEditingKey.value = null
  } else {
    arr.push({ _key: generateKey(), date: currentIsoDateTime(), ...record })
  }
  medsFormOpen.value = false
  resetMedsBuffer()
  emit('change')
}

function editMedsEntry(key: string) {
  const entry = (props.data.medicamentsHistory || []).find(e => e._key === key)
  if (!entry) return
  medsEditingKey.value = key
  medsBuffer.medicaments = Array.isArray(entry.medicaments) ? [...entry.medicaments] : []
  medsBuffer.adoDateDebut = entry.adoDateDebut || ''
  medsBuffer.adoCommentaire = entry.adoCommentaire || ''
  medsBuffer.glp1DateDebut = entry.glp1DateDebut || ''
  medsBuffer.glp1Commentaire = entry.glp1Commentaire || ''
  medsBuffer.insulineType = entry.insulineType || ''
  medsBuffer.insulineDateDebut = entry.insulineDateDebut || ''
  medsBuffer.insulineCommentaire = entry.insulineCommentaire || ''
  medsBuffer.pompeType = entry.pompeType || ''
  medsBuffer.pompeDateDebut = entry.pompeDateDebut || ''
  medsBuffer.pompeCommentaire = entry.pompeCommentaire || ''
  syncMedsDureesFromBuffer()
  medsFormOpen.value = true
}

function cancelMedsEdit() {
  medsEditingKey.value = null
  medsFormOpen.value = false
  resetMedsBuffer()
}

async function deleteMedsEntry(key: string) {
  try {
    await ElMessageBox.confirm('Supprimer ce traitement ?', 'Confirmation', {
      type: 'warning', confirmButtonText: 'Supprimer', cancelButtonText: 'Annuler',
    })
  } catch { return }
  const arr = medicamentsHistoryArray()
  const idx = arr.findIndex(e => e._key === key)
  if (idx !== -1) arr.splice(idx, 1)
  emit('change')
}

// ─── Traitement habituel : collection ───

function traitementHabituelHistoryArray(): TraitementHabituelHistoryEntry[] {
  const d = props.data as unknown as Record<string, unknown>
  if (!Array.isArray(d.traitementHabituelHistory)) d.traitementHabituelHistory = []
  return d.traitementHabituelHistory as TraitementHabituelHistoryEntry[]
}

const sortedTraitementHabituelHistory = computed(() =>
  [...((props.data.traitementHabituelHistory || []) as TraitementHabituelHistoryEntry[])]
    .sort((a, b) => String(b.date).localeCompare(String(a.date))),
)

function saveHabEntry() {
  const arr = traitementHabituelHistoryArray()
  const record = { traitementHabituel: habBuffer.traitementHabituel }
  if (habEditingKey.value) {
    const idx = arr.findIndex(e => e._key === habEditingKey.value)
    if (idx !== -1) arr[idx] = { ...arr[idx], ...record }
    habEditingKey.value = null
  } else {
    arr.push({ _key: generateKey(), date: currentIsoDateTime(), ...record })
  }
  habFormOpen.value = false
  habBuffer.traitementHabituel = ''
  emit('change')
}

function editHabEntry(key: string) {
  const entry = (props.data.traitementHabituelHistory || []).find(e => e._key === key)
  if (!entry) return
  habEditingKey.value = key
  habBuffer.traitementHabituel = entry.traitementHabituel || ''
  habFormOpen.value = true
}

function cancelHabEdit() {
  habEditingKey.value = null
  habFormOpen.value = false
  habBuffer.traitementHabituel = ''
}

async function deleteHabEntry(key: string) {
  try {
    await ElMessageBox.confirm('Supprimer ce traitement habituel ?', 'Confirmation', {
      type: 'warning', confirmButtonText: 'Supprimer', cancelButtonText: 'Annuler',
    })
  } catch { return }
  const arr = traitementHabituelHistoryArray()
  const idx = arr.findIndex(e => e._key === key)
  if (idx !== -1) arr.splice(idx, 1)
  emit('change')
}

// ─── Surveillance : collection ───

function surveillanceHistoryArray(): SurveillanceHistoryEntry[] {
  const d = props.data as unknown as Record<string, unknown>
  if (!Array.isArray(d.surveillanceHistory)) d.surveillanceHistory = []
  return d.surveillanceHistory as SurveillanceHistoryEntry[]
}

const sortedSurveillanceHistory = computed(() =>
  [...((props.data.surveillanceHistory || []) as SurveillanceHistoryEntry[])]
    .sort((a, b) => String(b.date).localeCompare(String(a.date))),
)

function saveSurvEntry() {
  const arr = surveillanceHistoryArray()
  const record = {
    surveillanceCapillaire: survBuffer.surveillanceCapillaire,
    surveillanceMCG: survBuffer.surveillanceMCG,
    surveillanceCommentaire: survBuffer.surveillanceCommentaire,
  }
  if (survEditingKey.value) {
    const idx = arr.findIndex(e => e._key === survEditingKey.value)
    if (idx !== -1) arr[idx] = { ...arr[idx], ...record }
    survEditingKey.value = null
  } else {
    arr.push({ _key: generateKey(), date: currentIsoDateTime(), ...record })
  }
  survFormOpen.value = false
  survBuffer.surveillanceCapillaire = ''
  survBuffer.surveillanceMCG = ''
  survBuffer.surveillanceCommentaire = ''
  emit('change')
}

function editSurvEntry(key: string) {
  const entry = (props.data.surveillanceHistory || []).find(e => e._key === key)
  if (!entry) return
  survEditingKey.value = key
  survBuffer.surveillanceCapillaire = entry.surveillanceCapillaire || ''
  survBuffer.surveillanceMCG = entry.surveillanceMCG || ''
  survBuffer.surveillanceCommentaire = entry.surveillanceCommentaire || ''
  survFormOpen.value = true
}

function cancelSurvEdit() {
  survEditingKey.value = null
  survFormOpen.value = false
  survBuffer.surveillanceCapillaire = ''
  survBuffer.surveillanceMCG = ''
  survBuffer.surveillanceCommentaire = ''
}

async function deleteSurvEntry(key: string) {
  try {
    await ElMessageBox.confirm('Supprimer cette surveillance ?', 'Confirmation', {
      type: 'warning', confirmButtonText: 'Supprimer', cancelButtonText: 'Annuler',
    })
  } catch { return }
  const arr = surveillanceHistoryArray()
  const idx = arr.findIndex(e => e._key === key)
  if (idx !== -1) arr.splice(idx, 1)
  emit('change')
}

// ─── Seed legacy scalaires -> history[0] (transition, silencieux) ───

function isMedicamentsLegacyNonEmpty(): boolean {
  const d = props.data
  return !!((Array.isArray(d.medicaments) && d.medicaments.length)
    || d.adoDateDebut || !isRichTextEmpty(d.adoCommentaire)
    || d.glp1DateDebut || !isRichTextEmpty(d.glp1Commentaire)
    || d.insulineType || d.insulineDateDebut || !isRichTextEmpty(d.insulineCommentaire)
    || d.pompeType || d.pompeDateDebut || !isRichTextEmpty(d.pompeCommentaire))
}

function isTraitementHabituelLegacyNonEmpty(): boolean {
  return !isRichTextEmpty(props.data.traitementHabituel)
}

function isSurveillanceLegacyNonEmpty(): boolean {
  const d = props.data
  return !!(d.surveillanceCapillaire || d.surveillanceMCG || !isRichTextEmpty(d.surveillanceCommentaire))
}

function seedMedicamentsHistoryOnce() {
  const arr = medicamentsHistoryArray()
  if (arr.length || !isMedicamentsLegacyNonEmpty()) return
  const d = props.data
  arr.push({
    _key: generateKey(),
    date: currentIsoDateTime(),
    medicaments: Array.isArray(d.medicaments) ? [...d.medicaments] : [],
    adoDateDebut: d.adoDateDebut || '',
    adoCommentaire: d.adoCommentaire || '',
    glp1DateDebut: d.glp1DateDebut || '',
    glp1Commentaire: d.glp1Commentaire || '',
    insulineType: d.insulineType || '',
    insulineDateDebut: d.insulineDateDebut || '',
    insulineCommentaire: d.insulineCommentaire || '',
    pompeType: d.pompeType || '',
    pompeDateDebut: d.pompeDateDebut || '',
    pompeCommentaire: d.pompeCommentaire || '',
  })
}

function seedTraitementHabituelHistoryOnce() {
  const arr = traitementHabituelHistoryArray()
  if (arr.length || !isTraitementHabituelLegacyNonEmpty()) return
  arr.push({
    _key: generateKey(),
    date: currentIsoDateTime(),
    traitementHabituel: props.data.traitementHabituel || '',
  })
}

function seedSurveillanceHistoryOnce() {
  const arr = surveillanceHistoryArray()
  if (arr.length || !isSurveillanceLegacyNonEmpty()) return
  const d = props.data
  arr.push({
    _key: generateKey(),
    date: currentIsoDateTime(),
    surveillanceCapillaire: d.surveillanceCapillaire || '',
    surveillanceMCG: d.surveillanceMCG || '',
    surveillanceCommentaire: d.surveillanceCommentaire || '',
  })
}

function exposureDuration(dateDebut: string): { y: number; m: number } | null {
  const p = parseDiagMonth(dateDebut)
  const ref = dureeRefDate()
  if (!p || isNaN(ref.getTime())) return null
  let years = ref.getFullYear() - p.y
  let months = ref.getMonth() + 1 - p.m
  if (months < 0) { years--; months += 12 }
  // Date de début postérieure à la référence → exposition non rendue (PA '—', durée '')
  if (years < 0) return null
  return { y: years, m: months }
}

/**
 * Durée « n an(s) / m mois » — équivalent de `expoLabel` côté export électron,
 * pour la parité du preview : ADO/aGLP-1/INSULINE affichent désormais leur
 * durée comme la POMPE et comme le bloc « Traitement / Autosurveillance ».
 * Retourne '' quand la date est absente ou postérieure à la référence.
 */
function durationLabelOf(dur: { y: number; m: number } | null): string {
  if (!dur) return ''
  const yTxt = dur.y > 0 ? `${dur.y} ${dur.y > 1 ? 'ans' : 'an'}` : ''
  const mTxt = dur.m > 0 ? `${dur.m} mois` : ''
  return [yTxt, mTxt].filter(Boolean).join(' ')
}

/**
 * Computes the pack-years ("paquets-année") for a given draft/data record.
 * Returns an empty string '—' when the exposure is incomplete (no active
 * consumption, missing quantity / unit / rythme / début or zero duration).
 */
function facteursPAOf(input: Record<string, any> | null | undefined): string {
  const d = input || {}
  if (d.tabac !== 'Oui') return '—'
  const q = d.tabacQuantite
  if (q == null || q <= 0) return '—'
  let qteJour: number | null = null
  if (d.tabacDuree === 'j') qteJour = q
  else if (d.tabacDuree === 'semaine') qteJour = q / 7
  else if (d.tabacDuree === 'mois') qteJour = q / 30
  if (qteJour == null) return '—'
  const dur = exposureDuration(d.tabacDateDebut)
  if (!dur) return '—'
  const annees = dur.y + dur.m / 12
  if (annees <= 0) return '—'
  let pa: number | null = null
  if (d.tabacUnite === 'cigarette') pa = (qteJour / 20) * annees
  else if (d.tabacUnite === 'paquet') pa = qteJour * annees
  if (pa == null) return '—'
  const rounded = Math.round(pa * 10) / 10
  return `${rounded} PA`
}

// ─── Historiques multi-saisies Tabac / Substance / Anthropométrie ───
// Pattern Glasgow (BilanInitialTab L71-175) : buffer de saisie local +
// collection historisée [{ _key, date now, champs métier }] + collapse form +
// table triée + save/edit/cancel/delete + emit change. Les scalaires legacy
// ne sont plus affichés ; ils sont seedés une fois en history[0] (migration).

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
  if (isNaN(d.getTime())) return isoStr
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
    + ' ' + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

/** Durée { y, m } entre un mois de début `YYYY-MM` et une date de référence. */
function durationBetween(startYm: string, refDate: Date): { y: number; m: number } | null {
  const p = parseDiagMonth(startYm)
  if (!p || isNaN(refDate.getTime())) return null
  let years = refDate.getFullYear() - p.y
  let months = refDate.getMonth() + 1 - p.m
  if (months < 0) { years--; months += 12 }
  if (years < 0) return null
  return { y: years, m: months }
}

/** Date de référence d'une entrée historique (repli : date d'entrée). */
function refDateOfEntry(entryDate: string): Date {
  const d = entryDate ? new Date(entryDate) : new Date(NaN)
  return isNaN(d.getTime()) ? dureeRefDate() : d
}

/**
 * PA (paquets-année) d'une entrée tabac avec la date de mesure comme
 * référence d'exposition (parité `paSeriesExtract` de parameter-history).
 */
function tabacEntryPA(entry: Record<string, any>): string {
  if (entry.tabac !== 'Oui') return '—'
  const q = Number(entry.tabacQuantite)
  if (!Number.isFinite(q) || q <= 0) return '—'
  let qteJour: number | null = null
  if (entry.tabacDuree === 'j') qteJour = q
  else if (entry.tabacDuree === 'semaine') qteJour = q / 7
  else if (entry.tabacDuree === 'mois') qteJour = q / 30
  if (qteJour == null) return '—'
  if (!parseDiagMonth(entry.tabacDateDebut)) return '—'
  const dur = durationBetween(entry.tabacDateDebut, refDateOfEntry(entry.date))
  if (!dur) return '—'
  const annees = dur.y + dur.m / 12
  if (annees <= 0) return '—'
  let pa: number | null = null
  if (entry.tabacUnite === 'cigarette') pa = (qteJour / 20) * annees
  else if (entry.tabacUnite === 'paquet') pa = qteJour * annees
  if (pa == null || !Number.isFinite(pa)) return '—'
  return `${Math.round(pa * 10) / 10} PA`
}

/** Libellé « depuis MM/YYYY (durée) » relatif à la date de mesure. */
function entryDepuisDuree(dateDebut: string, entryDate: string): string {
  if (!dateDebut) return '—'
  const dur = durationBetween(dateDebut, refDateOfEntry(entryDate))
  const label = durationLabelOf(dur)
  return `depuis ${formatMonth(dateDebut)}${label ? ` (${label})` : ''}`
}

function tabacEntryDepuisDuree(entry: { tabacDateDebut: string; date: string }): string {
  return entryDepuisDuree(entry.tabacDateDebut, entry.date)
}

function substanceEntryDepuisDuree(entry: { substanceDateDebut: string; date: string }): string {
  return entryDepuisDuree(entry.substanceDateDebut, entry.date)
}

// ─── Tabac : buffer + collection ───

const tabacFormOpen = ref(false)
const tabacEditingKey = ref<string | null>(null)
const tabacBuffer = reactive({
  tabac: '',
  tabacQuantite: null as number | null,
  tabacUnite: '',
  tabacDuree: '',
  tabacDateDebut: '',
  tabacCommentaire: '',
})

function tabacHistoryArray(): TabacHistoryEntry[] {
  const d = props.data as unknown as Record<string, unknown>
  if (!Array.isArray(d.tabacHistory)) d.tabacHistory = []
  return d.tabacHistory as TabacHistoryEntry[]
}

const sortedTabacHistory = computed(() =>
  [...((props.data.tabacHistory || []) as TabacHistoryEntry[])]
    .sort((a, b) => String(b.date).localeCompare(String(a.date))),
)

const tabacBufferPA = computed(() => facteursPAOf(tabacBuffer))
const tabacBufferDepuisDuree = computed(() => debutDureeLabel(tabacBuffer.tabacDateDebut) ?? '—')

// ─── Durée tabac ans/mois ↔ Date début (sync bidirectionnelle, parité traitement ADO) ───
const tabacDureeYears = ref<number | null>(null)
const tabacDureeMonths = ref<number | null>(null)
const isSyncingTabacDuree = ref(false)

function syncTabacDureeFromDate() {
  const p = parseDiagMonth(tabacBuffer.tabacDateDebut)
  const refDate = dureeRefDate()
  if (!p || isNaN(refDate.getTime())) {
    if (!isSyncingTabacDuree.value) {
      tabacDureeYears.value = null
      tabacDureeMonths.value = null
    }
    return
  }
  isSyncingTabacDuree.value = true
  let years = refDate.getFullYear() - p.y
  let months = refDate.getMonth() + 1 - p.m
  if (months < 0) { years--; months += 12 }
  if (years < 0) {
    tabacDureeYears.value = null
    tabacDureeMonths.value = null
  } else {
    tabacDureeYears.value = years
    tabacDureeMonths.value = months
  }
  nextTick(() => { isSyncingTabacDuree.value = false })
}

function syncTabacDateFromDuree() {
  if (isSyncingTabacDuree.value) return
  const refDate = dureeRefDate()
  if (isNaN(refDate.getTime())) return
  // Défense SEV1 : refs vidées (statut Non / reset) ⇒ aucune durée exprimée,
  // on ne synthétise JAMAIS de date : la date de début du buffer est préservée.
  if ((tabacDureeYears.value ?? 0) === 0 && (tabacDureeMonths.value ?? 0) === 0) return
  let years = tabacDureeYears.value ?? 0
  let months = tabacDureeMonths.value ?? 0
  if (months >= 12) {
    years += Math.floor(months / 12)
    months = months % 12
  }
  const totalMonths = years * 12 + months
  let targetMonth = refDate.getMonth() + 1 - totalMonths
  let targetYear = refDate.getFullYear()
  while (targetMonth <= 0) {
    targetMonth += 12
    targetYear--
  }
  const ym = `${targetYear}-${String(targetMonth).padStart(2, '0')}`
  if (ym !== tabacBuffer.tabacDateDebut) {
    tabacBuffer.tabacDateDebut = ym
  }
}

watch(() => tabacBuffer.tabacDateDebut, syncTabacDureeFromDate)
watch([tabacDureeYears, tabacDureeMonths], syncTabacDateFromDuree)
// Statut Non (ou vidé) → durées remises à zéro SOUS GARDE (le watcher inverse
// durée→date ne doit PAS réécrire la date pendant ce reset).
watch(() => tabacBuffer.tabac, (statut: unknown) => {
  if (statut !== 'Oui') {
    isSyncingTabacDuree.value = true
    tabacDureeYears.value = null
    tabacDureeMonths.value = null
    nextTick(() => { isSyncingTabacDuree.value = false })
  }
})

function resetTabacBuffer() {
  isSyncingTabacDuree.value = true
  tabacDureeYears.value = null
  tabacDureeMonths.value = null
  nextTick(() => { isSyncingTabacDuree.value = false })
  tabacBuffer.tabac = ''
  tabacBuffer.tabacQuantite = null
  tabacBuffer.tabacUnite = ''
  tabacBuffer.tabacDuree = ''
  tabacBuffer.tabacDateDebut = ''
  tabacBuffer.tabacCommentaire = ''
}

function saveTabacEntry() {
  const arr = tabacHistoryArray()
  const record = {
    tabac: tabacBuffer.tabac,
    tabacQuantite: tabacBuffer.tabacQuantite,
    tabacUnite: tabacBuffer.tabacUnite,
    tabacDuree: tabacBuffer.tabacDuree,
    tabacDateDebut: tabacBuffer.tabacDateDebut,
    tabacCommentaire: tabacBuffer.tabacCommentaire,
  }
  if (tabacEditingKey.value) {
    const idx = arr.findIndex(e => e._key === tabacEditingKey.value)
    if (idx !== -1) arr[idx] = { ...arr[idx], ...record }
    tabacEditingKey.value = null
  } else {
    arr.push({ _key: generateKey(), date: currentIsoDateTime(), ...record })
  }
  tabacFormOpen.value = false
  resetTabacBuffer()
  emit('change')
}

function editTabacEntry(key: string) {
  const entry = (props.data.tabacHistory || []).find(e => e._key === key)
  if (!entry) return
  tabacEditingKey.value = key
  tabacBuffer.tabac = entry.tabac
  tabacBuffer.tabacQuantite = entry.tabacQuantite
  tabacBuffer.tabacUnite = entry.tabacUnite
  tabacBuffer.tabacDuree = entry.tabacDuree
  tabacBuffer.tabacDateDebut = entry.tabacDateDebut
  tabacBuffer.tabacCommentaire = entry.tabacCommentaire
  syncTabacDureeFromDate()
  tabacFormOpen.value = true
}

function cancelTabacEdit() {
  tabacEditingKey.value = null
  tabacFormOpen.value = false
  resetTabacBuffer()
}

async function deleteTabacEntry(key: string) {
  try {
    await ElMessageBox.confirm('Supprimer cette consommation ?', 'Confirmation', {
      type: 'warning', confirmButtonText: 'Supprimer', cancelButtonText: 'Annuler',
    })
  } catch { return }
  const arr = tabacHistoryArray()
  const idx = arr.findIndex(e => e._key === key)
  if (idx !== -1) arr.splice(idx, 1)
  emit('change')
}

// ─── Substance : buffer + collection ───

const substanceFormOpen = ref(false)
const substanceEditingKey = ref<string | null>(null)
const substanceBuffer = reactive({
  substance: '',
  substancePrecision: '',
  substanceQuantite: null as number | null,
  substanceUnite: '',
  substanceDuree: '',
  substanceDateDebut: '',
  substanceCommentaire: '',
})

function substanceHistoryArray(): SubstanceHistoryEntry[] {
  const d = props.data as unknown as Record<string, unknown>
  if (!Array.isArray(d.substanceHistory)) d.substanceHistory = []
  return d.substanceHistory as SubstanceHistoryEntry[]
}

const sortedSubstanceHistory = computed(() =>
  [...((props.data.substanceHistory || []) as SubstanceHistoryEntry[])]
    .sort((a, b) => String(b.date).localeCompare(String(a.date))),
)

const substanceBufferDepuisDuree = computed(() => debutDureeLabel(substanceBuffer.substanceDateDebut) ?? '—')
const substanceBufferQuantiteLabel = computed(() => substanceQuantiteLabel(substanceBuffer))

// ─── Durée substance ans/mois ↔ Date début (sync bidirectionnelle, parité tabac/ADO) ───
const substanceDureeYears = ref<number | null>(null)
const substanceDureeMonths = ref<number | null>(null)
const isSyncingSubstanceDuree = ref(false)

function syncSubstanceDureeFromDate() {
  const p = parseDiagMonth(substanceBuffer.substanceDateDebut)
  const refDate = dureeRefDate()
  if (!p || isNaN(refDate.getTime())) {
    if (!isSyncingSubstanceDuree.value) {
      substanceDureeYears.value = null
      substanceDureeMonths.value = null
    }
    return
  }
  isSyncingSubstanceDuree.value = true
  let years = refDate.getFullYear() - p.y
  let months = refDate.getMonth() + 1 - p.m
  if (months < 0) { years--; months += 12 }
  if (years < 0) {
    substanceDureeYears.value = null
    substanceDureeMonths.value = null
  } else {
    substanceDureeYears.value = years
    substanceDureeMonths.value = months
  }
  nextTick(() => { isSyncingSubstanceDuree.value = false })
}

function syncSubstanceDateFromDuree() {
  if (isSyncingSubstanceDuree.value) return
  const refDate = dureeRefDate()
  if (isNaN(refDate.getTime())) return
  // Défense SEV1 : refs vidées (substance vidée / reset) ⇒ aucune durée exprimée,
  // on ne synthétise JAMAIS de date : la date de début du buffer est préservée.
  if ((substanceDureeYears.value ?? 0) === 0 && (substanceDureeMonths.value ?? 0) === 0) return
  let years = substanceDureeYears.value ?? 0
  let months = substanceDureeMonths.value ?? 0
  if (months >= 12) {
    years += Math.floor(months / 12)
    months = months % 12
  }
  const totalMonths = years * 12 + months
  let targetMonth = refDate.getMonth() + 1 - totalMonths
  let targetYear = refDate.getFullYear()
  while (targetMonth <= 0) {
    targetMonth += 12
    targetYear--
  }
  const ym = `${targetYear}-${String(targetMonth).padStart(2, '0')}`
  if (ym !== substanceBuffer.substanceDateDebut) {
    substanceBuffer.substanceDateDebut = ym
  }
}

watch(() => substanceBuffer.substanceDateDebut, syncSubstanceDureeFromDate)
watch([substanceDureeYears, substanceDureeMonths], syncSubstanceDateFromDuree)
// Substance vidée → durées remises à zéro SOUS GARDE (le watcher inverse
// durée→date ne doit PAS réécrire la date pendant ce reset).
watch(() => substanceBuffer.substance, (val: unknown) => {
  if (!val) {
    isSyncingSubstanceDuree.value = true
    substanceDureeYears.value = null
    substanceDureeMonths.value = null
    nextTick(() => { isSyncingSubstanceDuree.value = false })
  }
})

function resetSubstanceBuffer() {
  isSyncingSubstanceDuree.value = true
  substanceDureeYears.value = null
  substanceDureeMonths.value = null
  nextTick(() => { isSyncingSubstanceDuree.value = false })
  substanceBuffer.substance = ''
  substanceBuffer.substancePrecision = ''
  substanceBuffer.substanceQuantite = null
  substanceBuffer.substanceUnite = ''
  substanceBuffer.substanceDuree = ''
  substanceBuffer.substanceDateDebut = ''
  substanceBuffer.substanceCommentaire = ''
}

function saveSubstanceEntry() {
  const arr = substanceHistoryArray()
  const record = {
    substance: substanceBuffer.substance,
    substancePrecision: substanceBuffer.substancePrecision,
    substanceQuantite: substanceBuffer.substanceQuantite,
    substanceUnite: substanceBuffer.substanceUnite,
    substanceDuree: substanceBuffer.substanceDuree,
    substanceDateDebut: substanceBuffer.substanceDateDebut,
    substanceCommentaire: substanceBuffer.substanceCommentaire,
  }
  if (substanceEditingKey.value) {
    const idx = arr.findIndex(e => e._key === substanceEditingKey.value)
    if (idx !== -1) arr[idx] = { ...arr[idx], ...record }
    substanceEditingKey.value = null
  } else {
    arr.push({ _key: generateKey(), date: currentIsoDateTime(), ...record })
  }
  substanceFormOpen.value = false
  resetSubstanceBuffer()
  emit('change')
}

function editSubstanceEntry(key: string) {
  const entry = (props.data.substanceHistory || []).find(e => e._key === key)
  if (!entry) return
  substanceEditingKey.value = key
  substanceBuffer.substance = entry.substance
  substanceBuffer.substancePrecision = entry.substancePrecision
  substanceBuffer.substanceQuantite = entry.substanceQuantite
  substanceBuffer.substanceUnite = entry.substanceUnite
  substanceBuffer.substanceDuree = entry.substanceDuree
  substanceBuffer.substanceDateDebut = entry.substanceDateDebut
  substanceBuffer.substanceCommentaire = entry.substanceCommentaire
  syncSubstanceDureeFromDate()
  substanceFormOpen.value = true
}

function cancelSubstanceEdit() {
  substanceEditingKey.value = null
  substanceFormOpen.value = false
  resetSubstanceBuffer()
}

async function deleteSubstanceEntry(key: string) {
  try {
    await ElMessageBox.confirm('Supprimer cette prise ?', 'Confirmation', {
      type: 'warning', confirmButtonText: 'Supprimer', cancelButtonText: 'Annuler',
    })
  } catch { return }
  const arr = substanceHistoryArray()
  const idx = arr.findIndex(e => e._key === key)
  if (idx !== -1) arr.splice(idx, 1)
  emit('change')
}

// ─── Seed legacy scalaires -> history[0] (transition, silencieux) ───

function isTabacLegacyNonEmpty(): boolean {
  const d = props.data
  return !!(d.tabac || d.tabacQuantite != null || d.tabacUnite || d.tabacDuree
    || d.tabacDateDebut || !isRichTextEmpty(d.tabacCommentaire))
}

function isSubstanceLegacyNonEmpty(): boolean {
  const d = props.data
  return !!(d.substance || d.substancePrecision || d.substanceQuantite != null
    || d.substanceUnite || d.substanceDuree || d.substanceDateDebut
    || !isRichTextEmpty(d.substanceCommentaire))
}

function seedTabacHistoryOnce() {
  const arr = tabacHistoryArray()
  if (arr.length || !isTabacLegacyNonEmpty()) return
  const d = props.data
  arr.push({
    _key: generateKey(),
    date: currentIsoDateTime(),
    tabac: d.tabac || '',
    tabacQuantite: d.tabacQuantite ?? null,
    tabacUnite: d.tabacUnite || '',
    tabacDuree: d.tabacDuree || '',
    tabacDateDebut: d.tabacDateDebut || '',
    tabacCommentaire: d.tabacCommentaire || '',
  })
}

function seedSubstanceHistoryOnce() {
  const arr = substanceHistoryArray()
  if (arr.length || !isSubstanceLegacyNonEmpty()) return
  const d = props.data
  arr.push({
    _key: generateKey(),
    date: currentIsoDateTime(),
    substance: d.substance || '',
    substancePrecision: d.substancePrecision || '',
    substanceQuantite: d.substanceQuantite ?? null,
    substanceUnite: d.substanceUnite || '',
    substanceDuree: d.substanceDuree || '',
    substanceDateDebut: d.substanceDateDebut || '',
    substanceCommentaire: d.substanceCommentaire || '',
  })
}

// ─── Anthropométrie : buffer + collection partagée vitalSignsHistory ───

const anthropoFormOpen = ref(false)
const anthropoEditingKey = ref<string | null>(null)
const anthropoBuffer = reactive({
  poids: null as number | null,
  taille: null as number | null,
})
/** Repli local quand la prop partagée `bilanInitial` est absente (tests legacy). */
const anthropoLocalHistory = ref<VitalSignsHistoryEntry[]>([])

function anthropoHistoryArray(): VitalSignsHistoryEntry[] {
  const b = props.bilanInitial
  if (b) {
    if (!Array.isArray(b.vitalSignsHistory)) b.vitalSignsHistory = []
    return b.vitalSignsHistory
  }
  return anthropoLocalHistory.value
}

const sortedAnthropoHistory = computed(() => {
  const src = props.bilanInitial?.vitalSignsHistory ?? anthropoLocalHistory.value
  return [...(src || [])].sort((a, b) => String(b.date).localeCompare(String(a.date)))
})

const anthropoBufferImc = computed(() => {
  const v = calcIMC(anthropoBuffer.poids, anthropoBuffer.taille)
  return v != null ? String(v) : '—'
})

function anthropoEntryImc(entry: { poids: number | null; taille: number | null }) {
  return calcIMC(entry.poids, entry.taille)
}

function saveAnthropoEntry() {
  const arr = anthropoHistoryArray()
  if (anthropoEditingKey.value) {
    // Fusion : les autres constantes de l'entrée (TA, FC, T°, ...) saisies
    // via BilanInitialTab sont préservées — seule poids/taille est réécrite.
    const idx = arr.findIndex(e => e._key === anthropoEditingKey.value)
    if (idx !== -1) arr[idx] = { ...arr[idx], poids: anthropoBuffer.poids, taille: anthropoBuffer.taille }
    anthropoEditingKey.value = null
  } else {
    arr.push({
      _key: generateKey(),
      date: currentIsoDateTime(),
      taSystolique: null,
      taDiastolique: null,
      frequenceCardiaque: null,
      temperature: null,
      glycemie: null,
      cetonurie: null,
      glucosurie: null,
      cetonemie: null,
      poids: anthropoBuffer.poids,
      taille: anthropoBuffer.taille,
    })
  }
  anthropoFormOpen.value = false
  anthropoBuffer.poids = null
  anthropoBuffer.taille = null
  emit('change')
}

function editAnthropoEntry(key: string) {
  const src = props.bilanInitial?.vitalSignsHistory ?? anthropoLocalHistory.value
  const entry = (src || []).find(e => e._key === key)
  if (!entry) return
  anthropoEditingKey.value = key
  anthropoBuffer.poids = entry.poids
  anthropoBuffer.taille = entry.taille
  anthropoFormOpen.value = true
}

function cancelAnthropoEdit() {
  anthropoEditingKey.value = null
  anthropoFormOpen.value = false
  anthropoBuffer.poids = null
  anthropoBuffer.taille = null
}

async function deleteAnthropoEntry(key: string) {
  try {
    await ElMessageBox.confirm('Supprimer cette mesure ?', 'Confirmation', {
      type: 'warning', confirmButtonText: 'Supprimer', cancelButtonText: 'Annuler',
    })
  } catch { return }
  const arr = anthropoHistoryArray()
  const idx = arr.findIndex(e => e._key === key)
  if (idx !== -1) arr.splice(idx, 1)
  emit('change')
}

function isAnthropoLegacyNonEmpty(): boolean {
  const ep = props.examenPhysique
  return ep?.poids != null || ep?.taille != null
}

function seedAnthropoHistoryOnce() {
  const arr = anthropoHistoryArray()
  if (arr.length || !isAnthropoLegacyNonEmpty()) return
  const ep = props.examenPhysique
  arr.push({
    _key: generateKey(),
    date: currentIsoDateTime(),
    taSystolique: null,
    taDiastolique: null,
    frequenceCardiaque: null,
    temperature: null,
    glycemie: null,
    cetonurie: null,
    glucosurie: null,
    cetonemie: null,
    poids: ep?.poids ?? null,
    taille: ep?.taille ?? null,
  })
}

onMounted(() => {
  seedTabacHistoryOnce()
  seedSubstanceHistoryOnce()
  seedAnthropoHistoryOnce()
  seedMedicamentsHistoryOnce()
  seedTraitementHabituelHistoryOnce()
  seedSurveillanceHistoryOnce()
})

function dfgValueOf(creatininemie: number | null): number | null {
  return calcDFG(creatininemie, props.age, props.sexe)
}

function dfgDisplayOf(creatininemie: number | null): string {
  const v = dfgValueOf(creatininemie)
  return v != null ? String(v) : '—'
}

function stadeOf(dfg: number | null): string {
  return calcStadeIR(dfg)
}

function formatMonth(ym: string): string {
  const parts = ym.split('-')
  if (parts.length !== 2 || !parts[0] || !parts[1]) return ym
  return `${parts[1]}/${parts[0]}`
}

const historiquePreviewFields = computed<FormPreviewField[]>(() => {
  const d = props.data
  return [
    { label: 'Date du diagnostic', value: formatMonth(d.dateDiagnostic), key: `${FIELD_PREFIX}.dateDiagnostic`, updatedAt: metaFor(`${FIELD_PREFIX}.dateDiagnostic`), tracked: !!props.fieldMeta },
    { label: 'Durée d\'évolution', value: dureeOf(d.dateDiagnostic) !== '—' ? dureeOf(d.dateDiagnostic) : null, key: `${FIELD_PREFIX}.dateDiagnostic`, updatedAt: metaFor(`${FIELD_PREFIX}.dateDiagnostic`), tracked: !!props.fieldMeta },
    { label: 'Type de diabète', value: d.typeDiabete ? (d.typeDiabete === 'Autre' && d.typeDiabeteAutre ? `Autre (${d.typeDiabeteAutre})` : d.typeDiabete) : null, key: `${FIELD_PREFIX}.typeDiabete`, updatedAt: metaFor(`${FIELD_PREFIX}.typeDiabete`), tracked: !!props.fieldMeta },
    { label: 'Anticorps', value: d.anticorps ? d.anticorps : null, key: `${FIELD_PREFIX}.anticorps`, updatedAt: metaFor(`${FIELD_PREFIX}.anticorps`), tracked: !!props.fieldMeta },
    { label: 'Type d\'anticorps', value: d.typeAnticorps ? d.typeAnticorps : null, key: `${FIELD_PREFIX}.typeAnticorps`, updatedAt: metaFor(`${FIELD_PREFIX}.typeAnticorps`), tracked: !!props.fieldMeta },
    { label: 'Circonstances de découverte', value: isRichTextEmpty(d.circonstanceDecouverte) ? undefined : d.circonstanceDecouverte, rich: true, key: `${FIELD_PREFIX}.circonstanceDecouverte`, updatedAt: metaFor(`${FIELD_PREFIX}.circonstanceDecouverte`), tracked: !!props.fieldMeta },
  ]
})

function tabacRythmeSuffix(rythme: string): string {
  if (rythme === 'j') return '/jour'
  if (rythme === 'semaine') return '/semaine'
  if (rythme === 'mois') return '/mois'
  return ''
}

function tabacUniteLabel(unite: string): string {
  if (unite === 'cigarette') return 'cigarette(s)'
  if (unite === 'paquet') return 'paquet(s)'
  return unite || ''
}

function tabacQuantiteLabel(d: Record<string, any>): string | null {
  if (d.tabacQuantite == null || d.tabacQuantite === '') return null
  const unite = tabacUniteLabel(d.tabacUnite)
  const rythme = tabacRythmeSuffix(d.tabacDuree)
  return `${d.tabacQuantite}${unite ? ` ${unite}` : ''}${rythme ? ` ${rythme}` : ''}`.trim() || null
}

function substanceQuantiteLabel(d: Record<string, any>): string | null {
  if (d.substanceQuantite == null || d.substanceQuantite === '') return null
  const rythme = tabacRythmeSuffix(d.substanceDuree)
  const unite = d.substanceUnite || ''
  return `${d.substanceQuantite}${unite ? ` ${unite}` : ''}${rythme ? ` ${rythme}` : ''}`.trim() || null
}

function debutDureeLabel(dateDebut: string): string | null {
  if (!dateDebut) return null
  const dur = durationLabelOf(exposureDuration(dateDebut))
  return `depuis ${formatMonth(dateDebut)}${dur ? ` (${dur})` : ''}`
}

const facteursPreviewFields = computed<FormPreviewField[]>(() => {
  const d = props.data
  return [
    { label: 'Dyslipidémie', value: d.dyslipidemie ? 'Oui' : null, key: `${FIELD_PREFIX}.dyslipidemie`, updatedAt: metaFor(`${FIELD_PREFIX}.dyslipidemie`), tracked: !!props.fieldMeta },
    { label: 'HTA', value: d.hta ? 'Oui' : null, key: `${FIELD_PREFIX}.hta`, updatedAt: metaFor(`${FIELD_PREFIX}.hta`), tracked: !!props.fieldMeta },
    { label: 'SAOS', value: d.sas || null, key: `${FIELD_PREFIX}.sas`, updatedAt: metaFor(`${FIELD_PREFIX}.sas`), tracked: !!props.fieldMeta },
  ]
})

const bilanBioResults = computed<BilanBioResult[]>(() => {
  // Direct système : comme l'écran « Résultats Bio », la carte lit les
  // résultats live du patient quand ils sont chargés, avec repli sur la
  // photo sauvegardée du dossier (bilanBio.results).
  if (liveBioResults.value.length) return liveBioResults.value
  return props.examensComplementaires?.bilanBio?.results ?? []
})

// Résultats bio live du système (même source que « Résultats Bio »).
const { results: liveBioExamResults, fetchByPatient: fetchLiveBio } = useExamResults()
const liveBioResults = ref<BilanBioResult[]>([])
const liveBioLoaded = ref(false)

async function loadLiveBio(patientId: number | null | undefined) {
  if (!patientId) return
  try {
    await fetchLiveBio(patientId)
    liveBioResults.value = (liveBioExamResults.value as unknown as BilanBioResult[]).slice()
  } catch {
    liveBioResults.value = []
  } finally {
    liveBioLoaded.value = true
  }
}

onMounted(() => {
  void loadLiveBio(props.patientId)
})

watch(() => props.patientId, (id) => {
  liveBioLoaded.value = false
  liveBioResults.value = []
  void loadLiveBio(id)
})

const dernierExamenHbA1c = computed(() => latestBioValue(bilanBioResults.value, isHbA1c))
const dernierExamenLdl = computed(() => latestBioValue(bilanBioResults.value, isLdl))
const dernierExamenHdl = computed(() => latestBioValue(bilanBioResults.value, isHdl))
const dernierExamenTriglycerides = computed(() => latestBioValue(bilanBioResults.value, isTriglycerides))

/**
 * Display date (DD/MM/YYYY) of a bio result: `requestDate`, else `filledAt`,
 * else `createdAt`. Returns an empty string when the result carries no
 * parsable date (then `bioRowOf` renders the value without any parenthesis,
 * instead of a `(—)`). The `' ' → 'T'` normalisation keeps
 * `'YYYY-MM-DD HH:mm:ss'` values parseable by `new Date()` in every engine
 * (Safari rejects the space form). `formatDate` handles `YYYY-MM` values as
 * a local month-start, matching the electron `dateFmt` output exactly.
 */
function bioDateOf(r: BilanBioResult | undefined): string {
  if (!r) return ''
  const raw = r.requestDate || r.filledAt || r.createdAt
  if (!raw) return ''
  const formatted = formatDate(String(raw).replace(' ', 'T'))
  return formatted === '—' ? '' : formatted
}

/**
 * Read-only cell for « Dernier Examen métabolique » : `value unit (DD/MM/YYYY)`
 * when a latest result exists, `—` otherwise. Displayed format must stay
 * strictly identical to the electron export block.
 */
function bioRowOf(r: BilanBioResult | undefined): string {
  if (!r) return '—'
  const value = String(r.value)
  const unit = r.parameterUnit ? ` ${r.parameterUnit}` : ''
  const date = bioDateOf(r)
  return `${value}${unit}${date ? ` (${date})` : ''}`
}

const complicationsPreviewFields = computed<FormPreviewField[]>(() => {
  const d = props.data
  const dfg = dfgValueOf(d.creatininemie)
  const stade = stadeOf(dfg)
  return [
    { label: 'Rétinopathie', value: d.retinopathie, key: `${FIELD_PREFIX}.retinopathie`, updatedAt: metaFor(`${FIELD_PREFIX}.retinopathie`), tracked: !!props.fieldMeta },
    { label: 'Créatininémie (µmol/L)', value: d.creatininemie, key: `${FIELD_PREFIX}.creatininemie`, updatedAt: metaFor(`${FIELD_PREFIX}.creatininemie`), tracked: !!props.fieldMeta },
    { label: 'DFG (mL/min/1.73m²)', value: dfg, key: `${FIELD_PREFIX}.creatininemie`, updatedAt: metaFor(`${FIELD_PREFIX}.creatininemie`), tracked: !!props.fieldMeta },
    { label: 'Stade IR', value: stade !== '—' ? stade : null, key: `${FIELD_PREFIX}.creatininemie`, updatedAt: metaFor(`${FIELD_PREFIX}.creatininemie`), tracked: !!props.fieldMeta },
    { label: 'Neuropathie symptomatique', value: d.neuropathie ? 'Oui' : null, key: `${FIELD_PREFIX}.neuropathie`, updatedAt: metaFor(`${FIELD_PREFIX}.neuropathie`), tracked: !!props.fieldMeta },
    { label: 'Grade podologique', value: d.podologiqueGrade, key: `${FIELD_PREFIX}.podologiqueGrade`, updatedAt: metaFor(`${FIELD_PREFIX}.podologiqueGrade`), tracked: !!props.fieldMeta },
    { label: 'Amputation', value: d.amputation ? 'Oui' : null, key: `${FIELD_PREFIX}.amputation`, updatedAt: metaFor(`${FIELD_PREFIX}.amputation`), tracked: !!props.fieldMeta },
    { label: 'Détail amputation', value: isRichTextEmpty(d.amputationDetail) ? undefined : d.amputationDetail, rich: true, key: `${FIELD_PREFIX}.amputationDetail`, updatedAt: metaFor(`${FIELD_PREFIX}.amputationDetail`), tracked: !!props.fieldMeta },
    { label: 'Insuffisance cardiaque', value: d.insuffisanceCardiaque ? 'Oui' : null, key: `${FIELD_PREFIX}.insuffisanceCardiaque`, updatedAt: metaFor(`${FIELD_PREFIX}.insuffisanceCardiaque`), tracked: !!props.fieldMeta },
    { label: 'NT-proBNP (pg/mL)', value: d.ntProBNP, key: `${FIELD_PREFIX}.ntProBNP`, updatedAt: metaFor(`${FIELD_PREFIX}.ntProBNP`), tracked: !!props.fieldMeta },
    { label: 'AOMI', value: d.aomi ? 'Oui' : null, key: `${FIELD_PREFIX}.aomi`, updatedAt: metaFor(`${FIELD_PREFIX}.aomi`), tracked: !!props.fieldMeta },
    { label: 'Ischémie critique', value: isRichTextEmpty(d.ischemicCritique) ? undefined : d.ischemicCritique, rich: true, key: `${FIELD_PREFIX}.ischemicCritique`, updatedAt: metaFor(`${FIELD_PREFIX}.ischemicCritique`), tracked: !!props.fieldMeta },
  ]
})
</script>

<style scoped>
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

.duree-group {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
}

.duree-group .el-input-number {
  flex: 1;
}

.duree-unit {
  color: var(--cde-muted);
  font-size: 12px;
  white-space: nowrap;
}

.fdr-group {
  border: 1px solid var(--cde-border);
  border-radius: 6px;
  padding: 6px 14px 12px;
  margin: 0 0 14px;
}

.fdr-group > legend {
  padding: 0 6px;
  font-size: 12px;
  font-weight: 600;
  color: var(--cde-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.fdr-group:last-child {
  margin-bottom: 0;
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
.history-collapse__title { font-size: 13px; font-weight: 600; }
.history-collapse__header-icon { font-size: 16px; }
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

.dernier-examen {
  border: 1px solid var(--cde-border);
  border-radius: 6px;
  padding: 6px 14px 12px;
}

.dernier-examen__row {
  display: flex;
  gap: 12px;
  padding: 5px 0;
}

.dernier-examen__label {
  min-width: 140px;
  font-weight: 600;
  color: var(--cde-header-text);
}

.dernier-examen__value {
  color: var(--cde-header-text);
}

.examen-subtitle {
  margin: 14px 0 6px;
  font-size: 13px;
  font-weight: 600;
  color: var(--el-text-color-primary);
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

.dernier-examen__note {
  margin: 10px 0 0;
  font-size: 12px;
  color: var(--cde-muted);
}
</style>
