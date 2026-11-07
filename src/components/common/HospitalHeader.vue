<template>
  <div class="hospital-header">
    <div v-if="showRepublic" class="hospital-header__republic">
      <div class="hospital-header__republic-title">RÉPUBLIQUE DE GUINÉE</div>
      <div class="hospital-header__republic-sub">Travail — Justice — Solidarité</div>
    </div>
    <div v-if="showRepublic" class="hospital-header__sep">✶ ✶ ✶</div>
    <div class="hospital-header__main">
      <img v-if="logo" :src="logo" alt="Logo établissement" class="hospital-header__logo" />
      <div v-else class="hospital-header__logo-fallback" aria-hidden="true">CDE</div>
      <div class="hospital-header__text">
        <div class="hospital-header__name">{{ displayName }}</div>
        <div class="hospital-header__addr">{{ displayAddress }}</div>
        <div class="hospital-header__contact">{{ displayContact }}</div>
        <div v-if="displayReg" class="hospital-header__reg">N° agrément : {{ displayReg }}</div>
      </div>
      <div v-if="docTitle || docRef" class="hospital-header__doc">
        <div v-if="docTitle" class="hospital-header__doc-title">{{ docTitle }}</div>
        <div v-if="docRef" class="hospital-header__doc-ref">Réf : {{ docRef }}</div>
        <div v-if="docDate" class="hospital-header__doc-date">{{ docDate }}</div>
      </div>
    </div>
    <div class="hospital-header__rule">━ ━ ━ ━ ━ ━ ━ ━ ━ ━ ━ ━ ━ ━ ━ ━ ━ ━ ━ ━ ━ ━ ━ ━ ━ ━ ━ ━ ━ ━ ━ ━ ━ ━ ━ ━ ━ ━ ━ ━</div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

export interface HospitalHeaderInfo {
  name?: string
  address?: string
  phone?: string
  email?: string
  city?: string
  regNumber?: string
}

const props = withDefaults(
  defineProps<{
    info?: HospitalHeaderInfo | null
    logo?: string | null
    docTitle?: string
    docRef?: string
    docDate?: string
    showRepublic?: boolean
  }>(),
  {
    info: null,
    logo: null,
    docTitle: '',
    docRef: '',
    docDate: '',
    showRepublic: true,
  },
)

const displayName = computed(
  () => props.info?.name?.trim() || 'Clinique Diabète & Endocrinologie',
)
const displayAddress = computed(() => {
  const full = [props.info?.address?.trim(), props.info?.city?.trim()]
    .filter(Boolean)
    .join(', ')
  return full || 'Conakry, République de Guinée'
})
const displayContact = computed(() => {
  const tel = props.info?.phone?.trim() || '+224 000 00 00 00'
  const email = props.info?.email?.trim()
  return email ? `Tél : ${tel} — Email : ${email}` : `Tél : ${tel}`
})
const displayReg = computed(() => props.info?.regNumber?.trim() || '')
</script>

<style scoped>
.hospital-header {
  font-family: Arial, Helvetica, sans-serif;
  color: #111;
}
.hospital-header__republic {
  text-align: center;
  margin-bottom: 4px;
}
.hospital-header__republic-title {
  font-size: 13px;
  font-weight: 800;
  letter-spacing: 1.5px;
  color: #0b3b6b;
}
.hospital-header__republic-sub {
  font-size: 11px;
  font-weight: 600;
  color: #555;
  letter-spacing: 0.8px;
}
.hospital-header__sep {
  text-align: center;
  font-size: 11px;
  color: #999;
  margin: 4px 0;
}
.hospital-header__main {
  display: flex;
  align-items: center;
  gap: 14px;
  margin: 6px 0 4px;
}
.hospital-header__logo {
  height: 65px;
  width: auto;
  flex-shrink: 0;
  object-fit: contain;
}
.hospital-header__logo-fallback {
  height: 56px;
  min-width: 56px;
  padding: 0 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  font-weight: 800;
  font-size: 22px;
  color: #fff;
  background: #1a5fb4;
  border-radius: 8px;
  letter-spacing: 1px;
}
.hospital-header__text {
  flex: 1;
  min-width: 0;
}
.hospital-header__name {
  font-size: 16px;
  font-weight: 800;
  color: #0b3b6b;
}
.hospital-header__addr,
.hospital-header__contact,
.hospital-header__reg {
  font-size: 12px;
  color: #555;
  margin-top: 1px;
}
.hospital-header__doc {
  text-align: right;
  flex-shrink: 0;
}
.hospital-header__doc-title {
  font-size: 24px;
  font-weight: 800;
  letter-spacing: 2px;
  color: #111;
}
.hospital-header__doc-ref {
  font-size: 14px;
  font-weight: 700;
  font-family: 'Courier New', Courier, monospace;
  color: #333;
}
.hospital-header__doc-date {
  font-size: 12px;
  color: #555;
}
.hospital-header__rule {
  text-align: center;
  font-size: 11px;
  color: #999;
  margin: 6px 0 12px;
  border-bottom: 3px solid #1a5fb4;
  padding-bottom: 8px;
  overflow: hidden;
  white-space: nowrap;
}

@media print {
  .hospital-header__main {
    align-items: center;
  }
}
</style>
