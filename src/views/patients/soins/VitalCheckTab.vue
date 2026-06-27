<template>
  <div class="vital-check">
    <el-card>
      <template #header>
        <span><strong>Constantes vitales — {{ today }}</strong></span>
      </template>

      <el-form ref="formRef" :model="form" :rules="formRules" label-position="top" size="small">
        <el-row :gutter="24">
          <el-col :span="6">
            <el-form-item label="TA Systolique (mmHg)" prop="taSystolique">
              <el-input-number v-model="form.taSystolique" :min="60" :max="260" :step="2" />
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="TA Diastolique (mmHg)" prop="taDiastolique">
              <el-input-number v-model="form.taDiastolique" :min="30" :max="150" :step="2" />
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="Fréquence cardiaque (bpm)" prop="frequenceCardiaque">
              <el-input-number v-model="form.frequenceCardiaque" :min="20" :max="250" :step="1" />
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="Température (°C)" prop="temperature">
              <el-input-number v-model="form.temperature" :min="34" :max="42" :step="0.1" :precision="1" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="24">
          <el-col :span="6">
            <el-form-item label="Glycémie (g/L)" prop="glycemie">
              <el-input-number v-model="form.glycemie" :min="0.1" :max="6" :step="0.1" :precision="2" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row>
          <el-col>
            <el-button type="primary" @click="onSave">Enregistrer les constantes</el-button>
          </el-col>
        </el-row>
      </el-form>

      <el-divider />

      <div class="vital-check__last">
        <h4>Dernières constantes enregistrées</h4>
        <div v-if="vitalSigns" class="vital-check__values">
          <div class="vital-check__value">
            <span class="vital-check__label">TA</span>
            <span class="vital-check__data">{{ vitalSigns.taSystolique }}/{{ vitalSigns.taDiastolique }} mmHg</span>
          </div>
          <div class="vital-check__value">
            <span class="vital-check__label">FC</span>
            <span class="vital-check__data">{{ vitalSigns.frequenceCardiaque }} bpm</span>
          </div>
          <div class="vital-check__value">
            <span class="vital-check__label">T°</span>
            <span class="vital-check__data">{{ vitalSigns.temperature }} °C</span>
          </div>
          <div class="vital-check__value">
            <span class="vital-check__label">Glycémie</span>
            <span class="vital-check__data" :class="{ 'vital-check__data--high': (vitalSigns.glycemie ?? 0) > 1.1 }">
              {{ vitalSigns.glycemie }} g/L
            </span>
          </div>
        </div>
        <el-empty v-else description="Aucune constante enregistrée aujourd'hui" :image-size="40" />
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive, watch } from 'vue'
import type { FormInstance, FormRules } from 'element-plus'
import { useVitalSigns, type VitalSigns } from '@/composables/useVitalSigns'

const formRef = ref<FormInstance>()
const { vitalSigns, saveVitalSigns } = useVitalSigns()

const today = computed(() =>
  new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
)

const form = reactive({
  taSystolique: 120 as number | null,
  taDiastolique: 80 as number | null,
  frequenceCardiaque: 72 as number | null,
  temperature: 37.0 as number | null,
  glycemie: null as number | null,
})

const formRules: FormRules = {
  taSystolique: [{ required: true, message: 'Requis', trigger: 'blur' }],
  taDiastolique: [{ required: true, message: 'Requis', trigger: 'blur' }],
  frequenceCardiaque: [{ required: true, message: 'Requis', trigger: 'blur' }],
  temperature: [{ required: true, message: 'Requis', trigger: 'blur' }],
}

// When vital signs are loaded, pre-fill the form
watch(vitalSigns, (signs) => {
  if (signs) {
    form.taSystolique = signs.taSystolique
    form.taDiastolique = signs.taDiastolique
    form.frequenceCardiaque = signs.frequenceCardiaque
    form.temperature = signs.temperature
    form.glycemie = signs.glycemie
  }
}, { immediate: false })

async function onSave() {
  if (!formRef.value) return
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return

  const signs: VitalSigns = {
    date: new Date().toISOString(),
    taSystolique: form.taSystolique,
    taDiastolique: form.taDiastolique,
    frequenceCardiaque: form.frequenceCardiaque,
    temperature: form.temperature,
    glycemie: form.glycemie,
  }

  await saveVitalSigns(signs)
}
</script>

<style scoped>
.vital-check__last {
  margin-top: 8px;
}
.vital-check__last h4 {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 12px;
  color: var(--cd-gray-900);
}
.vital-check__values {
  display: flex;
  gap: 24px;
  flex-wrap: wrap;
}
.vital-check__value {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 12px 16px;
  background: var(--cd-gray-50);
  border-radius: 8px;
  min-width: 120px;
}
.vital-check__label {
  font-size: 11px;
  font-weight: 600;
  color: var(--cd-gray-400);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.vital-check__data {
  font-size: 18px;
  font-weight: 700;
  color: var(--cd-gray-900);
}
.vital-check__data--high {
  color: var(--cd-secondary);
}
</style>
