<template>
  <div class="prescription-view">
    <div class="prescription-view__header">
      <h3 class="prescription-view__title">Prescription médicale</h3>
      <el-button type="primary" size="small" :icon="Plus" @click="showForm = true">
        Nouvelle prescription
      </el-button>
    </div>

    <!-- Interaction warning banner -->
    <el-alert
      v-if="interactionWarning"
      :title="interactionWarning"
      type="warning"
      show-icon
      :closable="false"
      class="prescription-view__interaction"
    />
    <el-alert
      title="Vérification limitée — utilisez un référentiel officiel (ex: Thériaque, Vidal) pour confirmer l'absence d'interactions."
      type="info"
      show-icon
      :closable="false"
      class="prescription-view__interaction"
    />

    <!-- ================================================================ -->
    <!-- Prescription form (create)                                       -->
    <!-- ================================================================ -->
    <el-card v-if="showForm" class="prescription-view__form">
      <template #header>
        <span><strong>Nouvelle prescription</strong></span>
      </template>
      <el-form ref="formRef" :model="form" :rules="createFormRules" label-position="top" size="small">
        <!-- Type de prescription -->
        <el-row :gutter="16">
          <el-col :span="24">
            <el-form-item label="Type de prescription">
              <el-radio-group v-model="form.type">
                <el-radio value="medicament">Médicament</el-radio>
                <el-radio value="soins">Soin / Acte</el-radio>
              </el-radio-group>
            </el-form-item>
          </el-col>
        </el-row>

        <!-- ── MEDICAMENT FIELDS ────────────────────────────────────── -->
        <template v-if="form.type === 'medicament'">
          <!-- Row: Dénomination (existing) + Forme galénique -->
          <el-row :gutter="16">
            <el-col :span="8">
              <el-form-item label="Dénomination du médicament" prop="medicament">
                <el-select v-model="form.medicament" filterable placeholder="Rechercher un médicament..." style="width:100%">
                  <el-option v-for="m in medicaments" :key="m" :label="m" :value="m" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="4">
              <el-form-item label="Quantité" prop="dosage">
                <el-input v-model="form.dosage" placeholder="1" />
              </el-form-item>
            </el-col>
            <el-col :span="4">
              <el-form-item label="Unité" prop="unite">
                <el-select v-model="form.unite" placeholder="Unité">
                  <el-option v-for="u in UNITES" :key="u" :label="u" :value="u" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="4">
              <el-form-item label="Voie" prop="voie">
                <el-select v-model="form.voie" placeholder="Voie">
                  <el-option v-for="v in voieOptions" :key="v" :label="v" :value="v" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="4">
              <el-form-item label="Durée (jours)" prop="duree">
                <el-input-number v-model="form.duree" :min="1" :max="90" />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="Type de traitement">
                <el-radio-group v-model="form.dureeType">
                  <el-radio value="courte">Courte durée</el-radio>
                  <el-radio value="longue">Longue durée</el-radio>
                </el-radio-group>
              </el-form-item>
            </el-col>
          </el-row>
          <!-- Row: Forme galénique -->
          <el-row :gutter="16">
            <el-col :span="6">
              <el-form-item label="Forme galénique">
                <el-select v-model="form.formeGalenique" placeholder="Choisir..." style="width:100%">
                  <el-option v-for="fg in FORME_GALENIQUE_OPTIONS" :key="fg" :label="fg" :value="fg" />
                </el-select>
              </el-form-item>
            </el-col>
          </el-row>
          <!-- Row: Consignes de prise + Quantité totale -->
          <el-row :gutter="16">
            <el-col :span="8">
              <el-form-item label="Consignes de prise">
                <el-select v-model="form.momentPrises" multiple placeholder="Sélectionnez les consignes..." style="width:100%">
                  <el-option v-for="c in CONSIGNES_PRISE_OPTIONS" :key="c" :label="c" :value="c" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="6">
              <el-form-item label="Quantité totale / Conditionnement">
                <el-input :model-value="autoQuantiteTotale" disabled />
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
        </template>

        <!-- ── SOIN FIELDS ─────────────────────────────────────────── -->
        <template v-if="form.type === 'soins'">
          <el-row :gutter="16">
            <el-col :span="10">
              <el-form-item label="Type de soin / Acte" prop="medicament">
                <el-select v-model="form.medicament" filterable placeholder="Sélectionnez un acte..." style="width:100%">
                  <template #empty>
                    <el-empty description="Aucun acte médical configuré" :image-size="40" />
                  </template>
                  <el-option v-for="act in medicalActs" :key="act.id" :label="act.label" :value="act.label" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="4">
              <el-form-item label="Nb séances">
                <el-input-number v-model="form.nbSeances" :min="1" :max="99" />
              </el-form-item>
            </el-col>
            <el-col :span="4">
              <el-form-item label="Voie" prop="voie">
                <el-select v-model="form.voie" placeholder="Voie">
                  <el-option v-for="v in voieOptions" :key="v" :label="v" :value="v" />
                </el-select>
              </el-form-item>
            </el-col>
          </el-row>
          <el-row :gutter="16">
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
          <el-row :gutter="16">
            <el-col :span="8">
              <el-form-item label="Dispositifs médicaux & Voies d'abord">
                <el-select v-model="form.dispositifsMedicaux" multiple filterable placeholder="Sélectionnez..." style="width:100%">
                  <template #empty>
                    <el-empty description="Aucun type configuré" :image-size="40" />
                  </template>
                  <el-option v-for="d in dispositifTypes" :key="d.id" :label="d.label" :value="d.label" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="6">
              <el-form-item label="Professionnel cible">
                <el-select v-model="form.professionnelCible" placeholder="Professionnel..." style="width:100%">
                  <el-option v-for="p in PROFESSIONNEL_OPTIONS" :key="p" :label="p" :value="p" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="4">
              <el-form-item label="Durée (jours)" prop="duree">
                <el-input-number v-model="form.duree" :min="1" :max="90" />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="Type de traitement">
                <el-radio-group v-model="form.dureeType">
                  <el-radio value="courte">Courte durée</el-radio>
                  <el-radio value="longue">Longue durée</el-radio>
                </el-radio-group>
              </el-form-item>
            </el-col>
          </el-row>
        </template>

        <!-- ── COMMON: PRN ─────────────────────────────────────────── -->
        <el-row :gutter="16">
          <el-col :span="8">
            <el-form-item label="Si besoin">
              <el-switch v-model="form.prn" />
            </el-form-item>
          </el-col>
        </el-row>

        <!-- ── COMMON: Type de fréquence ───────────────────────────── -->
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="Type de fréquence">
              <el-radio-group v-model="form.frequenceType">
                <el-radio value="moments">Moments de la journée</el-radio>
                <el-radio value="fixed-times">Heures fixes</el-radio>
                <el-radio value="interval">Intervalle</el-radio>
              </el-radio-group>
            </el-form-item>
          </el-col>
        </el-row>

        <!-- ── COMMON: Fréquence ───────────────────────────────────── -->
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="Fréquence" prop="frequence">
              <el-select
                v-if="form.frequenceType === 'moments'"
                v-model="form.frequence" multiple placeholder="Sélectionnez les moments"
                collapse-tags collapse-tags-tooltip style="width:100%"
              >
                <el-option v-for="opt in MOMENTS_OPTIONS" :key="opt.value" :label="opt.label" :value="opt.value" />
              </el-select>
              <el-select
                v-else-if="form.frequenceType === 'fixed-times'"
                v-model="form.frequence" multiple placeholder="Sélectionnez les heures"
                collapse-tags collapse-tags-tooltip style="width:100%"
              >
                <el-option v-for="t in FIXED_TIMES_OPTIONS" :key="t" :label="t" :value="t" />
              </el-select>
              <el-select
                v-else-if="form.frequenceType === 'interval'"
                v-model="form.frequence" placeholder="Choisissez l'intervalle" style="width:100%"
              >
                <el-option
                  v-for="h in INTERVAL_OPTIONS"
                  :key="h"
                  :label="`Toutes les ${h}h`"
                  :value="`Toutes les ${h}h`"
                />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>

        <!-- ── COMMON: Instructions ────────────────────────────────── -->
        <el-row :gutter="16">
          <el-col :span="24">
            <el-form-item label="Instructions">
              <RichTextEditor v-model="form.instructions" :rows="2" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="24">
            <el-button type="primary" :loading="submitting" @click="onPrescrire">Prescrire</el-button>
            <el-button @click="showForm = false">Annuler</el-button>
          </el-col>
        </el-row>
      </el-form>
    </el-card>

    <!-- Loading state -->
    <div v-if="prescriptionsLoading" class="prescription-view__loading">
      <p>Chargement des prescriptions...</p>
    </div>

    <!-- Error banner -->
    <el-alert
      v-if="prescriptionError"
      :title="prescriptionError"
      type="error"
      show-icon
      closable
      @close="prescriptionError = null"
      style="margin-bottom: 16px"
    />

    <!-- Type filter above table -->
    <div v-if="prescriptions.length > 0" class="prescription-view__type-filter">
      <el-button
        v-for="opt in filterOptions"
        :key="opt.value"
        size="small"
        :type="tableTypeFilter === opt.value ? 'primary' : 'default'"
        :class="tableTypeFilter === opt.value ? `prescription-filter--${opt.value}` : ''"
        @click="tableTypeFilter = opt.value"
      >
        <span v-if="opt.value !== 'all'" class="prescription-filter__icon">{{ opt.value === 'medicament' ? '💊' : '🩹' }}</span>
        {{ opt.label }}
      </el-button>
    </div>

    <!-- Prescriptions table -->
    <el-table
      :data="filteredPrescriptions"
      style="width:100%;margin-top:16px"
      size="small"
      highlight-current-row
      @row-click="onRowClick"
      :row-class-name="tableRowClass"
    >
      <el-table-column label="Date" width="110">
        <template #default="{ row }">
          {{ formatCompactDateTime(row.createdAt) }}
        </template>
      </el-table-column>
      <el-table-column label="Type" width="130" align="center">
        <template #default="{ row }">
          <span
            class="prescription-cell__type-badge"
            :class="`prescription-cell__type-badge--${row.type}`"
          >
            <span class="prescription-cell__type-icon">{{ row.type === 'medicament' ? '💊' : '🩹' }}</span>
            {{ typeLabel(row.type) }}
          </span>
        </template>
      </el-table-column>
      <el-table-column label="Désignation" min-width="280">
        <template #default="{ row }">
          <div class="prescription-cell__row">
            <span
              class="prescription-type-dot"
              :class="`prescription-type-dot--${row.type}`"
            />
            <div class="prescription-cell__info">
              <span class="prescription-cell__medicament">{{ row.medicament }}</span>
              <span class="prescription-cell__dosage">{{ row.dosage }}</span>
              <span
                class="prescription-cell__type-label"
                :class="`prescription-cell__type-label--${row.type}`"
              >
                {{ typeLabel(row.type) }}
              </span>
            </div>
          </div>
        </template>
      </el-table-column>
      <el-table-column label="Fréquence" width="160">
        <template #default="{ row }">
          {{ row.frequence instanceof Array ? row.frequence.join(', ') : row.frequence }}
        </template>
      </el-table-column>
      <el-table-column label="Statut" width="100" align="center">
        <template #default="{ row }">
          <el-tag :type="statutTagType(row.statut)" size="small" effect="plain">
            {{ statutLabel(row.statut) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="Type de traitement" width="130" align="center">
        <template #default="{ row }">
          <el-tag :type="dureeTagType(row.dureeType)" size="small" effect="plain">
            {{ dureeTypeLabel(row.dureeType) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="Actions" width="150" align="center">
        <template #default="{ row }">
          <div class="prescription-cell__actions">
            <el-tooltip content="Modifier" placement="top" :show-after="400">
              <el-button
                size="small"
                text
                type="primary"
                @click.stop="onEdit(row)"
              >
                <el-icon><Edit /></el-icon>
              </el-button>
            </el-tooltip>

            <el-tooltip
              v-if="row.statut === 'active'"
              content="Arrêter"
              placement="top"
              :show-after="400"
            >
              <el-button
                size="small"
                text
                type="danger"
                :loading="stoppingId === row.id"
                @click.stop="onStop(row.id)"
              >
                <el-icon><CircleCloseFilled /></el-icon>
              </el-button>
            </el-tooltip>
            <el-tooltip content="Supprimer" placement="top" :show-after="400">
              <el-button
                size="small"
                text
                type="danger"
                @click.stop="onDelete(row)"
              >
                <el-icon><Delete /></el-icon>
              </el-button>
            </el-tooltip>
          </div>
        </template>
      </el-table-column>
    </el-table>

    <!-- Empty state -->
    <el-empty v-if="!prescriptionsLoading && prescriptions.length === 0" description="Aucune prescription" />

    <!-- ================================================================ -->
    <!-- Edit prescription dialog                                         -->
    <!-- ================================================================ -->
    <el-dialog v-model="showEditDialog" title="Modifier la prescription" width="600px">
      <el-form ref="editFormRef" :model="editForm" label-position="top" :rules="editFormRules">
        <!-- Type -->
        <el-row :gutter="16">
          <el-col :span="24">
            <el-form-item label="Type de prescription">
              <el-radio-group v-model="editForm.type">
                <el-radio value="medicament">Médicament</el-radio>
                <el-radio value="soins">Soin / Acte</el-radio>
              </el-radio-group>
            </el-form-item>
          </el-col>
        </el-row>

        <!-- ── MEDICAMENT edit fields ──────────────────────────────── -->
        <template v-if="editForm.type === 'medicament'">
          <el-row :gutter="16">
            <el-col :span="8">
              <el-form-item label="Dénomination" prop="medicament">
                <el-select v-model="editForm.medicament" filterable style="width:100%">
                  <el-option v-for="m in medicaments" :key="m" :label="m" :value="m" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="4">
              <el-form-item label="Quantité" prop="dosage">
                <el-input v-model="editForm.dosage" placeholder="1" />
              </el-form-item>
            </el-col>
            <el-col :span="4">
              <el-form-item label="Unité" prop="unite">
                <el-select v-model="editForm.unite" placeholder="Unité">
                  <el-option v-for="u in UNITES" :key="u" :label="u" :value="u" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="4">
              <el-form-item label="Voie" prop="voie">
                <el-select v-model="editForm.voie" style="width:100%">
                  <el-option v-for="v in voieOptions" :key="v" :label="v" :value="v" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="4">
              <el-form-item label="Durée (jours)" prop="duree">
                <el-input-number v-model="editForm.duree" :min="1" :max="90" />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="Type de traitement">
                <el-radio-group v-model="editForm.dureeType">
                  <el-radio value="courte">Courte durée</el-radio>
                  <el-radio value="longue">Longue durée</el-radio>
                </el-radio-group>
              </el-form-item>
            </el-col>
          </el-row>
          <el-row :gutter="16">
            <el-col :span="6">
              <el-form-item label="Forme galénique">
                <el-select v-model="editForm.formeGalenique" placeholder="Choisir..." style="width:100%">
                  <el-option v-for="fg in FORME_GALENIQUE_OPTIONS" :key="fg" :label="fg" :value="fg" />
                </el-select>
              </el-form-item>
            </el-col>
          </el-row>
          <el-row :gutter="16">
            <el-col :span="8">
              <el-form-item label="Consignes de prise">
                <el-select v-model="editForm.momentPrises" multiple placeholder="Sélectionnez les consignes..." style="width:100%">
                  <el-option v-for="c in CONSIGNES_PRISE_OPTIONS" :key="c" :label="c" :value="c" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="6">
              <el-form-item label="Quantité totale">
                <el-input :model-value="editAutoQuantiteTotale" disabled />
              </el-form-item>
            </el-col>
            <el-col :span="4">
              <el-form-item label="Renouvellement">
                <el-switch v-model="editForm.renouvellement" />
              </el-form-item>
            </el-col>
            <el-col v-if="editForm.renouvellement" :span="4">
              <el-form-item label="Nombre">
                <el-input-number v-model="editForm.nbRenouvellements" :min="1" :max="12" />
              </el-form-item>
            </el-col>
          </el-row>
        </template>

        <!-- ── SOIN edit fields ─────────────────────────────────────── -->
        <template v-if="editForm.type === 'soins'">
          <el-row :gutter="16">
            <el-col :span="10">
              <el-form-item label="Type de soin" prop="medicament">
                <el-select v-model="editForm.medicament" filterable placeholder="Sélectionnez un acte..." style="width:100%">
                  <template #empty>
                    <el-empty description="Aucun acte médical configuré" :image-size="40" />
                  </template>
                  <el-option v-for="act in medicalActs" :key="act.id" :label="act.label" :value="act.label" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="4">
              <el-form-item label="Séances">
                <el-input-number v-model="editForm.nbSeances" :min="1" :max="99" />
              </el-form-item>
            </el-col>
            <el-col :span="4">
              <el-form-item label="Voie" prop="voie">
                <el-select v-model="editForm.voie" style="width:100%">
                  <el-option v-for="v in voieOptions" :key="v" :label="v" :value="v" />
                </el-select>
              </el-form-item>
            </el-col>
          </el-row>
          <el-row :gutter="16">
            <el-col :span="12">
              <el-form-item label="Objectif clinique">
                <RichTextEditor v-model="editForm.objectifClinique" :rows="2" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="Consignes spécifiques">
                <RichTextEditor v-model="editForm.consignesSpecifiques" :rows="2" />
              </el-form-item>
            </el-col>
          </el-row>
          <el-row :gutter="16">
            <el-col :span="8">
              <el-form-item label="Dispositifs">
                <el-select v-model="editForm.dispositifsMedicaux" multiple filterable placeholder="Sélectionnez..." style="width:100%">
                  <template #empty>
                    <el-empty description="Aucun type configuré" :image-size="40" />
                  </template>
                  <el-option v-for="d in dispositifTypes" :key="d.id" :label="d.label" :value="d.label" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="6">
              <el-form-item label="Professionnel">
                <el-select v-model="editForm.professionnelCible" placeholder="Professionnel..." style="width:100%">
                  <el-option v-for="p in PROFESSIONNEL_OPTIONS" :key="p" :label="p" :value="p" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="4">
              <el-form-item label="Durée (jours)" prop="duree">
                <el-input-number v-model="editForm.duree" :min="1" :max="90" />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="Type de traitement">
                <el-radio-group v-model="editForm.dureeType">
                  <el-radio value="courte">Courte durée</el-radio>
                  <el-radio value="longue">Longue durée</el-radio>
                </el-radio-group>
              </el-form-item>
            </el-col>
          </el-row>
        </template>

        <!-- ── COMMON edit fields ──────────────────────────────────── -->
        <el-row :gutter="16">
          <el-col :span="8">
            <el-form-item label="Si besoin">
              <el-switch v-model="editForm.prn" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="Type de fréquence">
          <el-radio-group v-model="editForm.frequenceType">
            <el-radio value="moments">Moments de la journée</el-radio>
            <el-radio value="fixed-times">Heures fixes</el-radio>
            <el-radio value="interval">Intervalle</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="Fréquence" prop="frequence">
          <el-select
            v-if="editForm.frequenceType === 'moments'"
            v-model="editForm.frequence" multiple placeholder="Sélectionnez les moments"
            collapse-tags collapse-tags-tooltip style="width:100%"
          >
            <el-option v-for="opt in MOMENTS_OPTIONS" :key="opt.value" :label="opt.label" :value="opt.value" />
          </el-select>
          <el-select
            v-else-if="editForm.frequenceType === 'fixed-times'"
            v-model="editForm.frequence" multiple placeholder="Sélectionnez les heures"
            collapse-tags collapse-tags-tooltip style="width:100%"
          >
            <el-option v-for="t in FIXED_TIMES_OPTIONS" :key="t" :label="t" :value="t" />
          </el-select>
          <el-select
            v-else-if="editForm.frequenceType === 'interval'"
            v-model="editForm.frequence" placeholder="Choisissez l'intervalle" style="width:100%"
          >
            <el-option
              v-for="h in INTERVAL_OPTIONS"
              :key="h"
              :label="`Toutes les ${h}h`"
              :value="`Toutes les ${h}h`"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="Instructions">
          <RichTextEditor v-model="editForm.instructions" :rows="2" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showEditDialog = false">Annuler</el-button>
        <el-button type="primary" :loading="editing" @click="onEditSubmit">Enregistrer</el-button>
      </template>
    </el-dialog>

    <!-- ================================================================ -->
    <!-- Prescription detail dialog                                       -->
    <!-- ================================================================ -->
    <el-dialog v-model="showDetailDialog" width="600px" class="prescription-detail-dialog" top="8vh">
      <template #header>
        <div class="prescription-detail__header">
          <div class="prescription-detail__title-group">
            <span class="prescription-detail__medicament">{{ selectedPrescription?.medicament }}</span>
            <span class="prescription-detail__dosage">{{ selectedPrescription?.dosage }}</span>
            <el-tag
              v-if="selectedPrescription?.type"
              :type="selectedPrescription.type === 'medicament' ? 'primary' : 'success'"
              size="small"
              effect="plain"
            >
              {{ typeLabel(selectedPrescription.type) }}
            </el-tag>
          </div>
          <el-tag :type="statutTagType(selectedPrescription?.statut)" size="small" effect="plain">
            {{ statutLabel(selectedPrescription?.statut) }}
          </el-tag>
        </div>
      </template>

      <div class="prescription-detail__body">
        <div class="prescription-detail__grid">
          <div class="prescription-detail__item">
            <span class="prescription-detail__label">Voie d'administration</span>
            <span class="prescription-detail__value">{{ selectedPrescription?.voie }}</span>
          </div>
          <div class="prescription-detail__item">
            <span class="prescription-detail__label">Durée du traitement</span>
            <span class="prescription-detail__value">{{ selectedPrescription?.duree }} jours</span>
          </div>
          <div class="prescription-detail__item">
            <span class="prescription-detail__label">Type de traitement</span>
            <span class="prescription-detail__value">{{ dureeTypeLabel(selectedPrescription?.dureeType) }}</span>
          </div>
          <div class="prescription-detail__item">
            <span class="prescription-detail__label">Fréquence</span>
            <span class="prescription-detail__value">
              {{ (selectedPrescription?.frequence || []).join(', ') || '—' }}
            </span>
          </div>
          <div class="prescription-detail__item">
            <span class="prescription-detail__label">Type de fréquence</span>
            <span class="prescription-detail__value">
              {{ frequencyTypeLabel(selectedPrescription) }}
            </span>
          </div>
          <div class="prescription-detail__item">
            <span class="prescription-detail__label">Prise si besoin (PRN)</span>
            <span class="prescription-detail__value">
              <el-tag :type="selectedPrescription?.prn ? 'warning' : 'info'" size="small" effect="plain">
                {{ selectedPrescription?.prn ? 'Oui' : 'Non' }}
              </el-tag>
            </span>
          </div>
        </div>

        <!-- ── Medicament-specific detail ──────────────────────────── -->
        <template v-if="selectedPrescription?.type === 'medicament'">
          <el-divider />
          <div class="prescription-detail__grid">
            <div class="prescription-detail__item">
              <span class="prescription-detail__label">Forme galénique</span>
              <span class="prescription-detail__value">{{ selectedPrescription.formeGalenique || '—' }}</span>
            </div>
            <div class="prescription-detail__item">
              <span class="prescription-detail__label">Consignes de prise</span>
              <span class="prescription-detail__value">{{ selectedPrescription.momentPrises || '—' }}</span>
            </div>
            <div class="prescription-detail__item">
              <span class="prescription-detail__label">Quantité totale</span>
              <span class="prescription-detail__value">{{ selectedPrescription.quantiteTotale || '—' }}</span>
            </div>
            <div class="prescription-detail__item">
              <span class="prescription-detail__label">Renouvellement</span>
              <span class="prescription-detail__value">
                {{ selectedPrescription.renouvellement ? `Oui (${selectedPrescription.nbRenouvellements || 1}×)` : 'Non' }}
              </span>
            </div>
          </div>
        </template>

        <!-- ── Soins-specific detail ────────────────────────────────── -->
        <template v-if="selectedPrescription?.type === 'soins'">
          <el-divider />
          <div class="prescription-detail__grid">
            <div class="prescription-detail__item">
              <span class="prescription-detail__label">Nombre de séances</span>
              <span class="prescription-detail__value">{{ selectedPrescription.nbSeances ?? '—' }}</span>
            </div>
            <div class="prescription-detail__item">
              <span class="prescription-detail__label">Objectif clinique</span>
              <span v-if="!isRichTextEmpty(selectedPrescription?.objectifClinique)" class="prescription-detail__value" v-html="selectedPrescription.objectifClinique" />
              <span v-else class="prescription-detail__value">—</span>
            </div>
            <div class="prescription-detail__item">
              <span class="prescription-detail__label">Consignes spécifiques</span>
              <span v-if="!isRichTextEmpty(selectedPrescription?.consignesSpecifiques)" class="prescription-detail__value" v-html="selectedPrescription.consignesSpecifiques" />
              <span v-else class="prescription-detail__value">—</span>
            </div>
            <div class="prescription-detail__item">
              <span class="prescription-detail__label">Dispositifs médicaux</span>
              <span class="prescription-detail__value">{{ selectedPrescription.dispositifsMedicaux || '—' }}</span>
            </div>
            <div class="prescription-detail__item">
              <span class="prescription-detail__label">Professionnel ciblé</span>
              <span class="prescription-detail__value">{{ selectedPrescription.professionnelCible || '—' }}</span>
            </div>
          </div>
        </template>

        <el-divider />

        <div class="prescription-detail__section">
          <h4 class="prescription-detail__section-title">Prescripteur</h4>
          <div class="prescription-detail__grid">
            <div class="prescription-detail__item">
              <span class="prescription-detail__label">Nom</span>
              <span class="prescription-detail__value">{{ selectedPrescription?.prescripteurNom || '—' }}</span>
            </div>
            <div class="prescription-detail__item">
              <span class="prescription-detail__label">Rôle</span>
              <span class="prescription-detail__value">{{ selectedPrescription?.prescripteurRole || '—' }}</span>
            </div>
            <div class="prescription-detail__item">
              <span class="prescription-detail__label">Prescrit le</span>
              <span class="prescription-detail__value">{{ formatDateTime(selectedPrescription?.createdAt) }}</span>
            </div>
            <div class="prescription-detail__item">
              <span class="prescription-detail__label">Dernière modification</span>
              <span class="prescription-detail__value">{{ formatDateTime(selectedPrescription?.updatedAt) }}</span>
            </div>
          </div>
        </div>

        <template v-if="!isRichTextEmpty(selectedPrescription?.instructions)">
          <el-divider />
          <div class="prescription-detail__section">
            <h4 class="prescription-detail__section-title">Instructions</h4>
            <div class="prescription-detail__instructions" v-html="selectedPrescription?.instructions"></div>
          </div>
        </template>
      </div>

      <template #footer>
        <div class="prescription-detail__actions">
          <el-button type="primary" @click="onEditFromDetail">
            Modifier
          </el-button>
          <el-button
            v-if="selectedPrescription?.statut === 'active'"
            type="danger"
            :loading="stoppingId === selectedPrescription?.id"
            @click="onStopFromDetail"
          >
            Arrêter
          </el-button>
          <el-button type="danger" plain @click="onDeleteFromDetail">
            Supprimer
          </el-button>

        </div>
      </template>
    </el-dialog>


  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { Plus, Edit, CircleCloseFilled, Delete } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import { ipcInvoke } from '@/utils/ipc'
import { useAuth } from '@/composables/useAuth'
import {
  MOMENTS_OPTIONS,
  FIXED_TIMES_OPTIONS,
  INTERVAL_OPTIONS,
  FORME_GALENIQUE_OPTIONS,
  PROFESSIONNEL_OPTIONS,
  CONSIGNES_PRISE_OPTIONS,
} from '@/utils/constants'
import { formatDateTime } from '@/utils/date'
import { usePrescriptions, type PrescriptionRecord } from '@/composables/usePrescriptions'
import RichTextEditor from '@/components/patients/RichTextEditor.vue'
import { isRichTextEmpty } from '@/utils/rich-text'


const route = useRoute()
const { user } = useAuth()

const { prescriptions, loading: prescriptionsLoading, fetchPrescriptions, createPrescription, updatePrescription, stopPrescription, deletePrescription } = usePrescriptions()

const patientId = computed(() => {
  const id = Number(route.params.id)
  return Number.isFinite(id) ? id : null
})

const showForm = ref(false)
const interactionWarning = ref('')
const formRef = ref<FormInstance>()
const submitting = ref(false)
const prescriptionError = ref<string | null>(null)
const stoppingId = ref<number | null>(null)

/* ── Edit state ── */
const editingPrescription = ref<PrescriptionRecord | null>(null)
const showEditDialog = ref(false)
const editFormRef = ref<FormInstance>()
const editing = ref(false)

/* ── Table filter ── */
const tableTypeFilter = ref('all')

const filterOptions = [
  { value: 'all', label: 'Tous' },
  { value: 'medicament', label: 'Médicaments' },
  { value: 'soins', label: 'Soins' },
]

const filteredPrescriptions = computed(() => {
  if (tableTypeFilter.value === 'all') return prescriptions.value
  return prescriptions.value.filter(p => p.type === tableTypeFilter.value)
})

const autoQuantiteTotale = computed(() => {
  const freqCount = Array.isArray(form.frequence) ? form.frequence.length : 0
  if (!freqCount || !form.duree) return ''
  const total = freqCount * form.duree
  return `${total} ${form.unite}`
})

const editAutoQuantiteTotale = computed(() => {
  const freqCount = Array.isArray(editForm.frequence) ? editForm.frequence.length : 0
  if (!freqCount || !editForm.duree) return ''
  const total = freqCount * editForm.duree
  return `${total} ${editForm.unite}`
})

const medicalActs = ref<{ id: number; label: string }[]>([])
const dispositifTypes = ref<{ id: number; label: string }[]>([])
const voieTypes = ref<{ id: number; label: string }[]>([])

const medicaments = [
  'Amoxicilline 500 mg', 'Furosémide 40 mg', 'Metformine 500 mg', 'Ramipril 5 mg',
  'Paracétamol 500 mg', 'Ibuprofène 400 mg', 'Warfarine 5 mg', 'Aspirine 100 mg',
  'Atorvastatine 20 mg', 'Oméprazole 20 mg',
]

const FALLBACK_VOIES = ['IV', 'PO', 'SC', 'IM', 'SL']
const voieOptions = computed(() => {
  if (voieTypes.value.length > 0) return voieTypes.value.map(v => v.label)
  return FALLBACK_VOIES
})

const UNITES = ['cp', 'UI', 'mg', 'g', 'mL', 'ampoule', 'sachet', 'cuillère', 'goutte']

/* ── Form model factory ── */
function createPrescriptionForm() {
  return {
    type: 'medicament' as 'medicament' | 'soins',
    medicament: '',
    dosage: '',
    unite: '',
    voie: '',
    duree: 7,
    dureeType: 'courte' as 'courte' | 'longue',
    prn: false,
    frequence: [] as string[],
    frequenceType: '',
    instructions: '',
    // Medicament-specific
    formeGalenique: '',
    momentPrises: [] as string[],
    quantiteTotale: '',
    renouvellement: false,
    nbRenouvellements: 0,
    // Soin-specific
    nbSeances: 1,
    objectifClinique: '',
    consignesSpecifiques: '',
    dispositifsMedicaux: [] as string[],
    professionnelCible: '',
  }
}

const form = reactive(createPrescriptionForm())

const editForm = reactive({
  ...createPrescriptionForm(),
  id: 0 as number | undefined,
})

/* ── Form validation rules ── */
const createFormRules = computed<FormRules>(() => {
  if (form.type === 'medicament') {
    return {
      medicament: [{ required: true, message: 'Choisissez un médicament', trigger: 'change' }],
      dosage: [{ required: true, message: 'Indiquez la quantité', trigger: 'blur' }],
      unite: [{ required: true, message: 'Sélectionnez l\'unité', trigger: 'change' }],
      voie: [{ required: true, message: 'Sélectionnez la voie d\'administration', trigger: 'change' }],
      duree: [{ required: true, message: 'Indiquez la durée', trigger: 'blur' }],
      frequence: [{ required: true, message: 'Sélectionnez au moins une fréquence', trigger: 'change' }],
    }
  }
  return {
    medicament: [{ required: true, message: 'Sélectionnez un acte', trigger: 'change' }],
    voie: [{ required: true, message: 'Sélectionnez la voie d\'administration', trigger: 'change' }],
    duree: [{ required: true, message: 'Indiquez la durée', trigger: 'blur' }],
    frequence: [{ required: true, message: 'Sélectionnez au moins une fréquence', trigger: 'change' }],
  }
})

const editFormRules = computed<FormRules>(() => {
  if (editForm.type === 'medicament') {
    return {
      medicament: [{ required: true, message: 'Choisissez un médicament', trigger: 'change' }],
      dosage: [{ required: true, message: 'Indiquez la quantité', trigger: 'blur' }],
      unite: [{ required: true, message: 'Sélectionnez l\'unité', trigger: 'change' }],
      voie: [{ required: true, message: 'Sélectionnez la voie d\'administration', trigger: 'change' }],
      duree: [{ required: true, message: 'Indiquez la durée', trigger: 'blur' }],
      frequence: [{ required: true, message: 'Sélectionnez au moins une fréquence', trigger: 'change' }],
    }
  }
  return {
    medicament: [{ required: true, message: 'Sélectionnez un acte', trigger: 'change' }],
    voie: [{ required: true, message: 'Sélectionnez la voie d\'administration', trigger: 'change' }],
    duree: [{ required: true, message: 'Indiquez la durée', trigger: 'blur' }],
    frequence: [{ required: true, message: 'Sélectionnez au moins une fréquence', trigger: 'change' }],
  }
})

const INTERACTIONS_DB: Record<string, string[]> = {
  Warfarine: ['Aspirine', 'Ibuprofène'],
  Aspirine: ['Warfarine', 'Ibuprofène'],
  Ibuprofène: ['Warfarine', 'Aspirine'],
}

async function loadPrescriptions() {
  if (!patientId.value) return
  prescriptionError.value = null
  try {
    await fetchPrescriptions(patientId.value)
  } catch (e) {
    prescriptionError.value = (e as Error).message
    ElMessage.error(`Erreur de chargement: ${(e as Error).message}`)
  }
}

function buildApiPayload(formData: typeof form | typeof editForm) {
  const combinedDosage = `${formData.dosage} ${formData.unite}`.trim()
  return {
    type: formData.type as 'medicament' | 'soins',
    medicament: formData.medicament,
    dosage: combinedDosage,
    voie: formData.voie,
    duree: formData.duree,
    dureeType: formData.dureeType ?? 'courte',
    frequence: formData.frequence,
    frequenceType: formData.frequenceType,
    prn: formData.prn,
    instructions: formData.instructions || null,
    // Medicament-specific
    formeGalenique: formData.formeGalenique || undefined,
    momentPrises: formData.momentPrises?.length ? formData.momentPrises.join(', ') : undefined,
    quantiteTotale: formData.type === 'medicament' && Array.isArray(formData.frequence) && formData.frequence.length > 0 && formData.duree > 0
      ? `${formData.frequence.length * formData.duree} ${formData.unite}`
      : undefined,
    renouvellement: formData.type === 'medicament' ? formData.renouvellement : undefined,
    nbRenouvellements: formData.type === 'medicament' ? formData.nbRenouvellements : undefined,
    // Soin-specific
    nbSeances: formData.type === 'soins' ? formData.nbSeances : undefined,
    objectifClinique: formData.objectifClinique || undefined,
    consignesSpecifiques: formData.consignesSpecifiques || undefined,
    dispositifsMedicaux: formData.type === 'soins' && formData.dispositifsMedicaux?.length
      ? formData.dispositifsMedicaux.join(', ')
      : undefined,
    professionnelCible: formData.professionnelCible || undefined,
  }
}

async function onPrescrire() {
  if (!formRef.value) return
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return

  // Interaction detection (only for medicament type)
  if (form.type === 'medicament') {
    const molName = form.medicament.split(' ')[0]
    let foundInteraction = false
    for (const existing of prescriptions.value) {
      const existingMol = existing.medicament.split(' ')[0]
      const dangerous = INTERACTIONS_DB[molName]
      if (dangerous?.includes(existingMol)) {
        interactionWarning.value = `⚠ Interaction détectée: ${molName} + ${existingMol}. Veuillez vérifier la prescription.`
        foundInteraction = true
        break
      }
    }
    if (!foundInteraction) {
      interactionWarning.value = ''
    }
  } else {
    interactionWarning.value = ''
  }

  if (!patientId.value) {
    ElMessage.error('Patient non valide')
    submitting.value = false
    return
  }

  submitting.value = true

  try {
    const prescripteurId = user.value?.id ?? 0
    const payload = buildApiPayload(form)
    const result = await createPrescription(patientId.value, {
      ...payload,
      prescripteurId,
    })

    if (!result) {
      ElMessage.error('Erreur de création')
      return
    }

    const itemsCount = result.itemsGenerated
    const itemLabel = itemsCount > 0
      ? ` Généré ${itemsCount} administration${itemsCount > 1 ? 's' : ''} dans le plan de distribution.`
      : ''

    ElMessage.success(`Prescription créée avec succès.${itemLabel}`)
    showForm.value = false
    formRef.value.resetFields()
    Object.assign(form, createPrescriptionForm())

    await loadPrescriptions()
  } catch (e) {
    const msg = (e as Error).message
    if (msg.includes('introuvable dans patient')) {
      ElMessage.error('Le dossier patient semble inaccessible. Veuillez rafraîchir la page.')
    } else {
      ElMessage.error(`Erreur de création: ${msg}`)
    }
  } finally {
    submitting.value = false
  }
}

async function onStop(id: number) {
  try {
    await ElMessageBox.confirm(
      'Êtes-vous sûr de vouloir arrêter cette prescription ?',
      'Confirmation',
      { confirmButtonText: 'Arrêter', cancelButtonText: 'Annuler', type: 'warning' },
    )
  } catch {
    return
  }

  stoppingId.value = id
  try {
    await stopPrescription(id)
    ElMessage.success('Prescription arrêtée')
    await loadPrescriptions()
  } catch (e) {
    ElMessage.error(`Erreur: ${(e as Error).message}`)
  } finally {
    stoppingId.value = null
  }
}

function onEdit(row: PrescriptionRecord) {
  editingPrescription.value = row
  const parts = row.dosage.split(' ')
  editForm.dosage = parts.slice(0, -1).join(' ')
  editForm.unite = parts.length > 1 ? parts[parts.length - 1] : ''
  editForm.medicament = row.medicament
  editForm.voie = row.voie
  editForm.duree = row.duree
  editForm.dureeType = (row as any).dureeType ?? 'courte'
  editForm.frequence = [...row.frequence]
  editForm.frequenceType = (row as any).frequenceType || ''
  editForm.prn = row.prn
  editForm.instructions = row.instructions || ''
  editForm.type = row.type

  // Medicament-specific
  editForm.formeGalenique = (row as any).formeGalenique || ''
  editForm.momentPrises = (row as any).momentPrises
    ? String((row as any).momentPrises).split(',').map((s: string) => s.trim()).filter(Boolean)
    : []
  editForm.quantiteTotale = (row as any).quantiteTotale || ''
  editForm.renouvellement = (row as any).renouvellement || false
  editForm.nbRenouvellements = (row as any).nbRenouvellements || 0

  // Soin-specific
  editForm.nbSeances = (row as any).nbSeances || 1
  editForm.objectifClinique = (row as any).objectifClinique || ''
  editForm.consignesSpecifiques = (row as any).consignesSpecifiques || ''
  editForm.dispositifsMedicaux = (row as any).dispositifsMedicaux
    ? String((row as any).dispositifsMedicaux).split(',').map((s: string) => s.trim()).filter(Boolean)
    : []
  editForm.professionnelCible = (row as any).professionnelCible || ''

  showEditDialog.value = true
}

async function onEditSubmit() {
  if (!editingPrescription.value) return
  const valid = await editFormRef.value?.validate().catch(() => false)
  if (!valid) return

  editing.value = true
  try {
    const payload = buildApiPayload(editForm)
    const result = await updatePrescription(editingPrescription.value.id, payload)
    if (!result) {
      ElMessage.error('Erreur de mise à jour')
      return
    }
    ElMessage.success(`Prescription modifiée — ${result.itemsGenerated} administration(s) générée(s)`)
    showEditDialog.value = false
    editingPrescription.value = null
    await loadPrescriptions()
  } catch (e) {
    ElMessage.error(`Erreur: ${(e as Error).message}`)
  }
  editing.value = false
}

async function onDelete(row: PrescriptionRecord) {
  try {
    await ElMessageBox.confirm(
      `Supprimer la prescription de ${row.medicament} ?`,
      'Confirmation',
      { type: 'warning', confirmButtonText: 'Supprimer', cancelButtonText: 'Annuler' },
    )
  } catch {
    return
  }

  try {
    await deletePrescription(row.id)
    ElMessage.success('Prescription supprimée')
    await loadPrescriptions()
  } catch (e) {
    ElMessage.error(`Erreur: ${(e as Error).message}`)
  }
}

/* ── Helpers ── */
function typeLabel(type?: string): string {
  if (type === 'medicament') return 'Médicament'
  if (type === 'soins') return 'Soin'
  return '—'
}

function tableRowClass({ row }: { row: PrescriptionRecord }): string {
  if (row.type === 'soins') return 'prescription-row--soins'
  return 'prescription-row--medicament'
}

function frequencyTypeLabel(prescription?: PrescriptionRecord | null): string {
  if (!prescription) return '—'
  const ft = (prescription as any).frequenceType
  if (ft === 'moments') return 'Moments de la journée'
  if (ft === 'fixed-times') return 'Heures fixes'
  if (ft === 'interval') return 'Intervalle'
  return '—'
}

function dureeTypeLabel(type?: string): string {
  if (type === 'longue') return 'Longue durée'
  if (type === 'courte') return 'Courte durée'
  return '—'
}

function dureeTagType(type?: string) {
  if (type === 'longue') return 'warning'
  if (type === 'courte') return 'success'
  return 'info'
}

function statutTagType(statut?: string) {
  if (statut === 'active') return 'success'
  if (statut === 'stopped') return 'danger'
  return 'info'
}

function statutLabel(statut?: string) {
  if (statut === 'active') return 'Active'
  if (statut === 'stopped') return 'Arrêtée'
  return 'Terminée'
}

function formatCompactDateTime(dateStr: string | Date | null | undefined): string {
  if (!dateStr) return '—'
  const d = typeof dateStr === 'string' ? new Date(dateStr) : dateStr
  if (isNaN(d.getTime())) return '—'
  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const hours = String(d.getHours()).padStart(2, '0')
  const minutes = String(d.getMinutes()).padStart(2, '0')
  return `${day}/${month} ${hours}:${minutes}`
}

/* ── Detail dialog ── */
const showDetailDialog = ref(false)
const selectedPrescription = ref<PrescriptionRecord | null>(null)

function onRowClick(row: PrescriptionRecord) {
  selectedPrescription.value = row
  showDetailDialog.value = true
}

function onEditFromDetail() {
  showDetailDialog.value = false
  if (selectedPrescription.value) onEdit(selectedPrescription.value)
}

function onStopFromDetail() {
  showDetailDialog.value = false
  if (selectedPrescription.value) onStop(selectedPrescription.value.id)
}

function onDeleteFromDetail() {
  showDetailDialog.value = false
  if (selectedPrescription.value) onDelete(selectedPrescription.value)
}



onMounted(() => {
  loadPrescriptions()
  ipcInvoke<{ id: number; label: string }[]>('acts:list', { activeOnly: true }).then(acts => {
    medicalActs.value = acts ?? []
  }).catch(() => {})
  if (patientId.value) {
    ipcInvoke<{ id: number; label: string }[]>('dispositif-types:list', { activeOnly: true }).then(d => {
      dispositifTypes.value = d ?? []
    }).catch(() => {})
    ipcInvoke<{ id: number; label: string }[]>('voie-types:list', { activeOnly: true }).then(v => {
      voieTypes.value = v ?? []
    }).catch(() => {})
  }
})
</script>

<style scoped>
.prescription-view__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}
.prescription-view__title {
  font-size: 16px;
  font-weight: 600;
  color: var(--cd-gray-900);
}
.prescription-view__type-filter {
  margin-bottom: 16px;
}
.prescription-view__interaction {
  margin-bottom: 16px;
}
.prescription-view__form {
  margin-bottom: 16px;
}
.prescription-view__form .el-form-item {
  margin-bottom: 22px;
}
.prescription-view__form .el-row {
  margin-bottom: 4px;
}
.prescription-view__loading {
  padding: 24px 0;
  text-align: center;
  color: var(--cd-gray-500);
}

/* ── Clickable rows ── */
.prescription-view .el-table__row {
  cursor: pointer;
}

/* ── Table cell medicament ── */
.prescription-cell__row {
  display: inline-flex;
  align-items: baseline;
  gap: 6px;
  flex-wrap: wrap;
}
.prescription-cell__medicament {
  font-weight: 600;
  font-size: 13px;
  color: var(--cd-gray-900);
  line-height: 1.4;
}
.prescription-cell__dosage {
  font-size: 12px;
  color: var(--cd-gray-500);
  line-height: 1.4;
}

/* ── Table action buttons ── */
.prescription-cell__actions {
  display: inline-flex;
  align-items: center;
  gap: 2px;
}
.prescription-cell__actions .el-button {
  margin-left: 0;
}

/* ── Row color coding by type (desktop pro) ── */
:deep(.el-table .prescription-row--medicament) {
  border-left: 5px solid #2980B9;
  background: linear-gradient(to right, rgba(41, 128, 185, 0.1), rgba(41, 128, 185, 0.02));
}
:deep(.el-table .prescription-row--soins) {
  border-left: 5px solid #27AE60;
  background: linear-gradient(to right, rgba(39, 174, 96, 0.1), rgba(39, 174, 96, 0.02));
}

:deep(.el-table .prescription-row--medicament:hover) {
  background: linear-gradient(to right, rgba(41, 128, 185, 0.18), rgba(41, 128, 185, 0.05));
}
:deep(.el-table .prescription-row--soins:hover) {
  background: linear-gradient(to right, rgba(39, 174, 96, 0.18), rgba(39, 174, 96, 0.05));
}

:deep(.el-table .prescription-row--medicament.current-row) {
  background: linear-gradient(to right, rgba(41, 128, 185, 0.22), rgba(41, 128, 185, 0.06));
}
:deep(.el-table .prescription-row--soins.current-row) {
  background: linear-gradient(to right, rgba(39, 174, 96, 0.22), rgba(39, 174, 96, 0.06));
}

/* ── Detail dialog ── */
.prescription-detail-dialog .el-dialog__header {
  padding-bottom: 12px;
}
.prescription-detail-dialog .el-dialog__body {
  padding-top: 8px;
  padding-bottom: 8px;
}
.prescription-detail__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}
.prescription-detail__title-group {
  display: flex;
  align-items: baseline;
  gap: 10px;
  flex-wrap: wrap;
}
.prescription-detail__medicament {
  font-size: 18px;
  font-weight: 700;
  color: var(--cd-gray-900);
  line-height: 1.3;
}
.prescription-detail__dosage {
  font-size: 14px;
  color: var(--cd-gray-500);
  font-weight: 500;
}
.prescription-detail__body {
  padding: 4px 0;
}
.prescription-detail__grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}
.prescription-detail__item {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.prescription-detail__label {
  font-size: 12px;
  color: var(--cd-gray-500);
  text-transform: uppercase;
  letter-spacing: 0.3px;
  font-weight: 500;
}
.prescription-detail__value {
  font-size: 14px;
  font-weight: 600;
  color: var(--cd-gray-900);
}
.prescription-detail__section {
  margin: 4px 0;
}
.prescription-detail__section-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--cd-gray-700);
  margin: 0 0 12px 0;
  text-transform: uppercase;
  letter-spacing: 0.4px;
}
.prescription-detail__instructions {
  font-size: 14px;
  color: var(--cd-gray-800);
  line-height: 1.6;
  margin: 0;
  padding: 12px;
  background: var(--cd-gray-100);
  border-radius: 6px;
}
.prescription-detail__actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

/* ── Type indicator dot ── */
.prescription-cell__row {
  display: flex;
  align-items: center;
  gap: 10px;
}
.prescription-cell__info {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}
.prescription-cell__type-label {
  display: inline-block;
  font-size: 9px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  line-height: 1.2;
  opacity: 0.7;
}
.prescription-cell__type-label--medicament {
  color: #2980B9;
}
.prescription-cell__type-label--soins {
  color: #27AE60;
}

.prescription-type-dot {
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
  margin-right: 8px;
  box-shadow: 0 0 0 2px rgba(255,255,255,0.8);
}
.prescription-type-dot--medicament {
  background: linear-gradient(135deg, #3498DB, #2980B9);
}
.prescription-type-dot--soins {
  background: linear-gradient(135deg, #2ECC71, #27AE60);
}

/* ── Type badge (desktop pro) ── */
.prescription-cell__type-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.3px;
  white-space: nowrap;
  box-shadow: 0 1px 3px rgba(0,0,0,0.12);
}
.prescription-cell__type-badge--medicament {
  background: linear-gradient(135deg, #3498DB, #2980B9);
  color: #fff;
}
.prescription-cell__type-badge--soins {
  background: linear-gradient(135deg, #2ECC71, #27AE60);
  color: #fff;
}
.prescription-cell__type-icon {
  font-size: 12px;
  line-height: 1;
}

/* ── Type filter styling ── */
.prescription-view__type-filter {
  margin-bottom: 16px;
  display: flex;
  gap: 6px;
}
.prescription-view__type-filter .el-button {
  font-weight: 500;
  font-size: 12px;
  padding: 6px 14px;
  border-radius: 16px;
  transition: all 0.2s ease;
}
.prescription-view__type-filter .el-button.el-button--primary {
  font-weight: 700;
  box-shadow: 0 1px 4px rgba(0,0,0,0.15);
}
.prescription-filter__icon {
  font-size: 13px;
  line-height: 1;
  margin-right: 2px;
}
.prescription-filter--medicament.el-button--primary {
  background: linear-gradient(135deg, #3498DB, #2980B9);
  border-color: #2980B9;
}
.prescription-filter--soins.el-button--primary {
  background: linear-gradient(135deg, #2ECC71, #27AE60);
  border-color: #27AE60;
}
</style>
