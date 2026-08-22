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
        <el-tag v-if="data.length > 0" size="small" effect="dark" round>{{ data.length }}</el-tag>
      </div>
      <div class="ordonnance-tab__header-actions">
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
            <el-card class="ordonnance-form-card" shadow="never">
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
                    <el-col :span="12">
                      <el-form-item :label="form.categorie === 'soins' ? 'Soin' : 'Médicament'" prop="medicament">
                        <el-select v-model="form.medicament" filterable placeholder="Rechercher..." style="width:100%">
                          <el-option v-for="m in (form.categorie === 'soins' ? soinsOptions : medicaments)" :key="m" :label="m" :value="m" />
                        </el-select>
                      </el-form-item>
                    </el-col>
                    <el-col :span="6">
                      <el-form-item label="Dosage" prop="dosage">
                        <el-input v-model="form.dosage" placeholder="500" />
                      </el-form-item>
                    </el-col>
                    <el-col :span="6">
                      <el-form-item label="Unité" prop="unite">
                        <el-select v-model="form.unite" placeholder="Unité" style="width:100%">
                          <el-option v-for="u in UNITES" :key="u" :label="u" :value="u" />
                        </el-select>
                      </el-form-item>
                    </el-col>
                  </el-row>

                  <el-row :gutter="12">
                    <el-col :span="4">
                      <el-form-item label="Voie" prop="voie">
                        <el-select v-model="form.voie" placeholder="Voie" style="width:100%">
                          <el-option v-for="v in VOIES" :key="v" :label="v" :value="v" />
                        </el-select>
                      </el-form-item>
                    </el-col>
                    <el-col :span="4">
                      <el-form-item label="Durée (jours)" prop="duree">
                        <el-input-number v-model="form.duree" :min="1" :max="365" style="width:100%" />
                      </el-form-item>
                    </el-col>
                    <el-col :span="8">
                      <el-form-item label="Type de traitement">
                        <el-radio-group v-model="form.dureeType">
                          <el-radio-button value="courte">Courte durée</el-radio-button>
                          <el-radio-button value="longue">Longue durée</el-radio-button>
                        </el-radio-group>
                      </el-form-item>
                    </el-col>
                    <el-col :span="8">
                      <el-form-item label="Forme galénique">
                        <el-select v-model="form.formeGalenique" placeholder="Choisir..." style="width:100%">
                          <el-option v-for="fg in FORME_GALENIQUE_OPTIONS" :key="fg" :label="fg" :value="fg" />
                        </el-select>
                      </el-form-item>
                    </el-col>
                  </el-row>

                  <el-row :gutter="12">
                    <el-col :span="10">
                      <el-form-item label="Consignes de prise">
                        <el-select v-model="form.momentPrises" multiple placeholder="Sélectionnez..." style="width:100%" collapse-tags collapse-tags-tooltip>
                          <el-option v-for="c in CONSIGNES_PRISE_OPTIONS" :key="c" :label="c" :value="c" />
                        </el-select>
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

                  <el-row :gutter="12">
                    <el-col :span="24">
                      <el-form-item label="Instructions">
                        <RichTextEditor v-model="form.instructions" :rows="2" placeholder="Instructions complémentaires..." />
                      </el-form-item>
                    </el-col>
                  </el-row>
                </template>

                <template v-else>
                  <el-row :gutter="12">
                    <el-col :span="24">
                      <el-form-item :label="form.categorie === 'examen' ? 'Examen' : 'Spécialité'" :prop="form.categorie === 'examen' ? 'examen' : 'specialite'">
                        <el-select
                          v-if="form.categorie === 'examen'"
                          v-model="form.examen"
                          filterable allow-create default-first-option
                          placeholder="Rechercher ou créer..." style="width:100%"
                        >
                          <el-option v-for="opt in examOptions" :key="opt" :label="opt" :value="opt" />
                        </el-select>
                        <el-select
                          v-else
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
                      <el-form-item label="Motif">
                        <RichTextEditor v-model="form.motif" :rows="2" placeholder="Motif (optionnel)..." />
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
            </el-card>
          </CollapsibleSection>
        </transition>

        <el-empty v-if="!showForm && data.length === 0" description="Aucune prescription de sortie" :image-size="60" />
      </div>

      <!-- Colonne droite : Aperçu groupé par catégorie -->
      <div class="ordonnance-tab__preview-col">
        <div v-for="group in groupedData" :key="group.categorie" class="ordonnance-group">
          <div class="ordonnance-group__header">
            <div class="ordonnance-group__title">
              <span>{{ group.label }}</span>
              <el-tag v-if="group.items.length > 0" size="small" type="info" effect="plain" round>{{ group.items.length }}</el-tag>
            </div>
            <el-button v-if="!readonly" size="small" :icon="Plus" @click="openAddForm(group.categorie)">
              Ajouter
            </el-button>
          </div>

          <div v-if="group.items.length > 0" class="ordonnance-group__cards">
            <div v-for="rx in group.items" :key="rx._key" class="rx-card" :class="`rx-card--${group.categorie}`">
              <template v-if="group.categorie === 'medicament' || group.categorie === 'soins'">
                <div class="rx-card__header">
                  <div class="rx-card__title-group">
                    <span class="rx-card__medicament">{{ rx.medicament }}</span>
                    <span class="rx-card__dosage">{{ rx.dosage }} {{ rx.unite }}</span>
                  </div>
                  <el-tag v-if="rx.renouvellement" type="warning" size="small" effect="plain" round>
                    Renouvellement ×{{ rx.nbRenouvellements }}
                  </el-tag>
                </div>
                <div class="rx-card__tags">
                  <el-tag v-if="rx.voie" size="small" effect="plain" type="info">{{ rx.voie }}</el-tag>
                  <el-tag size="small" effect="plain" type="info">{{ rx.duree }} jours</el-tag>
                  <el-tag v-if="rx.dureeType" size="small" effect="plain" :type="dureeTagType(rx.dureeType)">
                    {{ dureeTypeLabel(rx.dureeType) }}
                  </el-tag>
                  <el-tag size="small" effect="plain" type="info">{{ frequenceLabel(rx) }}</el-tag>
                  <el-tag v-if="rx.formeGalenique" size="small" effect="plain">{{ rx.formeGalenique }}</el-tag>
                </div>
                <div v-if="(rx.momentPrises ?? []).length > 0" class="rx-card__details">
                  <span>{{ (rx.momentPrises ?? []).join(' · ') }}</span>
                </div>
                <div v-if="!isRichTextEmpty(rx.instructions)" class="rx-card__details rx-card__details--rich" v-html="rx.instructions" />
              </template>
              <template v-else>
                <div class="rx-card__header">
                  <div class="rx-card__title-group">
                    <span class="rx-card__medicament">{{ rx.examen || rx.specialite }}</span>
                  </div>
                </div>
                <div v-if="!isRichTextEmpty(rx.motif)" class="rx-card__details rx-card__details--rich" v-html="rx.motif" />
              </template>
              <div v-if="!readonly" class="rx-card__actions">
                <el-button size="small" text type="primary" :icon="Edit" @click="editPrescription(dataIndexOf(rx))">Modifier</el-button>
                <el-button size="small" text type="danger" :icon="Delete" @click="removePrescription(dataIndexOf(rx))">Supprimer</el-button>
              </div>
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
  </div>
</template>

<script setup lang="ts">
/* eslint-disable vue/no-mutating-props -- Commit volontaire dans l'objet réactif partagé data (push/splice) déclenché par validation du formulaire ou par le pré-remplissage, suivi de l'émission explicite de 'change' */
import { ref, reactive, computed, inject, onMounted, watch } from 'vue'
import type { Ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import { Plus, Edit, Delete } from '@element-plus/icons-vue'
import type { PrescriptionSortie, PrescriptionSortieCategorie } from '@/types/crh-diabete'
import RichTextEditor from '@/components/patients/RichTextEditor.vue'
import CollapsibleSection from '@/components/common/CollapsibleSection.vue'
import { isRichTextEmpty } from '@/utils/rich-text'
import { ipcInvoke } from '@/utils/ipc'
import type { PrescriptionRecord } from '@/composables/usePrescriptions'
import type { ExamRequestDto } from '@/composables/useExamRequests'
import { useExamTypes } from '@/composables/useExamTypes'
import { useSpecialties } from '@/composables/useSpecialties'
import {
  MOMENTS_OPTIONS,
  FIXED_TIMES_OPTIONS,
  INTERVAL_OPTIONS,
  FORME_GALENIQUE_OPTIONS,
  CONSIGNES_PRISE_OPTIONS,
} from '@/utils/constants'

const props = defineProps<{
  data: PrescriptionSortie[]
  readonly: boolean
  fieldMeta?: Record<string, string>
  patientId?: number | null
  dateEntree?: string
}>()

const emit = defineEmits<{ change: [] }>()

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

const medicaments = [
  'Amoxicilline 500 mg', 'Furosémide 40 mg', 'Metformine 500 mg', 'Ramipril 5 mg',
  'Paracétamol 500 mg', 'Ibuprofène 400 mg', 'Warfarine 5 mg', 'Aspirine 100 mg',
  'Atorvastatine 20 mg', 'Oméprazole 20 mg', 'Levothyrox 75 µg', 'Metoprolol 50 mg',
  'Amlodipine 5 mg', 'Gliclazide 80 mg', 'Insuline Glargine', 'Pantoprazole 40 mg',
]
const soinsOptions = [
  'Pansement quotidien', 'Soins de plaie', 'Bande de contention', 'Vessie de glace',
  'Toilette au lit', 'Surveillance glycémie capillaire', 'Massage préventif', 'Autre soin',
]
const UNITES = ['cp', 'UI', 'mg', 'g', 'mL', 'ampoule', 'sachet', 'goutte']
const VOIES = ['VO', 'IV', 'IM', 'SC', 'SL', 'IP', 'Rectale', 'Cutanée']

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
  frequenceType: string
  frequence: string[] | string
  instructions: string
  examen: string
  specialite: string
  motif: string
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
    frequenceType: 'moments',
    frequence: [],
    instructions: '',
    examen: '',
    specialite: '',
    motif: '',
  }
}

const form = reactive(createForm())

const formRules = computed<FormRules>(() => {
  if (form.categorie === 'examen') {
    return {
      examen: [{ required: true, message: 'Choisissez un examen', trigger: 'change' }],
    }
  }
  if (form.categorie === 'avis') {
    return {
      specialite: [{ required: true, message: 'Choisissez une spécialité', trigger: 'change' }],
    }
  }
  return {
    medicament: [{ required: true, message: 'Choisissez un médicament', trigger: 'change' }],
    dosage: [{ required: true, message: 'Indiquez la quantité', trigger: 'blur' }],
    unite: [{ required: true, message: 'Sélectionnez l\'unité', trigger: 'change' }],
    voie: [{ required: true, message: 'Sélectionnez la voie', trigger: 'change' }],
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
const examOptions = ref<string[]>([])
const specialtyOptions = computed(() => specialties.value.map(s => s.name))
let examOptionsLoaded = false
let specialtiesLoaded = false

async function loadCategoryOptions(categorie: PrescriptionSortieCategorie) {
  try {
    if (categorie === 'examen' && !examOptionsLoaded) {
      examOptionsLoaded = true
      const labels = new Set<string>()
      await fetchAllByCategory('imagerie')
      for (const t of allTypes.value) if (t.label) labels.add(t.label)
      await fetchAllByCategory('laboratoire')
      for (const t of allTypes.value) if (t.label) labels.add(t.label)
      examOptions.value = [...labels].sort((a, b) => a.localeCompare(b))
    }
    if (categorie === 'avis' && !specialtiesLoaded) {
      specialtiesLoaded = true
      await fetchSpecialties(true)
    }
  } catch {
    examOptionsLoaded = false
    specialtiesLoaded = false
  }
}

function openAddForm(categorie: PrescriptionSortieCategorie = 'medicament') {
  Object.assign(form, createForm())
  form.categorie = categorie
  editingIndex.value = null
  showForm.value = true
  void loadCategoryOptions(categorie)
}

function editPrescription(idx: number) {
  const rx = props.data[idx]
  Object.assign(form, {
    categorie: rx.categorie ?? 'medicament',
    medicament: rx.medicament,
    dosage: rx.dosage,
    unite: rx.unite,
    voie: rx.voie,
    duree: rx.duree,
    dureeType: rx.dureeType ?? 'courte',
    formeGalenique: rx.formeGalenique,
    momentPrises: [...(rx.momentPrises ?? [])],
    renouvellement: rx.renouvellement,
    nbRenouvellements: rx.nbRenouvellements,
    frequenceType: rx.frequenceType,
    // The `interval` el-select is single-mode and binds a plain string, while
    // `moments`/`fixed-times` are multi-selects that bind an array.
    frequence: rx.frequenceType === 'interval'
      ? (rx.frequence[0] ?? '')
      : [...rx.frequence],
    instructions: rx.instructions,
    examen: rx.examen ?? '',
    specialite: rx.specialite ?? '',
    motif: rx.motif ?? '',
  })
  editingIndex.value = idx
  showForm.value = true
  void loadCategoryOptions(form.categorie)
}

function dataIndexOf(rx: PrescriptionSortie): number {
  return props.data.findIndex(d => d._key === rx._key)
}

async function onSubmit() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return

  const cat = form.categorie
  const isMed = cat === 'medicament' || cat === 'soins'
  const prescription: PrescriptionSortie = {
    _key: editingIndex.value !== null ? props.data[editingIndex.value]._key : crypto.randomUUID(),
    categorie: cat,
    medicament: isMed ? form.medicament : '',
    dosage: isMed ? form.dosage : '',
    unite: isMed ? form.unite : '',
    voie: isMed ? form.voie : '',
    duree: isMed ? form.duree : 7,
    dureeType: isMed ? form.dureeType : 'courte',
    formeGalenique: isMed ? form.formeGalenique : '',
    momentPrises: isMed ? [...form.momentPrises] : [],
    renouvellement: isMed ? form.renouvellement : false,
    nbRenouvellements: isMed ? form.nbRenouvellements : 1,
    frequenceType: isMed ? form.frequenceType : 'moments',
    // For the `interval` mode `form.frequence` is a single string (single-mode
    // el-select); wrap it in an array instead of spreading it char-by-char.
    frequence: isMed ? (Array.isArray(form.frequence) ? [...form.frequence] : [form.frequence]) : [],
    instructions: isMed ? form.instructions : '',
    examen: cat === 'examen' ? form.examen : '',
    specialite: cat === 'avis' ? form.specialite : '',
    motif: cat === 'examen' || cat === 'avis' ? form.motif : '',
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
  if (cat === 'examen') return `examen|${rx.examen ?? ''}`
  if (cat === 'avis') return `avis|${rx.specialite ?? ''}`
  return `${cat}|${rx.medicament}`
}

function toPrescriptionItem(p: PrescriptionRecord, categorie: PrescriptionSortieCategorie): PrescriptionSortie {
  return {
    _key: crypto.randomUUID(),
    categorie,
    medicament: p.medicament,
    dosage: p.dosage ?? '',
    unite: '',
    voie: p.voie ?? '',
    duree: p.duree ?? 7,
    dureeType: p.dureeType ?? 'courte',
    frequence: Array.isArray(p.frequence) ? [...p.frequence] : (p.frequence ? [p.frequence] : []),
    frequenceType: p.frequenceType ?? 'moments',
    instructions: p.instructions ?? '',
    formeGalenique: p.formeGalenique ?? '',
    momentPrises: p.momentPrises ? String(p.momentPrises).split(',').map(s => s.trim()).filter(Boolean) : [],
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
    specialite: '',
    motif: '',
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
        candidates.push({ ...baseExamenItem(), examen: r.examenLabel ?? '', motif: r.motif ?? '' })
      } else if (r.type === 'laboratoire') {
        const label = (r.examIds ?? []).map(id => labLabels.get(id)).filter(Boolean).join(', ') || r.examenLabel || ''
        if (!label) continue
        candidates.push({ ...baseExamenItem(), examen: label, motif: r.motif ?? '' })
      } else if (r.type === 'avis') {
        candidates.push({
          ...baseExamenItem(),
          categorie: 'avis',
          specialite: r.specialtyName || r.specialite || 'Avis spécialisé',
          motif: r.motif ?? '',
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

onMounted(() => {
  if (!props.readonly && props.patientId && props.data.length === 0 && !autoPrefillDone) {
    autoPrefillDone = true
    void loadDefaults()
  }
})
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
  padding: 12px 20px;
  background: linear-gradient(135deg, var(--cd-primary), #1ABC9C);
  border-radius: 8px 8px 0 0;
  color: white;
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
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  flex: 1;
  overflow: auto;
  padding: 20px;
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color-light);
  border-top: none;
  border-radius: 0 0 8px 8px;
}

.ordonnance-tab__form-col {
  display: flex;
  flex-direction: column;
}

.ordonnance-tab__preview-col {
  display: flex;
  flex-direction: column;
}

.ordonnance-group {
  margin-bottom: 20px;
}

.ordonnance-group:last-child {
  margin-bottom: 0;
}

.ordonnance-group__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.ordonnance-group__title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.4px;
  color: var(--cd-gray-500);
}

.ordonnance-group__cards {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.ordonnance-form-card {
  border: 1px solid var(--el-border-color-light);
  border-radius: 8px;
}

.ordonnance-form-card :deep(.el-card__header) {
  padding: 10px 16px;
  background: var(--cd-gray-50);
  border-bottom: 1px solid var(--el-border-color-light);
}

.ordonnance-form-card__actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  padding-top: 4px;
}

.rx-card {
  background: white;
  border: 1px solid var(--el-border-color-lighter);
  border-left: 4px solid var(--el-color-success);
  border-radius: 8px;
  padding: 14px 16px;
  transition: box-shadow 0.2s, transform 0.15s;
}

.rx-card:hover {
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  transform: translateY(-1px);
}

.rx-card--soins {
  border-left-color: var(--el-color-primary);
}

.rx-card--examen {
  border-left-color: #9B59B6;
}

.rx-card--avis {
  border-left-color: #E67E22;
}

.rx-card__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 8px;
}

.rx-card__title-group {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.rx-card__medicament {
  font-size: 14px;
  font-weight: 700;
  color: var(--cd-gray-900);
}

.rx-card__dosage {
  font-size: 13px;
  color: var(--cd-gray-500);
}

.rx-card__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-bottom: 6px;
}

.rx-card__details {
  font-size: 12px;
  color: var(--cd-gray-500);
  line-height: 1.5;
}

.rx-card__details--italic {
  font-style: italic;
}

.rx-card__details--rich {
  font-style: normal;
  overflow-wrap: anywhere;
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
  border-left: 3px solid #d1d5db;
  margin: 4px 0;
  padding: 2px 8px;
  color: #4b5563;
  font-style: italic;
}
.rx-card__details--rich :deep(pre) {
  background: #f3f4f6;
  border: 1px solid #e5e7eb;
  padding: 8px;
  font-family: monospace;
  font-size: 11px;
  white-space: pre-wrap;
  margin: 4px 0;
}
.rx-card__details--rich :deep(code) {
  background: #f3f4f6;
  font-family: monospace;
  font-size: 11px;
  padding: 1px 3px;
}
.rx-card__details--rich :deep(hr) {
  border: none;
  border-top: 1px solid #d1d5db;
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
  color: #2563eb;
  text-decoration: underline;
}

.rx-card__actions {
  display: flex;
  justify-content: flex-end;
  gap: 4px;
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid var(--el-border-color-lighter);
}

.ordonnance-summary {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: var(--cd-gray-50);
  border: 1px solid var(--el-border-color-light);
  border-top: none;
  border-radius: 0 0 8px 8px;
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
