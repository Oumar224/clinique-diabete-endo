<template>
  <div class="ordonnance-tab">
    <div class="ordonnance-tab__header">
      <div class="ordonnance-tab__header-title">
        <svg width="16" height="16" viewBox="0 0 14 14" fill="none">
          <rect x="2" y="1" width="10" height="12" rx="1.5" stroke="currentColor" stroke-width="0.8" fill="currentColor" fill-opacity="0.06"/>
          <path d="M5 4.5H9" stroke="currentColor" stroke-width="0.8" stroke-linecap="round"/>
          <path d="M5 6.5H8" stroke="currentColor" stroke-width="0.8" stroke-linecap="round"/>
          <path d="M5 8.5H7" stroke="currentColor" stroke-width="0.8" stroke-linecap="round"/>
        </svg>
        <span>Ordonnance de Sortie</span>
        <el-tag v-if="data.length > 0" size="small" effect="plain" round>{{ data.length }}</el-tag>
      </div>
      <div class="ordonnance-tab__header-actions">
        <el-button
          size="small"
          :disabled="!props.patientId || data.length === 0"
          @click="openPreview()"
        >
          Aperçu PDF
        </el-button>
        <el-button
          v-if="!readonly && !showForm"
          type="primary" size="small" :icon="Plus"
          @click="openAddForm('medicament')"
        >
          Nouveau
        </el-button>
        <el-button
          v-if="!readonly"
          size="small"
          :loading="prefillLoading"
          @click="loadDefaults"
        >
          Recharger les éléments par défaut
        </el-button>
      </div>
    </div>

    <div class="ordonnance-tab__body">
      <!-- Colonne gauche : Formulaire -->
      <div class="ordonnance-tab__form-col">
        <transition name="fade-slide">
          <CollapsibleSection
            v-if="showForm"
            :title="editingIndex !== null ? 'Modifier la prescription' : 'Nouvelle prescription'"
            :default-open="true"
          >
            <div class="cde-panel ordonnance-form-card">
              <el-form ref="formRef" :model="form" :rules="formRules" label-position="top" size="small">
                <el-row :gutter="12">
                  <el-col :span="24">
                    <el-form-item label="Catégorie">
                      <el-select v-model="form.categorie" :disabled="editingIndex !== null" style="width:100%">
                        <el-option v-for="c in CATEGORIE_OPTIONS" :key="c.value" :label="c.label" :value="c.value" />
                      </el-select>
                    </el-form-item>
                  </el-col>
                </el-row>

                <template v-if="form.categorie === 'medicament' || form.categorie === 'soins'">
                  <el-row :gutter="12">
                    <el-col :span="form.categorie === 'soins' ? 24 : 12">
                      <el-form-item :label="form.categorie === 'soins' ? 'Soin' : 'Médicament'" prop="medicament">
                        <el-select v-model="form.medicament" filterable allow-create placeholder="Rechercher..." style="width:100%">
                          <el-option v-for="m in (form.categorie === 'soins' ? soinsOptions : medicaments)" :key="m" :label="m" :value="m" />
                        </el-select>
                      </el-form-item>
                    </el-col>
                    <el-col v-if="form.categorie !== 'soins'" :span="6">
                      <el-form-item label="Dosage" prop="dosage">
                        <el-input v-model="form.dosage" placeholder="500" />
                      </el-form-item>
                    </el-col>
                    <el-col v-if="form.categorie !== 'soins'" :span="6">
                      <el-form-item label="Unité" prop="unite">
                        <el-select v-model="form.unite" placeholder="Unité" style="width:100%">
                          <el-option v-for="u in UNITES" :key="u" :label="u" :value="u" />
                        </el-select>
                      </el-form-item>
                    </el-col>
                  </el-row>

                  <el-row :gutter="12">
                    <el-col v-if="form.categorie !== 'soins'" :span="4">
                      <el-form-item label="Voie" prop="voie">
                        <el-select v-model="form.voie" placeholder="Voie" style="width:100%">
                          <el-option v-for="v in VOIES" :key="v.code" :label="v.label" :value="v.code" />
                        </el-select>
                      </el-form-item>
                    </el-col>
                    <el-col :span="form.categorie === 'soins' ? 6 : 4">
                      <el-form-item label="Durée (jours)" prop="duree">
                        <el-input-number v-model="form.duree" :min="1" :max="365" style="width:100%" />
                      </el-form-item>
                    </el-col>
                    <el-col :span="form.categorie === 'soins' ? 18 : 8">
                      <el-form-item label="Type de traitement">
                        <el-radio-group v-model="form.dureeType">
                          <el-radio-button value="courte">Courte durée</el-radio-button>
                          <el-radio-button value="longue">Longue durée</el-radio-button>
                        </el-radio-group>
                      </el-form-item>
                    </el-col>
                    <el-col v-if="form.categorie !== 'soins'" :span="8">
                      <el-form-item label="Forme galénique">
                        <el-select v-model="form.formeGalenique" placeholder="Choisir..." style="width:100%">
                          <el-option v-for="fg in FORME_GALENIQUE_OPTIONS" :key="fg" :label="fg" :value="fg" />
                        </el-select>
                      </el-form-item>
                    </el-col>
                  </el-row>

                  <el-row :gutter="12">
                    <el-col v-if="form.categorie !== 'soins'" :span="10">
                      <el-form-item label="Consignes de prise">
                        <el-select v-model="form.momentPrises" multiple placeholder="Sélectionnez..." style="width:100%" collapse-tags collapse-tags-tooltip>
                          <el-option v-for="c in CONSIGNES_PRISE_OPTIONS" :key="c" :label="c" :value="c" />
                        </el-select>
                      </el-form-item>
                    </el-col>
                    <el-col v-if="form.categorie === 'soins'" :span="4">
                      <el-form-item label="Nb séances">
                        <el-input-number v-model="form.nbSeances" :min="1" :max="99" style="width:100%" />
                      </el-form-item>
                    </el-col>
                    <el-col :span="4">
                      <el-form-item label="Renouvellement">
                        <el-switch v-model="form.renouvellement" />
                      </el-form-item>
                    </el-col>
                    <el-col v-if="form.renouvellement" :span="4">
                      <el-form-item label="Nombre">
                        <el-input-number v-model="form.nbRenouvellements" :min="1" :max="12" />
                      </el-form-item>
                    </el-col>
                  </el-row>

                  <el-row v-if="form.categorie === 'soins'" :gutter="12">
                    <el-col :span="12">
                      <el-form-item label="Objectif clinique">
                        <RichTextEditor v-model="form.objectifClinique" :rows="2" placeholder="Objectif du traitement..." />
                      </el-form-item>
                    </el-col>
                    <el-col :span="12">
                      <el-form-item label="Consignes spécifiques">
                        <RichTextEditor v-model="form.consignesSpecifiques" :rows="2" placeholder="À faire à jeun, Patient non mobile, À domicile..." />
                      </el-form-item>
                    </el-col>
                  </el-row>

                  <el-row v-if="form.categorie === 'soins'" :gutter="12">
                    <el-col :span="14">
                      <el-form-item label="Dispositifs médicaux & Voies d'abord">
                        <el-select v-model="form.dispositifsMedicaux" multiple filterable placeholder="Sélectionnez..." style="width:100%" collapse-tags collapse-tags-tooltip>
                          <el-option v-for="d in dispositifTypes" :key="d.id" :label="d.label" :value="d.label" />
                        </el-select>
                      </el-form-item>
                    </el-col>
                    <el-col :span="10">
                      <el-form-item label="Professionnel cible">
                        <el-select v-model="form.professionnelCible" placeholder="Professionnel..." style="width:100%">
                          <el-option v-for="p in PROFESSIONNEL_OPTIONS" :key="p" :label="p" :value="p" />
                        </el-select>
                      </el-form-item>
                    </el-col>
                  </el-row>

                  <el-row :gutter="12">
                    <el-col :span="12">
                      <el-form-item label="Type de fréquence">
                        <el-radio-group v-model="form.frequenceType">
                          <el-radio-button value="moments">Moments</el-radio-button>
                          <el-radio-button value="fixed-times">Heures fixes</el-radio-button>
                          <el-radio-button value="interval">Intervalle</el-radio-button>
                        </el-radio-group>
                      </el-form-item>
                    </el-col>
                    <el-col :span="12">
                      <el-form-item label="Fréquence" prop="frequence">
                        <el-select
                          v-if="form.frequenceType === 'moments'"
                          v-model="form.frequence" multiple
                          placeholder="Moments" style="width:100%"
                          collapse-tags collapse-tags-tooltip
                        >
                          <el-option v-for="opt in MOMENTS_OPTIONS" :key="opt.value" :label="opt.label" :value="opt.value" />
                        </el-select>
                        <el-select
                          v-else-if="form.frequenceType === 'fixed-times'"
                          v-model="form.frequence" multiple
                          placeholder="Heures" style="width:100%"
                          collapse-tags collapse-tags-tooltip
                        >
                          <el-option v-for="t in FIXED_TIMES_OPTIONS" :key="t" :label="t" :value="t" />
                        </el-select>
                        <el-select
                          v-else
                          v-model="form.frequence"
                          placeholder="Intervalle" style="width:100%"
                        >
                          <el-option v-for="h in INTERVAL_OPTIONS" :key="h" :label="`Toutes les ${h}h`" :value="`Toutes les ${h}h`" />
                        </el-select>
                      </el-form-item>
                    </el-col>
                  </el-row>

                  <el-row v-if="form.categorie === 'medicament'" :gutter="12">
                    <el-col :span="12">
                      <el-form-item label="Quantité totale" prop="quantite">
                        <div class="quantite-field">
                          <el-input-number v-model="form.quantite" :min="1" placeholder="Auto" @change="markQuantiteDirty" />
                          <span v-if="quantiteHint" class="quantite-hint">{{ quantiteHint }}</span>
                        </div>
                      </el-form-item>
                    </el-col>
                  </el-row>

                  <el-row :gutter="12">
                    <el-col :span="24">
                      <el-form-item label="Instructions">
                        <RichTextEditor v-model="form.instructions" :rows="2" placeholder="Instructions complémentaires..." />
                      </el-form-item>
                    </el-col>
                  </el-row>
                </template>

                <template v-else-if="form.categorie === 'examen'">
                  <el-row :gutter="12">
                    <el-col :span="24">
                      <el-form-item label="Type d'examen" prop="examenType">
                        <el-radio-group v-model="form.examenType">
                          <el-radio-button value="imagerie">Imagerie (un seul examen)</el-radio-button>
                          <el-radio-button value="laboratoire">Laboratoire (plusieurs analyses)</el-radio-button>
                        </el-radio-group>
                      </el-form-item>
                    </el-col>
                  </el-row>
                  <el-row :gutter="12">
                    <el-col :span="24">
                      <el-form-item
                        v-if="form.examenType === 'imagerie'"
                        label="Examen demandé"
                        prop="examenId"
                      >
                        <el-tree-select
                          v-model="form.examenId"
                          :data="imagerieTreeData"
                          :props="{ label: 'label', children: 'children' }"
                          node-key="id"
                          check-strictly
                          filterable
                          placeholder="Sélectionner un examen d'imagerie"
                          style="width:100%"
                        />
                      </el-form-item>
                      <el-form-item
                        v-else
                        label="Analyses demandées"
                        prop="examensIds"
                      >
                        <el-tree-select
                          v-model="form.examensIds"
                          :data="laboratoireTreeData"
                          :props="{ label: 'label', children: 'children' }"
                          node-key="id"
                          multiple
                          show-checkbox
                          check-strictly
                          filterable
                          placeholder="Rechercher et sélectionner des analyses"
                          style="width:100%"
                          collapse-tags
                          collapse-tags-tooltip
                        />
                      </el-form-item>
                    </el-col>
                  </el-row>
                  <el-row :gutter="12">
                    <el-col :span="24">
                      <el-form-item
                        :label="form.examenType === 'imagerie' ? 'Motif clinique de la demande' : 'Motif (optionnel)'"
                        prop="motif"
                      >
                        <RichTextEditor
                          v-model="form.motif"
                          :rows="2"
                          :placeholder="form.examenType === 'imagerie' ? 'Décrire le motif clinique...' : 'Motif (optionnel)...'"
                        />
                      </el-form-item>
                    </el-col>
                  </el-row>
                  <el-row :gutter="12">
                    <el-col :span="24">
                      <el-form-item label="Prescripteur" prop="prescripteur">
                        <el-select v-model="form.prescripteur" filterable placeholder="Sélectionner un prescripteur" style="width:100%">
                          <el-option v-for="m in medecins" :key="formatMedecin(m)" :label="formatMedecin(m)" :value="formatMedecin(m)" />
                        </el-select>
                      </el-form-item>
                    </el-col>
                  </el-row>
                </template>
                <template v-else>
                  <el-row :gutter="12">
                    <el-col :span="24">
                      <el-form-item label="Spécialité" prop="specialite">
                        <el-select
                          v-model="form.specialite"
                          filterable allow-create default-first-option
                          placeholder="Rechercher ou créer..." style="width:100%"
                        >
                          <el-option v-for="opt in specialtyOptions" :key="opt" :label="opt" :value="opt" />
                        </el-select>
                      </el-form-item>
                    </el-col>
                  </el-row>
                  <el-row :gutter="12">
                    <el-col :span="24">
                      <el-form-item label="Motif" prop="motif">
                        <RichTextEditor v-model="form.motif" :rows="2" placeholder="Motif (optionnel)..." />
                      </el-form-item>
                    </el-col>
                  </el-row>
                  <el-row :gutter="12">
                    <el-col :span="24">
                      <el-form-item label="Prescripteur" prop="prescripteur">
                        <el-select v-model="form.prescripteur" filterable placeholder="Sélectionner un prescripteur" style="width:100%">
                          <el-option v-for="m in medecins" :key="formatMedecin(m)" :label="formatMedecin(m)" :value="formatMedecin(m)" />
                        </el-select>
                      </el-form-item>
                    </el-col>
                  </el-row>
                </template>

                <el-row :gutter="12">
                  <el-col :span="24" class="ordonnance-form-card__actions">
                    <el-button type="primary" size="small" @click="onSubmit">
                      {{ editingIndex !== null ? 'Mettre à jour' : 'Ajouter' }}
                    </el-button>
                    <el-button size="small" @click="cancelForm">Annuler</el-button>
                  </el-col>
                </el-row>
              </el-form>
            </div>
          </CollapsibleSection>
        </transition>

        <el-empty v-if="!showForm && data.length === 0" description="Aucune prescription de sortie" :image-size="60" />
      </div>

      <!-- Colonne droite : Aperçu groupé par catégorie -->
      <div class="ordonnance-tab__preview-col">
        <div v-for="group in groupedData" :key="group.categorie" class="cde-panel ordonnance-group">
          <div class="cde-panel__head ordonnance-group__header">
            <div class="cde-panel__title ordonnance-group__title">
              <span>{{ group.label }}</span>
              <el-tag v-if="group.items.length > 0" size="small" type="info" effect="plain" round>{{ group.items.length }}</el-tag>
            </div>
            <div class="ordonnance-group__actions">
              <el-button v-if="!readonly" size="small" :icon="Plus" @click="openAddForm(group.categorie)">
                Ajouter
              </el-button>
              <el-tooltip v-if="group.items.length > 0" content="Aperçu PDF" placement="top" :show-after="400">
                <el-button class="preview-eye-btn" size="small" :icon="View" @click="openPreview(group.items)" />
              </el-tooltip>
              <el-button v-if="group.items.length > 0" size="small" @click="emit('generate', group.categorie)">
                Générer
              </el-button>
            </div>
          </div>

          <template v-if="group.categorie === 'examen' && group.items.length > 0">
            <div class="ordonnance-subgroup">
              <div v-if="imagerieItems(group.items).length > 0" class="ordonnance-subgroup__block">
                <div class="ordonnance-subgroup__header">
                  <span>Imagerie</span>
                  <el-tag size="small" type="primary" effect="plain" round>{{ imagerieItems(group.items).length }}</el-tag>
                </div>
                <div class="ordonnance-group__cards">
                  <div v-for="rx in imagerieItems(group.items)" :key="rx._key" class="rx-card rx-card--examen">
                    <div class="rx-card__header">
                      <div class="rx-card__title-group">
                        <span class="rx-card__medicament">{{ examenDisplay(rx) }}</span>
                        <el-tag size="small" effect="plain" type="primary">Imagerie</el-tag>
                      </div>
                      <div v-if="!readonly" class="rx-card__actions">
                        <el-button size="small" text type="success" @click="emit('generate-item', { categorie: group.categorie, key: rx._key })">Générer</el-button>
                        <el-tooltip content="Aperçu PDF" placement="top" :show-after="400">
                          <el-button class="preview-eye-btn" size="small" text :icon="View" @click="openPreview([rx])" />
                        </el-tooltip>
                        <el-button size="small" text type="primary" :icon="Edit" @click="editPrescription(dataIndexOf(rx))">Modifier</el-button>
                        <el-button size="small" text type="danger" :icon="Delete" @click="removePrescription(dataIndexOf(rx))">Supprimer</el-button>
                      </div>
                    </div>
                    <div v-if="!isRichTextEmpty(rx.motif)" class="rx-card__details rx-card__details--rich" v-html="rx.motif" />
                    <div v-if="planMetaOf(rx)" class="rx-card__details rx-card__details--meta">{{ planMetaOf(rx) }}</div>
                  </div>
                </div>
              </div>
              <div v-if="laboratoireItems(group.items).length > 0" class="ordonnance-subgroup__block">
                <div class="ordonnance-subgroup__header">
                  <span>Laboratoire</span>
                  <el-tag size="small" type="success" effect="plain" round>{{ laboratoireItems(group.items).length }}</el-tag>
                </div>
                <div class="ordonnance-group__cards">
                  <div v-for="rx in laboratoireItems(group.items)" :key="rx._key" class="rx-card rx-card--examen">
                    <div class="rx-card__header">
                      <div class="rx-card__title-group">
                        <span class="rx-card__medicament">{{ examenDisplay(rx) }}</span>
                        <el-tag size="small" effect="plain" type="success">Laboratoire</el-tag>
                      </div>
                      <div v-if="!readonly" class="rx-card__actions">
                        <el-button size="small" text type="success" @click="emit('generate-item', { categorie: group.categorie, key: rx._key })">Générer</el-button>
                        <el-tooltip content="Aperçu PDF" placement="top" :show-after="400">
                          <el-button class="preview-eye-btn" size="small" text :icon="View" @click="openPreview([rx])" />
                        </el-tooltip>
                        <el-button size="small" text type="primary" :icon="Edit" @click="editPrescription(dataIndexOf(rx))">Modifier</el-button>
                        <el-button size="small" text type="danger" :icon="Delete" @click="removePrescription(dataIndexOf(rx))">Supprimer</el-button>
                      </div>
                    </div>
                    <div v-if="!isRichTextEmpty(rx.motif)" class="rx-card__details rx-card__details--rich" v-html="rx.motif" />
                    <div v-if="planMetaOf(rx)" class="rx-card__details rx-card__details--meta">{{ planMetaOf(rx) }}</div>
                  </div>
                </div>
              </div>
              <div v-if="legacyExamenItems(group.items).length > 0" class="ordonnance-subgroup__block">
                <div class="ordonnance-group__cards">
                  <div v-for="rx in legacyExamenItems(group.items)" :key="rx._key" class="rx-card rx-card--examen">
                    <div class="rx-card__header">
                      <div class="rx-card__title-group">
                        <span class="rx-card__medicament">{{ examenDisplay(rx) }}</span>
                      </div>
                      <div v-if="!readonly" class="rx-card__actions">
                        <el-button size="small" text type="success" @click="emit('generate-item', { categorie: group.categorie, key: rx._key })">Générer</el-button>
                        <el-tooltip content="Aperçu PDF" placement="top" :show-after="400">
                          <el-button class="preview-eye-btn" size="small" text :icon="View" @click="openPreview([rx])" />
                        </el-tooltip>
                        <el-button size="small" text type="primary" :icon="Edit" @click="editPrescription(dataIndexOf(rx))">Modifier</el-button>
                        <el-button size="small" text type="danger" :icon="Delete" @click="removePrescription(dataIndexOf(rx))">Supprimer</el-button>
                      </div>
                    </div>
                    <div v-if="!isRichTextEmpty(rx.motif)" class="rx-card__details rx-card__details--rich" v-html="rx.motif" />
                    <div v-if="planMetaOf(rx)" class="rx-card__details rx-card__details--meta">{{ planMetaOf(rx) }}</div>
                  </div>
                </div>
              </div>
            </div>
          </template>
          <div v-else-if="group.items.length > 0" class="ordonnance-group__cards">
            <div v-for="rx in group.items" :key="rx._key" class="rx-card" :class="`rx-card--${group.categorie}`">
              <template v-if="group.categorie === 'medicament' || group.categorie === 'soins'">
                <div class="rx-card__header">
                  <div class="rx-card__title-group">
                    <span class="rx-card__medicament">{{ rx.medicament }}</span>
                    <span v-if="group.categorie !== 'soins' && (rx.dosage || rx.unite)" class="rx-card__dosage">{{ rx.dosage }}{{ rx.unite ? ` ${rx.unite}` : '' }}</span>
                    <el-tag v-if="group.categorie !== 'soins' && rx.voie" size="small" effect="plain" type="info">{{ rx.voie }}</el-tag>
                    <el-tag size="small" effect="plain" type="info">{{ rx.duree }} jours</el-tag>
                    <el-tag v-if="rx.dureeType" size="small" effect="plain" :type="dureeTagType(rx.dureeType)">
                      {{ dureeTypeLabel(rx.dureeType) }}
                    </el-tag>
                    <el-tag size="small" effect="plain" type="info">{{ frequenceLabel(rx) }}</el-tag>
                    <el-tag v-if="group.categorie !== 'soins' && rx.formeGalenique" size="small" effect="plain">{{ rx.formeGalenique }}</el-tag>
                    <el-tag v-if="rx.quantite != null" size="small" effect="plain" type="info">Qté : {{ rx.quantite }}{{ rx.unite ? ` ${rx.unite}` : '' }}</el-tag>
                  </div>
                  <el-tag v-if="rx.renouvellement" type="warning" size="small" effect="plain" round>
                    Renouvellement ×{{ rx.nbRenouvellements }}
                  </el-tag>
                  <div v-if="!readonly" class="rx-card__actions">
                    <el-button
                      size="small" text type="success"
                      @click="emit('generate-item', { categorie: group.categorie, key: rx._key })"
                    >Générer</el-button>
                    <el-tooltip
                      content="Aperçu PDF" placement="top" :show-after="400"
                    >
                      <el-button class="preview-eye-btn" size="small" text :icon="View" @click="openPreview([rx])" />
                    </el-tooltip>
                    <el-button size="small" text type="primary" :icon="Edit" @click="editPrescription(dataIndexOf(rx))">Modifier</el-button>
                    <el-button size="small" text type="danger" :icon="Delete" @click="removePrescription(dataIndexOf(rx))">Supprimer</el-button>
                  </div>
                </div>
                <div v-if="group.categorie !== 'soins' && (rx.momentPrises ?? []).length > 0" class="rx-card__details">
                  <span>{{ (rx.momentPrises ?? []).join(' · ') }}</span>
                </div>
                <div v-if="!isRichTextEmpty(rx.instructions)" class="rx-card__details rx-card__details--rich" v-html="rx.instructions" />
                <template v-if="group.categorie === 'soins'">
                  <div v-if="rx.nbSeances != null" class="rx-card__details"><span>Nb séances : {{ rx.nbSeances }}</span></div>
                  <div v-if="!isRichTextEmpty(rx.objectifClinique)" class="rx-card__details rx-card__details--rich" v-html="rx.objectifClinique" />
                  <div v-if="!isRichTextEmpty(rx.consignesSpecifiques)" class="rx-card__details rx-card__details--rich" v-html="rx.consignesSpecifiques" />
                  <div v-if="rx.dispositifsMedicaux" class="rx-card__details"><span>Dispositifs & Voies d'abord : {{ rx.dispositifsMedicaux }}</span></div>
                  <div v-if="rx.professionnelCible" class="rx-card__details"><span>Professionnel cible : {{ rx.professionnelCible }}</span></div>
                </template>
              </template>
              <template v-else>
                <div class="rx-card__header">
                  <div class="rx-card__title-group">
                    <span class="rx-card__medicament">{{ rx.examen || rx.specialite }}</span>
                  </div>
                  <div v-if="!readonly" class="rx-card__actions">
                    <el-button
                      size="small" text type="success"
                      @click="emit('generate-item', { categorie: group.categorie, key: rx._key })"
                    >Générer</el-button>
                    <el-tooltip
                      content="Aperçu PDF" placement="top" :show-after="400"
                    >
                      <el-button class="preview-eye-btn" size="small" text :icon="View" @click="openPreview([rx])" />
                    </el-tooltip>
                    <el-button size="small" text type="primary" :icon="Edit" @click="editPrescription(dataIndexOf(rx))">Modifier</el-button>
                    <el-button size="small" text type="danger" :icon="Delete" @click="removePrescription(dataIndexOf(rx))">Supprimer</el-button>
                  </div>
                </div>
                <div v-if="!isRichTextEmpty(rx.motif)" class="rx-card__details rx-card__details--rich" v-html="rx.motif" />
                <div v-if="group.categorie === 'avis' && planMetaOf(rx)" class="rx-card__details rx-card__details--meta">{{ planMetaOf(rx) }}</div>
              </template>
            </div>
          </div>

          <el-empty v-else description="Aucun élément" :image-size="40" />
        </div>
      </div>
    </div>

    <!-- Summary bar -->
    <div v-if="data.length > 0" class="ordonnance-summary">
      <span>
        {{ medicamentCount }} médicament(s)
        <template v-if="soinsCount > 0">, {{ soinsCount }} soin(s)</template>
        <template v-if="examenCount > 0">, {{ examenCount }} examen(s)</template>
        <template v-if="avisCount > 0">, {{ avisCount }} avis</template>
      </span>
      <el-tag v-if="renouvellementCount > 0" type="warning" size="small" effect="plain">
        {{ renouvellementCount }} avec renouvellement
      </el-tag>
    </div>

    <OrdonnancePreview
      ref="previewRef"
      :patient-id="props.patientId ?? 0"
      :ordonnance-items="previewItemsOverride ?? data"
      @close="previewItemsOverride = null"
    />
  </div>
</template>

<script setup lang="ts">
/* eslint-disable vue/no-mutating-props -- Commit volontaire dans l'objet réactif partagé data (push/splice) déclenché par validation du formulaire ou par le pré-remplissage, suivi de l'émission explicite de 'change' */
import { ref, reactive, computed, inject, onMounted, watch } from 'vue'
import type { Ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import { Plus, Edit, Delete, View } from '@element-plus/icons-vue'
import type { PrescriptionSortie, PrescriptionSortieCategorie } from '@/types/crh-diabete'
import RichTextEditor from '@/components/patients/RichTextEditor.vue'
import CollapsibleSection from '@/components/common/CollapsibleSection.vue'
import OrdonnancePreview from '@/components/prescriptions/OrdonnancePreview.vue'
import { isRichTextEmpty } from '@/utils/rich-text'
import { ipcInvoke } from '@/utils/ipc'
import { useAuth } from '@/composables/useAuth'
import { useUsers, getUserDisplayName, type UserDto } from '@/composables/useUsers'
import type { PrescriptionRecord } from '@/composables/usePrescriptions'
import type { ExamRequestDto } from '@/composables/useExamRequests'
import { useExamTypes, type ExamTypeDto } from '@/composables/useExamTypes'
import { useSpecialties } from '@/composables/useSpecialties'
import { useMedicaments, medicamentShortLabel } from '@/composables/useMedicaments'
import {
  MOMENTS_OPTIONS,
  FIXED_TIMES_OPTIONS,
  INTERVAL_OPTIONS,
  FORME_GALENIQUE_OPTIONS,
  CONSIGNES_PRISE_OPTIONS,
  PROFESSIONNEL_OPTIONS,
} from '@/utils/constants'
import { VOIE_OPTIONS, normalizeVoie, VOIE_ERROR_MESSAGE } from '@/constants/voies'
import type { VoieAdministration } from '@/types/soins'

const props = defineProps<{
  data: PrescriptionSortie[]
  readonly: boolean
  fieldMeta?: Record<string, string>
  patientId?: number | null
  dateEntree?: string
}>()

const emit = defineEmits<{
  change: []
  generate: [categorie: PrescriptionSortieCategorie]
  'generate-item': [payload: { categorie: PrescriptionSortieCategorie; key: string }]
}>()

const showForm = ref(false)
const editingIndex = ref<number | null>(null)
const formRef = ref<FormInstance>()

const CATEGORIE_OPTIONS: { value: PrescriptionSortieCategorie; label: string }[] = [
  { value: 'medicament', label: 'Médicament' },
  { value: 'soins', label: 'Soins' },
  { value: 'examen', label: "Demande d'examen" },
  { value: 'avis', label: 'Avis spécialisé' },
]

const GROUPS: { categorie: PrescriptionSortieCategorie; label: string }[] = [
  { categorie: 'medicament', label: 'Médicaments' },
  { categorie: 'soins', label: 'Soins' },
  { categorie: 'examen', label: "Demandes d'examens" },
  { categorie: 'avis', label: 'Avis spécialisés' },
]

const FALLBACK_MEDICAMENTS = [
  'Amoxicilline 500 mg', 'Furosémide 40 mg', 'Metformine 500 mg', 'Ramipril 5 mg',
  'Paracétamol 500 mg', 'Ibuprofène 400 mg', 'Warfarine 5 mg', 'Aspirine 100 mg',
  'Atorvastatine 20 mg', 'Oméprazole 20 mg', 'Levothyrox 75 µg', 'Metoprolol 50 mg',
  'Amlodipine 5 mg', 'Gliclazide 80 mg', 'Insuline Glargine', 'Pantoprazole 40 mg',
]
const { medicaments: catalogueMedicaments, fetchMedicaments } = useMedicaments()
const medicaments = computed(() =>
  catalogueMedicaments.value.length > 0
    ? catalogueMedicaments.value.map(medicamentShortLabel)
    : FALLBACK_MEDICAMENTS,
)
const soinsOptions = [
  'Pansement quotidien', 'Soins de plaie', 'Bande de contention', 'Vessie de glace',
  'Toilette au lit', 'Surveillance glycémie capillaire', 'Massage préventif', 'Autre soin',
]
const UNITES = ['cp', 'UI', 'mg', 'g', 'mL', 'ampoule', 'sachet', 'goutte']
/**
 * Options de voie alignées sur l'allowlist backend `PO/SC/IV/IM/SL`
 * (l'ancien `VO` est normalisé vers `PO`, `IP/Rectale/Cutanée` rejetés).
 * Gardé sous le nom `VOIES` pour compatibilité template/tests.
 */
const VOIES = VOIE_OPTIONS

/**
 * Local form model. `frequence` is an array for the multi-select frequency
 * modes (`moments`, `fixed-times`) but a plain string for the single-select
 * `interval` mode. `categorie` drives which field set is rendered and which
 * validation rules apply.
 */
interface OrdonnanceForm {
  categorie: PrescriptionSortieCategorie
  medicament: string
  dosage: string
  unite: string
  voie: string
  duree: number
  dureeType: 'courte' | 'longue'
  formeGalenique: string
  momentPrises: string[]
  renouvellement: boolean
  nbRenouvellements: number
  quantite: number | null
  frequenceType: string
  frequence: string[] | string
  instructions: string
  examen: string
  /** Sous-type examen : imagerie (single) vs laboratoire (multiple). Défaut imagerie. */
  examenType: 'imagerie' | 'laboratoire'
  /** Sélection imagerie (tree-select single, node id). */
  examenId: number | null
  /** Sélections laboratoire (tree-select multiple, node ids). */
  examensIds: number[]
  specialite: string
  motif: string
  /** Nom affiché du prescripteur (examen/avis, alignement ExamensView). */
  prescripteur: string
  nbSeances: number
  objectifClinique: string
  consignesSpecifiques: string
  dispositifsMedicaux: string[]
  professionnelCible: string
}

function createForm(): OrdonnanceForm {
  return {
    categorie: 'medicament',
    medicament: '',
    dosage: '',
    unite: '',
    voie: '',
    duree: 7,
    dureeType: 'courte',
    formeGalenique: '',
    momentPrises: [],
    renouvellement: false,
    nbRenouvellements: 1,
    quantite: null,
    frequenceType: 'moments',
    frequence: [],
    instructions: '',
    examen: '',
    examenType: 'imagerie',
    examenId: null,
    examensIds: [],
    specialite: '',
    motif: '',
    prescripteur: '',
    nbSeances: 1,
    objectifClinique: '',
    consignesSpecifiques: '',
    dispositifsMedicaux: [],
    professionnelCible: '',
  }
}

const form = reactive(createForm())

interface TreeNode {
  id: number
  label: string
  children?: TreeNode[]
}

function buildTree(items: ExamTypeDto[]): TreeNode[] {
  const types = items.filter(t => !t.parent_id)
  return types.map(type => {
    const children = items.filter(e => e.parent_id === type.id)
    return {
      id: type.id!,
      label: type.label,
      children: children.length > 0
        ? children.map(c => ({ id: c.id!, label: c.label }))
        : undefined,
    }
  })
}

function findExamLabel(items: ExamTypeDto[], id: number): string {
  return items.find(i => i.id === id)?.label ?? String(id)
}

function findExamIdByLabel(items: ExamTypeDto[], label: string): number | null {
  const norm = label.trim().toLowerCase()
  const found = items.find(i => (i.label ?? '').trim().toLowerCase() === norm)
  return found?.id ?? null
}

function richTextRequiredRule(message: string) {
  return {
    validator: (_rule: unknown, value: unknown, callback: (error?: string | Error) => void) => {
      if (isRichTextEmpty(value as string | null | undefined)) {
        callback(new Error(message))
      } else {
        callback()
      }
    },
    trigger: 'blur',
  }
}

function voieRule() {
  return [
    { required: true, message: 'Sélectionnez la voie', trigger: 'change' as const },
    {
      validator: (_rule: unknown, value: unknown, callback: (error?: Error) => void) => {
        if (!value) { callback(); return }
        if (!normalizeVoie(value)) callback(new Error(VOIE_ERROR_MESSAGE))
        else callback()
      },
      trigger: 'change' as const,
    },
  ]
}

const formRules = computed<FormRules>(() => {
  if (form.categorie === 'examen') {
    const prescripteurRule = { required: true, message: 'Sélectionnez un prescripteur', trigger: 'change' as const }
    if (form.examenType === 'laboratoire') {
      return {
        examensIds: [{ required: true, message: 'Sélectionnez au moins une analyse', trigger: 'change' }],
        prescripteur: [prescripteurRule],
      }
    }
    return {
      examenId: [{ required: true, message: 'Sélectionnez un examen', trigger: 'change' }],
      motif: [richTextRequiredRule('Le motif clinique est requis')],
      prescripteur: [prescripteurRule],
    }
  }
  if (form.categorie === 'avis') {
    return {
      specialite: [{ required: true, message: 'Choisissez une spécialité', trigger: 'change' }],
      prescripteur: [{ required: true, message: 'Sélectionnez un prescripteur', trigger: 'change' }],
    }
  }
  if (form.categorie === 'soins') {
    return {
      medicament: [{ required: true, message: 'Choisissez un soin', trigger: 'change' }],
      duree: [{ required: true, message: 'Indiquez la durée', trigger: 'blur' }],
      frequence: [{ required: true, message: 'Sélectionnez une fréquence', trigger: 'change' }],
    }
  }
  return {
    medicament: [{ required: true, message: 'Choisissez un médicament', trigger: 'change' }],
    dosage: [{ required: true, message: 'Indiquez la quantité', trigger: 'blur' }],
    unite: [{ required: true, message: 'Sélectionnez l\'unité', trigger: 'change' }],
    voie: voieRule(),
    duree: [{ required: true, message: 'Indiquez la durée', trigger: 'blur' }],
    frequence: [{ required: true, message: 'Sélectionnez une fréquence', trigger: 'change' }],
  }
})

const groupedData = computed(() =>
  GROUPS.map(g => ({
    ...g,
    items: props.data.filter(rx => (rx.categorie ?? 'medicament') === g.categorie),
  })),
)
const medicamentCount = computed(() => props.data.filter(r => (r.categorie ?? 'medicament') === 'medicament').length)
const soinsCount = computed(() => props.data.filter(r => r.categorie === 'soins').length)
const examenCount = computed(() => props.data.filter(r => r.categorie === 'examen').length)
const avisCount = computed(() => props.data.filter(r => r.categorie === 'avis').length)
const renouvellementCount = computed(() => props.data.filter(r => r.renouvellement).length)

const { allTypes, fetchAllByCategory } = useExamTypes()
const { specialties, fetchSpecialties } = useSpecialties()
const { user } = useAuth()
const { users: allUsers, loadUsers } = useUsers()
const specialtyOptions = computed(() => specialties.value.map(s => s.name))
const dispositifTypes = ref<{ id: number; label: string }[]>([])
const imageriesDisponibles = ref<ExamTypeDto[]>([])
const analysesDisponibles = ref<ExamTypeDto[]>([])
const imagerieTreeData = computed<TreeNode[]>(() => buildTree(imageriesDisponibles.value))
const laboratoireTreeData = computed<TreeNode[]>(() => buildTree(analysesDisponibles.value))
// Heures planifiées (alignement ExamensView).

// Liste médecins pour le prescripteur (pattern ExamensView : MEDECIN/ADMIN).
const medecins = ref<UserDto[]>([])
let imagerieLoaded = false
let laboLoaded = false
let specialtiesLoaded = false
let dispositifTypesLoaded = false
let medecinsLoaded = false

function formatMedecin(m: UserDto): string {
  try {
    const name = getUserDisplayName(m)
    if (name) return name
  } catch { /* fallback ci-dessous */ }
  return `${m.prenom ?? ''} ${m.nom ?? ''}`.trim()
}

/**
 * Nom affiché par défaut du prescripteur : utilisateur courant (via
 * getUserDisplayName, sinon 'prénom nom'), sinon premier médecin.
 */
function defaultPrescripteurName(): string {
  if (user.value) {
    try {
      const name = getUserDisplayName(user.value as unknown as UserDto)
      if (name) return name
    } catch { /* fallback */ }
    const fallback = `${(user.value as unknown as UserDto).prenom ?? ''} ${(user.value as unknown as UserDto).nom ?? ''}`.trim()
    if (fallback) return fallback
  }
  if (medecins.value.length > 0) return formatMedecin(medecins.value[0])
  return ''
}

async function ensureMedecins(): Promise<void> {
  if (medecinsLoaded) return
  medecinsLoaded = true
  try {
    await loadUsers()
    medecins.value = (allUsers.value ?? []).filter(u => u.role === 'MEDECIN' || u.role === 'ADMIN')
    // Si le formulaire examen/avis est ouvert sans prescripteur (liste pas
    // encore chargée à l'ouverture), pré-remplit avec le défaut.
    if (showForm.value && (form.categorie === 'examen' || form.categorie === 'avis') && !form.prescripteur) {
      const fallback = defaultPrescripteurName()
      if (fallback) form.prescripteur = fallback
      else if (user.value && medecins.value.some(m => m.id === (user.value as unknown as { id: number }).id)) {
        form.prescripteur = formatMedecin(medecins.value.find(m => m.id === (user.value as unknown as { id: number }).id)!)
      } else if (medecins.value.length > 0) {
        form.prescripteur = formatMedecin(medecins.value[0])
      }
    }
  } catch {
    medecinsLoaded = false
  }
}

/**
 * Ligne méta sous les cartes examen/avis : `Prescrit par X` — '' quand vide.
 */
function planMetaOf(rx: PrescriptionSortie): string {
  if (rx.prescripteur) return `Prescrit par ${rx.prescripteur}`
  return ''
}

// Chargeur sérialisé des référentiels d'examens : `allTypes` (useExamTypes)
// est un ref PARTAGÉ écrasé à chaque fetch. Sans sérialisation, deux appels
// concurrents (watcher examenType + ouverture du formulaire) mélangeaient les
// listes et l'arbre Imagerie affichait des analyses labo → items labo stockés
// avec examenType 'imagerie'. Tous les appelants passent par ici.
let examenReferentialsPromise: Promise<void> | null = null

async function ensureExamenReferentials(): Promise<void> {
  if (imagerieLoaded && laboLoaded) return
  if (!examenReferentialsPromise) {
    examenReferentialsPromise = (async () => {
      try {
        if (!imagerieLoaded) {
          await fetchAllByCategory('imagerie')
          imageriesDisponibles.value = [...allTypes.value]
          imagerieLoaded = true
        }
        if (!laboLoaded) {
          await fetchAllByCategory('laboratoire')
          analysesDisponibles.value = [...allTypes.value]
          laboLoaded = true
        }
      } catch {
        imagerieLoaded = false
        laboLoaded = false
        throw new Error('referentiels examens non chargés')
      }
    })().finally(() => {
      examenReferentialsPromise = null
    })
  }
  await examenReferentialsPromise
}

async function loadExamenSubtype(subtype: 'imagerie' | 'laboratoire') {
  try {
    await ensureExamenReferentials()
  } catch {
    if (subtype === 'imagerie') imagerieLoaded = false
    else laboLoaded = false
  }
}

async function loadCategoryOptions(categorie: PrescriptionSortieCategorie) {
  try {
    if (categorie === 'examen') {
      // Passe par le chargeur sérialisé (voir ensureExamenReferentials).
      await ensureExamenReferentials()
      // Assure aussi le sous-type courant (au cas où un seul des deux aurait
      // été chargé via le watcher examenType).
      await loadExamenSubtype(form.examenType)
      await ensureMedecins()
    }
    if (categorie === 'avis') {
      if (!specialtiesLoaded) {
        specialtiesLoaded = true
        await fetchSpecialties(true)
      }
      await ensureMedecins()
    }
    if (categorie === 'soins' && !dispositifTypesLoaded) {
      dispositifTypesLoaded = true
      const types = await ipcInvoke<{ id: number; label: string }[]>('dispositif-types:list', { activeOnly: true })
      dispositifTypes.value = types ?? []
    }
  } catch {
    imagerieLoaded = false
    laboLoaded = false
    specialtiesLoaded = false
    dispositifTypesLoaded = false
    medecinsLoaded = false
  }
}

const quantiteDirty = ref(false)

function frequenceCount(): number {
  return Array.isArray(form.frequence) ? form.frequence.length : (form.frequence ? 1 : 0)
}

function suggestedQuantite(): number | null {
  const count = frequenceCount()
  if (!count || !form.duree) return null
  return count * form.duree * (1 + (form.renouvellement ? form.nbRenouvellements : 0))
}

const quantiteHint = computed(() => {
  const suggestion = suggestedQuantite()
  if (suggestion == null) return ''
  return `Suggestion : ${suggestion}${form.unite ? ` ${form.unite}` : ''}`
})

function maybeAutofillQuantite() {
  if (quantiteDirty.value || form.categorie !== 'medicament') return
  form.quantite = suggestedQuantite()
}

function markQuantiteDirty() {
  quantiteDirty.value = true
}

watch(
  () => [form.frequence, form.duree, form.renouvellement, form.nbRenouvellements, form.categorie],
  () => { if (showForm.value) maybeAutofillQuantite() },
)

function openAddForm(categorie: PrescriptionSortieCategorie = 'medicament') {
  Object.assign(form, createForm())
  quantiteDirty.value = false
  form.categorie = categorie
  if (categorie === 'examen') form.examenType = 'imagerie'
  if (categorie === 'examen' || categorie === 'avis') {
    form.prescripteur = defaultPrescripteurName()
  }
  editingIndex.value = null
  showForm.value = true
  if (!props.readonly && catalogueMedicaments.value.length === 0) void fetchMedicaments({ actif: true })
  void loadCategoryOptions(categorie)
}

async function editPrescription(idx: number) {
  const rx = props.data[idx]
  // Infère le sous-type depuis les libellés (répare les items mal classés
  // ou legacy), avec la valeur stockée en repli.
  let examenType: 'imagerie' | 'laboratoire' = rx.examenType ?? 'imagerie'
  // Charge les référentiels avant de résoudre libellés → ids (édition d'un
  // item stocké en libellés vers un tree-select en ids).
  if ((rx.categorie ?? 'medicament') === 'examen') {
    await loadCategoryOptions('examen')
    const inferred = inferExamenTypeFromLabels(examenItemLabels(rx))
    if (inferred) examenType = inferred
  } else {
    void loadCategoryOptions((rx.categorie ?? 'medicament') as PrescriptionSortieCategorie)
  }
  let examenId: number | null = null
  let examensIds: number[] = []
  if ((rx.categorie ?? 'medicament') === 'examen') {
    if (examenType === 'laboratoire') {
      const labels = (rx.examens && rx.examens.length > 0)
        ? [...rx.examens]
        : (rx.examen ? rx.examen.split(',').map(s => s.trim()).filter(Boolean) : [])
      examensIds = labels
        .map(l => findExamIdByLabel([...analysesDisponibles.value, ...imageriesDisponibles.value], l))
        .filter((id): id is number => id != null)
    } else {
      const label = rx.examen ?? ''
      examenId = label
        ? findExamIdByLabel([...imageriesDisponibles.value, ...analysesDisponibles.value], label)
        : null
    }
  }
  Object.assign(form, {
    categorie: rx.categorie ?? 'medicament',
    medicament: rx.medicament,
    dosage: rx.dosage,
    unite: rx.unite,
    // Normalise les voies legacy ('VO' → 'PO') vers l'allowlist backend.
    voie: (normalizeVoie(rx.voie) ?? rx.voie ?? '') as string,
    duree: rx.duree,
    dureeType: rx.dureeType ?? 'courte',
    formeGalenique: rx.formeGalenique,
    momentPrises: [...(rx.momentPrises ?? [])],
    renouvellement: rx.renouvellement,
    nbRenouvellements: rx.nbRenouvellements,
    quantite: rx.quantite ?? null,
    frequenceType: rx.frequenceType,
    // The `interval` el-select is single-mode and binds a plain string, while
    // `moments`/`fixed-times` are multi-selects that bind an array.
    frequence: rx.frequenceType === 'interval'
      ? (rx.frequence[0] ?? '')
      : [...rx.frequence],
    instructions: rx.instructions,
    examen: rx.examen ?? '',
    examenType,
    examenId,
    examensIds,
    specialite: rx.specialite ?? '',
    motif: rx.motif ?? '',
    prescripteur: rx.prescripteur ?? '',
    nbSeances: rx.nbSeances ?? 1,
    objectifClinique: rx.objectifClinique ?? '',
    consignesSpecifiques: rx.consignesSpecifiques ?? '',
    dispositifsMedicaux: rx.dispositifsMedicaux ? String(rx.dispositifsMedicaux).split(',').map(s => s.trim()).filter(Boolean) : [],
    professionnelCible: rx.professionnelCible ?? '',
  })
  quantiteDirty.value = rx.quantite != null
  maybeAutofillQuantite()
  if (!props.readonly && catalogueMedicaments.value.length === 0) void fetchMedicaments({ actif: true })
  editingIndex.value = idx
  showForm.value = true
}

function dataIndexOf(rx: PrescriptionSortie): number {
  return props.data.findIndex(d => d._key === rx._key)
}

async function onSubmit() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return

  const cat = form.categorie
  const isMed = cat === 'medicament' || cat === 'soins'
  // Normalise la voie vers l'allowlist backend (VO→PO, labels longs).
  // Ordonnance de sortie = document, mais la voie y est aussi contrainte.
  let normalizedVoie: VoieAdministration | '' = ''
  if (isMed && cat !== 'soins' && form.voie) {
    const code = normalizeVoie(form.voie)
    if (!code) {
      ElMessage.error(VOIE_ERROR_MESSAGE)
      return
    }
    normalizedVoie = code
  }
  // Résolution ids → libellés (contrat data : examen = 1 libellé imagerie ou
  // join ', ' labo ; examens[] = libellés multiples labo).
  let examenLabel = ''
  let examensLabels: string[] = []
  let examenType: 'imagerie' | 'laboratoire' | undefined
  if (cat === 'examen') {
    examenType = form.examenType
    if (form.examenType === 'laboratoire') {
      const all = [...analysesDisponibles.value, ...imageriesDisponibles.value]
      examensLabels = form.examensIds
        .map(id => findExamLabel(all, id))
        .filter(Boolean)
      if (examensLabels.length === 0 && form.examen.trim()) {
        // Compat : formulaire legacy piloté via form.examen (tests).
        examensLabels = form.examen.split(',').map(s => s.trim()).filter(Boolean)
      }
      examenLabel = examensLabels.join(', ')
    } else {
      const all = [...imageriesDisponibles.value, ...analysesDisponibles.value]
      examenLabel = form.examenId != null
        ? findExamLabel(all, form.examenId)
        : form.examen.trim()
      examensLabels = []
    }
  }
  const prescription: PrescriptionSortie = {
    _key: editingIndex.value !== null ? props.data[editingIndex.value]._key : crypto.randomUUID(),
    categorie: cat,
    medicament: isMed ? form.medicament : '',
    dosage: isMed && cat !== 'soins' ? form.dosage : '',
    unite: isMed && cat !== 'soins' ? form.unite : '',
    voie: isMed && cat !== 'soins' ? normalizedVoie : '',
    duree: isMed ? form.duree : 7,
    dureeType: isMed ? form.dureeType : 'courte',
    formeGalenique: isMed && cat !== 'soins' ? form.formeGalenique : '',
    momentPrises: isMed && cat !== 'soins' ? [...form.momentPrises] : [],
    renouvellement: isMed ? form.renouvellement : false,
    nbRenouvellements: isMed ? form.nbRenouvellements : 1,
    quantite: cat === 'medicament' ? (form.quantite ?? undefined) : undefined,
    frequenceType: isMed ? form.frequenceType : 'moments',
    // For the `interval` mode `form.frequence` is a single string (single-mode
    // el-select); wrap it in an array instead of spreading it char-by-char.
    frequence: isMed ? (Array.isArray(form.frequence) ? [...form.frequence] : [form.frequence]) : [],
    instructions: isMed ? form.instructions : '',
    examen: cat === 'examen' ? examenLabel : '',
    ...(cat === 'examen'
      ? (examenType === 'laboratoire'
        ? { examenType, examens: examensLabels }
        : { examenType, examens: [] })
      : {}),
    specialite: cat === 'avis' ? form.specialite : '',
    motif: cat === 'examen' || cat === 'avis' ? form.motif : '',
    // Alignement ExamensView : prescripteur + planification stockés pour examen ET avis.
    prescripteur: cat === 'examen' || cat === 'avis' ? form.prescripteur : undefined,
    nbSeances: cat === 'soins' ? form.nbSeances : undefined,
    objectifClinique: cat === 'soins' ? form.objectifClinique : '',
    consignesSpecifiques: cat === 'soins' ? form.consignesSpecifiques : '',
    dispositifsMedicaux: cat === 'soins' ? form.dispositifsMedicaux.filter(Boolean).join(', ') : '',
    professionnelCible: cat === 'soins' ? form.professionnelCible : '',
  }

  if (editingIndex.value !== null) {
    props.data.splice(editingIndex.value, 1, prescription)
  } else {
    props.data.push(prescription)
  }

  showForm.value = false
  editingIndex.value = null
  Object.assign(form, createForm())
  emit('change')
}

function cancelForm() {
  showForm.value = false
  editingIndex.value = null
}

async function removePrescription(idx: number) {
  try {
    await ElMessageBox.confirm('Supprimer cette prescription ?', 'Confirmation', {
      type: 'warning',
      confirmButtonText: 'Supprimer',
      cancelButtonText: 'Annuler',
    })
  } catch { return }
  props.data.splice(idx, 1)
  emit('change')
}

function frequenceLabel(rx: PrescriptionSortie): string {
  if (rx.frequence instanceof Array) return rx.frequence.join(', ')
  return rx.frequence || '—'
}

function dureeTypeLabel(type?: 'courte' | 'longue'): string {
  if (type === 'longue') return 'Longue durée'
  if (type === 'courte') return 'Courte durée'
  return '—'
}

function dureeTagType(type?: 'courte' | 'longue') {
  if (type === 'longue') return 'warning'
  if (type === 'courte') return 'success'
  return 'info'
}

/**
 * Libellé affiché pour une demande d'examen : `examens[]` (labo) prioritaire,
 * sinon `examen` (imagerie / legacy), sinon `specialite`.
 */
function examenDisplay(rx: PrescriptionSortie): string {
  if (Array.isArray(rx.examens) && rx.examens.length > 0) return rx.examens.join(', ')
  return rx.examen || rx.specialite || ''
}

function imagerieItems(items: PrescriptionSortie[]): PrescriptionSortie[] {
  return items.filter(rx => rx.examenType === 'imagerie')
}

function laboratoireItems(items: PrescriptionSortie[]): PrescriptionSortie[] {
  return items.filter(rx => rx.examenType === 'laboratoire')
}

/** Anciens items sans `examenType` → affichés sans tag (compat). */
function legacyExamenItems(items: PrescriptionSortie[]): PrescriptionSortie[] {
  return items.filter(rx => !rx.examenType)
}

/** Libellés d'un item examen, quelle que soit sa forme de stockage. */
function examenItemLabels(rx: PrescriptionSortie): string[] {
  if (Array.isArray(rx.examens) && rx.examens.length > 0) return [...rx.examens]
  if (rx.examen) return rx.examen.split(',').map(s => s.trim()).filter(Boolean)
  return []
}

/**
 * Déduit le sous-type d'après les libellés croisés aux deux référentiels.
 * Retourne null quand c'est ambigu (match des deux côtés ou d'aucun).
 */
function inferExamenTypeFromLabels(labels: string[]): 'imagerie' | 'laboratoire' | null {
  const norm = (s: string) => s.trim().toLowerCase()
  const labo = new Set(analysesDisponibles.value.map(t => norm(t.label ?? '')).filter(Boolean))
  const imag = new Set(imageriesDisponibles.value.map(t => norm(t.label ?? '')).filter(Boolean))
  let hitLabo = false
  let hitImag = false
  for (const l of labels) {
    const n = norm(l)
    if (!n) continue
    if (labo.has(n)) hitLabo = true
    if (imag.has(n)) hitImag = true
  }
  if (hitLabo && !hitImag) return 'laboratoire'
  if (hitImag && !hitLabo) return 'imagerie'
  return null
}

// ─── Pré-remplissage ("éléments par défaut") ───────────────────────

const prefillLoading = ref(false)
let prefillRunning = false
let autoPrefillDone = false
// Consumed by CrhDiabeteForm's deep watcher so prefill-driven writes are not
// recorded as user-modified fields in meta.champs (same pattern as
// BilanInitialTab's vital-history sync).
const vitalSyncInProgress = inject<Ref<boolean> | undefined>('vitalSyncInProgress', undefined)

function itemKey(rx: PrescriptionSortie): string {
  const cat = rx.categorie ?? 'medicament'
  if (cat === 'examen') {
    if (rx.examenType === 'laboratoire') {
      const labels = (rx.examens && rx.examens.length > 0)
        ? rx.examens.join(', ')
        : (rx.examen ?? '')
      return `examen|laboratoire|${labels}`
    }
    if (rx.examenType === 'imagerie') return `examen|imagerie|${rx.examen ?? ''}`
    return `examen|${rx.examen ?? ''}`
  }
  if (cat === 'avis') return `avis|${rx.specialite ?? ''}`
  return `${cat}|${rx.medicament}`
}

function toPrescriptionItem(p: PrescriptionRecord, categorie: PrescriptionSortieCategorie): PrescriptionSortie {
  const isSoins = categorie === 'soins'
  return {
    _key: crypto.randomUUID(),
    categorie,
    medicament: p.medicament,
    dosage: isSoins ? '' : (p.dosage ?? ''),
    unite: '',
    voie: isSoins ? '' : (p.voie ?? ''),
    duree: p.duree ?? 7,
    dureeType: p.dureeType ?? 'courte',
    frequence: Array.isArray(p.frequence) ? [...p.frequence] : (p.frequence ? [p.frequence] : []),
    frequenceType: p.frequenceType ?? 'moments',
    instructions: p.instructions ?? '',
    formeGalenique: isSoins ? '' : (p.formeGalenique ?? ''),
    momentPrises: isSoins ? [] : (p.momentPrises ? String(p.momentPrises).split(',').map(s => s.trim()).filter(Boolean) : []),
    renouvellement: !!p.renouvellement,
    nbRenouvellements: p.nbRenouvellements ?? 1,
    examen: '',
    specialite: '',
    motif: '',
  }
}

function baseExamenItem(): PrescriptionSortie {
  return {
    _key: crypto.randomUUID(),
    categorie: 'examen',
    medicament: '',
    dosage: '',
    unite: '',
    voie: '',
    duree: 7,
    dureeType: 'courte',
    frequence: [],
    frequenceType: 'moments',
    instructions: '',
    formeGalenique: '',
    momentPrises: [],
    renouvellement: false,
    nbRenouvellements: 1,
    examen: '',
    examenType: 'imagerie',
    examens: [],
    specialite: '',
    motif: '',
    prescripteur: '',
  }
}

async function loadDefaults() {
  if (props.readonly || !props.patientId || prefillRunning) return
  prefillRunning = true
  prefillLoading.value = true
  try {
    const prescriptions = (await ipcInvoke<PrescriptionRecord[]>('prescription:list', { patientId: props.patientId })) ?? []
    const requests = (await ipcInvoke<ExamRequestDto[]>('exam-request:list', { patientId: props.patientId })) ?? []
    const candidates: PrescriptionSortie[] = []

    for (const p of prescriptions) {
      if (p.type === 'medicament' && p.statut === 'active'
        && (!props.dateEntree || !p.datePrescription || p.datePrescription <= props.dateEntree)) {
        candidates.push(toPrescriptionItem(p, 'medicament'))
      } else if (p.type === 'soins' && p.statut === 'active') {
        candidates.push(toPrescriptionItem(p, 'soins'))
      }
    }

    // Laboratoire labels needed to resolve `examIds` → human-readable labels.
    const labLabels = new Map<number, string>()
    try {
      await fetchAllByCategory('laboratoire')
      for (const t of allTypes.value) {
        if (t.id != null && t.label) labLabels.set(t.id, t.label)
      }
    } catch { /* ipcInvoke already surfaced the error */ }

    for (const r of requests) {
      if (r.statut === 'annule') continue
      if (r.type === 'imagerie') {
        candidates.push({ ...baseExamenItem(), examenType: 'imagerie', examens: [], examen: r.examenLabel ?? '', motif: r.motif ?? '', prescripteur: r.prescripteurNom ?? '' })
      } else if (r.type === 'laboratoire') {
        const labels = (r.examIds ?? []).map(id => labLabels.get(id)).filter((l): l is string => Boolean(l))
        const label = labels.join(', ') || r.examenLabel || ''
        if (!label) continue
        candidates.push({
          ...baseExamenItem(),
          examenType: 'laboratoire',
          examen: label,
          examens: labels.length > 0 ? labels : [label],
          motif: r.motif ?? '',
          prescripteur: r.prescripteurNom ?? '',
        })
      } else if (r.type === 'avis') {
        candidates.push({
          ...baseExamenItem(),
          categorie: 'avis',
          specialite: r.specialtyName || r.specialite || 'Avis spécialisé',
          motif: r.motif ?? '',
          prescripteur: r.prescripteurNom ?? '',
        })
      }
    }

    // Dedup: skip candidates already present in data by (categorie, label).
    const existingKeys = new Set(props.data.map(itemKey))
    const toAdd = candidates.filter(c => !existingKeys.has(itemKey(c)))
    if (toAdd.length === 0) return

    if (vitalSyncInProgress) vitalSyncInProgress.value = true
    props.data.push(...toAdd)
    // Self-heal: clear the flag even if the parent watcher never fires for this batch.
    if (vitalSyncInProgress) queueMicrotask(() => { vitalSyncInProgress.value = false })
    emit('change')
  } catch (e) {
    ElMessage.warning((e as Error).message)
  } finally {
    prefillRunning = false
    prefillLoading.value = false
  }
}

watch(() => form.categorie, (cat) => {
  if (showForm.value) void loadCategoryOptions(cat)
})

watch(() => form.examenType, (subtype) => {
  if (showForm.value && form.categorie === 'examen') {
    void loadExamenSubtype(subtype)
    formRef.value?.clearValidate(['examenId', 'examensIds', 'motif'])
  }
})

let examenRepairDone = false

/**
 * Reclassement automatique (une fois par montage, hors readonly) : les items
 * examen dont les libellés correspondent sans ambiguïté à l'autre
 * référentiel (ex. Biochimie stockée en Imagerie suite au mélange de
 * référentiels) sont remis dans le bon sous-type. Legacy sans type mais
 * inférables → typés aussi.
 */
async function repairExamenTypesOnce() {
  if (examenRepairDone || props.readonly) return
  examenRepairDone = true
  const hasExamen = props.data.some(rx => (rx.categorie ?? 'medicament') === 'examen')
  if (!hasExamen) return
  try {
    await ensureExamenReferentials()
  } catch {
    return
  }
  let changed = false
  for (const rx of props.data) {
    if ((rx.categorie ?? 'medicament') !== 'examen') continue
    const inferred = inferExamenTypeFromLabels(examenItemLabels(rx))
    if (!inferred || rx.examenType === inferred) continue
    rx.examenType = inferred
    if (inferred === 'laboratoire') {
      const labels = examenItemLabels(rx)
      rx.examens = labels
      rx.examen = labels.join(', ')
    } else {
      // Imagerie = un seul libellé : garde le premier, vide le multi.
      const labels = examenItemLabels(rx)
      if (labels.length > 0) rx.examen = labels[0]
      rx.examens = []
    }
    changed = true
  }
  if (changed) emit('change')
}

onMounted(() => {
  if (!props.readonly && props.patientId && props.data.length === 0 && !autoPrefillDone) {
    autoPrefillDone = true
    void loadDefaults()
  }
  void repairExamenTypesOnce()
})

// ─── Aperçu PDF (ordonnance de sortie) ──────────────────────────────

const previewRef = ref<InstanceType<typeof OrdonnancePreview> | null>(null)
const previewItemsOverride = ref<PrescriptionSortie[] | null>(null)

function openPreview(items?: PrescriptionSortie[]) {
  if (!props.patientId) return
  const list = items ?? props.data
  if (list.length === 0) return
  previewItemsOverride.value = items ?? null
  previewRef.value?.open()
}
</script>

<style scoped>
.ordonnance-tab {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.ordonnance-tab__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  background: var(--cd-gray-50);
  border: 1px solid var(--cd-border);
  border-bottom: none;
  border-radius: 6px 6px 0 0;
  color: var(--cd-gray-900);
  flex-shrink: 0;
}

.ordonnance-tab__header-title {
  font-size: 14px;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 8px;
}

.ordonnance-tab__header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.ordonnance-tab__body {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 20px;
  flex: 1;
  overflow: auto;
  padding: 20px;
  background: var(--cde-surface);
  border: 1px solid var(--cde-border);
  border-top: none;
  border-radius: 0 0 6px 6px;
  min-width: 0;
  max-width: 100%;
}
@media (max-width: 900px) {
  .ordonnance-tab__body { grid-template-columns: minmax(0, 1fr); }
}

.ordonnance-tab__form-col {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.ordonnance-tab__preview-col {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.ordonnance-group {
  margin-bottom: 12px;
}

.ordonnance-group:last-child {
  margin-bottom: 0;
}

.ordonnance-group__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.ordonnance-group__actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.ordonnance-group__title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.06em;
  color: var(--cd-gray-500);
}

.ordonnance-group > .ordonnance-group__cards,
.ordonnance-group > .ordonnance-subgroup,
.ordonnance-group > .el-empty {
  padding: 8px 10px 10px;
}

.ordonnance-group__cards {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.ordonnance-subgroup {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.ordonnance-subgroup__block {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.ordonnance-subgroup__header {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  color: var(--cd-gray-500);
}

.ordonnance-form-card {
  padding: 12px;
  border-radius: 6px;
}

.ordonnance-form-card__actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  padding-top: 4px;
}

.rx-card {
  background: var(--cde-surface);
  border: 1px solid var(--cde-border);
  border-left: 3px solid var(--cde-success);
  border-radius: 6px;
  padding: 6px 10px;
  transition: border-color 0.2s;
}

.rx-card:hover {
  border-top-color: var(--cde-border);
  border-right-color: var(--cde-border);
  border-bottom-color: var(--cde-border);
}

.rx-card--soins {
  border-left-color: var(--cde-accent);
}

.rx-card--examen {
  border-left-color: var(--cde-info);
}

.rx-card--avis {
  border-left-color: var(--cde-warning);
}

.rx-card__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 2px;
}

.rx-card__title-group {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  flex: 1 1 auto;
  min-width: min(180px, 100%);
  row-gap: 2px;
  column-gap: 4px;
}

.rx-card__medicament {
  font-size: 12px;
  font-weight: 700;
  color: var(--cd-gray-900);
}

.rx-card__dosage {
  font-size: 11px;
  color: var(--cd-gray-500);
}

.rx-card__dosage::before {
  content: '· ';
}

.rx-card__details {
  font-size: 11px;
  color: var(--cd-gray-500);
  line-height: 1.3;
}

.rx-card__details--italic {
  font-style: italic;
}

.rx-card__details--rich {
  font-style: normal;
  overflow-wrap: anywhere;
}

.rx-card__details--meta {
  font-style: italic;
}
.rx-card__details--rich :deep(p) {
  margin: 0 0 4px;
}
.rx-card__details--rich :deep(h1),
.rx-card__details--rich :deep(h2),
.rx-card__details--rich :deep(h3) {
  margin: 6px 0 4px;
  font-weight: 700;
}
.rx-card__details--rich :deep(h1) {
  font-size: 14px;
}
.rx-card__details--rich :deep(h2) {
  font-size: 13px;
}
.rx-card__details--rich :deep(h3) {
  font-size: 12px;
}
.rx-card__details--rich :deep(ul),
.rx-card__details--rich :deep(ol) {
  margin: 0 0 4px;
  padding-left: 18px;
}
.rx-card__details--rich :deep(li) {
  margin-bottom: 2px;
}
.rx-card__details--rich :deep(blockquote) {
  border-left: 3px solid var(--cde-border);
  margin: 4px 0;
  padding: 2px 8px;
  color: var(--cde-muted);
  font-style: italic;
}
.rx-card__details--rich :deep(pre) {
  background: var(--cde-surface-tint);
  border: 1px solid var(--cde-border-soft);
  padding: 8px;
  font-family: monospace;
  font-size: 11px;
  white-space: pre-wrap;
  margin: 4px 0;
}
.rx-card__details--rich :deep(code) {
  background: var(--cde-surface-tint);
  font-family: monospace;
  font-size: 11px;
  padding: 1px 3px;
}
.rx-card__details--rich :deep(hr) {
  border: none;
  border-top: 1px solid var(--cde-border);
  margin: 6px 0;
}
.rx-card__details--rich :deep(img) {
  max-width: 100%;
  height: auto;
}
.rx-card__details--rich :deep(img.is-left) {
  float: left;
  margin: 0 12px 6px 0;
  max-width: 45%;
}
.rx-card__details--rich :deep(img.is-right) {
  float: right;
  margin: 0 0 6px 12px;
  max-width: 45%;
}
.rx-card__details--rich :deep(img.is-center) {
  display: block;
  margin: 6px auto;
}
.rx-card__details--rich :deep(a) {
  color: var(--cde-accent);
  text-decoration: underline;
}

.rx-card__actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  flex-wrap: nowrap;
  flex-shrink: 0;
  gap: 4px;
  margin-left: auto;
}

.quantite-field {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
}
.quantite-field .el-input-number {
  flex: 1;
  min-width: 0;
}
.quantite-hint {
  font-size: 11px;
  color: var(--el-text-color-secondary);
  white-space: nowrap;
}

.ordonnance-summary {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: var(--cd-gray-50);
  border: 1px solid var(--cd-border);
  border-top: none;
  border-radius: 0 0 6px 6px;
  font-size: 12px;
  color: var(--cd-gray-600);
  flex-shrink: 0;
}

.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: all 0.25s ease;
}

.fade-slide-enter-from,
.fade-slide-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>
