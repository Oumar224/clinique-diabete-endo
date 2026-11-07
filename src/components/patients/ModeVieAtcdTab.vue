<template>
  <el-form label-position="top" class="tab-form">
    <StagedCollapsibleSection
      :ref="setSectionRef('entourage')"
      title="Entourage &amp; Social"
      :keys="['situationFamiliale', 'isolement', 'hebergement', 'commentaireVie']"
      :model-value="data"
      @save="emit('change')"
    >
      <template #default="{ draft }">
        <el-row :gutter="16">
          <el-col :span="5">
            <el-form-item label="Situation familiale">
              <el-select v-model="draft.situationFamiliale" placeholder="Sélectionner" style="width:100%">
                <el-option label="Célibataire" value="Célibataire" />
                <el-option label="Marié" value="Marié" />
                <el-option label="Divorcé" value="Divorcé" />
                <el-option label="Veuf" value="Veuf" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="3">
            <el-form-item label="Isolement">
              <el-checkbox v-model="draft.isolement">Oui</el-checkbox>
            </el-form-item>
          </el-col>
          <el-col :span="5">
            <el-form-item label="Hébergement / Logement">
              <el-select v-model="draft.hebergement" placeholder="Sélectionner" style="width:100%">
                <el-option label="Domicile" value="Domicile" />
                <el-option label="Chez un tiers" value="Chez un tiers" />
                <el-option label="Centre" value="Centre" />
                <el-option label="SAS" value="SAS" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="24">
            <el-form-item label="Commentaire de mode de vie">
              <RichTextEditor v-model="draft.commentaireVie" :rows="1" placeholder="A à sa charge son neveu autiste..." />
            </el-form-item>
          </el-col>
        </el-row>
      </template>
    </StagedCollapsibleSection>

    <div class="section-preview">
      <FormPreview
        title="Entourage &amp; Social"
        variant="compact"
        :fields="entouragePreviewFields"
        @edit="() => openSection('entourage')"
      />
    </div>

    <StagedCollapsibleSection
      :ref="setSectionRef('autonomie')"
      title="Autonomie &amp; Dépendance (Grille SL)"
      :keys="['autonomieSL']"
      :model-value="data"
      @save="emit('change')"
    >
      <template #default="{ draft }">
        <el-row :gutter="16">
          <el-col :span="8">
            <el-form-item label="Alimentation">
              <el-radio-group v-model="draft.autonomieSL.alimentation">
                <el-radio value="Autonome">Autonome</el-radio>
                <el-radio value="Aide partielle">Aide partielle</el-radio>
                <el-radio value="Dépendance totale">Dépendance totale</el-radio>
              </el-radio-group>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="Hygiène">
              <el-radio-group v-model="draft.autonomieSL.hygiene">
                <el-radio value="Autonome">Autonome</el-radio>
                <el-radio value="Aide partielle">Aide partielle</el-radio>
                <el-radio value="Dépendance totale">Dépendance totale</el-radio>
              </el-radio-group>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="Habillage">
              <el-radio-group v-model="draft.autonomieSL.habillage">
                <el-radio value="Autonome">Autonome</el-radio>
                <el-radio value="Aide partielle">Aide partielle</el-radio>
                <el-radio value="Dépendance totale">Dépendance totale</el-radio>
              </el-radio-group>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="8">
            <el-form-item label="Déplacement">
              <el-radio-group v-model="draft.autonomieSL.deplacement">
                <el-radio value="Autonome">Autonome</el-radio>
                <el-radio value="Aide partielle">Aide partielle</el-radio>
                <el-radio value="Dépendance totale">Dépendance totale</el-radio>
              </el-radio-group>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="Continence">
              <el-radio-group v-model="draft.autonomieSL.continence">
                <el-radio value="Continence urinaire">Continence urinaire</el-radio>
                <el-radio value="Continence fécale">Continence fécale</el-radio>
                <el-radio value="Tonus pelvien">Tonus pelvien</el-radio>
              </el-radio-group>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="Classe d'Autonomie">
              <el-input :model-value="autonomieClasseOf(draft.autonomieSL)" disabled>
                <template #prefix>
                  <el-icon v-if="autonomieTagTypeOf(draft.autonomieSL) === 'success'" style="color: var(--el-color-success);"><svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 7L5 10L12 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg></el-icon>
                  <el-icon v-else-if="autonomieTagTypeOf(draft.autonomieSL) === 'warning'" style="color: var(--el-color-warning);"><svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1L1 13H13L7 1Z" stroke="currentColor" stroke-width="1" stroke-linecap="round"/><path d="M7 5V8" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/><circle cx="7" cy="10.5" r="0.5" fill="currentColor"/></svg></el-icon>
                  <el-icon v-else style="color: var(--el-color-danger);"><svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="6" stroke="currentColor" stroke-width="1"/><path d="M7 4V8" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/><circle cx="7" cy="10" r="0.5" fill="currentColor"/></svg></el-icon>
                </template>
              </el-input>
            </el-form-item>
          </el-col>
        </el-row>
      </template>
    </StagedCollapsibleSection>

    <div class="section-preview">
      <FormPreview
        title="Autonomie &amp; Dépendance (Grille SL)"
        variant="compact"
        :fields="autonomiePreviewFields"
        @edit="() => openSection('autonomie')"
      />
    </div>

    <StagedCollapsibleSection
      :ref="setSectionRef('habitus')"
      title="Habitus / Toxiques &amp; Droits"
      :keys="['comprehensionFrancais', 'tabagisme', 'tabagismeDetail', 'alcool', 'alcoolDetail', 'cannabis', 'cannabisDetail']"
      :model-value="data"
      @save="emit('change')"
    >
      <template #default="{ draft }">
        <el-row :gutter="16">
          <el-col :span="6">
            <el-form-item label="Compréhension du français" class="form-item-inline">
              <el-checkbox v-model="draft.comprehensionFrancais">Oui</el-checkbox>
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="Tabagisme" class="form-item-inline">
              <el-select v-model="draft.tabagisme" style="width:100%">
                <el-option label="Non-fumeur" value="Non-fumeur" />
                <el-option label="Fumeur actif" value="Fumeur actif" />
                <el-option label="Sevré" value="Sevré" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="Alcool" class="form-item-inline">
              <el-checkbox v-model="draft.alcool">Oui</el-checkbox>
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="Cannabis" class="form-item-inline">
              <el-checkbox v-model="draft.cannabis">Oui</el-checkbox>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row v-if="draft.tabagisme !== 'Non-fumeur'" :gutter="16">
          <el-col :span="24">
            <el-form-item label="Détail consommation tabac">
              <RichTextEditor v-model="draft.tabagismeDetail" :rows="2" placeholder="15 cigarettes/jour depuis 20 ans, sevrage en mars 2025..." />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row v-if="draft.alcool" :gutter="16">
          <el-col :span="24">
            <el-form-item label="Détail consommation alcool">
              <RichTextEditor v-model="draft.alcoolDetail" :rows="2" placeholder="3 canettes de bière/jour (2L)" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row v-if="draft.cannabis" :gutter="16">
          <el-col :span="24">
            <el-form-item label="Détail consommation cannabis">
              <RichTextEditor v-model="draft.cannabisDetail" :rows="2" placeholder="2 joints par jour, avis addictologique du 03/09/2021" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-alert
          v-if="draft.alcool || draft.cannabis"
          title="Avis addictologique requis"
          type="warning"
          show-icon
          :closable="false"
          style="margin-bottom:12px"
        >
          Une consommation active d'alcool ou de cannabis est renseignée. Veuillez préciser la date ou le statut de l'avis addictologique dans le détail ci-dessus.
        </el-alert>
      </template>
    </StagedCollapsibleSection>

    <div class="section-preview">
      <FormPreview
        title="Habitus / Toxiques &amp; Droits"
        variant="compact"
        :fields="habitusPreviewFields"
        @edit="() => openSection('habitus')"
      />
    </div>

    <StagedCollapsibleSection
      :ref="setSectionRef('allergies')"
      title="Allergies"
      :keys="['allergies']"
      :model-value="data"
      @save="emit('change')"
    >
      <template #default="{ draft }">
        <el-row :gutter="16" class="inline-entry-form">
          <el-col :span="5">
            <el-select v-model="newAllergie.type" style="width:100%">
              <el-option label="Médicamenteuse" value="Médicamenteuse" />
              <el-option label="Alimentaire" value="Alimentaire" />
              <el-option label="Latex" value="Latex" />
              <el-option label="Piqûre" value="Piqûre" />
              <el-option label="Autre" value="Autre" />
            </el-select>
          </el-col>
          <el-col :span="17">
            <el-input v-model="newAllergie.libelle" placeholder="Libellé de l'allergie" @keyup.enter="addAllergie(draft.allergies)" />
          </el-col>
          <el-col :span="2">
            <el-button type="primary" @click="addAllergie(draft.allergies)" :disabled="!newAllergie.libelle.trim()">
              <el-icon><Plus /></el-icon>
            </el-button>
          </el-col>
        </el-row>
        <div v-if="draft.allergies.length > 0" class="entry-list">
          <div
            v-for="(entry, i) in draft.allergies"
            :key="i"
            class="entry-card"
            :style="{ borderLeftColor: allergyTypeColors(entry.type).border }"
          >
            <span
              class="entry-type-badge"
              :style="{
                background: allergyTypeColors(entry.type).bg,
                color: allergyTypeColors(entry.type).text,
              }"
            >{{ entry.type }}</span>
            <span class="entry-libelle">{{ entry.libelle }}</span>
            <button class="entry-delete" @click="removeAllergie(draft.allergies, i)" title="Supprimer">
              <el-icon :size="14"><Delete /></el-icon>
            </button>
          </div>
        </div>
        <div v-else class="entry-empty">Aucune allergie renseignée</div>
        <el-alert
          v-if="draft.allergies.length > 0"
          title="Alerte allergie"
          type="error"
          show-icon
          :closable="false"
          style="margin-bottom:12px"
        >
          Une allergie a été renseignée. Veuillez vérifier et prendre les précautions nécessaires.
        </el-alert>
      </template>
    </StagedCollapsibleSection>

    <div class="section-preview">
      <FormPreview
        title="Allergies"
        variant="compact"
        :fields="allergiesPreviewFields"
        empty-text="Aucune allergie renseignée"
        @edit="() => openSection('allergies')"
      />
    </div>

    <StagedCollapsibleSection
      :ref="setSectionRef('antecedents')"
      title="Antécédents"
      :keys="['antecedents']"
      :model-value="data"
      @save="emit('change')"
    >
      <template #default="{ draft }">
        <el-row :gutter="16" class="inline-entry-form">
          <el-col :span="3">
            <el-input v-model="newAntecedent.annee" placeholder="Année" maxlength="4" @keyup.enter="addAntecedent(draft.antecedents)" />
          </el-col>
          <el-col :span="5">
            <el-select v-model="newAntecedent.type" style="width:100%">
              <el-option label="Familiale" value="Familiale" />
              <el-option label="Personnelle" value="Personnelle" />
            </el-select>
          </el-col>
          <el-col :span="14">
            <el-input v-if="newAntecedent.type === 'Familiale'" v-model="newAntecedent.libelle" placeholder="Libellé de l'antécédent" @keyup.enter="addAntecedent(draft.antecedents)" />
            <template v-else>
              <el-select v-model="newAntecedentCategorie" placeholder="Sélectionner une catégorie" style="width:100%">
                <el-option v-for="c in PERSONNELLE_CATEGORIES" :key="c" :label="c" :value="c" />
              </el-select>
              <el-input v-model="newAntecedentLibre" placeholder="Saisir l'allergie" style="margin-top:8px" @keyup.enter="addAntecedent(draft.antecedents)" />
            </template>
          </el-col>
          <el-col :span="2">
            <el-button type="primary" @click="addAntecedent(draft.antecedents)" :disabled="!antecedentLibelleValid">
              <el-icon><Plus /></el-icon>
            </el-button>
          </el-col>
        </el-row>
        <div v-if="draft.antecedents.length > 0" class="entry-list">
          <template v-for="group in antecedentGroupsOf(draft.antecedents)" :key="group.title">
            <div class="entry-group-title">{{ group.title }}</div>
            <div
              v-for="(entry, i) in group.items"
              :key="i"
              class="entry-card"
              :style="{ borderLeftColor: antecedentTypeColors(entry.type).border }"
            >
              <span v-if="entry.annee" class="entry-annee">{{ entry.annee }}</span>
              <span v-if="entry.type === 'Personnelle' && entry.categorie" class="entry-categorie">{{ entry.categorie }}</span>
              <span class="entry-libelle">{{ entry.libelle }}</span>
              <button class="entry-delete" @click="removeAntecedent(draft.antecedents, draft.antecedents.indexOf(entry))" title="Supprimer">
                <el-icon :size="14"><Delete /></el-icon>
              </button>
            </div>
          </template>
        </div>
        <div v-else class="entry-empty">Aucun antécédent renseigné</div>
      </template>
    </StagedCollapsibleSection>

    <div class="section-preview">
      <FormPreview
        title="Antécédents"
        variant="compact"
        :fields="antecedentsPreviewFields"
        empty-text="Aucun antécédent renseigné"
        @edit="() => openSection('antecedents')"
      />
    </div>
  </el-form>
</template>

<script setup lang="ts">
import { computed, ref, nextTick } from 'vue'
import { Plus, Delete } from '@element-plus/icons-vue'
import type { ModeVieAtcdData, AllergieEntry, AntecedentEntry, AutonomieSL } from '@/types/crh-diabete'
import StagedCollapsibleSection from '@/components/common/StagedCollapsibleSection.vue'
import FormPreview from '@/components/common/FormPreview.vue'
import type { FormPreviewField } from '@/components/common/FormPreview.vue'
import { useCrhDiabeteCalculations } from '@/composables/useCrhDiabeteCalculations'
import RichTextEditor from '@/components/patients/RichTextEditor.vue'
import { isRichTextEmpty } from '@/utils/rich-text'
import { allergyTypeColors, antecedentTypeColors, PERSONNELLE_CATEGORIES } from '@/utils/allergy-helpers'

const FIELD_PREFIX = 'modeVieAtcd'

const props = defineProps<{
  data: ModeVieAtcdData
  fieldMeta?: Record<string, string>
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

const { calcAutonomieClass } = useCrhDiabeteCalculations()

function autonomieClasseOf(sl: AutonomieSL): string {
  return calcAutonomieClass(sl).description
}

function autonomieTagTypeOf(sl: AutonomieSL): 'success' | 'warning' | 'danger' {
  const result = calcAutonomieClass(sl)
  if (result.classe === 'A') return 'success'
  if (result.classe === 'B') return 'warning'
  return 'danger'
}

const entouragePreviewFields = computed<FormPreviewField[]>(() => [
  { label: 'Situation familiale', value: props.data.situationFamiliale, key: `${FIELD_PREFIX}.situationFamiliale`, updatedAt: metaFor(`${FIELD_PREFIX}.situationFamiliale`), tracked: !!props.fieldMeta },
  { label: 'Isolement', value: props.data.isolement ? 'Oui' : null, key: `${FIELD_PREFIX}.isolement`, updatedAt: metaFor(`${FIELD_PREFIX}.isolement`), tracked: !!props.fieldMeta },
  { label: 'Hébergement / Logement', value: props.data.hebergement, key: `${FIELD_PREFIX}.hebergement`, updatedAt: metaFor(`${FIELD_PREFIX}.hebergement`), tracked: !!props.fieldMeta },
  { label: 'Commentaire de mode de vie', value: isRichTextEmpty(props.data.commentaireVie) ? undefined : props.data.commentaireVie, rich: true, key: `${FIELD_PREFIX}.commentaireVie`, updatedAt: metaFor(`${FIELD_PREFIX}.commentaireVie`), tracked: !!props.fieldMeta },
])

const autonomiePreviewFields = computed<FormPreviewField[]>(() => [
  { label: 'Alimentation', value: props.data.autonomieSL.alimentation, key: `${FIELD_PREFIX}.autonomieSL.alimentation`, updatedAt: metaFor(`${FIELD_PREFIX}.autonomieSL.alimentation`), tracked: !!props.fieldMeta },
  { label: 'Hygiène', value: props.data.autonomieSL.hygiene, key: `${FIELD_PREFIX}.autonomieSL.hygiene`, updatedAt: metaFor(`${FIELD_PREFIX}.autonomieSL.hygiene`), tracked: !!props.fieldMeta },
  { label: 'Habillage', value: props.data.autonomieSL.habillage, key: `${FIELD_PREFIX}.autonomieSL.habillage`, updatedAt: metaFor(`${FIELD_PREFIX}.autonomieSL.habillage`), tracked: !!props.fieldMeta },
  { label: 'Déplacement', value: props.data.autonomieSL.deplacement, key: `${FIELD_PREFIX}.autonomieSL.deplacement`, updatedAt: metaFor(`${FIELD_PREFIX}.autonomieSL.deplacement`), tracked: !!props.fieldMeta },
  { label: 'Continence', value: props.data.autonomieSL.continence, key: `${FIELD_PREFIX}.autonomieSL.continence`, updatedAt: metaFor(`${FIELD_PREFIX}.autonomieSL.continence`), tracked: !!props.fieldMeta },
])

const habitusPreviewFields = computed<FormPreviewField[]>(() => [
  { label: 'Compréhension du français', value: props.data.comprehensionFrancais ? 'Oui' : null, key: `${FIELD_PREFIX}.comprehensionFrancais`, updatedAt: metaFor(`${FIELD_PREFIX}.comprehensionFrancais`), tracked: !!props.fieldMeta },
  { label: 'Tabagisme', value: props.data.tabagisme, key: `${FIELD_PREFIX}.tabagisme`, updatedAt: metaFor(`${FIELD_PREFIX}.tabagisme`), tracked: !!props.fieldMeta },
  { label: 'Détail consommation tabac', value: isRichTextEmpty(props.data.tabagismeDetail) ? undefined : props.data.tabagismeDetail, rich: true, key: `${FIELD_PREFIX}.tabagismeDetail`, updatedAt: metaFor(`${FIELD_PREFIX}.tabagismeDetail`), tracked: !!props.fieldMeta },
  { label: 'Alcool', value: props.data.alcool ? 'Oui' : null, key: `${FIELD_PREFIX}.alcool`, updatedAt: metaFor(`${FIELD_PREFIX}.alcool`), tracked: !!props.fieldMeta },
  { label: 'Détail consommation alcool', value: isRichTextEmpty(props.data.alcoolDetail) ? undefined : props.data.alcoolDetail, rich: true, key: `${FIELD_PREFIX}.alcoolDetail`, updatedAt: metaFor(`${FIELD_PREFIX}.alcoolDetail`), tracked: !!props.fieldMeta },
  { label: 'Cannabis', value: props.data.cannabis ? 'Oui' : null, key: `${FIELD_PREFIX}.cannabis`, updatedAt: metaFor(`${FIELD_PREFIX}.cannabis`), tracked: !!props.fieldMeta },
  { label: 'Détail consommation cannabis', value: isRichTextEmpty(props.data.cannabisDetail) ? undefined : props.data.cannabisDetail, rich: true, key: `${FIELD_PREFIX}.cannabisDetail`, updatedAt: metaFor(`${FIELD_PREFIX}.cannabisDetail`), tracked: !!props.fieldMeta },
])

const allergiesPreviewFields = computed<FormPreviewField[]>(() =>
  props.data.allergies.map(a => ({
    label: a.type || 'Allergie',
    value: a.libelle,
    key: `${FIELD_PREFIX}.allergies`,
    updatedAt: metaFor(`${FIELD_PREFIX}.allergies`),
    tracked: !!props.fieldMeta,
  })),
)

function formatAntecedentPreview(a: AntecedentEntry): string {
  if (!a.categorie) {
    return [a.annee, a.libelle].filter(Boolean).join(' ')
  }
  const detail = [a.categorie, a.libelle].filter(Boolean).join(' : ')
  return [a.annee, detail].filter(Boolean).join(' · ')
}

const antecedentsPreviewFields = computed<FormPreviewField[]>(() =>
  props.data.antecedents.map(a => ({
    label: a.type || 'Antécédent',
    value: formatAntecedentPreview(a),
    key: `${FIELD_PREFIX}.antecedents`,
    updatedAt: metaFor(`${FIELD_PREFIX}.antecedents`),
    tracked: !!props.fieldMeta,
  })),
)

const newAllergie = ref<AllergieEntry>({ libelle: '', type: 'Médicamenteuse' })
const newAntecedent = ref<AntecedentEntry>({ libelle: '', annee: '', type: 'Familiale' })
const newAntecedentCategorie = ref('')
const newAntecedentLibre = ref('')

function antecedentGroupsOf(list: AntecedentEntry[]) {
  return [
    { title: 'Antécédents familiaux', items: list.filter(a => a.type === 'Familiale') },
    { title: 'Antécédents personnels', items: list.filter(a => a.type === 'Personnelle') },
  ].filter(group => group.items.length > 0)
}

const antecedentLibelleValid = computed(() => {
  if (newAntecedent.value.type === 'Familiale') {
    return newAntecedent.value.libelle.trim().length > 0
  }
  if (newAntecedentCategorie.value === '') return false
  return newAntecedentLibre.value.trim().length > 0
})

function addAllergie(list: AllergieEntry[]) {
  const val = newAllergie.value.libelle.trim()
  if (!val) return
  list.push({ ...newAllergie.value, libelle: val })
  newAllergie.value = { libelle: '', type: 'Médicamenteuse' }
}

function removeAllergie(list: AllergieEntry[], index: number) {
  list.splice(index, 1)
}

function addAntecedent(list: AntecedentEntry[]) {
  if (!antecedentLibelleValid.value) return
  const type = newAntecedent.value.type
  const annee = newAntecedent.value.annee
  if (type === 'Personnelle') {
    list.push({
      libelle: newAntecedentLibre.value.trim(),
      annee,
      type,
      categorie: newAntecedentCategorie.value,
    })
  } else {
    list.push({ libelle: newAntecedent.value.libelle.trim(), annee, type })
  }
  newAntecedent.value = { libelle: '', annee: '', type: 'Familiale' }
  newAntecedentCategorie.value = ''
  newAntecedentLibre.value = ''
}

function removeAntecedent(list: AntecedentEntry[], index: number) {
  list.splice(index, 1)
}
</script>

<style scoped>
.inline-entry-form {
  margin-bottom: 12px;
}
.section-preview {
  margin: 8px 0 16px;
}
.entry-list {
  margin-bottom: 20px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.entry-empty {
  padding: 14px 16px;
  text-align: center;
  color: var(--cde-muted);
  font-size: 13px;
  font-style: italic;
  background: var(--cde-surface-tint);
  border: 1px dashed var(--cde-border);
  border-radius: 6px;
  margin-bottom: 20px;
}
.entry-group-title {
  font-size: 12px;
  font-weight: 700;
  color: var(--cde-muted);
  text-transform: uppercase;
  letter-spacing: 0.4px;
  margin: 10px 0 2px;
}
.entry-group-title:first-child {
  margin-top: 0;
}
.entry-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  background: var(--cde-surface);
  border: 1px solid var(--cde-border);
  border-left: 3px solid var(--cde-accent);
  border-radius: 6px;
  font-size: 13px;
  transition: background-color 0.2s ease;
}
.entry-card:hover {
  background: var(--cde-surface-tint);
}
.entry-type-badge {
  display: inline-flex;
  align-items: center;
  padding: 3px 12px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 700;
  white-space: nowrap;
  letter-spacing: 0.4px;
  text-transform: uppercase;
  flex-shrink: 0;
}
.entry-libelle {
  font-weight: 600;
  flex: 1;
  color: var(--cde-header-text);
  font-size: 13px;
  line-height: 1.4;
}
.entry-annee {
  color: var(--cde-muted);
  font-size: 12px;
  font-weight: 600;
  background: var(--cde-surface-tint);
  padding: 2px 10px;
  border-radius: 4px;
  flex-shrink: 0;
}
.entry-categorie {
  color: var(--cde-muted);
  font-size: 12px;
  font-weight: 600;
  background: var(--cde-surface-tint);
  border: 1px solid var(--cde-border-soft);
  padding: 2px 10px;
  border-radius: 4px;
  flex-shrink: 0;
}
.entry-delete {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border: 1px solid transparent;
  background: transparent;
  color: var(--cde-muted);
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.15s ease;
  flex-shrink: 0;
}
.entry-delete:hover {
  background: var(--cde-danger-tint);
  color: var(--cde-danger);
  border-color: color-mix(in srgb, var(--cde-danger) 20%, transparent);
}
</style>
