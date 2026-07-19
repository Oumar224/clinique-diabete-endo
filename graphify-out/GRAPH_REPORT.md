# Graph Report - /home/oumar/projects/clinique-diabete-endo  (2026-07-19)

## Corpus Check
- Large corpus: 536 files · ~285,316 words. Semantic extraction will be expensive (many Claude tokens). Consider running on a subfolder.

## Summary
- 4075 nodes · 7315 edges · 284 communities (252 shown, 32 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 149 edges (avg confidence: 0.71)
- Token cost: 0 input · 0 output

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
- Tarifs Tests
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
- Settings Extension Migration
- ESLint Configuration
- Global Component Types
- Community 256
- Community 257
- Community 259
- Community 260
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
- Community 272
- Community 273
- Community 275
- Community 276

## God Nodes (most connected - your core abstractions)
1. `AppDatabaseDatasource` - 142 edges
2. `DB` - 141 edges
3. `ipcInvoke()` - 87 edges
4. `createHandler()` - 56 edges
5. `registerSettingsHandlers()` - 46 edges
6. `AuthService` - 30 edges
7. `registerAllHandlers()` - 29 edges
8. `ExportService` - 29 edges
9. `ClinicalDocumentService` - 28 edges
10. `ServiceService` - 28 edges

## Surprising Connections (you probably didn't know these)
- `Template Ordonnance (Prescription Template)` ----> `ESLint Configuration`  [AMBIGUOUS]
  intelligent_resources/template_ordonance.jpeg → .eslintrc.yaml
- `HTML Entry Point` ----> `CDE App Icon (PNG)`  [EXTRACTED]
  index.html → public/cde.png
- `HTML Entry Point` ----> `Favicon SVG`  [EXTRACTED]
  index.html → public/favicon.svg
- `CDE App Icon (PNG)` ----> `CDE Icon Copy in Assets`  [AMBIGUOUS]
  public/cde.png → src/assets/cde.png
- `useConfigTarifs()` --indirect_call--> `createTarif()`  [INFERRED]
  src/composables/useConfigTarifs.ts → electron/services/__tests__/config-tarif.service.spec.ts

## Import Cycles
- None detected.

## Communities (284 total, 32 thin omitted)

### Community 0 - "Data Source & DB Layer"
Cohesion: 0.03
Nodes (43): inject, Entity, inject, inject, inject, inject, inject, inject (+35 more)

### Community 1 - "Prescription Management"
Cohesion: 0.03
Nodes (54): handleClosed(), activeStep, ageInput, allergyInputRef, allergyInputValue, allergyInputVisible, cancelAndClose(), close() (+46 more)

### Community 2 - "Patient Form Dialog"
Cohesion: 0.06
Nodes (14): IAppDataSource, AppSettingsEntity, AutomergeDocumentEntity, DB, ENTITIES, ServiceSiteEntity, UserMedicalUnitEntity, UserServiceEntity (+6 more)

### Community 3 - "Plan Soins & Prescriptions"
Cohesion: 0.05
Nodes (51): getPlanSoins(), reprendrePrescription(), reprendreSoin(), suspendrePrescription(), getPrescription(), updatePrescription(), StatutSoin, VoieAdministration (+43 more)

### Community 4 - "Patient Converters & DTOs"
Cohesion: 0.04
Nodes (39): { activePatient }, analysesDisponibles, createExamForm(), currentHour, currentWeekStart, editDialogVisible, editForm, editRequestId (+31 more)

### Community 5 - "App Settings Entity"
Cohesion: 0.10
Nodes (13): ChampLocalisationCreateDto, ChampLocalisationDto, ChampLocalisationUpdateDto, StockagePhysiqueCreateDto, StockagePhysiqueDto, StockagePhysiqueUpdateDto, ConservateurChampLocalisationEntity, ConservateurStockageEntity (+5 more)

### Community 6 - "Encounters Table UI"
Cohesion: 0.08
Nodes (13): ClinicalDocumentDTO, ClinicalDocumentEntity, ClinicalDocumentRow, ClinicalDocumentStatus, ClinicalDocumentTypeDTO, ClinicalDocumentTypeEntity, FormFieldSchema, ClinicalDocumentService (+5 more)

### Community 7 - "Examens View"
Cohesion: 0.07
Nodes (36): onMedecinSelect(), queryMedecins(), careUnits, emit, encounterId, fetchCareUnitsByService(), {
  form,
  endDateFormatted,
  showOriginPrecision,
  showAssuranceField,
  resetForm,
  patchForm,
}, formRef (+28 more)

### Community 8 - "Clinical Documents"
Cohesion: 0.05
Nodes (36): autoQuantiteTotale, createFormRules, dispositifTypes, editAutoQuantiteTotale, editForm, editFormRef, editFormRules, editing (+28 more)

### Community 9 - "Contact Form & Medecin Select"
Cohesion: 0.06
Nodes (24): ActPriceHistoryDto, AppInfoDto, BackupResultDto, CurrencyCreateDto, CurrencyUpdateDto, DbStatsDto, FonctionCreateDto, FonctionUpdateDto (+16 more)

### Community 10 - "Invoice DTOs"
Cohesion: 0.05
Nodes (42): ./*, auto-imports.d.ts, dist, DOM, DOM.Iterable, e2e/**/*.ts, ES2020, node_modules (+34 more)

### Community 11 - "Settings DTOs"
Cohesion: 0.07
Nodes (33): form, formRef, handleSubmit(), loading, rules, submitted, careUnits, emit (+25 more)

### Community 12 - "Forgot Password"
Cohesion: 0.06
Nodes (26): ./ContactOriginFormDialog.vue, { createOrigin, updateOrigin }, editingId, emit, form, formRef, rules, submit() (+18 more)

### Community 13 - "Insurance Form Dialog"
Cohesion: 0.05
Nodes (27): getVitalSignsItemsList(), saveVitalSignsItem(), activeTab, ALERT_THRESHOLDS, allItems, CONSTANTS_ROWS, currentHour, currentWeekStart (+19 more)

### Community 14 - "Dispositif & Vital Signs DTOs"
Cohesion: 0.06
Nodes (23): createLocalites(), EL_STUBS, mockInvoke, mockLocalites(), customCountry, fileInput, filterActive, filteredTree (+15 more)

### Community 15 - "Patient Form Tests"
Cohesion: 0.07
Nodes (25): mockActiveStay, mockInvoke, mockMovements, mockStays, getActiveStay(), getStayMovements(), listStaysByPatient(), StayDto (+17 more)

### Community 16 - "Stay Timeline"
Cohesion: 0.07
Nodes (31): { formatCurrency }, PriceHistoryEntry, getTrustedPerson(), TrustedPersonDto, formatDate(), formatDateTime(), avatarGender, avatarSymbol (+23 more)

### Community 17 - "Vital Check Tab"
Cohesion: 0.08
Nodes (24): emit, loadingMovements, movementsMap, onExpandChange(), originLabelMap, mockEncounters, mockInvoke, mockMovements (+16 more)

### Community 18 - "NPM Dependencies"
Cohesion: 0.06
Nodes (35): @automerge/automerge, bcryptjs, chart.js, electron-updater, exceljs, @iconify-json/bi, @iconify-json/carbon, @iconify-json/mdi (+27 more)

### Community 19 - "Service Constructors"
Cohesion: 0.10
Nodes (14): TarifBulkUpdateDto, TarifCreateDto, TarifDto, ConfigTarifEntity, ConfigTarifService, singleton, createTarif(), mockInvoke (+6 more)

### Community 20 - "Catalogue Actes Tab"
Cohesion: 0.06
Nodes (21): actPaginator, {
  acts, loading: actsLoading, fetchActs,
}, actSearch, actServiceFilter, codeTarifFilter, {
  currencies, defaultCurrency, loading: curLoading,
  fetchCurrencies, setDefault, deleteCurrency, formatCurrency,
}, currencyDialogRef, edits (+13 more)

### Community 21 - "Trusted Person Composable"
Cohesion: 0.06
Nodes (33): electron, electron-builder, jsdom, devDependencies, electron, electron-builder, jsdom, prettier (+25 more)

### Community 22 - "Encounter DTOs"
Cohesion: 0.07
Nodes (21): ./SiteFormDialog.vue, { createSite, updateSite }, editingId, emit, form, formRef, rules, submit() (+13 more)

### Community 23 - "Tarifs Tab"
Cohesion: 0.12
Nodes (10): EncounterCreateDto, EncounterDto, EncounterListFilters, EncounterMovementDto, EncounterUpdateDto, EncounterEntity, EncounterMovementEntity, EncounterRow (+2 more)

### Community 24 - "Electron Build Dependencies"
Cohesion: 0.10
Nodes (22): PlanSoinsRecord, suspendreSoin(), validerSoin(), DEFAULT_BLOCS, { mockGetPlanSoins, mockValiderSoin, mockSuspendreSoin }, mountPlanSoinsContext(), SOIN_EN_ATTENTE, SOIN_INSULIN (+14 more)

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
Cohesion: 0.11
Nodes (9): PatientDto, PatientEntity, EnrichedPatient, PatientService, inject, singleton, createTestPatient(), createTestPatient() (+1 more)

### Community 29 - "Medical Unit DTOs"
Cohesion: 0.12
Nodes (25): hideLoader(), showLoader(), createUser(), deleteUser(), getUserDisplayName(), loadUsers(), MedicalUnitRef, reactivateContract() (+17 more)

### Community 30 - "System Settings & Migration"
Cohesion: 0.07
Nodes (22): { activePatient }, appointments, currentWeekStart, error, filteredAppointments, FilterMode, formDialogVisible, getWeekStart() (+14 more)

### Community 31 - "Care Unit DTOs"
Cohesion: 0.11
Nodes (8): LocaliteCreateDto, LocaliteDto, LocaliteUpdateDto, LocaliteEntity, LOCALITE_TYPES_BY_DEPTH, LocaliteRaw, LocaliteService, singleton

### Community 32 - "Dossier Clinic View"
Cohesion: 0.09
Nodes (23): StaticMigrationProvider, dbPath, emailForm, handleSaveEmail(), handleTestEmail(), hasData, { systemInfo, backingUp, restoring, fetchInfo, triggerBackup, triggerRestore }, EmailConfig (+15 more)

### Community 33 - "Localite DTOs"
Cohesion: 0.18
Nodes (4): AppointmentDto, AppointmentEntity, AppointmentService, singleton

### Community 34 - "Export Service"
Cohesion: 0.17
Nodes (3): ExportService, singleton, useExport()

### Community 35 - "Header Builder"
Cohesion: 0.10
Nodes (17): mockIpcInvoke, _entries, OpenPatientEntry, useOpenPatients(), activePatient, Patient, PATIENT_CONTEXT_KEY, providePatientContext() (+9 more)

### Community 36 - "TopBar Component"
Cohesion: 0.07
Nodes (17): activeContact, { activePatient }, contactDisplayLabel, contactTypeLabel, creatingDoc, {
  documentTypes,
  documents,
  selectedDocument,
  loading,
  fetchDocumentTypes,
  fetchDocumentsByPatient,
  createDocument,
  updateDocumentData,
  signDocument,
  deleteDocument,
  getDocumentType,
  selectDocument,
}, isReadonly, pageLoading (+9 more)

### Community 37 - "CRH Diabete Form"
Cohesion: 0.13
Nodes (6): ServiceDto, ServiceEntity, ServiceService, singleton, createTestService(), createTestService()

### Community 38 - "Exam Type Tab"
Cohesion: 0.18
Nodes (22): buildContactLine(), buildDeviseLine(), buildInstitutionLine(), buildProfileTitle(), buildRepublicHeader(), buildSeparatorLine(), buildTitleAndDate(), darkBlueFont() (+14 more)

### Community 39 - "Plan Soins DTOs"
Cohesion: 0.08
Nodes (24): getValidesPlanSoins(), ValideRecord, getVitalSignsList(), activeTab, chartData, chartOptions, DataPoint, dateRange (+16 more)

### Community 40 - "IPC Handlers Registration"
Cohesion: 0.09
Nodes (25): { activePatient }, activeTab, { calcAge, calcGlasgowScore }, draftStatus, emit, { exportCrhDiabetePdf }, flattenFormData(), formData (+17 more)

### Community 41 - "SideBar Component"
Cohesion: 0.09
Nodes (21): cancelEdit(), {
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
}, childrenErrors, childrenLoading, childrenMap, createExamForm, createExamParentId, createForm (+13 more)

### Community 42 - "Service DTOs & Entities"
Cohesion: 0.14
Nodes (8): CareUnitCreateDto, CareUnitDto, CareUnitUpdateDto, CareUnitEntity, registerCareUnitHandlers(), CareUnitService, CareUnitWithService, singleton

### Community 43 - "Specialty DTOs"
Cohesion: 0.20
Nodes (16): registerAppointmentHandlers(), registerAuthHandlers(), registerClinicalDocumentHandlers(), registerEmailHandlers(), registerEncounterHandlers(), registerExamTypeHandlers(), registerExportHandlers(), registerIdentityHandlers() (+8 more)

### Community 44 - "Contact Category DTOs"
Cohesion: 0.08
Nodes (23): toggle(), { activePatient, clearPatient, setActivePatient }, activeRoute, { isCollapsed, sidebarWidth, toggle }, isPatientRoute, logoError, { logoUrl }, matchesSearch() (+15 more)

### Community 45 - "Contact Origin DTOs"
Cohesion: 0.18
Nodes (7): BlocHoraireDto, PlanSoinsDto, PlanSoinsEntity, PlanSoinsItemEntity, PlanSoinsService, singleton, SoinItem

### Community 46 - "Insurance DTOs"
Cohesion: 0.19
Nodes (8): AppointmentConverter, EntityConverter, InvoiceConverter, PatientConverter, UserConverter, TestEntity, AutomergeDocument, ExcludeMethods

### Community 47 - "Service Form Dialog"
Cohesion: 0.14
Nodes (4): CurrencyDto, CurrencyEntity, CurrencyService, singleton

### Community 48 - "SQLite Connection Driver"
Cohesion: 0.15
Nodes (6): SiteCreateDto, SiteDto, SiteUpdateDto, SiteEntity, SiteService, singleton

### Community 49 - "Patient Attachment DTOs"
Cohesion: 0.14
Nodes (8): StayDto, StayMovementDto, StayEntity, StayMovementEntity, StayRow, StayService, inject, singleton

### Community 50 - "Medical Act DTOs"
Cohesion: 0.09
Nodes (15): dialogRef, filteredList, paginatedList, paginator, searchQuery, serviceFilter, { services, fetchServices }, { units, loading, error, fetchUnits, deleteUnit, toggleUnit } (+7 more)

### Community 51 - "Site DTOs"
Cohesion: 0.15
Nodes (6): MedicalUnitCreateDto, MedicalUnitDto, MedicalUnitUpdateDto, MedicalUnitEntity, MedicalUnitService, singleton

### Community 52 - "Care Units Tab"
Cohesion: 0.16
Nodes (6): FrequenceType, PrescriptionDto, PrescriptionEntity, registerPrescriptionHandlers(), PrescriptionService, singleton

### Community 53 - "Auth Service & User"
Cohesion: 0.15
Nodes (6): FonctionDto, FonctionEntity, registerSettingsHandlers(), SUPPORTED_CURRENCIES, FonctionService, singleton

### Community 54 - "Patient Acte DTOs"
Cohesion: 0.15
Nodes (7): ContactCategoryCreateDto, ContactCategoryDto, ContactCategoryEntity, ContactCategoryUpdateDto, registerContactCategoryHandlers(), ContactCategoryService, singleton

### Community 55 - "Conservateur Stockage"
Cohesion: 0.15
Nodes (7): ContactOriginCreateDto, ContactOriginDto, ContactOriginEntity, ContactOriginUpdateDto, registerContactOriginHandlers(), ContactOriginService, singleton

### Community 56 - "Synthese Diagram Tab"
Cohesion: 0.15
Nodes (7): InsuranceCreateDto, InsuranceDto, InsuranceEntity, InsuranceUpdateDto, registerInsuranceHandlers(), InsuranceService, singleton

### Community 57 - "User Form"
Cohesion: 0.12
Nodes (17): apiClient, ajouterDispositif(), DispositifInput, getDispositifs(), supprimerDispositif(), mockIpcInvoke, User, Dispositif (+9 more)

### Community 58 - "Currency DTOs"
Cohesion: 0.09
Nodes (14): dialogVisible, emits, fileInputRef, { fonctions, fetchFonctions: fetchFonctionsList }, form, formRef, onSubmit(), rules (+6 more)

### Community 59 - "Stay DTOs"
Cohesion: 0.09
Nodes (17): exportingExcel, exportingPdf, getApi(), invokeExport(), editUserFormRef, userFormRef, users, { exportingPdf, exportingExcel, exportUsersListPdf, exportUsersListExcel } (+9 more)

### Community 60 - "Migration Service"
Cohesion: 0.09
Nodes (4): NodeSqliteConnection, SQLValue, NodeSqliteDialect, NodeSqliteDriver

### Community 61 - "TypeScript Config"
Cohesion: 0.17
Nodes (7): LoginResult, SyncUserRelationsDto, TerminateContractDto, ValidatePasswordDto, UserEntity, SessionService, singleton

### Community 62 - "Entity Converters"
Cohesion: 0.17
Nodes (8): CreatePatientAttachmentDto, PatientAttachmentDto, UpdatePatientAttachmentDto, PatientAttachmentEntity, registerPatientAttachmentHandlers(), PatientAttachmentService, singleton, getBase64DecodedSize()

### Community 63 - "Attachment Type DTOs"
Cohesion: 0.15
Nodes (4): MedicalActDto, MedicalActEntity, MedicalActService, singleton

### Community 64 - "Electron Main Process"
Cohesion: 0.17
Nodes (7): SpecialtyCreateDto, SpecialtyDto, SpecialtyUpdateDto, SpecialtyEntity, registerSpecialtyHandlers(), SpecialtyService, singleton

### Community 65 - "Patient Context Toolbar"
Cohesion: 0.13
Nodes (16): getVitalSigns(), saveVitalSigns(), VitalSignsInput, VitalSignsItemInput, VitalSignsItemRecord, VitalSignsRecord, { mockGetVitalSigns, mockSaveVitalSigns }, mountVitalSignsContext() (+8 more)

### Community 66 - "Patient Clinical Docs UI"
Cohesion: 0.10
Nodes (19): ./ServiceFormDialog.vue, categories, { createService, updateService }, editingId, emit, form, formRef, rules (+11 more)

### Community 67 - "Patient Composable"
Cohesion: 0.19
Nodes (5): UserDto, AuthService, LoginResult, singleton, useAuth()

### Community 68 - "Automerge Sync Service"
Cohesion: 0.17
Nodes (6): PatientActeCreateDto, PatientActeDto, PatientActeEntity, registerPatientActeHandlers(), PatientActeService, singleton

### Community 69 - "Conservateur DTOs"
Cohesion: 0.10
Nodes (16): isOpen, onOpenPatientClick(), pdfLoading, props, getPatient(), mockOrdonnances, { activePatient, age, setActivePatient, clearPatient }, currentSection (+8 more)

### Community 70 - "User Attachment DTOs"
Cohesion: 0.09
Nodes (13): { activePatient }, currentPatientId, {
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
}, isReadonly, props, selectedDocType, { user }, error (+5 more)

### Community 71 - "Care Unit Form Dialog"
Cohesion: 0.13
Nodes (16): deletePatient(), fetchPatients(), PatientDto, patients, onDelete(), { exportingExcel, exportPatientsListExcel }, filteredList, formDialogRef (+8 more)

### Community 72 - "User Attachments Section"
Cohesion: 0.16
Nodes (7): ExamTypeDto, ExamTypeEntity, ExamTypeService, singleton, useDispositifTypes(), useExamTypes(), useVoieTypes()

### Community 73 - "Facturation View"
Cohesion: 0.18
Nodes (6): TrustedPersonDto, TrustedPersonEntity, registerPatientHandlers(), TrustedPersonService, inject, singleton

### Community 74 - "System Service"
Cohesion: 0.11
Nodes (16): addItem(), { currencyDef }, emit, form, formRef, onItemTypeChange(), open(), patientOptions (+8 more)

### Community 75 - "Fonction DTOs"
Cohesion: 0.10
Nodes (13): adding, {
  attachments,
  loading,
  addAttachment,
  removeAttachment,
  loadAttachments,
}, attachmentTypes, fileData, fileInputRef, props, selectedAttachmentTypeId, selectedFile (+5 more)

### Community 76 - "Invoice Form Dialog"
Cohesion: 0.17
Nodes (6): AutomergeSyncService, inject, singleton, AutomergeSqliteStorageAdapter, singleton, ChangeCallback

### Community 77 - "SideBar Tests"
Cohesion: 0.20
Nodes (7): AttachmentTypeDto, CreateAttachmentTypeDto, UpdateAttachmentTypeDto, AttachmentTypeEntity, registerAttachmentTypeHandlers(), AttachmentTypeService, singleton

### Community 78 - "Dispositif Voie Tab"
Cohesion: 0.17
Nodes (14): CreateDocumentParams, SeedService, buildAppointment(), buildCreateDocumentParams(), buildDispositif(), buildExamRequest(), buildInvoiceCreateDto(), buildPatientAttachment() (+6 more)

### Community 79 - "User Detail Dialog"
Cohesion: 0.11
Nodes (13): actDialogRef, {
  acts, loading, error, fetchActs, deleteAct,
}, filteredActs, paginatedActs, paginator, search, serviceFilter, { services, fetchServices } (+5 more)

### Community 80 - "Exam Request DTOs"
Cohesion: 0.10
Nodes (15): dialogPlaceholder, dialogTitle, dialogType, dispositifFiltered, dispositifSearch, error, form, formRef (+7 more)

### Community 81 - "Form Draft DTOs"
Cohesion: 0.16
Nodes (7): DispositifDto, DispositifEntity, registerPatientCareHandlers(), DispositifsService, singleton, createTestPatient(), createTestUser()

### Community 82 - "Dispositif Type DTOs"
Cohesion: 0.19
Nodes (5): ExamRequestDto, ExamRequestEntity, registerExamRequestHandlers(), ExamRequestService, singleton

### Community 83 - "Dispositifs Composable"
Cohesion: 0.20
Nodes (6): CreateAttachmentDto, UserAttachmentDto, UserAttachmentEntity, registerUserAttachmentHandlers(), singleton, UserAttachmentService

### Community 84 - "Patient Attachments Section"
Cohesion: 0.17
Nodes (6): VitalSignsDto, VitalSignEntity, createTestPatient(), createTestUser(), singleton, VitalSignsService

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
Cohesion: 0.12
Nodes (13): currUser, dialogVisible, displayName, emit, { exportingPdf, exportingExcel, exportUserProfilePdf, exportUserProfileExcel }, { fonctions, fetchFonctions: fetchFonctionsList }, handleReactivate(), handleTerminate() (+5 more)

### Community 90 - "Voie Type Tab"
Cohesion: 0.18
Nodes (16): AutonomieValues, calculateAutonomieLevel(), calculateGlasgow(), getGlasgowSeverity(), GlasgowValues, AutonomieItem, autonomieItems, autonomieLevel (+8 more)

### Community 91 - "Clinical Scores Composables"
Cohesion: 0.12
Nodes (13): fetchPatientInvoices(), invoices, { formatCurrency, loadCurrency }, formDialogRef, loadData(), loading, onCreated(), patientId (+5 more)

### Community 92 - "Users View"
Cohesion: 0.13
Nodes (12): DownloadProgress, isUpdateDownloaded, onDownloadProgress(), onUpdateAvailable(), onUpdateDownloaded(), state, UpdateInfo, updateMessage (+4 more)

### Community 93 - "Voie Type DTOs"
Cohesion: 0.13
Nodes (13): { activePatient, age, hasActivePatient }, addressLine, avatarBgColor, isPatientRoute, PATIENT_ROUTE_NAMES, route, showPatientHeader, addressLine (+5 more)

### Community 94 - "Exam Type Entity"
Cohesion: 0.13
Nodes (16): allDocumentTypes, autoDetectService(), {
  createDocumentWithActe,
  fetchDocumentTypesWithPricing,
  isContactExpired,
  checkContactExpired,
}, creatingId, emit, { formatCurrency }, formatPrice(), groupedTypes (+8 more)

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
Nodes (11): filteredList, { formatCurrency, loadCurrency }, formDialogRef, loading, onInvoiceCreated(), paginatedList, paginator, paymentDialogRef (+3 more)

### Community 98 - "Stockage Form Dialog"
Cohesion: 0.21
Nodes (5): FormDraftDto, FormDraftEntity, registerFormDraftHandlers(), FormDraftService, singleton

### Community 99 - "Stockage Tab"
Cohesion: 0.22
Nodes (6): InvoiceCreateDto, InvoiceListDto, InvoicePaymentDto, InvoiceStatsDto, InvoiceUpdateDto, InvoicePaymentEntity

### Community 100 - "Patient Invoices View"
Cohesion: 0.18
Nodes (4): VoieTypeDto, VoieTypeEntity, singleton, VoieTypeService

### Community 101 - "Attachment Types Tab"
Cohesion: 0.26
Nodes (14): calculateAge(), calculateAgeFromDates(), calculateDuration(), escapeHtml(), generateCrhDiabeteHtml(), generateFooter(), generateMedicalHeader(), generatePatientProfileHtml() (+6 more)

### Community 102 - "Patient Actes Tests"
Cohesion: 0.15
Nodes (16): createPrescription(), deletePrescription(), getPrescriptions(), PrescriptionCreateResult, PrescriptionInput, PrescriptionRecord, stopPrescription(), buildApiPayload() (+8 more)

### Community 103 - "Appointment Service"
Cohesion: 0.13
Nodes (13): AttachmentType, dialogVisible, editingType, form, formRef, handleDelete(), handleSave(), loading (+5 more)

### Community 104 - "Export Templates"
Cohesion: 0.14
Nodes (14): deleteEncounter(), { activePatient }, contactDialogVisible, currentUserId, editingEncounter, encounters, loadEncounters(), loading (+6 more)

### Community 105 - "Email Config Service"
Cohesion: 0.20
Nodes (6): EmailConfigDto, EmailConfigSaveDto, EmailConfigEntity, decrypt(), encrypt(), ENCRYPTION_KEY

### Community 106 - "Auto Imports Config"
Cohesion: 0.26
Nodes (3): InvoiceDto, InvoiceService, singleton

### Community 107 - "Automerge Sync & Registry"
Cohesion: 0.18
Nodes (4): DispositifTypeDto, DispositifTypeEntity, DispositifTypeService, singleton

### Community 108 - "Email Config DTOs"
Cohesion: 0.14
Nodes (3): LogoService, singleton, ./electron/*

### Community 110 - "Login Form"
Cohesion: 0.22
Nodes (4): VitalSignsItemDto, VitalSignsItemEntity, singleton, VitalSignsItemService

### Community 111 - "Admission Tab"
Cohesion: 0.18
Nodes (11): emits, form, formRef, LoginCommand, { logoUrl }, onSubmit(), rules, logoUrl (+3 more)

### Community 112 - "Identity Tab"
Cohesion: 0.17
Nodes (12): ageDisplay, { calcAge }, props, useCrhDiabeteCalculations(), ActeInterventionnel, AdmissionData, AutonomieSL, CrhDiabeteFormData (+4 more)

### Community 113 - "Services Tab"
Cohesion: 0.15
Nodes (12): ./ChampLocalisationFormDialog.vue, { createChamp, updateChamp, champs }, editingId, emit, form, formRef, nextSortOrder(), rules (+4 more)

### Community 114 - "Contact Category Tests"
Cohesion: 0.13
Nodes (8): fileInputRef, formRef, { info, loadInfo, saveInfo, saveLogo }, logoPreview, pendingLogo, { refreshLogo }, rules, saving

### Community 115 - "Contact Origin Tests"
Cohesion: 0.14
Nodes (11): { createAct, updateAct }, editingId, emit, form, formRef, rules, { services }, servicesList (+3 more)

### Community 116 - "User Print Dialog"
Cohesion: 0.13
Nodes (6): dialogRef, filterActive, filteredServices, searchQuery, {
  services,
  loading,
  error,
  fetchServices,
  toggleService,
  deleteService,
}, { sites, fetchSites }

### Community 117 - "User Profile View"
Cohesion: 0.15
Nodes (10): EL_STUBS, mockCategories, { mockInvoke, mockElMessage, mockElMessageBox }, mockCategories, mockInvoke, categories, ContactCategoryDto, error (+2 more)

### Community 118 - "Currency Composable"
Cohesion: 0.15
Nodes (10): EL_STUBS, mockInsurances, { mockInvoke, mockElMessage, mockElMessageBox }, mockInsurances, mockInvoke, error, InsuranceDto, insurances (+2 more)

### Community 119 - "Prescription DTOs"
Cohesion: 0.15
Nodes (9): { formatCurrency }, invoice, visible, Invoice, {
  currencies,
  defaultCurrency,
  formatCurrency,
  setDefault,
  loadDefault,
  fetchCurrencies,
}, CURRENCY_LOCALE, currencyCode, currencyDef (+1 more)

### Community 120 - "Dynamic Form Renderer"
Cohesion: 0.18
Nodes (10): buildRules(), buildValidatorRule(), emit, formRef, getFetchSuggestions(), handleAutocomplete(), localFormData, props (+2 more)

### Community 121 - "Currency Form Dialog"
Cohesion: 0.15
Nodes (11): ./CareUnitFormDialog.vue, { createUnit, updateUnit }, editingId, emit, form, formRef, rules, { services } (+3 more)

### Community 122 - "Package Config"
Cohesion: 0.16
Nodes (11): ./StockageFormDialog.vue, { createStockage, updateStockage, stockages }, editingId, emit, form, formRef, nextSortOrder(), rules (+3 more)

### Community 123 - "Vital Signs Tests"
Cohesion: 0.18
Nodes (8): HospitalInfoDto, inject, PatientExportService, inject, singleton, SettingsService, inject, singleton

### Community 124 - "Contact Category Form"
Cohesion: 0.27
Nodes (5): EmailConfigService, singleton, EmailService, inject, singleton

### Community 125 - "Contact Category Tab"
Cohesion: 0.15
Nodes (12): description, main, name, scripts, build, dev, lint, postinstall (+4 more)

### Community 126 - "Contact Origin Form"
Cohesion: 0.17
Nodes (10): ./ContactCategoryFormDialog.vue, { createCategory, updateCategory }, editingId, emit, form, formRef, rules, submit() (+2 more)

### Community 127 - "Contact Origin Tab"
Cohesion: 0.15
Nodes (6): { categories, loading, error, fetchCategories, updateCategory, deleteCategory }, dialogRef, filteredList, paginatedList, paginator, searchQuery

### Community 128 - "Medical Unit Form"
Cohesion: 0.17
Nodes (10): ./CurrencyFormDialog.vue, { createCurrency, updateCurrency }, editingCode, emit, form, formRef, rules, submit() (+2 more)

### Community 129 - "Price History Timeline"
Cohesion: 0.17
Nodes (10): ./InsuranceFormDialog.vue, { createInsurance, updateInsurance }, editingId, emit, form, formRef, rules, submit() (+2 more)

### Community 130 - "Specialty Form"
Cohesion: 0.15
Nodes (6): dialogRef, filteredList, { insurances, loading, error, fetchInsurances, updateInsurance, deleteInsurance }, paginatedList, paginator, searchQuery

### Community 131 - "Care Units Tab Tests"
Cohesion: 0.15
Nodes (11): EL_STUBS, mockDeleteUnit, mockFetchServices, mockFetchUnits, { mockInvoke, mockElMessage, mockElMessageBox }, mockServices, mockToggleUnit, mockUnits (+3 more)

### Community 132 - "Exam Types Tests"
Cohesion: 0.15
Nodes (12): CATEGORIE_SOIN_OPTIONS, CONSIGNES_PRISE_OPTIONS, FIXED_TIMES_OPTIONS, FORME_GALENIQUE_OPTIONS, FREQUENCE_TYPE_OPTIONS, FrequenceOption, FrequenceValue, INTERVAL_OPTIONS (+4 more)

### Community 133 - "Prescription View Tests"
Cohesion: 0.28
Nodes (10): makePrescription(), makeSoinPrescription(), {
  mockGetPrescriptions,
  mockDeletePrescription,
  mockUpdatePrescription,
  mockCreatePrescription,
  mockStopPrescription,
  mockGetPlanSoins,
  mockValiderSoin,
  mockSuspendreSoin,
}, mountAndOpenDialog(), mountWithForm(), openCreateForm(), IMPORTANT: The el-table stub does NOT render a <slot /> because the, setupForInteraction() (+2 more)

### Community 134 - "Electron API Types"
Cohesion: 0.15
Nodes (5): DownloadProgress, ElectronAPI, UpdateInfo, *.vue, Window

### Community 135 - "Appointment DTOs"
Cohesion: 0.17
Nodes (9): useMedicalServices(), dateRange, { fetchFavorites, favorites }, { formatCurrency, loadCurrency }, formattedDate, recentPatients, router, upcomingAppointments (+1 more)

### Community 136 - "Prescription Service"
Cohesion: 0.17
Nodes (11): vite.config.ts, compilerOptions, allowSyntheticDefaultImports, composite, emitDecoratorMetadata, experimentalDecorators, module, moduleResolution (+3 more)

### Community 137 - "Vite & TS Config"
Cohesion: 0.20
Nodes (9): emits, form, formRef, onSubmit(), rules, ValidatePasswordCommand, { logoUrl }, { validatePassword, loading, error } (+1 more)

### Community 138 - "Validate Password Form"
Cohesion: 0.18
Nodes (10): emit, form, { formatCurrency }, formRef, invoice, rules, saving, submit() (+2 more)

### Community 139 - "Clinical Doc Form"
Cohesion: 0.21
Nodes (10): contactDisplay, emit, formRendererRef, handleSave(), handleSaveDraft(), handleSign(), localFormData, props (+2 more)

### Community 140 - "Clinical Doc List Tests"
Cohesion: 0.18
Nodes (9): documents, documentTypes, EL_STUBS, mockConfirm, mockDocuments, mockDocumentTypes, mockIpcInvoke, ClinicalDocumentDTO (+1 more)

### Community 141 - "App Loader & Users"
Cohesion: 0.17
Nodes (8): emit, hospitalAddress, hospitalEmail, hospitalName, hospitalPhone, hospitalRegNumber, props, visible

### Community 142 - "Conservateurs Tests"
Cohesion: 0.20
Nodes (10): mockChamps, mockInvoke, mockStockages, ChampLocalisationDto, champs, champsLoading, error, loading (+2 more)

### Community 143 - "Migrations 004-011"
Cohesion: 0.20
Nodes (10): mockExamTypes, mockIpcInvoke, allTypes, CATEGORIES, error, ExamCategoryDto, ExamTypeDto, loading (+2 more)

### Community 144 - "Invoice Payment Dialog"
Cohesion: 0.20
Nodes (10): autonomieClasse, autonomieTag, { calcAutonomieClass }, emit, emitChange(), NO_ALLERGY_PHRASES, props, showAlerteAddicto (+2 more)

### Community 145 - "Mode Vie Antecedents"
Cohesion: 0.22
Nodes (9): mockAvisRequest, mockImagerieRequest, mockIpcInvoke, mockLaboratoireRequest, error, ExamRequestDto, loading, requests (+1 more)

### Community 146 - "Exam Requests Tests"
Cohesion: 0.31
Nodes (10): addPayment(), createInvoice(), fetchInvoices(), fetchInvoiceStats(), getInvoice(), InvoiceStats, invoke(), ServiceControllerResultType (+2 more)

### Community 147 - "Invoices Composable"
Cohesion: 0.18
Nodes (5): appointments, currentWeekStart, hours, weekDays, weekLabel

### Community 150 - "Fiche Diabete Tab"
Cohesion: 0.20
Nodes (7): mockClearPatient, mockElMessage, mockGetPatient, mockRemovePatient, mockRouterPush, mockSetActivePatient, stubs

### Community 151 - "Vital Check Tests"
Cohesion: 0.22
Nodes (9): { calcDureeDiabete, calcDFG, calcStadeIR }, dfgDisplay, dfgValue, dureeEvolution, emit, emitChange(), props, stadeDisplay (+1 more)

### Community 152 - "Examens View Tests"
Cohesion: 0.20
Nodes (5): {
  mockGetVitalSignsItemsList,
  mockSaveVitalSignsItem,
}, MONDAY, MONDAY_STR, RECORD_TEMPLATE, stubs

### Community 153 - "Session DTOs"
Cohesion: 0.27
Nodes (5): dateAt(), defaultMockRequests(), makeRequest(), { mockIpcInvoke }, stubs

### Community 158 - "Patient Layout Tests"
Cohesion: 0.25
Nodes (8): { calcGlasgowScore, glasgowInterpretation }, emit, emitChange(), glasgowInterpretationType, glasgowLabel, glasgowScore, props, BilanInitialData

### Community 159 - "Patient Record Tests"
Cohesion: 0.28
Nodes (7): mockActes, mockInvoke, error, loading, PatientActeDto, patientActes, usePatientActes()

### Community 160 - "Session Service"
Cohesion: 0.22
Nodes (7): currencies, CURRENCY_LOCALE, CurrencyDto, currencyMap, defaultCurrency, loaded, loading

### Community 161 - "Hospital Info Composable"
Cohesion: 0.22
Nodes (5): useCurrencies(), { formatCurrency, fetchCurrencies }, { patientActes, loading, fetchPatientActes, updateStatut }, patientId, route

### Community 162 - "Vital Signs Composable"
Cohesion: 0.22
Nodes (3): ElCardMock, mockInvoke, mockSetActivePatient

### Community 163 - "Invoice Print View"
Cohesion: 0.25
Nodes (6): HospitalInfoDto, info, loaded, loading, SaveResult, useHospitalInfo()

### Community 164 - "Sortie Tab"
Cohesion: 0.36
Nodes (7): addRdv(), emit, emitChange(), props, removeRdv(), sortedRdvs, SortieData

### Community 165 - "Clinical Doc Form Tests"
Cohesion: 0.25
Nodes (6): documentType, draftDocument, DynamicFormRendererStub, EL_STUBS, mockConfirm, signedDocument

### Community 166 - "Dynamic Form Renderer Tests"
Cohesion: 0.32
Nodes (5): EL_STUBS, FormFieldSchema, normalizeDocument(), parseFormData(), RawClinicalDocumentDTO

### Community 167 - "Auth DTOs & Handler"
Cohesion: 0.43
Nodes (4): emit, handleCreate(), handleDelete(), handleSelect()

### Community 168 - "Password Service"
Cohesion: 0.38
Nodes (6): emit, emitChange(), handleEnterKey(), journalRef, props, EvolutionMedicaleData

### Community 169 - "Clinical Doc List UI"
Cohesion: 0.43
Nodes (6): addActe(), emit, emitChange(), props, removeActe(), ExamensComplementairesData

### Community 170 - "Evolution Medicale Tab"
Cohesion: 0.29
Nodes (6): createWrapper(), EL_STUBS, mockCreateUnit, { mockInvoke, mockElMessage, mockElMessageBox }, mockUpdateUnit, servicesRef

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

### Community 177 - "Soins View"
Cohesion: 0.40
Nodes (5): HTML Entry Point, Main entry script /src/main.ts, CDE App Icon (PNG), Favicon SVG, CDE Icon Copy in Assets

### Community 178 - "Pharmacie View"
Cohesion: 0.50
Nodes (4): colors, emit, props, select()

### Community 180 - "Service Color Picker"
Cohesion: 0.50
Nodes (3): ComponentCustomProperties, GlobalComponents, vue

### Community 182 - "Patient Form Draft"
Cohesion: 0.50
Nodes (3): createWrapper(), EL_STUBS, { mockInvoke, mockElMessage, mockElMessageBox }

### Community 183 - "Settings Extension Migration"
Cohesion: 0.50
Nodes (3): createWrapper(), EL_STUBS, { mockInvoke, mockElMessage, mockElMessageBox }

## Ambiguous Edges - Review These
- `ESLint Configuration` → `Template Ordonnance (Prescription Template)`  [AMBIGUOUS]
  intelligent_resources/template_ordonance.jpeg · relation: unknown
- `CDE App Icon (PNG)` → `CDE Icon Copy in Assets`  [AMBIGUOUS]
  public/cde.png · relation: unknown

## Knowledge Gaps
- **1288 isolated node(s):** `vue`, `GlobalComponents`, `ServiceControllerResultType`, `TestEntity`, `ExcludeMethods` (+1283 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **32 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `ESLint Configuration` and `Template Ordonnance (Prescription Template)`?**
  _Edge tagged AMBIGUOUS (relation: related to) - confidence is low._
- **What is the exact relationship between `CDE App Icon (PNG)` and `CDE Icon Copy in Assets`?**
  _Edge tagged AMBIGUOUS (relation: related to) - confidence is low._
- **Why does `DB` connect `Patient Form Dialog` to `Data Source & DB Layer`, `App Settings Entity`, `Encounters Table UI`, `Contact Form & Medecin Select`, `Service Constructors`, `Planning View`, `Tarifs Tab`, `Act Price History DTOs`, `Service Favorites DTOs`, `Appointments View`, `Bilan Initial Tab`, `API Client`, `Care Unit DTOs`, `Localite DTOs`, `CRH Diabete Form`, `Service DTOs & Entities`, `Contact Origin DTOs`, `Service Form Dialog`, `HTML Entry & Assets`, `SQLite Connection Driver`, `Patient Attachment DTOs`, `Site DTOs`, `Care Units Tab`, `Auth Service & User`, `Patient Acte DTOs`, `Conservateur Stockage`, `Synthese Diagram Tab`, `TypeScript Config`, `Entity Converters`, `Attachment Type DTOs`, `Electron Main Process`, `Patient Composable`, `Automerge Sync Service`, `User Attachments Section`, `Facturation View`, `SideBar Tests`, `Form Draft DTOs`, `Dispositif Type DTOs`, `Dispositifs Composable`, `Patient Attachments Section`, `Stockage Form Dialog`, `Stockage Tab`, `Patient Invoices View`, `Email Config Service`, `Auto Imports Config`, `Automerge Sync & Registry`, `Login Form`, `Vital Signs Tests`, `Contact Category Form`?**
  _High betweenness centrality (0.233) - this node is a cross-community bridge._
- **Why does `ipcInvoke()` connect `Settings DTOs` to `Prescription Management`, `Examens View`, `Clinical Documents`, `Forgot Password`, `App Loader & Users`, `Conservateurs Tests`, `Migrations 004-011`, `Dispositif & Vital Signs DTOs`, `Vital Check Tab`, `Mode Vie Antecedents`, `Service Constructors`, `Patient Form Tests`, `Stay Timeline`, `Encounter DTOs`, `Plan Soins Records`, `Site Form Dialog`, `Fonction Form Dialog`, `Medical Unit DTOs`, `Patient Record Tests`, `Session Service`, `Dossier Clinic View`, `Invoice Print View`, `Header Builder`, `Dynamic Form Renderer Tests`, `SideBar Component`, `Medical Act DTOs`, `User Form`, `Patient Clinical Docs UI`, `Care Unit Form Dialog`, `Fonction DTOs`, `User Detail Dialog`, `Champ Localisation Form`, `Dispositif Type Tab`, `Document Type Form`, `Medical Units Tab`, `Exam Type Entity`, `App & Update Notifier`, `Appointment Service`, `Export Templates`, `Admission Tab`, `Contact Category Tests`, `User Profile View`, `Currency Composable`?**
  _High betweenness centrality (0.129) - this node is a cross-community bridge._
- **Why does `useAuth()` connect `Patient Composable` to `Header Builder`, `TopBar Component`, `Patient Converters & DTOs`, `User Attachment DTOs`, `Appointment DTOs`, `Export Templates`, `Clinical Documents`, `Plan Soins & Prescriptions`, `Settings DTOs`, `Contact Category DTOs`, `Vite & TS Config`, `Admission Tab`, `Patient Form Tests`, `Electron Build Dependencies`, `Users View`, `Medical Unit DTOs`, `Exam Type Entity`?**
  _High betweenness centrality (0.100) - this node is a cross-community bridge._
- **Are the 8 inferred relationships involving `AppDatabaseDatasource` (e.g. with `registerSettingsHandlers()` and `createTestPatient()`) actually correct?**
  _`AppDatabaseDatasource` has 8 INFERRED edges - model-reasoned connections that need verification._
- **Are the 13 inferred relationships involving `registerSettingsHandlers()` (e.g. with `ConfigTarifService` and `CurrencyService`) actually correct?**
  _`registerSettingsHandlers()` has 13 INFERRED edges - model-reasoned connections that need verification._