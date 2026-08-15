#!/usr/bin/env node
"use strict";

const { DatabaseSync } = require("node:sqlite");
const path = require("node:path");

const DB_PATH = path.join(
  process.env.HOME,
  ".config/cde/cde-clinique.db",
);

const db = new DatabaseSync(DB_PATH);
db.exec("PRAGMA journal_mode = WAL");
db.exec("PRAGMA foreign_keys = ON");

const now = new Date().toISOString().replace("T", " ").slice(0, 19);

function ref(json) {
  return JSON.stringify(json);
}

function tx(fn) {
  db.exec("BEGIN");
  try {
    fn();
    db.exec("COMMIT");
  } catch (e) {
    db.exec("ROLLBACK");
    throw e;
  }
}

// ── STEP 1: lab_exams ──────────────────────────────────────────────
const exams = [
  // Types (parent_id = NULL)
  { id: 56, category_id: 2, parent_id: null, name: "BIOCHIMIE" },
  { id: 59, category_id: 2, parent_id: null, name: "PARASITOLOGIE DES SELLES" },
  { id: 60, category_id: 2, parent_id: null, name: "PARASITOLOGIE SANGUINE" },
  { id: 61, category_id: 2, parent_id: null, name: "NUMÉRATION FORMULE SANGUINE" },
  { id: 62, category_id: 2, parent_id: null, name: "HORMONOLOGIE" },
  { id: 63, category_id: 2, parent_id: null, name: "SÉROLOGIE" },
  { id: 64, category_id: 2, parent_id: null, name: "ECBU" },
  // Children of BIOCHIMIE
  { id: 57, category_id: 2, parent_id: 56, name: "Biochimie du sang" },
  { id: 58, category_id: 2, parent_id: 56, name: "Biochimie des urines" },
];

const insertExam = db.prepare(
  "INSERT OR IGNORE INTO lab_exams (id, category_id, parent_id, name) VALUES (?, ?, ?, ?)",
);

tx(() => {
  for (const e of exams) {
    insertExam.run(e.id, e.category_id, e.parent_id, e.name);
  }
});
console.log(`✅ lab_exams inserted: ${exams.length}`);

// ── STEP 2: exam_parameters ────────────────────────────────────────
const params = [
  // Biochimie du sang (exam_id=57)
  {
    id: 1,
    exam_id: 57,
    name: "Créat",
    unit: "µmol/l",
    input_type: "numeric",
    reference_values: ref({ min_h: 61.8, max_h: 123.7, min_f: 53, max_f: 97.2 }),
    sort_order: 0,
  },
  {
    id: 2,
    exam_id: 57,
    name: "HbA1c",
    unit: "%",
    input_type: "numeric",
    reference_values: ref({ min: 4.5, max: 6.5 }),
    sort_order: 1,
  },
  {
    id: 3,
    exam_id: 57,
    name: "LDL-C",
    unit: "g/l",
    input_type: "numeric",
    reference_values: ref({ max: 1.59 }),
    sort_order: 2,
  },
  {
    id: 4,
    exam_id: 57,
    name: "Triglycérides",
    unit: "g/l",
    input_type: "numeric",
    reference_values: ref({ max: 1.5 }),
    sort_order: 3,
  },
  {
    id: 5,
    exam_id: 57,
    name: "Calcémie",
    unit: "mg/l",
    input_type: "numeric",
    reference_values: ref({ min: 86, max: 102 }),
    sort_order: 4,
  },
  {
    id: 6,
    exam_id: 57,
    name: "Magnésémie",
    unit: "mg/l",
    input_type: "numeric",
    reference_values: ref({ min: 16, max: 25 }),
    sort_order: 5,
  },
  {
    id: 7,
    exam_id: 57,
    name: "Acide urique",
    unit: "mg/l",
    input_type: "numeric",
    reference_values: ref({ min_h: 36, max_h: 77, min_f: 25, max_f: 68 }),
    sort_order: 6,
  },
  {
    id: 8,
    exam_id: 57,
    name: "SGOT",
    unit: "UI/l",
    input_type: "numeric",
    reference_values: ref({ max_h: 38, max_f: 31 }),
    sort_order: 7,
  },
  {
    id: 9,
    exam_id: 57,
    name: "SGPT",
    unit: "UI/l",
    input_type: "numeric",
    reference_values: ref({ max_h: 40, max_f: 32 }),
    sort_order: 8,
  },

  // Biochimie des urines (exam_id=58)
  {
    id: 10,
    exam_id: 58,
    name: "Aspect",
    unit: "-",
    input_type: "select",
    reference_values: ref({
      normal_value: "Jaune clair",
      options: [
        { value: "Jaune clair", is_normal: true },
        { value: "Jaune foncé", is_normal: false },
        { value: "Trouble", is_normal: false },
        { value: "Hématique", is_normal: false },
        { value: "Incolore", is_normal: false },
      ],
    }),
    sort_order: 0,
  },
  {
    id: 11,
    exam_id: 58,
    name: "Urobilinogène",
    unit: "mg/dl",
    input_type: "boolean",
    reference_values: ref({ normal_value: "Négative" }),
    sort_order: 1,
  },
  {
    id: 12,
    exam_id: 58,
    name: "Bilirubine",
    unit: "mg/dl",
    input_type: "boolean",
    reference_values: ref({ normal_value: "Négative" }),
    sort_order: 2,
  },
  {
    id: 13,
    exam_id: 58,
    name: "Glucose",
    unit: "mg/dl",
    input_type: "boolean",
    reference_values: ref({ normal_value: "Négatif" }),
    sort_order: 3,
  },
  {
    id: 14,
    exam_id: 58,
    name: "Corps cétoniques",
    unit: "mg/dl",
    input_type: "boolean",
    reference_values: ref({ normal_value: "Négatif" }),
    sort_order: 4,
  },
  {
    id: 15,
    exam_id: 58,
    name: "Nitrites",
    unit: "-",
    input_type: "boolean",
    reference_values: ref({ normal_value: "Négative" }),
    sort_order: 5,
  },
  {
    id: 16,
    exam_id: 58,
    name: "Leucocytes",
    unit: "cell/µl",
    input_type: "boolean",
    reference_values: ref({ normal_value: "Négatif" }),
    sort_order: 6,
  },
  {
    id: 17,
    exam_id: 58,
    name: "Sang",
    unit: "cell/µl",
    input_type: "boolean",
    reference_values: ref({ normal_value: "Négatif" }),
    sort_order: 7,
  },
  {
    id: 18,
    exam_id: 58,
    name: "MicroAlbuminurie",
    unit: "mg/l",
    input_type: "numeric",
    reference_values: ref({ max: 18 }),
    sort_order: 8,
  },
  {
    id: 19,
    exam_id: 58,
    name: "Protéines",
    unit: "mg/dl",
    input_type: "boolean",
    reference_values: ref({ normal_value: "Négatives" }),
    sort_order: 9,
  },
  {
    id: 20,
    exam_id: 58,
    name: "PH",
    unit: "-",
    input_type: "numeric",
    reference_values: ref({ min: 5.0, max: 6.0 }),
    sort_order: 10,
  },

  // PARASITOLOGIE DES SELLES (exam_id=59)
  {
    id: 21,
    exam_id: 59,
    name: "Examen parasitologique des selles",
    unit: "-",
    input_type: "boolean",
    reference_values: ref({ normal_value: "Négative" }),
    sort_order: 0,
  },

  // PARASITOLOGIE SANGUINE (exam_id=60)
  {
    id: 22,
    exam_id: 60,
    name: "GE(dp)",
    unit: "Troph/chp",
    input_type: "numeric",
    reference_values: ref({ normal_value: "Négative" }),
    sort_order: 0,
  },

  // NUMÉRATION FORMULE SANGUINE (exam_id=61)
  {
    id: 23,
    exam_id: 61,
    name: "Hb",
    unit: "g/dl",
    input_type: "numeric",
    reference_values: ref({ min_h: 13, max_h: 18, min_f: 12, max_f: 16 }),
    sort_order: 0,
  },
  {
    id: 24,
    exam_id: 61,
    name: "Ht",
    unit: "%",
    input_type: "numeric",
    reference_values: ref({ min_h: 39, max_h: 54, min_f: 36, max_f: 48 }),
    sort_order: 1,
  },
  {
    id: 25,
    exam_id: 61,
    name: "Hématies",
    unit: "cell/mm3 (x10^6)",
    input_type: "numeric",
    reference_values: ref({ min_h: 4.3, max_h: 5.8, min_f: 4, max_f: 5.8 }),
    sort_order: 2,
  },
  {
    id: 26,
    exam_id: 61,
    name: "Leucocytes",
    unit: "cell/mm3 (x10^3)",
    input_type: "numeric",
    reference_values: ref({ min: 4, max: 10 }),
    sort_order: 3,
  },
  {
    id: 27,
    exam_id: 61,
    name: "Neutrophiles",
    unit: "%",
    input_type: "numeric",
    reference_values: ref({ min: 50, max: 70 }),
    sort_order: 4,
  },
  {
    id: 28,
    exam_id: 61,
    name: "Lymphocytes",
    unit: "%",
    input_type: "numeric",
    reference_values: ref({ min: 20, max: 40 }),
    sort_order: 5,
  },
  {
    id: 29,
    exam_id: 61,
    name: "Monocytes",
    unit: "%",
    input_type: "numeric",
    reference_values: ref({ min: 3, max: 10 }),
    sort_order: 6,
  },
  {
    id: 30,
    exam_id: 61,
    name: "Éosinophiles",
    unit: "%",
    input_type: "numeric",
    reference_values: ref({ min: 1, max: 3 }),
    sort_order: 7,
  },
  {
    id: 31,
    exam_id: 61,
    name: "Basophiles",
    unit: "%",
    input_type: "numeric",
    reference_values: ref({ min: 0, max: 1 }),
    sort_order: 8,
  },

  // HORMONOLOGIE (exam_id=62)
  {
    id: 32,
    exam_id: 62,
    name: "TSH",
    unit: "µUI/ml",
    input_type: "numeric",
    reference_values: ref({ min: 0.3, max: 4.2 }),
    sort_order: 0,
  },
  {
    id: 33,
    exam_id: 62,
    name: "T4L",
    unit: "nmol/l",
    input_type: "numeric",
    reference_values: ref({ min: 66, max: 181 }),
    sort_order: 1,
  },
  {
    id: 34,
    exam_id: 62,
    name: "Testostérone",
    unit: "ng/ml",
    input_type: "numeric",
    reference_values: ref({ min: 2, max: 8 }),
    sort_order: 2,
  },

  // SÉROLOGIE (exam_id=63)
  {
    id: 35,
    exam_id: 63,
    name: "ASLO",
    unit: "UI/ml",
    input_type: "numeric",
    reference_values: ref({ max: 200 }),
    sort_order: 0,
  },
  {
    id: 36,
    exam_id: 63,
    name: "CRP",
    unit: "mg/l",
    input_type: "numeric",
    reference_values: ref({ max: 6 }),
    sort_order: 1,
  },
  {
    id: 37,
    exam_id: 63,
    name: "BW",
    unit: "-",
    input_type: "boolean",
    reference_values: ref({ normal_value: "Négatif" }),
    sort_order: 2,
  },
  {
    id: 38,
    exam_id: 63,
    name: "WIDAL",
    unit: "-",
    input_type: "text",
    reference_values: ref({}),
    sort_order: 3,
  },
  {
    id: 39,
    exam_id: 63,
    name: "AgHbs",
    unit: "-",
    input_type: "boolean",
    reference_values: ref({ normal_value: "Négatif" }),
    sort_order: 4,
  },
  {
    id: 40,
    exam_id: 63,
    name: "AgP24",
    unit: "-",
    input_type: "boolean",
    reference_values: ref({ normal_value: "Négatif" }),
    sort_order: 5,
  },

  // ECBU (exam_id=64)
  {
    id: 41,
    exam_id: 64,
    name: "Aspect",
    unit: "-",
    input_type: "select",
    reference_values: ref({
      normal_value: "Jaune clair",
      options: [
        { value: "Jaune clair", is_normal: true },
        { value: "Jaune foncé", is_normal: false },
        { value: "Trouble", is_normal: false },
        { value: "Hématique", is_normal: false },
      ],
    }),
    sort_order: 0,
  },
  {
    id: 42,
    exam_id: 64,
    name: "Culot",
    unit: "-",
    input_type: "select",
    reference_values: ref({
      normal_value: "Léger",
      options: [
        { value: "Léger", is_normal: true },
        { value: "Abondant", is_normal: false },
        { value: "Absent", is_normal: false },
      ],
    }),
    sort_order: 1,
  },
  {
    id: 43,
    exam_id: 64,
    name: "Cellules épithéliales",
    unit: "cell/chp",
    input_type: "numeric",
    reference_values: ref({ max: 10 }),
    sort_order: 2,
  },
  {
    id: 44,
    exam_id: 64,
    name: "Leucocytes",
    unit: "cell/chp",
    input_type: "numeric",
    reference_values: ref({ max: 10 }),
    sort_order: 3,
  },
  {
    id: 45,
    exam_id: 64,
    name: "Hématies",
    unit: "cell/chp",
    input_type: "boolean",
    reference_values: ref({ normal_value: "Absentes" }),
    sort_order: 4,
  },
  {
    id: 46,
    exam_id: 64,
    name: "Parasites",
    unit: "-",
    input_type: "boolean",
    reference_values: ref({ normal_value: "Absents" }),
    sort_order: 5,
  },
  {
    id: 47,
    exam_id: 64,
    name: "Levures",
    unit: "-",
    input_type: "boolean",
    reference_values: ref({ normal_value: "Absentes" }),
    sort_order: 6,
  },
  {
    id: 48,
    exam_id: 64,
    name: "Filaments mycéliens",
    unit: "-",
    input_type: "boolean",
    reference_values: ref({ normal_value: "Absents" }),
    sort_order: 7,
  },
  {
    id: 49,
    exam_id: 64,
    name: "Cristaux",
    unit: "-",
    input_type: "boolean",
    reference_values: ref({ normal_value: "Absents" }),
    sort_order: 8,
  },
];

const insertParam = db.prepare(
  `INSERT OR IGNORE INTO exam_parameters
    (id, exam_id, name, unit, input_type, reference_values, sort_order, is_active, created_at, updated_at)
   VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
);

tx(() => {
  for (const p of params) {
    insertParam.run(p.id, p.exam_id, p.name, p.unit, p.input_type, p.reference_values, p.sort_order, now, now);
  }
});
console.log(`✅ exam_parameters inserted: ${params.length}`);

// ── STEP 3: exam_requests ──────────────────────────────────────────
const requests = [
  {
    id: 1,
    patient_id: 1,
    encounter_id: null,
    type: "laboratoire",
    examen_id: null,
    exam_ids: JSON.stringify([56, 61]),
    motif: "Bilan biochimie + NFS",
    statut: "realise",
    prescripteur_id: 1,
    created_by: 1,
    created_at: now,
    updated_at: now,
    specialite: null,
    specialty_id: null,
    planned_hour: null,
    planned_date: "2026-07-25",
    validated_at: "2026-07-25 10:30:00",
  },
  {
    id: 2,
    patient_id: 1,
    encounter_id: null,
    type: "laboratoire",
    examen_id: null,
    exam_ids: JSON.stringify([62, 63]),
    motif: "Hormonologie + Sérologie",
    statut: "demande",
    prescripteur_id: 1,
    created_by: 1,
    created_at: now,
    updated_at: now,
    specialite: null,
    specialty_id: null,
    planned_hour: null,
    planned_date: "2026-07-23",
    validated_at: null,
  },
  {
    id: 3,
    patient_id: 1,
    encounter_id: null,
    type: "laboratoire",
    examen_id: null,
    exam_ids: JSON.stringify([64]),
    motif: "ECBU",
    statut: "en_cours",
    prescripteur_id: 1,
    created_by: 1,
    created_at: now,
    updated_at: now,
    specialite: null,
    specialty_id: null,
    planned_hour: null,
    planned_date: "2026-07-21",
    validated_at: null,
  },
];

const insertReq = db.prepare(
  `INSERT OR IGNORE INTO exam_requests
    (id, patient_id, encounter_id, type, examen_id, exam_ids, motif, statut,
     prescripteur_id, created_by, created_at, updated_at,
     specialite, specialty_id, planned_hour, planned_date, validated_at)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
);

tx(() => {
  for (const r of requests) {
    insertReq.run(
      r.id, r.patient_id, r.encounter_id, r.type, r.examen_id,
      r.exam_ids, r.motif, r.statut,
      r.prescripteur_id, r.created_by, r.created_at, r.updated_at,
      r.specialite, r.specialty_id, r.planned_hour, r.planned_date, r.validated_at,
    );
  }
});
console.log(`✅ exam_requests inserted: ${requests.length}`);

// ── STEP 4: exam_results for request 1 ─────────────────────────────
const results = [
  // Biochimie du sang
  { exam_request_id: 1, parameter_id: 1, value: "95.3", is_normal: 1 },
  { exam_request_id: 1, parameter_id: 2, value: "7.2", is_normal: 0 },
  { exam_request_id: 1, parameter_id: 3, value: "1.8", is_normal: 0 },
  { exam_request_id: 1, parameter_id: 4, value: "1.2", is_normal: 1 },
  { exam_request_id: 1, parameter_id: 5, value: "94", is_normal: 1 },
  { exam_request_id: 1, parameter_id: 6, value: "21", is_normal: 1 },
  { exam_request_id: 1, parameter_id: 7, value: "52", is_normal: 1 },
  { exam_request_id: 1, parameter_id: 8, value: "28", is_normal: 1 },
  { exam_request_id: 1, parameter_id: 9, value: "35", is_normal: 1 },
  // NFS
  { exam_request_id: 1, parameter_id: 23, value: "14.5", is_normal: 1 },
  { exam_request_id: 1, parameter_id: 24, value: "42", is_normal: 1 },
  { exam_request_id: 1, parameter_id: 25, value: "4.8", is_normal: 1 },
  { exam_request_id: 1, parameter_id: 26, value: "7.5", is_normal: 1 },
  { exam_request_id: 1, parameter_id: 27, value: "62", is_normal: 1 },
  { exam_request_id: 1, parameter_id: 28, value: "28", is_normal: 1 },
  { exam_request_id: 1, parameter_id: 29, value: "6", is_normal: 1 },
  { exam_request_id: 1, parameter_id: 30, value: "2", is_normal: 1 },
  { exam_request_id: 1, parameter_id: 31, value: "0.5", is_normal: 1 },
];

const insertResult = db.prepare(
  `INSERT OR IGNORE INTO exam_results
    (exam_request_id, parameter_id, value, is_normal, filled_by, filled_at, created_at, updated_at)
   VALUES (?, ?, ?, ?, 1, ?, ?, ?)`,
);

tx(() => {
  for (const r of results) {
    insertResult.run(
      r.exam_request_id, r.parameter_id, r.value, r.is_normal,
      "2026-07-25 10:30:00", now, now,
    );
  }
});
console.log(`✅ exam_results inserted: ${results.length}`);

// ── Summary ────────────────────────────────────────────────────────
console.log("\n── SUMMARY ──────────────────────────────────");
console.log(`lab_exams      : ${exams.length} rows (IDs 56–${exams[exams.length - 1].id})`);
console.log(`exam_parameters: ${params.length} rows (IDs 1–${params[params.length - 1].id})`);
console.log(`exam_requests  : ${requests.length} rows (IDs 1–${requests.length})`);
console.log(`exam_results   : ${results.length} rows (request_id=1)`);
console.log("Done ✓");
