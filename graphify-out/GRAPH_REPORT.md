# Graph Report - clinique-diabete-endo  (2026-08-14)

## Corpus Check
- 675 files · ~396,431 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 5252 nodes · 10549 edges · 358 communities (303 shown, 55 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 257 edges (avg confidence: 0.67)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `59863b62`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Data Source & DB Layer
- Prescription Management
- Patient Form Dialog
- Plan Soins & Prescriptions
- Patient Converters & DTOs
- App Settings Entity
- Encounters Table UI
- Examens View
- Clinical Documents
- Contact Form & Medecin Select
- Invoice DTOs
- Settings DTOs
- Forgot Password
- Insurance Form Dialog
- Dispositif & Vital Signs DTOs
- Patient Form Tests
- Stay Timeline
- Vital Check Tab
- NPM Dependencies
- Service Constructors
- Catalogue Actes Tab
- Trusted Person Composable
- Encounter DTOs
- Tarifs Tab
- Electron Build Dependencies
- Plan Soins Records
- Site Form Dialog
- Fonction Form Dialog
- Appointments View
- Medical Unit DTOs
- System Settings & Migration
- Care Unit DTOs
- Dossier Clinic View
- Localite DTOs
- Export Service
- Header Builder
- TopBar Component
- CRH Diabete Form
- Exam Type Tab
- Plan Soins DTOs
- IPC Handlers Registration
- SideBar Component
- Service DTOs & Entities
- Specialty DTOs
- Contact Category DTOs
- Contact Origin DTOs
- Insurance DTOs
- Service Form Dialog
- SQLite Connection Driver
- Patient Attachment DTOs
- Medical Act DTOs
- Site DTOs
- Care Units Tab
- Auth Service & User
- Patient Acte DTOs
- Conservateur Stockage
- Synthese Diagram Tab
- User Form
- Currency DTOs
- Stay DTOs
- Migration Service
- TypeScript Config
- Entity Converters
- Attachment Type DTOs
- Electron Main Process
- Patient Context Toolbar
- Patient Clinical Docs UI
- Patient Composable
- Automerge Sync Service
- Conservateur DTOs
- User Attachment DTOs
- Care Unit Form Dialog
- User Attachments Section
- Facturation View
- System Service
- Fonction DTOs
- Invoice Form Dialog
- SideBar Tests
- Dispositif Voie Tab
- User Detail Dialog
- Exam Request DTOs
- Form Draft DTOs
- Dispositif Type DTOs
- Dispositifs Composable
- Patient Attachments Section
- Champ Localisation Form
- Dispositif Type Tab
- Document Type Form
- Medical Units Tab
- Specialties Tab
- Voie Type Tab
- Clinical Scores Composables
- Users View
- Voie Type DTOs
- Exam Type Entity
- App & Update Notifier
- Contact Form Selector
- Dossier Clinic Tab
- Stockage Form Dialog
- Stockage Tab
- Patient Invoices View
- Attachment Types Tab
- Patient Actes Tests
- Appointment Service
- Export Templates
- Email Config Service
- Auto Imports Config
- Automerge Sync & Registry
- Email Config DTOs
- Exam Category DTOs
- Login Form
- Admission Tab
- Identity Tab
- Services Tab
- Contact Category Tests
- Contact Origin Tests
- User Print Dialog
- User Profile View
- Currency Composable
- Prescription DTOs
- Dynamic Form Renderer
- Currency Form Dialog
- Package Config
- Vital Signs Tests
- Contact Category Form
- Contact Category Tab
- Contact Origin Form
- Contact Origin Tab
- Medical Unit Form
- Price History Timeline
- Specialty Form
- Care Units Tab Tests
- Exam Types Tests
- Prescription View Tests
- Electron API Types
- Appointment DTOs
- Prescription Service
- Vite & TS Config
- Validate Password Form
- Clinical Doc Form
- Clinical Doc List Tests
- App Loader & Users
- Conservateurs Tests
- Migrations 004-011
- Invoice Payment Dialog
- Mode Vie Antecedents
- Exam Requests Tests
- Invoices Composable
- Planning View
- Fiche Diabete Tab
- Vital Check Tests
- Examens View Tests
- Session DTOs
- Act Price History DTOs
- Service Favorites DTOs
- API Client
- Bilan Initial Tab
- Patient Layout Tests
- Patient Record Tests
- Session Service
- Hospital Info Composable
- Vital Signs Composable
- Invoice Print View
- Sortie Tab
- Clinical Doc Form Tests
- Dynamic Form Renderer Tests
- Auth DTOs & Handler
- Password Service
- Clinical Doc List UI
- Evolution Medicale Tab
- Examens Complementaires Tab
- Stockage Tab Tests
- Tarifs Tab Tests
- Configuration Clinic Tests
- HTML Entry & Assets
- User Entity
- Soins View
- Pharmacie View
- Invoice Entity
- Service Color Picker
- Export Composable
- Patient Form Draft
- ESLint Configuration
- Global Component Types
- Category Form Tests
- Community 193
- Community 209
- Community 211
- Community 220
- Community 225
- Community 230
- Community 231
- Community 234
- Community 235
- Community 236
- Community 241
- Community 243
- Community 245
- Community 246
- Community 251
- Community 256
- Community 257
- Community 259
- Community 261
- Community 262
- Community 263
- Community 264
- Community 265
- Community 266
- Community 267
- Community 268
- Community 269
- Community 270
- Community 271
- email-config.entity.ts
- Community 273
- Community 275
- Community 276
- Community 284
- Community 285
- extract_design.py
- pinia
- qrcode
- InsuranceEntity
- Ordonnance Bizone Template
- @types/bcryptjs
- @types/node
- 025-attachment-types.ts
- 071-create-exam-requests.ts
- 075-add-exam-request-specialty-id.ts
- 079-seed-ordonnance-libre.ts
- PatientActeService
- UserAttachmentService
- sync.handler.spec.ts
- chart.js
- usePatientFormDraft.ts
- InvoiceEntity
- reflect-metadata
- UserAttachmentEntity
- VoieTypeEntity
- @tiptap/extension-placeholder
- @tiptap/extension-text-style
- useExport.ts
- vue-router
- PatientAttachmentEntity
- 046-service-hierarchy.ts
- UserSpecialtyEntity
- @tiptap/vue-3
- prettier
- @types/qrcode
- exam-type.handler.ts
- unplugin-icons
- 070-add-care-unit-to-encounters-fix.ts
- createExamForm
- examLabel
- vite-plugin-electron
- stay.converter.ts
- voie-type.converter.ts
- @tiptap/extension-underline
- @types/qrcode
- vite
- vite-plugin-top-level-await
- @vitejs/plugin-vue
- vue-chartjs
- @typescript-eslint/parser
- unplugin-vue-components
- vitest
- @vitest/coverage-v8

## God Nodes (most connected - your core abstractions)
1. `AutomergeDocument` - 279 edges
2. `AppDatabaseDatasource` - 159 edges
3. `DB` - 147 edges
4. `buildDocumentSchema()` - 112 edges
5. `SchemaField()` - 108 edges
6. `ipcInvoke()` - 86 edges
7. `EntityRegistry` - 69 edges
8. `EntityConverter` - 60 edges
9. `createHandler()` - 60 edges
10. `registerSettingsHandlers()` - 47 edges

## Surprising Connections (you probably didn't know these)
- `registerAttachmentTypeHandlers()` --indirect_call--> `created()`  [INFERRED]
  electron/handlers/attachment-type.handler.ts → src/components/__tests__/SyncProgressDialog.spec.ts
- `registerCareUnitHandlers()` --indirect_call--> `created()`  [INFERRED]
  electron/handlers/care-unit.handler.ts → src/components/__tests__/SyncProgressDialog.spec.ts
- `registerConservateurHandlers()` --indirect_call--> `created()`  [INFERRED]
  electron/handlers/conservateur.handler.ts → src/components/__tests__/SyncProgressDialog.spec.ts
- `registerContactOriginHandlers()` --indirect_call--> `created()`  [INFERRED]
  electron/handlers/contact-origin.handler.ts → src/components/__tests__/SyncProgressDialog.spec.ts
- `registerExamParameterHandlers()` --indirect_call--> `created()`  [INFERRED]
  electron/handlers/exam-parameter.handler.ts → src/components/__tests__/SyncProgressDialog.spec.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Diabetes Treatment Plan** — medication_insuline_tresiba, medication_insuline_novorapid, medication_xigduo, medication_trulicity, medical_device_freestyle_libre_2 [INFERRED]

## Communities (358 total, 55 thin omitted)

### Community 0 - "Data Source & DB Layer"
Cohesion: 0.04
Nodes (38): Entity, inject, inject, inject, inject, inject, inject, inject (+30 more)

### Community 1 - "Prescription Management"
Cohesion: 0.03
Nodes (55): handleClosed(), activeStep, ageInput, allergyInputRef, allergyInputValue, allergyInputVisible, cancelAndClose(), close() (+47 more)

### Community 2 - "Patient Form Dialog"
Cohesion: 0.14
Nodes (12): EntityChangeAction, entityEventBus, EventSource, DB, ENTITIES, CareUnitWithService, FREQUENCE_TO_BLOC, createDraftDoc() (+4 more)

### Community 3 - "Plan Soins & Prescriptions"
Cohesion: 0.05
Nodes (40): getPlanSoins(), FREQUENCE_OPTIONS, { createPrescription, updatePrescription, getPrescription }, currentHour, currentWeekStart, detailMotifSuspension, detailPrescription, detailSoin (+32 more)

### Community 4 - "Patient Converters & DTOs"
Cohesion: 0.04
Nodes (43): { activePatient }, analysesDisponibles, createExamForm(), currentHour, currentWeekStart, editDialogVisible, editForm, editRequestId (+35 more)

### Community 5 - "App Settings Entity"
Cohesion: 0.14
Nodes (9): ConservateurChampLocalisationConverter, ChampLocalisationCreateDto, ChampLocalisationDto, ChampLocalisationUpdateDto, StockagePhysiqueCreateDto, StockagePhysiqueDto, StockagePhysiqueUpdateDto, ConservateurChampLocalisationEntity (+1 more)

### Community 6 - "Encounters Table UI"
Cohesion: 0.10
Nodes (9): ClinicalDocumentDTO, ClinicalDocumentStatus, ClinicalDocumentTypeDTO, FormFieldSchema, ClinicalDocumentService, CreateDocumentWithActeResult, toTimestamp(), singleton (+1 more)

### Community 7 - "Examens View"
Cohesion: 0.07
Nodes (28): careUnits, contactTypeLocked, { createEncounter, updateEncounter }, emit, encounterId, fetchCareUnitsByService(), { fetchMedicalStaff, searchMedicalStaff }, {
  form,
  endDateFormatted,
  showOriginPrecision,
  showAssuranceField,
  resetForm,
  patchForm,
} (+20 more)

### Community 8 - "Clinical Documents"
Cohesion: 0.05
Nodes (44): autoQuantiteTotale, buildApiPayload(), createFormRules, createPrescriptionForm(), dispositifTypes, editAutoQuantiteTotale, editForm, editFormRef (+36 more)

### Community 9 - "Contact Form & Medecin Select"
Cohesion: 0.21
Nodes (4): FonctionEntity, FonctionService, inject, singleton

### Community 10 - "Invoice DTOs"
Cohesion: 0.05
Nodes (42): ./*, auto-imports.d.ts, dist, DOM, DOM.Iterable, e2e/**/*.ts, ES2020, node_modules (+34 more)

### Community 11 - "Settings DTOs"
Cohesion: 0.07
Nodes (33): form, formRef, handleSubmit(), loading, rules, submitted, careUnits, emit (+25 more)

### Community 12 - "Forgot Password"
Cohesion: 0.15
Nodes (11): ./ContactOriginFormDialog.vue, { createOrigin, updateOrigin }, editingId, emit, form, formRef, rules, submit() (+3 more)

### Community 13 - "Insurance Form Dialog"
Cohesion: 0.06
Nodes (24): activeTab, ALERT_THRESHOLDS, allItems, CONSTANTS_ROWS, currentHour, currentWeekStart, error, fetchWeekData() (+16 more)

### Community 14 - "Dispositif & Vital Signs DTOs"
Cohesion: 0.06
Nodes (23): createLocalites(), EL_STUBS, mockInvoke, mockLocalites(), customCountry, fileInput, filterActive, filteredTree (+15 more)

### Community 15 - "Patient Form Tests"
Cohesion: 0.10
Nodes (13): on(), activeEncounter, { activePatient }, activeStay, encounterMovements, { getActiveStay, listStaysByPatient }, { listEncountersByPatient, getEncounterMovements }, loading (+5 more)

### Community 16 - "Stay Timeline"
Cohesion: 0.14
Nodes (7): ExamParameterDto, ExamParameterReferenceValues, ExamParameterEntity, registerExamParameterHandlers(), ExamParameterService, inject, singleton

### Community 17 - "Vital Check Tab"
Cohesion: 0.10
Nodes (14): emit, { getEncounterMovements }, loadingMovements, movementsMap, originLabelMap, mockEncounters, mockIpcInvoke, mockMovements (+6 more)

### Community 18 - "NPM Dependencies"
Cohesion: 0.05
Nodes (39): @automerge/automerge, element-plus, @element-plus/icons-vue, exceljs, @iconify-json/bi, @iconify-json/carbon, @iconify/vue, nodemailer (+31 more)

### Community 19 - "Service Constructors"
Cohesion: 0.14
Nodes (9): inject, LogoService, singleton, PatientExportService, inject, singleton, DB_FORM_DATA, electronState (+1 more)

### Community 20 - "Catalogue Actes Tab"
Cohesion: 0.06
Nodes (21): actPaginator, {
  acts, loading: actsLoading, fetchActs,
}, actSearch, actServiceFilter, codeTarifFilter, {
  currencies, defaultCurrency, loading: curLoading,
  fetchCurrencies, setDefault, deleteCurrency, formatCurrency,
}, currencyDialogRef, edits (+13 more)

### Community 21 - "Trusted Person Composable"
Cohesion: 0.04
Nodes (45): electron, electron-builder, eslint, eslint-plugin-vue, jsdom, devDependencies, electron, electron-builder (+37 more)

### Community 22 - "Encounter DTOs"
Cohesion: 0.07
Nodes (21): ./SiteFormDialog.vue, { createSite, updateSite }, editingId, emit, form, formRef, rules, submit() (+13 more)

### Community 23 - "Tarifs Tab"
Cohesion: 0.09
Nodes (16): mockIpcInvoke, mockPatients, error, loading, PatientDto, patients, usePatients(), { exportingExcel, exportPatientsListExcel } (+8 more)

### Community 24 - "Electron Build Dependencies"
Cohesion: 0.10
Nodes (24): DEFAULT_BLOCS, mockIpcInvoke, mountPlanSoinsContext(), SOIN_EN_ATTENTE, SOIN_INSULIN, SOIN_SUSPENDU, SOIN_VALIDE, error (+16 more)

### Community 25 - "Plan Soins Records"
Cohesion: 0.07
Nodes (21): ./FonctionFormDialog.vue, { createFonction, updateFonction }, editingId, emit, form, formRef, rules, submit() (+13 more)

### Community 26 - "Site Form Dialog"
Cohesion: 0.07
Nodes (21): ./MedicalUnitFormDialog.vue, { createUnit, updateUnit }, editingId, emit, form, formRef, rules, submit() (+13 more)

### Community 27 - "Fonction Form Dialog"
Cohesion: 0.07
Nodes (20): dialogRef, filteredList, paginatedList, paginator, searchQuery, { specialties, loading, error, fetchSpecialties, deleteSpecialty, toggleSpecialty }, { createSpecialty, updateSpecialty }, editingId (+12 more)

### Community 28 - "Appointments View"
Cohesion: 0.08
Nodes (25): mockInvoke, mockTrustedPerson, error, loading, TrustedPersonDto, useTrustedPerson(), calculateAge(), avatarGender (+17 more)

### Community 29 - "Medical Unit DTOs"
Cohesion: 0.11
Nodes (21): mockHideLoader, mockIpcInvoke, mockMessageBoxConfirm, mockShowLoader, getUserDisplayName(), MedicalUnitRef, roleColor(), roleLabel() (+13 more)

### Community 30 - "System Settings & Migration"
Cohesion: 0.07
Nodes (22): { activePatient }, appointments, currentWeekStart, error, filteredAppointments, FilterMode, formDialogVisible, getWeekStart() (+14 more)

### Community 31 - "Care Unit DTOs"
Cohesion: 0.13
Nodes (6): LocaliteCreateDto, LocaliteDto, LocaliteUpdateDto, LocaliteEntity, LocaliteService, singleton

### Community 32 - "Dossier Clinic View"
Cohesion: 0.10
Nodes (15): dbPath, { emailConfig, testing, saving, loadConfig, saveConfig, testEmail }, emailForm, hasData, { systemInfo, backingUp, restoring, fetchInfo, triggerBackup, triggerRestore }, AppInfoDto, backingUp, BackupResultDto (+7 more)

### Community 33 - "Localite DTOs"
Cohesion: 0.17
Nodes (5): AppointmentDto, AppointmentEntity, registerAppointmentHandlers(), AppointmentService, singleton

### Community 34 - "Export Service"
Cohesion: 0.16
Nodes (3): ExportService, singleton, useExport()

### Community 35 - "Header Builder"
Cohesion: 0.14
Nodes (7): FrequenceType, PrescriptionDto, PrescriptionEntity, registerPrescriptionHandlers(), PrescriptionService, inject, singleton

### Community 36 - "TopBar Component"
Cohesion: 0.06
Nodes (21): activeContact, { activePatient }, contactDisplayLabel, contactTypeLabel, creatingDoc, {
  documentTypes,
  documents,
  selectedDocument,
  loading,
  fetchDocumentTypes,
  fetchDocumentsByPatient,
  createDocument,
  importFile,
  openPdf,
  updateDocumentData,
  signDocument,
  deleteDocument,
  getDocumentType,
  selectDocument,
}, filterDateRange, filteredByContactTypes (+13 more)

### Community 37 - "CRH Diabete Form"
Cohesion: 0.15
Nodes (6): ServiceEntity, ServiceService, singleton, createTestService(), createTestPatient(), createTestService()

### Community 38 - "Exam Type Tab"
Cohesion: 0.20
Nodes (9): DownloadProgress, isUpdateDownloaded, onDownloadProgress(), onUpdateAvailable(), onUpdateDownloaded(), state, UpdateInfo, updateMessage (+1 more)

### Community 39 - "Plan Soins DTOs"
Cohesion: 0.08
Nodes (23): getValidesPlanSoins(), getVitalSignsList(), activeTab, chartData, chartOptions, DataPoint, dateRange, emptyChartData (+15 more)

### Community 40 - "IPC Handlers Registration"
Cohesion: 0.06
Nodes (40): { activePatient }, activeTab, { calcAge, calcGlasgowScore }, CRH_DOCUMENT_TYPE_CODES, draftStatus, emit, { exportCrhDiabetePdf }, fieldMeta (+32 more)

### Community 41 - "SideBar Component"
Cohesion: 0.08
Nodes (22): cancelEdit(), {
  categories,
  types,
  loading,
  typesLoading,
  error,
  fetchCategories,
  fetchTypesByCategory,
  createType,
  updateType,
  deleteType,
}, childrenErrors, childrenLoading, childrenMap, createExamForm, createExamParentId, createForm (+14 more)

### Community 42 - "Service DTOs & Entities"
Cohesion: 0.24
Nodes (3): CareUnitService, inject, singleton

### Community 43 - "Specialty DTOs"
Cohesion: 0.14
Nodes (21): registerAuthHandlers(), registerCareUnitHandlers(), registerClinicalDocumentHandlers(), registerEmailHandlers(), registerEncounterHandlers(), registerExamResultHandlers(), registerExportHandlers(), registerIdentityHandlers() (+13 more)

### Community 44 - "Contact Category DTOs"
Cohesion: 0.09
Nodes (21): { activePatient, clearPatient, setActivePatient }, activeRoute, { getPatient }, { isCollapsed, sidebarWidth, toggle }, isPatientRoute, logoError, { logoUrl }, matchesSearch() (+13 more)

### Community 45 - "Contact Origin DTOs"
Cohesion: 0.14
Nodes (7): DispositifDto, VitalSignsDto, VitalSignsItemDto, VitalSignsItemEntity, registerPatientCareHandlers(), singleton, VitalSignsItemService

### Community 46 - "Insurance DTOs"
Cohesion: 0.05
Nodes (24): AppointmentConverter, AttachmentTypeConverter, ConservateurStockageConverter, ContactOriginConverter, CurrencyConverter, ExamCategoryConverter, ExamParameterConverter, ExamResultConverter (+16 more)

### Community 47 - "Service Form Dialog"
Cohesion: 0.12
Nodes (5): NodeSqliteDialect, CurrencyEntity, CurrencyService, singleton, seedResult()

### Community 48 - "SQLite Connection Driver"
Cohesion: 0.16
Nodes (6): SiteCreateDto, SiteDto, SiteUpdateDto, SiteEntity, SiteService, singleton

### Community 49 - "Patient Attachment DTOs"
Cohesion: 0.12
Nodes (16): richValue(), emit, emitChange(), evenementsPreviewFields, journalPreviewFields, props, sectionRefs, createDefaultData() (+8 more)

### Community 50 - "Medical Act DTOs"
Cohesion: 0.09
Nodes (15): dialogRef, filteredList, paginatedList, paginator, searchQuery, serviceFilter, { services, fetchServices }, { units, loading, error, fetchUnits, deleteUnit, toggleUnit } (+7 more)

### Community 51 - "Site DTOs"
Cohesion: 0.21
Nodes (4): MedicalUnitEntity, MedicalUnitService, inject, singleton

### Community 52 - "Care Units Tab"
Cohesion: 0.15
Nodes (6): PatientEntity, PatientService, inject, singleton, createTestPatient(), createTestPatient()

### Community 53 - "Auth Service & User"
Cohesion: 0.20
Nodes (6): StayCreateDto, StayDto, StayMovementDto, StayService, inject, singleton

### Community 54 - "Patient Acte DTOs"
Cohesion: 0.15
Nodes (8): EncounterCreateDto, EncounterDto, EncounterListFilters, EncounterMovementCreateDto, EncounterMovementDto, EncounterUpdateDto, EncounterService, singleton

### Community 55 - "Conservateur Stockage"
Cohesion: 0.15
Nodes (8): ContactOriginCreateDto, ContactOriginDto, ContactOriginUpdateDto, ContactOriginEntity, registerContactOriginHandlers(), ContactOriginService, inject, singleton

### Community 56 - "Synthese Diagram Tab"
Cohesion: 0.15
Nodes (8): InsuranceCreateDto, InsuranceDto, InsuranceUpdateDto, InsuranceEntity, registerInsuranceHandlers(), InsuranceService, inject, singleton

### Community 57 - "User Form"
Cohesion: 0.10
Nodes (14): mockIpcInvoke, mountComposable(), DispositifInput, dispositifs, error, loading, useDispositifs(), Dispositif (+6 more)

### Community 58 - "Currency DTOs"
Cohesion: 0.09
Nodes (14): dialogVisible, emits, fileInputRef, { fonctions, fetchFonctions: fetchFonctionsList }, form, formRef, onSubmit(), rules (+6 more)

### Community 59 - "Stay DTOs"
Cohesion: 0.10
Nodes (10): TarifBulkUpdateDto, TarifCreateDto, ConfigTarifService, inject, singleton, PatientActeService, inject, singleton (+2 more)

### Community 60 - "Migration Service"
Cohesion: 0.21
Nodes (6): BlocHoraireDto, PlanSoinsDto, PlanSoinsService, singleton, SoinItem, MedicationGridSlot

### Community 61 - "TypeScript Config"
Cohesion: 0.17
Nodes (5): UserDto, AuthService, singleton, mountComposable(), useUsers()

### Community 62 - "Entity Converters"
Cohesion: 0.10
Nodes (17): mockIpcInvoke, error, loading, OrdonnanceLibreRecord, ordonnances, useOrdonnanceLibre(), loadData(), onDelete() (+9 more)

### Community 63 - "Attachment Type DTOs"
Cohesion: 0.21
Nodes (3): MedicalActService, inject, singleton

### Community 64 - "Electron Main Process"
Cohesion: 0.15
Nodes (8): SpecialtyCreateDto, SpecialtyDto, SpecialtyUpdateDto, SpecialtyEntity, registerSpecialtyHandlers(), SpecialtyService, inject, singleton

### Community 65 - "Patient Context Toolbar"
Cohesion: 0.13
Nodes (15): deleteVitalEntry(), mockIpcInvoke, mountVitalSignsContext(), deleteVitalSignsItem(), provideVitalSigns(), VITAL_SIGNS_KEY, VitalSigns, VitalSignsContext (+7 more)

### Community 66 - "Patient Clinical Docs UI"
Cohesion: 0.09
Nodes (20): ./ServiceFormDialog.vue, categories, { createService, updateService }, editingId, emit, form, formRef, rules (+12 more)

### Community 68 - "Automerge Sync Service"
Cohesion: 0.36
Nodes (3): PatientActeCreateDto, PatientActeDto, registerPatientActeHandlers()

### Community 69 - "Conservateur DTOs"
Cohesion: 0.06
Nodes (28): pdfLoading, props, mockIpcInvoke, _entries, OpenPatientEntry, useOpenPatients(), activePatient, Patient (+20 more)

### Community 70 - "User Attachment DTOs"
Cohesion: 0.09
Nodes (14): { activePatient }, currentPatientId, {
  documentTypes,
  documents,
  selectedDocument,
  loading,
  isContactExpired,
  fetchDocumentTypes,
  fetchDocuments,
  createDocument,
  updateDocumentData,
  signDocument,
  deleteDocument,
  checkContactExpired,
  getDocumentType,
  selectDocument,
  importFile,
}, filterCategory, filterDateRange, filteredDocuments, filterSource, filterTypeId (+6 more)

### Community 71 - "Care Unit Form Dialog"
Cohesion: 0.27
Nodes (5): EmailConfigService, singleton, EmailService, inject, singleton

### Community 72 - "User Attachments Section"
Cohesion: 0.21
Nodes (5): ExamTypeDto, ExamTypeEntity, registerExamTypeHandlers(), ExamTypeService, singleton

### Community 73 - "Facturation View"
Cohesion: 0.29
Nodes (6): registerSyncHandlers(), mockGetStatus, mockHandle, mockResolve, mockStart, mockStop

### Community 74 - "System Service"
Cohesion: 0.11
Nodes (16): addItem(), { currencyDef }, emit, form, formRef, onItemTypeChange(), open(), patientOptions (+8 more)

### Community 75 - "Fonction DTOs"
Cohesion: 0.10
Nodes (14): adding, {
  attachments,
  loading,
  addAttachment,
  removeAttachment,
  loadAttachments,
}, attachmentTypes, fileData, fileInputRef, props, selectedAttachmentTypeId, selectedFile (+6 more)

### Community 76 - "Invoice Form Dialog"
Cohesion: 0.08
Nodes (15): open, props, EL_STUBS, DoctorOption, doctors, emit, medecinPreviewFields, motifPreviewFields (+7 more)

### Community 77 - "SideBar Tests"
Cohesion: 0.17
Nodes (8): AttachmentTypeDto, CreateAttachmentTypeDto, UpdateAttachmentTypeDto, AttachmentTypeEntity, registerAttachmentTypeHandlers(), AttachmentTypeService, inject, singleton

### Community 78 - "Dispositif Voie Tab"
Cohesion: 0.08
Nodes (21): IAppDataSource, CreateDocumentParams, DispositifsService, inject, singleton, SeedService, buildAppointment(), buildCreateDocumentParams() (+13 more)

### Community 79 - "User Detail Dialog"
Cohesion: 0.11
Nodes (13): actDialogRef, {
  acts, loading, error, fetchActs, deleteAct,
}, filteredActs, paginatedActs, paginator, search, serviceFilter, { services, fetchServices } (+5 more)

### Community 80 - "Exam Request DTOs"
Cohesion: 0.10
Nodes (15): dialogPlaceholder, dialogTitle, dialogType, dispositifFiltered, dispositifSearch, error, form, formRef (+7 more)

### Community 81 - "Form Draft DTOs"
Cohesion: 0.14
Nodes (8): PatientDto, TrustedPersonDto, TrustedPersonEntity, registerPatientHandlers(), EnrichedPatient, TrustedPersonService, inject, singleton

### Community 82 - "Dispositif Type DTOs"
Cohesion: 0.22
Nodes (3): ExamRequestService, inject, singleton

### Community 83 - "Dispositifs Composable"
Cohesion: 0.17
Nodes (8): emit, hospitalAddress, hospitalEmail, hospitalName, hospitalPhone, hospitalRegNumber, props, visible

### Community 84 - "Patient Attachments Section"
Cohesion: 0.07
Nodes (22): { isCollapsed }, progressPercent, { status, syncProgress, pendingChanges }, statusLabel, detailText, previousStatus, progressPercent, { status, syncProgress } (+14 more)

### Community 85 - "Champ Localisation Form"
Cohesion: 0.11
Nodes (11): adding, {
  attachments,
  loading,
  addAttachment,
  removeAttachment,
  loadAttachments,
  reset,
}, attachmentTypes, canManage, fileData, fileInputRef, props, selectedAttachmentTypeId (+3 more)

### Community 86 - "Dispositif Type Tab"
Cohesion: 0.11
Nodes (12): filteredTypes, form, formRef, rules, search, showDialog, submitting, {
  types, loading, error, fetchTypes, createType, deleteType,
} (+4 more)

### Community 87 - "Document Type Form"
Cohesion: 0.12
Nodes (17): acteIdDeclenche, acteLabel, { acts: medicalActs, fetchActs }, CATEGORIES, editId, emit, ensureActsLoaded(), form (+9 more)

### Community 88 - "Medical Units Tab"
Cohesion: 0.11
Nodes (12): filteredTypes, form, formRef, rules, search, showDialog, submitting, {
  types, loading, error, fetchTypes, createType, deleteType,
} (+4 more)

### Community 89 - "Specialties Tab"
Cohesion: 0.11
Nodes (14): currUser, dialogVisible, displayName, emit, { exportingPdf, exportingExcel, exportUserProfilePdf, exportUserProfileExcel }, { fonctions, fetchFonctions: fetchFonctionsList }, handleReactivate(), handleTerminate() (+6 more)

### Community 90 - "Voie Type Tab"
Cohesion: 0.18
Nodes (16): AutonomieValues, calculateAutonomieLevel(), calculateGlasgow(), getGlasgowSeverity(), GlasgowValues, AutonomieItem, autonomieItems, autonomieLevel (+8 more)

### Community 91 - "Clinical Scores Composables"
Cohesion: 0.12
Nodes (13): fetchPatientInvoices(), { formatCurrency, loadCurrency }, formDialogRef, { getPatient }, loadData(), loading, onCreated(), patientId (+5 more)

### Community 92 - "Users View"
Cohesion: 0.17
Nodes (16): calculateAge(), calculateAgeFromDates(), calculateDuration(), CrhDiabeteOptions, escapeHtml(), generateCrhDiabeteHtml(), generateFooter(), generateMedicalHeader() (+8 more)

### Community 93 - "Voie Type DTOs"
Cohesion: 0.29
Nodes (5): { formatCurrency }, PriceHistoryEntry, useCurrencies(), formatDate(), formatDateTime()

### Community 94 - "Exam Type Entity"
Cohesion: 0.11
Nodes (17): allDocumentTypes, contactType, {
  createDocumentWithActe,
  fetchDocumentTypesWithPricing,
  isContactExpired,
  checkContactExpired,
}, creatingId, emit, filteredDocumentTypes, { formatCurrency }, formatPrice() (+9 more)

### Community 95 - "App & Update Notifier"
Cohesion: 0.12
Nodes (13): allTypes, error, filterActive, filteredTypes, { formatCurrency }, formDialogRef, handleToggleActive(), loading (+5 more)

### Community 96 - "Contact Form Selector"
Cohesion: 0.11
Nodes (7): champDialogRef, filterActive, filteredStockages, selectedStockage, stockageDialogRef, {
  stockages, champs, loading, champsLoading, error,
  fetchStockages, fetchChampsByStockage, deleteStockage, deleteChamp,
}, stockageSearch

### Community 97 - "Dossier Clinic Tab"
Cohesion: 0.11
Nodes (12): InvoiceStats, filteredList, { formatCurrency, loadCurrency }, formDialogRef, loading, onInvoiceCreated(), paginatedList, paginator (+4 more)

### Community 98 - "Stockage Form Dialog"
Cohesion: 0.07
Nodes (17): NodeSqliteConnection, SQLValue, NodeSqliteDriver, { DatabaseSync }, db, DB_PATH, exams, insertExam (+9 more)

### Community 99 - "Stockage Tab"
Cohesion: 0.21
Nodes (7): LoginResult, SyncUserRelationsDto, TerminateContractDto, ValidatePasswordDto, LoginResult, SessionService, singleton

### Community 100 - "Patient Invoices View"
Cohesion: 0.24
Nodes (3): DispositifTypeService, inject, singleton

### Community 101 - "Attachment Types Tab"
Cohesion: 0.12
Nodes (11): { exportingPdf, exportingExcel, exportUsersListPdf, exportUsersListExcel }, { fetchSpecialties }, filteredList, filteredUsers, { fonctions, fetchFonctions }, loading, paginator, printDialogVisible (+3 more)

### Community 102 - "Patient Actes Tests"
Cohesion: 0.06
Nodes (37): { activePatient }, activeTab, { calcAge, calcGlasgowScore }, CRC_DOCUMENT_TYPE_CODES, draftStatus, emit, { exportCrcDiabetePdf }, flattenFormData() (+29 more)

### Community 103 - "Appointment Service"
Cohesion: 0.13
Nodes (13): AttachmentType, dialogVisible, editingType, form, formRef, handleDelete(), handleSave(), loading (+5 more)

### Community 104 - "Export Templates"
Cohesion: 0.12
Nodes (15): activeEncounterId, { activePatient }, contactDialogVisible, currentUserId, editingEncounter, encounters, { listEncountersByPatient, deleteEncounter }, loadEncounters() (+7 more)

### Community 106 - "Auto Imports Config"
Cohesion: 0.12
Nodes (10): InvoiceCreateDto, InvoiceDto, InvoiceItemDto, InvoiceListDto, InvoicePaymentDto, InvoiceStatsDto, InvoiceUpdateDto, InvoiceService (+2 more)

### Community 107 - "Automerge Sync & Registry"
Cohesion: 0.16
Nodes (24): buildContactLine(), buildDeviseLine(), buildInstitutionLine(), buildProfileTitle(), buildRepublicHeader(), buildSeparatorLine(), buildTitleAndDate(), darkBlueFont() (+16 more)

### Community 108 - "Email Config DTOs"
Cohesion: 0.27
Nodes (3): UserFavoriteServiceConverter, ServiceFavoriteDto, UserFavoriteServiceEntity

### Community 109 - "Exam Category DTOs"
Cohesion: 0.09
Nodes (26): acceptTypes, canImport, cleanupPreview(), emit, fileExtension, fileInputRef, formatFileSize(), generatePreview() (+18 more)

### Community 110 - "Login Form"
Cohesion: 0.07
Nodes (30): { activePatient, age, hasActivePatient }, addressLine, avatarBgColor, isPatientRoute, PATIENT_ROUTE_NAMES, route, showPatientHeader, addressLine (+22 more)

### Community 111 - "Admission Tab"
Cohesion: 0.09
Nodes (21): emits, form, formRef, LoginCommand, { logoUrl }, onSubmit(), rules, emits (+13 more)

### Community 112 - "Identity Tab"
Cohesion: 0.07
Nodes (25): ChildTabStub, EL_STUBS, mockActivePatient, { mockConfirm }, mockFetchMedicalStaff, mockIpcInvoke, createDefaultData(), createWrapper() (+17 more)

### Community 113 - "Services Tab"
Cohesion: 0.12
Nodes (15): ./ChampLocalisationFormDialog.vue, { createChamp, updateChamp, champs }, editingId, emit, form, formRef, nextSortOrder(), rules (+7 more)

### Community 114 - "Contact Category Tests"
Cohesion: 0.09
Nodes (15): fileInputRef, formRef, { info, loadInfo, saveInfo, saveLogo }, logoPreview, pendingLogo, { refreshLogo }, rules, saving (+7 more)

### Community 115 - "Contact Origin Tests"
Cohesion: 0.06
Nodes (32): ExamParameterReferenceValues, EXAM_GRID_HOURS, ExamResultDto, MatrixDateColumn, MatrixGroup, MatrixRow, PatientResultFilters, useExamResults() (+24 more)

### Community 116 - "User Print Dialog"
Cohesion: 0.15
Nodes (6): ExamResultDto, ExamResultEntity, ExamResultService, PatientResultFilters, inject, singleton

### Community 117 - "User Profile View"
Cohesion: 0.10
Nodes (26): alignImage(), applyFontFamily(), applyFontSize(), bumpFontSize(), currentFontFamily, currentFontSize, editor, emit (+18 more)

### Community 118 - "Currency Composable"
Cohesion: 0.15
Nodes (10): EL_STUBS, mockInsurances, { mockInvoke, mockElMessage, mockElMessageBox }, mockInsurances, mockInvoke, error, InsuranceDto, insurances (+2 more)

### Community 119 - "Prescription DTOs"
Cohesion: 0.25
Nodes (4): { formatCurrency }, invoice, visible, Invoice

### Community 120 - "Dynamic Form Renderer"
Cohesion: 0.12
Nodes (12): buildRules(), buildValidatorRule(), emit, formRef, getFetchSuggestions(), handleAutocomplete(), localFormData, props (+4 more)

### Community 121 - "Currency Form Dialog"
Cohesion: 0.15
Nodes (11): ./CareUnitFormDialog.vue, { createUnit, updateUnit }, editingId, emit, form, formRef, rules, { services } (+3 more)

### Community 122 - "Package Config"
Cohesion: 0.12
Nodes (14): ./StockageFormDialog.vue, { createStockage, updateStockage, stockages }, editingId, emit, form, formRef, nextSortOrder(), rules (+6 more)

### Community 124 - "Contact Category Form"
Cohesion: 0.10
Nodes (23): closeSingleMovement(), closing, emit, encounter, form, { getEncounter, getEncounterMovements, addEncounterMovement, closeCurrentEncounterMovement }, handleAdd(), handleCloseMovement() (+15 more)

### Community 125 - "Contact Category Tab"
Cohesion: 0.15
Nodes (12): description, main, name, scripts, build, dev, lint, postinstall (+4 more)

### Community 126 - "Contact Origin Form"
Cohesion: 0.09
Nodes (22): { activePatient }, availablePrescriptions, buildFormData(), emit, { fetchAvailablePrescriptions }, handleSaveDraft(), handleSign(), inlineForm (+14 more)

### Community 127 - "Contact Origin Tab"
Cohesion: 0.07
Nodes (25): ClinicalDocFormStub, ClinicalDocListStub, createdDocument, deliveryDocument, documentTypes, EL_STUBS, ImportDocumentDialogStub, importedDocument (+17 more)

### Community 128 - "Medical Unit Form"
Cohesion: 0.17
Nodes (10): ./CurrencyFormDialog.vue, { createCurrency, updateCurrency }, editingCode, emit, form, formRef, rules, submit() (+2 more)

### Community 129 - "Price History Timeline"
Cohesion: 0.09
Nodes (24): onFormCellClick(), onFormCellClick(), displayValue(), emit, props, EL_STUBS, ENTRIES, DOC_TYPE_CODES (+16 more)

### Community 130 - "Specialty Form"
Cohesion: 0.07
Nodes (15): isOpen, usePatientContext(), activeDocumentId, { activePatient }, currentPatientId, encounters, { listEncountersByPatient }, loadingEncounters (+7 more)

### Community 131 - "Care Units Tab Tests"
Cohesion: 0.15
Nodes (11): EL_STUBS, mockDeleteUnit, mockFetchServices, mockFetchUnits, { mockInvoke, mockElMessage, mockElMessageBox }, mockServices, mockToggleUnit, mockUnits (+3 more)

### Community 132 - "Exam Types Tests"
Cohesion: 0.08
Nodes (28): createForm(), editingIndex, emit, form, formRef, formRules, medicaments, onSubmit() (+20 more)

### Community 133 - "Prescription View Tests"
Cohesion: 0.25
Nodes (11): makePrescription(), makeSoinPrescription(), {
  mockGetPrescriptions,
  mockDeletePrescription,
  mockUpdatePrescription,
  mockCreatePrescription,
  mockStopPrescription,
  mockGetPlanSoins,
  mockValiderSoin,
  mockSuspendreSoin,
}, mockIpcInvoke, mountAndOpenDialog(), mountWithForm(), openCreateForm(), IMPORTANT: The el-table stub does NOT render a <slot /> because the (+3 more)

### Community 134 - "Electron API Types"
Cohesion: 0.13
Nodes (5): DownloadProgress, ElectronAPI, UpdateInfo, *.vue, Window

### Community 135 - "Appointment DTOs"
Cohesion: 0.14
Nodes (13): {
  currencies,
  defaultCurrency,
  formatCurrency,
  setDefault,
  loadDefault,
  fetchCurrencies,
}, CURRENCY_LOCALE, currencyCode, currencyDef, useCurrency(), dateRange, { fetchFavorites, favorites }, { formatCurrency, loadCurrency } (+5 more)

### Community 136 - "Prescription Service"
Cohesion: 0.17
Nodes (11): vite.config.ts, compilerOptions, allowSyntheticDefaultImports, composite, emitDecoratorMetadata, experimentalDecorators, module, moduleResolution (+3 more)

### Community 137 - "Vite & TS Config"
Cohesion: 0.15
Nodes (9): AppInfoDto, BackupResultDto, DbStatsDto, IMPORTANT: The app must restart to pick up the new database., SystemService, inject, singleton, USER_TABLES (+1 more)

### Community 138 - "Validate Password Form"
Cohesion: 0.18
Nodes (10): emit, form, { formatCurrency }, formRef, invoice, rules, saving, submit() (+2 more)

### Community 139 - "Clinical Doc Form"
Cohesion: 0.18
Nodes (12): contactDisplay, emit, formRendererRef, handleSave(), handleSaveDraft(), handleSign(), importedFileType, localFormData (+4 more)

### Community 140 - "Clinical Doc List Tests"
Cohesion: 0.12
Nodes (14): documents, documentTypes, EL_STUBS, { mockConfirm }, documentTypes, EL_STUBS, mockDocuments, mockDocumentTypes (+6 more)

### Community 141 - "App Loader & Users"
Cohesion: 0.33
Nodes (3): defaultProps, {
  mockFetchAvailablePrescriptions,
  mockElMessage,
  mockElMessageBox,
  state,
}, stubs

### Community 142 - "Conservateurs Tests"
Cohesion: 0.20
Nodes (10): mockChamps, mockInvoke, mockStockages, ChampLocalisationDto, champs, champsLoading, error, loading (+2 more)

### Community 143 - "Migrations 004-011"
Cohesion: 0.19
Nodes (11): mockExamTypes, mockIpcInvoke, allTypes, CATEGORIES, error, ExamCategoryDto, ExamTypeDto, loading (+3 more)

### Community 144 - "Invoice Payment Dialog"
Cohesion: 0.06
Nodes (33): addAllergie(), addAntecedent(), allergiesPreviewFields, antecedentGroups, antecedentLibelleValid, antecedentsPreviewFields, autonomieClasse, autonomiePreviewFields (+25 more)

### Community 145 - "Mode Vie Antecedents"
Cohesion: 0.20
Nodes (9): mockAvisRequest, mockImagerieRequest, mockIpcInvoke, mockLaboratoireRequest, error, ExamRequestDto, loading, requests (+1 more)

### Community 146 - "Exam Requests Tests"
Cohesion: 0.16
Nodes (9): EL_STUBS, { mockInvoke, mockElMessage, mockElMessageBox }, mockOrigins, mockInvoke, mockOrigins, error, loading, origins (+1 more)

### Community 147 - "Invoices Composable"
Cohesion: 0.18
Nodes (5): appointments, currentWeekStart, hours, weekDays, weekLabel

### Community 148 - "Planning View"
Cohesion: 0.21
Nodes (4): EncounterConverter, EncounterMovementConverter, EncounterEntity, EncounterMovementEntity

### Community 150 - "Fiche Diabete Tab"
Cohesion: 0.15
Nodes (11): currentIdx, props, mockActiveStay, mockIpcInvoke, mockMovements, mockStays, error, loading (+3 more)

### Community 151 - "Vital Check Tests"
Cohesion: 0.08
Nodes (21): emit, FormPreviewField, onEditField(), props, visibleFields, EL_STUBS, bilanPreviewFields, { calcDureeDiabete, calcDFG, calcStadeIR } (+13 more)

### Community 152 - "Examens View Tests"
Cohesion: 0.20
Nodes (5): mockIpcInvoke, MONDAY, MONDAY_STR, RECORD_TEMPLATE, stubs

### Community 153 - "Session DTOs"
Cohesion: 0.27
Nodes (5): dateAt(), defaultMockRequests(), makeRequest(), { mockIpcInvoke }, stubs

### Community 154 - "Act Price History DTOs"
Cohesion: 0.27
Nodes (3): SessionConverter, SessionDto, SessionEntity

### Community 155 - "Service Favorites DTOs"
Cohesion: 0.24
Nodes (8): onMedecinSelect(), onMedecinSelect(), onResponsableSelect(), mockIpcInvoke, mockMedicalStaff, formatMedecinName(), medicalRoles, useMedicalStaff()

### Community 156 - "API Client"
Cohesion: 0.13
Nodes (6): dialogRef, filterActive, filteredServices, searchQuery, {
  services,
  loading,
  error,
  fetchServices,
  toggleService,
  deleteService,
}, { sites, fetchSites }

### Community 157 - "Bilan Initial Tab"
Cohesion: 0.26
Nodes (3): ClinicalDocumentSignatureConverter, ClinicalDocumentSignatureDTO, ClinicalDocumentSignatureEntity

### Community 158 - "Patient Layout Tests"
Cohesion: 0.05
Nodes (34): { calcGlasgowScore, glasgowInterpretation, calcIMC }, cancelVitalEdit(), conclusionPreviewFields, defaultVitalHour(), douleurEditingKey, douleurFormOpen, editVitalEntry(), examenPhysiquePreviewFields (+26 more)

### Community 159 - "Patient Record Tests"
Cohesion: 0.14
Nodes (11): mockActes, mockInvoke, error, loading, PatientActeDto, patientActes, usePatientActes(), { formatCurrency, fetchCurrencies } (+3 more)

### Community 160 - "Session Service"
Cohesion: 0.18
Nodes (5): AppSettingsConverter, DispositifTypeConverter, AppSettingsEntity, ServiceSiteEntity, DispositifTypeEntity

### Community 161 - "Hospital Info Composable"
Cohesion: 0.15
Nodes (7): PlanSoinsConverter, PlanSoinsItemConverter, UserSiteConverter, SchemaField(), PlanSoinsEntity, PlanSoinsItemEntity, UserSiteEntity

### Community 164 - "Sortie Tab"
Cohesion: 0.14
Nodes (13): addRdv(), clotureAdminPreviewFields, clotureMedicalePreviewFields, emit, emitChange(), props, removeRdv(), sectionRefs (+5 more)

### Community 165 - "Clinical Doc Form Tests"
Cohesion: 0.15
Nodes (11): documentType, draftDocument, DynamicFormRendererStub, EL_STUBS, importedDocDoc, importedDocument, importedDocumentNoPdf, importedImageDoc (+3 more)

### Community 166 - "Dynamic Form Renderer Tests"
Cohesion: 0.09
Nodes (19): editEncounter, EL_STUBS, ElAutocompleteStub, ElButtonStub, ElColStub, ElDatePickerStub, ElDialogStub, ElFormItemStub (+11 more)

### Community 167 - "Auth DTOs & Handler"
Cohesion: 0.09
Nodes (21): AdmissionData, AllergieEntry, AntecedentEntry, AutonomieSL, BilanBio, BilanBioResult, BilanInitialData, CrcDiabeteFormData (+13 more)

### Community 168 - "Password Service"
Cohesion: 0.16
Nodes (7): AutomergeSyncService, inject, singleton, EntityChangeEvent, AutomergeSqliteStorageAdapter, inject, singleton

### Community 169 - "Clinical Doc List UI"
Cohesion: 0.08
Nodes (23): addExamen(), bilanBioPreviewFields, bioGroups, bioRange, clearBio(), emit, emitChange(), EXAMEN_TYPES (+15 more)

### Community 170 - "Evolution Medicale Tab"
Cohesion: 0.18
Nodes (5): ConservateurStockageEntity, ConservateurService, singleton, createTestStockage(), useConservateurs()

### Community 171 - "Examens Complementaires Tab"
Cohesion: 0.29
Nodes (4): EL_STUBS, mockChamps, { mockInvoke, mockElMessage, mockElMessageBox }, mockStockages

### Community 172 - "Stockage Tab Tests"
Cohesion: 0.29
Nodes (6): EL_STUBS, mockActs, mockCurrencies, { mockInvoke, mockElMessage, mockElMessageBox }, mockTarifs, mountComponent()

### Community 173 - "Tarifs Tab Tests"
Cohesion: 0.29
Nodes (3): activeTab, EL_STUBS, { mockInvoke, mockElMessage, mockElMessageBox }

### Community 174 - "Configuration Clinic Tests"
Cohesion: 0.33
Nodes (4): filteredList, paginator, searchText, stock

### Community 175 - "HTML Entry & Assets"
Cohesion: 0.08
Nodes (8): ENTITY_TYPE_MAP, SyncProgressEvent, setupIpcDispatcher(), RemoteSyncService, inject, singleton, loadModule(), ./electron/*

### Community 176 - "User Entity"
Cohesion: 0.09
Nodes (19): contentRef, downloading, downloadPdf(), emit, handleClosed(), htmlContent, iframeRef, iframeStyle (+11 more)

### Community 177 - "Soins View"
Cohesion: 0.40
Nodes (5): HTML Entry Point, Main entry script /src/main.ts, CDE App Icon (PNG), Favicon SVG, CDE Icon Copy in Assets

### Community 178 - "Pharmacie View"
Cohesion: 0.50
Nodes (4): colors, emit, props, select()

### Community 180 - "Service Color Picker"
Cohesion: 0.50
Nodes (3): ComponentCustomProperties, GlobalComponents, vue

### Community 181 - "Export Composable"
Cohesion: 0.06
Nodes (29): computeIsNormal(), emit, formData, groupedParams, onSubmit(), { parameters, loading: loadingParams, fetchByExamIds }, ParamGroup, props (+21 more)

### Community 182 - "Patient Form Draft"
Cohesion: 0.29
Nodes (6): mockInvoke, mockTarifs, error, loading, TarifDto, tarifs

### Community 193 - "Community 193"
Cohesion: 0.21
Nodes (5): dateAt(), makeResult(), { mockIpcInvoke }, stubs, twoGroups()

### Community 209 - "Community 209"
Cohesion: 0.36
Nodes (8): charToCode128BValue(), CODE128_PATTERNS, Code128Options, computeChecksum(), escapeXml(), fmt(), generateCode128Svg(), patternLength()

### Community 211 - "Community 211"
Cohesion: 0.15
Nodes (6): dialogRef, filteredList, { origins, loading, error, fetchOrigins, updateOrigin, deleteOrigin }, paginatedList, paginator, searchQuery

### Community 220 - "Community 220"
Cohesion: 0.27
Nodes (3): ActPriceHistoryConverter, ActPriceHistoryDto, ActPriceHistoryEntity

### Community 225 - "Community 225"
Cohesion: 0.14
Nodes (11): { createAct, updateAct }, editingId, emit, form, formRef, rules, { services }, servicesList (+3 more)

### Community 230 - "Community 230"
Cohesion: 0.20
Nodes (8): createDefaultData(), createWrapper(), EL_STUBS, mockCan, mockEditor, saveVitalSignsItem(), BilanInitialData, onSaveHour()

### Community 231 - "Community 231"
Cohesion: 0.20
Nodes (5): ChildTabStub, EL_STUBS, mockActivePatient, { mockConfirm }, mockIpcInvoke

### Community 234 - "Community 234"
Cohesion: 0.29
Nodes (10): currentIsoDateTime(), deleteDouleurEntry(), deleteGlasgowEntry(), emit, emitChange(), generateKey(), saveDouleurEntry(), saveGlasgowEntry() (+2 more)

### Community 241 - "Community 241"
Cohesion: 0.20
Nodes (8): currencies, CURRENCY_LOCALE, CurrencyDto, currencyMap, defaultCurrency, error, loaded, loading

### Community 245 - "Community 245"
Cohesion: 0.17
Nodes (10): ./InsuranceFormDialog.vue, { createInsurance, updateInsurance }, editingId, emit, form, formRef, rules, submit() (+2 more)

### Community 246 - "Community 246"
Cohesion: 0.14
Nodes (6): EntityConverter, getEntityTypeForTable(), TABLE_TO_TYPE, TestEntity, ChangeCallback, ExcludeMethods

### Community 251 - "Community 251"
Cohesion: 0.15
Nodes (6): dialogRef, filteredList, { insurances, loading, error, fetchInsurances, updateInsurance, deleteInsurance }, paginatedList, paginator, searchQuery

### Community 259 - "Community 259"
Cohesion: 0.20
Nodes (6): CreateAttachmentDto, UserAttachmentDto, UserAttachmentEntity, registerUserAttachmentHandlers(), singleton, UserAttachmentService

### Community 264 - "Community 264"
Cohesion: 0.31
Nodes (10): addPayment(), createInvoice(), fetchInvoices(), fetchInvoiceStats(), getInvoice(), invoices, invoke(), ServiceControllerResultType (+2 more)

### Community 270 - "Community 270"
Cohesion: 0.22
Nodes (12): createPrescription(), makeCreateResult(), makePrescription(), mockIpcInvoke, mountComposable(), error, loading, PrescriptionCreateResult (+4 more)

### Community 271 - "Community 271"
Cohesion: 0.22
Nodes (5): DEFAULT_BLOCS, mockedUsePlanSoins, mockIpcInvoke, { mockValider, mockSuspendre, mockReprendreSoin, mockGetPlanSoins, mockCreatePrescription, mockUpdatePrescription, mockGetPrescription, mockSuspendrePrescription, mockReprendrePrescription }, stubs

### Community 272 - "email-config.entity.ts"
Cohesion: 0.23
Nodes (6): EmailConfigDto, EmailConfigSaveDto, decrypt(), encrypt(), ENCRYPTION_KEY, useEmailConfig()

### Community 286 - "extract_design.py"
Cohesion: 0.17
Nodes (8): downloading, emit, handleClosed(), htmlContent, iframeRef, loading, props, visible

### Community 288 - "qrcode"
Cohesion: 0.22
Nodes (3): ElCardMock, mockInvoke, mockSetActivePatient

### Community 289 - "InsuranceEntity"
Cohesion: 0.24
Nodes (3): inject, singleton, VoieTypeService

### Community 290 - "Ordonnance Bizone Template"
Cohesion: 0.25
Nodes (8): Ordonnance Bizone Template, Capteur Freestyle Libre 2 Plus, Insuline Novorapid, Insuline Tresiba 72 UI, Trulicity 3 mg, Xigduo (Metformine + Dapagliflozine), Ordonnance Bizone (CERFA 14465*01), Patient: Karahacane Nassim

### Community 291 - "@types/bcryptjs"
Cohesion: 0.20
Nodes (7): mockClearPatient, mockElMessage, mockGetPatient, mockRemovePatient, mockRouterPush, mockSetActivePatient, stubs

### Community 292 - "@types/node"
Cohesion: 0.36
Nodes (5): CreatePatientAttachmentDto, PatientAttachmentDto, UpdatePatientAttachmentDto, registerPatientAttachmentHandlers(), created()

### Community 295 - "025-attachment-types.ts"
Cohesion: 0.11
Nodes (8): AutomergeDocumentConverter, CareUnitConverter, UserServiceConverter, reg(), buildDocumentSchema(), AutomergeDocumentEntity, CareUnitEntity, UserServiceEntity

### Community 297 - "071-create-exam-requests.ts"
Cohesion: 0.33
Nodes (3): PasswordService, singleton, inject

### Community 298 - "075-add-exam-request-specialty-id.ts"
Cohesion: 0.19
Nodes (4): PatientAttachmentService, inject, singleton, getBase64DecodedSize()

### Community 300 - "PatientActeService"
Cohesion: 0.29
Nodes (3): CareUnitCreateDto, CareUnitDto, CareUnitUpdateDto

### Community 304 - "chart.js"
Cohesion: 0.33
Nodes (3): FormDraftService, inject, singleton

### Community 305 - "usePatientFormDraft.ts"
Cohesion: 0.33
Nodes (4): StaticMigrationProvider, mockConfig, mockIpcInvoke, EmailConfig

### Community 310 - "UserAttachmentEntity"
Cohesion: 0.33
Nodes (4): useAuth(), app, router, routes

### Community 311 - "VoieTypeEntity"
Cohesion: 0.05
Nodes (28): MedicalUnitCreateDto, MedicalUnitDto, MedicalUnitUpdateDto, CurrencyCreateDto, CurrencyDto, CurrencyUpdateDto, DispositifTypeDto, FonctionCreateDto (+20 more)

### Community 312 - "@tiptap/extension-placeholder"
Cohesion: 0.43
Nodes (4): emit, handleCreate(), handleDelete(), handleSelect()

### Community 317 - "useExport.ts"
Cohesion: 0.28
Nodes (7): DiabeteExportParams, error, exportingExcel, exportingPdf, fetchPreview(), getApi(), invokeExport()

### Community 318 - "vue-router"
Cohesion: 0.33
Nodes (4): makeDocument(), makeDocumentType(), {
  mockFetchDocumentTypes,
  mockFetchDocumentsByPatient,
  mockCreateDocument,
  mockDeleteDocument,
  mockListEncountersByPatient,
  mockElMessage,
  mockElMessageBox,
  mockSelectDocument,
  state,
}, stubs

### Community 319 - "PatientAttachmentEntity"
Cohesion: 0.29
Nodes (6): createWrapper(), EL_STUBS, mockCreateUnit, { mockInvoke, mockElMessage, mockElMessageBox }, mockUpdateUnit, servicesRef

### Community 320 - "046-service-hierarchy.ts"
Cohesion: 0.38
Nodes (6): INSULIN_DRUGS, isInsulin(), PlanSoins, StatutSoin, VoieAdministration, MedicationGridRow

### Community 345 - "stay.converter.ts"
Cohesion: 0.22
Nodes (4): StayConverter, StayMovementConverter, StayEntity, StayMovementEntity

## Ambiguous Edges - Review These
- `CDE App Icon (PNG)` → `CDE Icon Copy in Assets`  [AMBIGUOUS]
  public/cde.png · relation: unknown

## Knowledge Gaps
- **1774 isolated node(s):** `vue`, `GlobalComponents`, `ServiceControllerResultType`, `TestEntity`, `EntityChangeAction` (+1769 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **55 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `CDE App Icon (PNG)` and `CDE Icon Copy in Assets`?**
  _Edge tagged AMBIGUOUS (relation: related to) - confidence is low._
- **Why does `DB` connect `Patient Form Dialog` to `Data Source & DB Layer`, `Community 259`, `App Settings Entity`, `Community 261`, `Community 262`, `Encounters Table UI`, `Contact Form & Medecin Select`, `Vite & TS Config`, `Community 267`, `Community 268`, `Community 269`, `Stay Timeline`, `Community 273`, `email-config.entity.ts`, `Service Constructors`, `Planning View`, `Act Price History DTOs`, `Community 284`, `Bilan Initial Tab`, `Care Unit DTOs`, `Session Service`, `Localite DTOs`, `Hospital Info Composable`, `Header Builder`, `Invoice Print View`, `CRH Diabete Form`, `InsuranceEntity`, `025-attachment-types.ts`, `Evolution Medicale Tab`, `079-seed-ordonnance-libre.ts`, `Service DTOs & Entities`, `Contact Origin DTOs`, `Specialty DTOs`, `Service Form Dialog`, `SQLite Connection Driver`, `chart.js`, `075-add-exam-request-specialty-id.ts`, `InvoiceEntity`, `Site DTOs`, `Care Units Tab`, `Patient Acte DTOs`, `Conservateur Stockage`, `Synthese Diagram Tab`, `Auth Service & User`, `Category Form Tests`, `Stay DTOs`, `Migration Service`, `TypeScript Config`, `Attachment Type DTOs`, `Electron Main Process`, `UserSpecialtyEntity`, `Patient Composable`, `Care Unit Form Dialog`, `User Attachments Section`, `SideBar Tests`, `Dispositif Voie Tab`, `unplugin-icons`, `Form Draft DTOs`, `Dispositif Type DTOs`, `stay.converter.ts`, `voie-type.converter.ts`, `Community 220`, `Stockage Tab`, `Patient Invoices View`, `Email Config Service`, `Auto Imports Config`, `Community 236`, `Email Config DTOs`, `Community 243`, `User Print Dialog`, `Vital Signs Tests`?**
  _High betweenness centrality (0.201) - this node is a cross-community bridge._
- **Why does `ipcInvoke()` connect `Settings DTOs` to `Prescription Management`, `Price History Timeline`, `Plan Soins & Prescriptions`, `Examens View`, `Clinical Documents`, `Clinical Doc List Tests`, `Conservateurs Tests`, `Migrations 004-011`, `Dispositif & Vital Signs DTOs`, `Vital Check Tab`, `Exam Requests Tests`, `Mode Vie Antecedents`, `Community 270`, `Encounter DTOs`, `Tarifs Tab`, `Electron Build Dependencies`, `Plan Soins Records`, `Site Form Dialog`, `Service Favorites DTOs`, `Fonction Form Dialog`, `Fiche Diabete Tab`, `Appointments View`, `Patient Record Tests`, `Dossier Clinic View`, `Medical Unit DTOs`, `Patient Layout Tests`, `Plan Soins DTOs`, `SideBar Component`, `usePatientFormDraft.ts`, `Medical Act DTOs`, `Export Composable`, `Patient Form Draft`, `User Form`, `Entity Converters`, `Patient Context Toolbar`, `Patient Clinical Docs UI`, `Conservateur DTOs`, `Fonction DTOs`, `Invoice Form Dialog`, `User Detail Dialog`, `Dispositifs Composable`, `Champ Localisation Form`, `Dispositif Type Tab`, `Document Type Form`, `Medical Units Tab`, `App & Update Notifier`, `Community 230`, `Appointment Service`, `Login Form`, `Admission Tab`, `Community 241`, `Contact Category Tests`, `Contact Origin Tests`, `Currency Composable`, `Contact Category Form`?**
  _High betweenness centrality (0.120) - this node is a cross-community bridge._
- **Why does `useAuth()` connect `UserAttachmentEntity` to `Plan Soins & Prescriptions`, `TopBar Component`, `Conservateur DTOs`, `Patient Actes Tests`, `User Attachment DTOs`, `IPC Handlers Registration`, `Appointment DTOs`, `Export Templates`, `Settings DTOs`, `Contact Category DTOs`, `Patient Converters & DTOs`, `Clinical Documents`, `Admission Tab`, `Medical Unit DTOs`, `Export Composable`, `Electron Build Dependencies`, `TypeScript Config`, `Exam Type Entity`?**
  _High betweenness centrality (0.098) - this node is a cross-community bridge._
- **Are the 16 inferred relationships involving `AppDatabaseDatasource` (e.g. with `registerSettingsHandlers()` and `createTestPatient()`) actually correct?**
  _`AppDatabaseDatasource` has 16 INFERRED edges - model-reasoned connections that need verification._
- **What connects `vue`, `GlobalComponents`, `ServiceControllerResultType` to the rest of the system?**
  _1774 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Data Source & DB Layer` be split into smaller, more focused modules?**
  _Cohesion score 0.039649122807017545 - nodes in this community are weakly interconnected._