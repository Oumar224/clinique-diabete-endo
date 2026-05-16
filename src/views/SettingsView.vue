<template>
  <div class="settings">
    <h1 class="settings__title">Paramètres</h1>

    <el-tabs v-model="activeTab" class="settings__tabs">
      <el-tab-pane label="Services" name="services">
        <el-empty description="Configuration des services médicaux" />
      </el-tab-pane>

      <el-tab-pane label="Tarifs" name="prices">
        <div class="settings__section">
          <h2 class="settings__section-title">Devise</h2>
          <p class="settings__section-desc">Monnaie par défaut utilisée dans l'application</p>
          <el-select v-model="selectedCurrency" @change="onCurrencyChange" style="width: 240px">
            <el-option
              v-for="c in currencies"
              :key="c.code"
              :label="`${c.code} (${c.symbol})`"
              :value="c.code"
            />
          </el-select>
          <p class="settings__preview">Aperçu : <strong>{{ preview }}</strong></p>
        </div>
        <el-divider />
        <el-empty description="Gestion des tarifs des actes CCAM" />
      </el-tab-pane>

      <el-tab-pane label="Système" name="system">
        <el-empty description="Informations système et sauvegarde" />
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { CURRENCIES } from '@/currency/currency.config'
import { useCurrency } from '@/currency/useCurrency'

const activeTab = ref('services')
const currencies = computed(() => Object.values(CURRENCIES))

const { currencyCode, formatCurrency, setCurrency, loadCurrency } = useCurrency()
const selectedCurrency = ref(currencyCode.value)

const preview = computed(() => formatCurrency(12500))

function onCurrencyChange(code: string) {
  setCurrency(code)
}

onMounted(async () => {
  await loadCurrency()
  selectedCurrency.value = currencyCode.value
})
</script>

<style scoped>
.settings__section {
  margin-bottom: 16px;
}
.settings__section-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--cd-gray-900);
  margin-bottom: 4px;
}
.settings__section-desc {
  font-size: 13px;
  color: var(--cd-gray-400);
  margin-bottom: 12px;
}
.settings__preview {
  margin-top: 12px;
  font-size: 14px;
  color: var(--cd-gray-600);
}
</style>

<style scoped>
.settings__title {
  font-size: 22px;
  font-weight: 700;
  color: var(--cd-gray-900);
  margin-bottom: 24px;
}
</style>
