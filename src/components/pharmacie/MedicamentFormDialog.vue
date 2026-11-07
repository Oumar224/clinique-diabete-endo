<template>
  <el-dialog
    v-model="visible"
    :title="editingId ? 'Modifier le produit' : 'Nouveau produit'"
    width="560px"
    :close-on-click-modal="false"
    @closed="onClosed"
  >
    <el-form
      ref="formRef"
      :model="form"
      :rules="rules"
      label-position="top"
    >
      <el-form-item label="Type de produit" prop="typeProduit">
        <el-select v-model="form.typeProduit" placeholder="Choisir..." style="width:100%">
          <el-option v-for="t in TYPES_PRODUIT" :key="t" :label="TYPE_PRODUIT_LABEL[t]" :value="t" />
        </el-select>
      </el-form-item>
      <el-form-item label="DCI / Libellé" prop="dci">
        <el-input v-model="form.dci" placeholder="Ex : Metformine" maxlength="200" />
      </el-form-item>
      <el-row :gutter="12">
        <el-col :span="12">
          <el-form-item label="Nom commercial" prop="nomCommercial">
            <el-input v-model="form.nomCommercial" placeholder="Ex : Glucophage" maxlength="200" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="Dosage" prop="dosage">
            <el-input v-model="form.dosage" placeholder="Ex : 500 mg" maxlength="100" />
          </el-form-item>
        </el-col>
      </el-row>
      <el-row :gutter="12">
        <el-col :span="12">
          <el-form-item label="Forme" prop="forme">
            <el-select v-model="form.forme" filterable allow-create placeholder="Choisir..." style="width:100%">
              <el-option v-for="f in FORMES" :key="f" :label="f" :value="f" />
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="Unité de stock" prop="uniteStock">
            <div class="unite-row">
              <el-select v-model="form.uniteStock" filterable placeholder="Choisir..." style="width:100%">
                <el-option v-for="u in uniteOptions" :key="u.value" :label="u.label" :value="u.value" />
              </el-select>
              <el-button circle title="Nouvelle unité de stock" @click="quickAddUnite('stock')">+</el-button>
            </div>
          </el-form-item>
        </el-col>
      </el-row>
      <el-form-item label="Conditionnement" prop="conditionnement">
        <el-input v-model="form.conditionnement" placeholder="Ex: boîte de 30 comprimés" maxlength="200" />
      </el-form-item>
      <el-row :gutter="12" class="contenance-row">
        <el-col :span="12">
          <el-form-item label="Contenance (qté)" prop="contenanceQte" class="is-error-multiline">
            <el-input-number v-model="form.contenanceQte" :min="0" :step="0.1" :precision="1" style="width:100%" placeholder="Ex : 30" controls-position="right" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="Unité contenance" prop="uniteContenance" class="is-error-multiline">
            <div class="unite-row">
              <el-select v-model="form.uniteContenance" filterable clearable placeholder="Choisir..." style="width:100%">
                <el-option v-for="u in uniteOptions" :key="u.value" :label="u.label" :value="u.value" />
              </el-select>
              <el-button circle title="Nouvelle unité de contenance" @click="quickAddUnite('contenance')">+</el-button>
            </div>
          </el-form-item>
        </el-col>
      </el-row>
      <el-form-item
        v-if="form.uniteStock === 'autre' || form.uniteContenance === 'autre'"
        label="Précision unité « autre »"
        prop="autreUnitePrecision"
      >
        <el-input v-model="form.autreUnitePrecision" placeholder="Ex : sachet-dose de 5 g" maxlength="100" />
      </el-form-item>
      <el-row :gutter="12">
        <el-col :span="12">
          <el-form-item label="Prix d'achat" prop="prixAchat">
            <el-input-number v-model="form.prixAchat" :min="0" :step="0.01" :precision="2" style="width:100%" placeholder="Optionnel" controls-position="right" />
          </el-form-item>
          <div class="pharmacie__hint">Optionnel — obligatoire en Phase 2</div>
        </el-col>
        <el-col :span="12">
          <el-form-item label="Prix de vente" prop="prixVente">
            <el-input-number v-model="form.prixVente" :min="0" :step="0.01" :precision="2" style="width:100%" placeholder="Optionnel" controls-position="right" />
          </el-form-item>
          <div class="pharmacie__hint">Optionnel — obligatoire en Phase 2</div>
        </el-col>
      </el-row>
      <el-form-item label="Fournisseur principal" prop="fournisseurPrincipalId">
        <div class="fournisseur-row">
          <el-select v-model="form.fournisseurPrincipalId" filterable clearable placeholder="Choisir..." style="width:100%">
            <el-option v-for="opt in fournisseurOptions" :key="opt.value" :label="opt.label" :value="opt.value" />
          </el-select>
          <el-button circle title="Nouveau fournisseur" @click="quickAddFournisseur">+</el-button>
        </div>
      </el-form-item>
      <el-row :gutter="12">
        <el-col :span="12">
          <el-form-item label="Seuil d'alerte" prop="seuilAlerte">
            <el-input-number v-model="form.seuilAlerte" :min="0" style="width:100%" controls-position="right" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="Actif" prop="actif">
            <el-switch v-model="form.actif" />
          </el-form-item>
        </el-col>
      </el-row>
    </el-form>
    <template #footer>
      <el-button @click="visible = false">Annuler</el-button>
      <el-button type="primary" :loading="submitting" @click="submit">Confirmer</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import {
  useMedicaments,
  type MedicamentDto,
  type TypeProduit,
  TYPES_PRODUIT,
  TYPE_PRODUIT_LABEL,
} from '@/composables/useMedicaments'
import { useFournisseurs } from '@/composables/useFournisseurs'
import { useUnitesStock } from '@/composables/useUnitesStock'

const emit = defineEmits<{
  saved: []
}>()

const { saveMedicament } = useMedicaments()
const { fournisseurs, fournisseurOptions, fetchFournisseurs, saveFournisseur, error: fournisseurError } = useFournisseurs()
const { unites, uniteOptions, fetchUnites, createUnite, error: uniteError } = useUnitesStock()

const FORMES = ['Comprimé', 'Comprimé LP', 'Gélule', 'Solution', 'Suspension', 'Ampoule', 'Sachet', 'Sirop', 'Pompe', 'Stylo']

const visible = ref(false)
const submitting = ref(false)
const editingId = ref<number | null>(null)
const formRef = ref<FormInstance>()

const form = reactive({
  dci: '',
  nomCommercial: '',
  dosage: '',
  forme: '',
  typeProduit: 'medicament' as TypeProduit,
  uniteStock: '',
  conditionnement: '',
  contenanceQte: null as number | null,
  uniteContenance: '',
  autreUnitePrecision: '',
  prixAchat: null as number | null,
  prixVente: null as number | null,
  fournisseurPrincipalId: null as number | null,
  seuilAlerte: 10,
  actif: true,
})

function prixValidator(_rule: unknown, value: number | null, callback: (err?: Error) => void) {
  if (value == null) return callback()
  if (typeof value !== 'number' || isNaN(value) || value < 0) {
    return callback(new Error('Le prix doit être ≥ 0'))
  }
  callback()
}

function precisionValidator(_rule: unknown, value: string, callback: (err?: Error) => void) {
  const needsPrecision = form.uniteStock === 'autre' || form.uniteContenance === 'autre'
  if (needsPrecision && !String(value ?? '').trim()) {
    return callback(new Error('La précision est requise quand l’unité est « autre »'))
  }
  callback()
}

function contenanceValidator(_rule: unknown, value: number | null, callback: (err?: Error) => void) {
  const hasQte = value != null
  const hasUnite = !!form.uniteContenance
  if (hasQte !== hasUnite) {
    return callback(new Error('Contenance : quantité et unité vont ensemble (tout ou rien)'))
  }
  callback()
}

function uniteContenanceValidator(_rule: unknown, value: string, callback: (err?: Error) => void) {
  const hasQte = form.contenanceQte != null
  const hasUnite = !!value
  if (hasQte !== hasUnite) {
    return callback(new Error('Contenance : quantité et unité vont ensemble (tout ou rien)'))
  }
  callback()
}

const rules: FormRules = {
  dci: [{ required: true, message: 'La DCI est requise', trigger: 'blur' }],
  typeProduit: [{ required: true, message: 'Le type de produit est requis', trigger: 'change' }],
  prixAchat: [{ validator: prixValidator, trigger: 'change' }],
  prixVente: [{ validator: prixValidator, trigger: 'change' }],
  autreUnitePrecision: [{ validator: precisionValidator, trigger: 'blur' }],
  contenanceQte: [{ validator: contenanceValidator, trigger: 'change' }],
  uniteContenance: [{ validator: uniteContenanceValidator, trigger: 'change' }],
}

function open(med?: MedicamentDto) {
  editingId.value = null
  form.dci = ''
  form.nomCommercial = ''
  form.dosage = ''
  form.forme = ''
  form.typeProduit = 'medicament'
  form.uniteStock = ''
  form.conditionnement = ''
  form.contenanceQte = null
  form.uniteContenance = ''
  form.autreUnitePrecision = ''
  form.prixAchat = null
  form.prixVente = null
  form.fournisseurPrincipalId = null
  form.seuilAlerte = 10
  form.actif = true
  if (med) {
    editingId.value = med.id ?? null
    form.dci = med.dci ?? ''
    form.nomCommercial = med.nomCommercial ?? ''
    form.dosage = med.dosage ?? ''
    form.forme = med.forme ?? ''
    form.typeProduit = med.typeProduit ?? 'medicament'
    form.uniteStock = med.uniteStock ?? ''
    form.conditionnement = med.conditionnement ?? ''
    form.contenanceQte = med.contenanceQte ?? null
    form.uniteContenance = med.uniteContenance ?? ''
    form.autreUnitePrecision = med.autreUnitePrecision ?? ''
    form.prixAchat = med.prixAchat ?? null
    form.prixVente = med.prixVente ?? null
    form.fournisseurPrincipalId = med.fournisseurPrincipalId ?? null
    form.seuilAlerte = med.seuilAlerte ?? 10
    form.actif = med.actif ?? true
  }
  if (fournisseurs.value.length === 0) {
    fetchFournisseurs().catch(() => undefined)
  }
  if (unites.value.length === 0) {
    fetchUnites().catch(() => undefined)
  }
  visible.value = true
}

function close() {
  visible.value = false
}

/**
 * Ajout rapide d'une unité, sur le modèle du fournisseur : une invite, un
 * référentiel partagé, et la valeur est immédiatement sélectionnée.
 *
 * @param target - Champ à renseigner après création.
 */
async function quickAddUnite(target: 'stock' | 'contenance') {
  let nom = ''
  try {
    const result = await ElMessageBox.prompt("Nom de l'unité (ex : test, kit, mmol/L)", 'Nouvelle unité', {
      confirmButtonText: 'Créer',
      cancelButtonText: 'Annuler',
      inputPattern: /\S/,
      inputErrorMessage: "Le nom de l'unité est requis",
    })
    nom = typeof result === 'string' ? result : (result as { value?: string }).value ?? ''
  } catch {
    return
  }
  nom = nom.trim()
  if (!nom) return
  const saved = await createUnite(nom)
  if (saved?.nom) {
    if (target === 'stock') form.uniteStock = saved.nom
    else form.uniteContenance = saved.nom
    ElMessage.success('Unité ajoutée')
  } else {
    ElMessage.error(uniteError.value || "Création de l'unité impossible")
  }
}

async function quickAddFournisseur() {
  let nom = ''
  try {
    const result = await ElMessageBox.prompt('Nom du fournisseur', 'Nouveau fournisseur', {
      confirmButtonText: 'Créer',
      cancelButtonText: 'Annuler',
      inputPattern: /\S/,
      inputErrorMessage: 'Le nom est requis',
    })
    nom = typeof result === 'string' ? result : (result as { value?: string }).value ?? ''
  } catch {
    return
  }
  nom = nom.trim()
  if (!nom) return
  const saved = await saveFournisseur({ nom })
  if (saved?.id != null) {
    form.fournisseurPrincipalId = saved.id
    ElMessage.success('Fournisseur créé')
  } else {
    ElMessage.error(fournisseurError.value || 'Création fournisseur impossible')
  }
}

async function submit() {
  if (!formRef.value) return
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return
  submitting.value = true
  try {
    const dto: MedicamentDto = {
      dci: form.dci.trim(),
      nomCommercial: form.nomCommercial.trim() || undefined,
      dosage: form.dosage.trim() || undefined,
      forme: form.forme || undefined,
      typeProduit: form.typeProduit,
      uniteStock: form.uniteStock || undefined,
      conditionnement: form.conditionnement.trim() || undefined,
      contenanceQte: form.contenanceQte,
      uniteContenance: form.uniteContenance || undefined,
      autreUnitePrecision: form.autreUnitePrecision.trim() || undefined,
      prixAchat: form.prixAchat,
      prixVente: form.prixVente,
      fournisseurPrincipalId: form.fournisseurPrincipalId,
      seuilAlerte: form.seuilAlerte,
      actif: form.actif,
    }
    if (editingId.value) dto.id = editingId.value
    const result = await saveMedicament(dto)
    if (result) {
      ElMessage.success(editingId.value ? 'Produit modifié' : 'Produit créé')
      emit('saved')
      visible.value = false
    }
  } finally {
    submitting.value = false
  }
}

function onClosed() {
  editingId.value = null
  formRef.value?.resetFields()
}

defineExpose({ open, close })
</script>

<style scoped>
.fournisseur-row {
  display: flex;
  gap: 8px;
  align-items: center;
}
.fournisseur-row .el-select {
  flex: 1;
}
.unite-row {
  display: flex;
  gap: 8px;
  align-items: center;
  width: 100%;
}
.unite-row .el-select {
  flex: 1;
}
.pharmacie__hint {
  font-size: 11px;
  color: var(--el-text-color-secondary);
  line-height: 1.4;
  margin-top: -12px;
  margin-bottom: 18px;
}
/* Fix chevauchement rangée contenance : les 2 validateurs miroirs affichent
   le même long message qui wrappe sur 2 lignes (~250px/col) et recouvrait
   la rangée Prix car .el-form-item__error est absolute (style.css).
   Scopé à ce dialog uniquement — ne pas toucher au global. */
.contenance-row {
  /* Réserve l'espace pour une erreur 2 lignes, même quand pas d'erreur :
     évite le saut de layout à l'apparition de l'erreur. */
  margin-bottom: 10px;
}
.is-error-multiline :deep(.el-form-item__error) {
  position: static;
  display: block;
  white-space: normal;
  word-break: break-word;
  line-height: 1.3;
  min-height: 2.6em;
}
</style>
