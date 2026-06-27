<template>
  <el-dialog v-model="visible" title="Aperçu avant impression" width="95%" fullscreen top="0" class="print-dialog">
    <div id="print-area" class="print-content">
      <div class="republique">
        <div class="rep-devise">RÉPUBLIQUE DE GUINÉE</div>
        <div class="rep-devise-sub">Travail — Justice — Solidarité</div>
      </div>
      <div class="separator">✶ ✶ ✶</div>

      <div class="print-header">
        <div class="print-header-text">
          <div class="institution-name">{{ hospitalName }}</div>
          <div class="institution-addr">{{ hospitalAddress }}</div>
          <div class="institution-contact">
            Tél : {{ hospitalPhone }}{{ hospitalEmail ? ` | Email : ${hospitalEmail}` : '' }}
          </div>
          <div v-if="hospitalRegNumber" class="institution-reg">
            N° agrément : {{ hospitalRegNumber }}
          </div>
        </div>
      </div>

      <div class="separator">━ ━ ━ ━ ━ ━ ━ ━ ━ ━ ━ ━ ━ ━ ━ ━ ━ ━ ━ ━ ━ ━ ━ ━</div>

      <div class="doc-title-block">
        <div class="doc-title">Liste des utilisateurs</div>
        <div class="doc-meta">
          <span class="doc-date">Éditée le {{ formatDate(new Date()) }}</span>
          <span class="doc-total">Total : <strong>{{ users.length }}</strong> utilisateur{{ users.length > 1 ? 's' : '' }}</span>
        </div>
      </div>

      <table class="print-table">
        <thead>
          <tr>
            <th>Noms</th>
            <th>Rôle</th>
            <th>Fonction</th>
            <th>Email</th>
            <th>Téléphone</th>
            <th>Service</th>
            <th>Spécialités</th>
            <th>Contrat</th>
            <th>Statut</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(user, i) in users" :key="user.id" :class="{ alt: i % 2 === 1 }">
            <td>{{ getUserDisplayName(user) }}</td>
            <td>{{ roleLabel(user.role) }}</td>
            <td>{{ user.fonction || '—' }}</td>
            <td>{{ user.email || '—' }}</td>
            <td>{{ user.telephone || '—' }}</td>
            <td>{{ user.service || '—' }}</td>
            <td>{{ formatSpecialties(user) }}</td>
            <td>{{ formatContrat(user) }}</td>
            <td>{{ user.is_validated ? 'Validé' : 'En attente' }}</td>
          </tr>
        </tbody>
      </table>

      <div class="print-footer">
        Document généré par CDE — Clinique Diabète &amp; Endocrinologie
      </div>
    </div>

    <template #footer>
      <el-button @click="visible = false">Fermer</el-button>
      <el-button type="primary" @click="print">
        <el-icon><Printer /></el-icon> Imprimer
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { Printer } from '@element-plus/icons-vue'
import { getUserDisplayName, roleLabel } from '@/composables/useUsers'
import { formatDate } from '@/utils/date'
import { ipcInvoke } from '@/utils/ipc'

const props = defineProps<{
  modelValue: boolean
  users: any[]
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

const visible = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
})

const hospitalName = ref('Clinique Diabète & Endocrinologie')
const hospitalAddress = ref('')
const hospitalPhone = ref('')
const hospitalEmail = ref('')
const hospitalRegNumber = ref('')

onMounted(async () => {
  try {
    const info = await ipcInvoke<any>('identity:get-info')
    if (info) {
      if (info.name) hospitalName.value = info.name
      if (info.address || info.city) {
        hospitalAddress.value = [info.address, info.city].filter(Boolean).join(', ')
      }
      if (info.phone) hospitalPhone.value = info.phone
      if (info.email) hospitalEmail.value = info.email
      if (info.regNumber) hospitalRegNumber.value = info.regNumber
    }
  } catch {}
})

function print() {
  window.print()
}

function formatSpecialties(user: any): string {
  return user.specialties?.map((s: any) => s.name).join(', ') || '—'
}

function formatContrat(user: any): string {
  const parts: string[] = []
  if (user.type_contrat) parts.push(user.type_contrat)
  if (user.statut_contrat) parts.push(user.statut_contrat)
  return parts.join(' - ') || '—'
}
</script>

<style scoped>
.republique {
  text-align: center;
  margin-bottom: 2px;
}
.rep-devise {
  font-size: 15px;
  font-weight: 700;
  letter-spacing: 1.5px;
  color: #0b3b6b;
}
.rep-devise-sub {
  font-size: 11px;
  font-weight: 600;
  color: #666;
  letter-spacing: 0.8px;
}
.separator {
  text-align: center;
  font-size: 12px;
  color: #aaa;
  margin: 3px 0 6px;
}
.print-content {
  padding: 24px 20px;
}
.print-header {
  display: flex;
  align-items: center;
  margin: 4px 0 2px;
}
.print-header-text {
  flex: 1;
}
.institution-name {
  font-size: 17px;
  font-weight: 700;
  color: #0b3b6b;
}
.institution-addr {
  font-size: 11px;
  color: #555;
  margin-top: 1px;
}
.institution-contact {
  font-size: 11px;
  color: #555;
}
.institution-reg {
  font-size: 11px;
  color: #555;
}
.doc-title-block {
  margin: 6px 0 10px;
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  flex-wrap: wrap;
}
.doc-title {
  font-size: 17px;
  font-weight: 700;
  color: #0b3b6b;
}
.doc-meta {
  text-align: right;
  font-size: 10px;
  color: #777;
  line-height: 1.5;
}
.doc-date {
  display: block;
}
.doc-total {
  display: block;
  font-weight: 600;
  color: #555;
}
.print-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 10px;
  border: 1px solid #ccc;
}
.print-table thead {
  display: table-header-group;
}
.print-table th {
  background: #0b3b6b;
  color: white;
  padding: 6px 6px;
  text-align: left;
  white-space: nowrap;
  font-weight: 600;
  border: 1px solid #0a2f55;
  font-size: 10px;
}
.print-table td {
  padding: 4px 6px;
  border: 1px solid #ddd;
  vertical-align: top;
}
.print-table tr.alt td {
  background: #f0f4fa;
}
.print-footer {
  text-align: center;
  font-size: 9px;
  color: #aaa;
  margin-top: 18px;
  border-top: 1px solid #ddd;
  padding-top: 6px;
}
@media print {
  body * {
    visibility: hidden;
  }
  #print-area,
  #print-area * {
    visibility: visible;
  }
  #print-area {
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
    padding: 12mm 10mm !important;
  }
  @page {
    size: A4 landscape;
    margin: 10mm 10mm 18mm 10mm;
    @bottom-center {
      content: "— Page " counter(page) " / " counter(pages) " —";
      font-family: 'Segoe UI', Arial, sans-serif;
      font-size: 9px;
      color: #888;
    }
  }
  .el-dialog,
  .el-overlay,
  .el-dialog__header,
  .el-dialog__footer,
  .el-dialog__body {
    display: none !important;
  }
  .print-table thead {
    display: table-header-group;
  }
  .print-table tr {
    page-break-inside: avoid;
  }
}
</style>
