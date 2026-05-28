import Dexie, { type Table } from 'dexie';

// --- Interface Definitions ---
export interface Project {
  id: string;
  userId: string;
  title: string;
  discipline: string;
  hypothesis: string;
  abstract: string;
  status: string; // 'active', 'archived', 'planning'
  areaId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ResearchRecord {
  id: string;
  userId: string;
  projectId: string;
  schemaTemplateId: string | null;
  title: string;
  recordType: string;
  methodology: string;
  recordedDate: string;
  attributes: Record<string, any>;
  dataPath: string;
  externalRef: string | null;
  summary: string;
  tags: string[];
  readingStatus: string; // 'unread', 'reading', 'read', 'to-reread'
  starred: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Manuscript {
  id: string;
  projectId: string;
  title: string;
  abstract: string;
  status: string;
  authors: string[];
  journal: string;
  sections: Array<{ id: string; title: string; content: string; order: number }>;
  createdAt: string;
  updatedAt: string;
}

export interface Submission {
  id: string;
  manuscriptId: string;
  journal: string;
  status: string;
  initialSubmissionDate: string | null;
  deadlineDate: string | null;
  firstDecisionDate: string | null;
  revisionDueDate: string | null;
  acceptanceDate: string | null;
  publicationDate: string | null;
  notes: string;
  timelineNodes: Array<{
    id: string;
    name: string;
    type: string;
    status: string;
    date: string;
    planDate?: string;
    dueDate?: string;
    completeDate?: string;
    notes?: string;
    keyEventMapping?: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

export interface Task {
  id: string;
  userId: string;
  projectId: string;
  title: string;
  description: string;
  status: string; // 'todo', 'completed'
  priority: number;
  dueDate: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ResearchArea {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  color: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Evidence {
  id: string;
  userId: string;
  projectId: string;
  title: string;
  description: string;
  evidenceType: string;
  filePath: string;
  fileSize: number;
  createdAt: string;
  updatedAt: string;
}

export interface SchemaTemplate {
  id: string;
  name: string;
  fields: Array<{
    name: string;
    type: string;
    required: boolean;
    defaultValue?: any;
  }>;
  createdAt: string;
}

export interface Hypothesis {
  id: string;
  projectId: string;
  statement: string;
  status: string; // 'proposed', 'testing', 'confirmed', 'refuted'
  evidenceIds: string[];
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface Experiment {
  id: string;
  projectId: string;
  hypothesisId: string | null;
  title: string;
  design: string;
  variables: string;
  status: string; // 'planned', 'running', 'completed', 'failed'
  results: string;
  resultSummary: string;
  createdAt: string;
  updatedAt: string;
}

export interface ExperimentResult {
  id: string;
  experimentId: string;
  projectId: string;
  title: string;
  summary: string;
  conclusionType: string; // 'supporting', 'contradicting', 'inconclusive'
  evidenceIds: string[];
  rawData: string;
  createdAt: string;
  updatedAt: string;
}

export interface JournalEntry {
  id: string;
  userId: string;
  projectId: string | null;
  date: string;
  content: string;
  mood: string; // 'productive', 'stuck', 'breakthrough', 'neutral'
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

// --- Dexie Database Class ---
class ScholarFlowDatabase extends Dexie {
  projects!: Table<Project>;
  researchRecords!: Table<ResearchRecord>;
  manuscripts!: Table<Manuscript>;
  submissions!: Table<Submission>;
  tasks!: Table<Task>;
  researchAreas!: Table<ResearchArea>;
  evidence!: Table<Evidence>;
  schemaTemplates!: Table<SchemaTemplate>;
  hypotheses!: Table<Hypothesis>;
  experiments!: Table<Experiment>;
  experimentResults!: Table<ExperimentResult>;
  journalEntries!: Table<JournalEntry>;

  constructor() {
    super('ResearchFlowDatabase');
    this.version(1).stores({
      projects: 'id, userId, title, status',
      researchRecords: 'id, userId, projectId, recordType, recordedDate',
      manuscripts: 'id, projectId, status, journal',
      submissions: 'id, manuscriptId, status, journal',
      tasks: 'id, userId, projectId, status',
      researchAreas: 'id, userId, name',
      evidence: 'id, userId, projectId, evidenceType',
      schemaTemplates: 'id, name',
    });
    // Version 2: add areaId to projects, readingStatus/starred to records, new tables
    this.version(2).stores({
      projects: 'id, userId, title, status, areaId',
      researchRecords: 'id, userId, projectId, recordType, recordedDate, readingStatus, starred',
      manuscripts: 'id, projectId, status, journal',
      submissions: 'id, manuscriptId, status, journal',
      tasks: 'id, userId, projectId, status, priority, dueDate',
      researchAreas: 'id, userId, name',
      evidence: 'id, userId, projectId, evidenceType',
      schemaTemplates: 'id, name',
      hypotheses: 'id, projectId, status',
      experiments: 'id, projectId, hypothesisId, status',
    });
    // Version 3: add experimentResults, journalEntries tables
    this.version(3).stores({
      projects: 'id, userId, title, status, areaId',
      researchRecords: 'id, userId, projectId, recordType, recordedDate, readingStatus, starred',
      manuscripts: 'id, projectId, status, journal',
      submissions: 'id, manuscriptId, status, journal',
      tasks: 'id, userId, projectId, status, priority, dueDate',
      researchAreas: 'id, userId, name',
      evidence: 'id, userId, projectId, evidenceType',
      schemaTemplates: 'id, name',
      hypotheses: 'id, projectId, status',
      experiments: 'id, projectId, hypothesisId, status',
      experimentResults: 'id, experimentId, projectId, conclusionType',
      journalEntries: 'id, userId, projectId, date, mood',
    });
  }
}

export const db = new ScholarFlowDatabase();

// --- Automatic Storage Migration Utility ---
export async function migrateOldStorage() {
  const result = await chrome.storage.local.get(['researchflow_db', 'migrated_to_dexie']);
  if (result.migrated_to_dexie) {
    return { success: true, message: 'Already migrated.' };
  }

  const legacyDb = result.researchflow_db;
  if (!legacyDb) {
    // If no legacy DB, try loading preloaded DB if available
    try {
      const preloadUrl = chrome.runtime.getURL('data/preloaded_db.json');
      const res = await fetch(preloadUrl);
      if (res.ok) {
        const preloadData = await res.json();
        await importLegacyDataToDexie(preloadData);
        await chrome.storage.local.set({ migrated_to_dexie: true });
        return { success: true, message: 'Preloaded DB migrated to Dexie.' };
      }
    } catch (e) {
      console.warn('Failed to load preloaded_db.json on migration', e);
    }
    
    // Set migrated to true for clean installations
    await chrome.storage.local.set({ migrated_to_dexie: true });
    return { success: true, message: 'Clean install: marked migrated.' };
  }

  try {
    await importLegacyDataToDexie(legacyDb);
    // Keep settings in local storage under a distinct key rather than wiping entirely
    if (legacyDb.settings) {
      await chrome.storage.local.set({ settings: legacyDb.settings });
    }
    await chrome.storage.local.set({ migrated_to_dexie: true });
    return { success: true };
  } catch (err: unknown) {
    console.error('Migration failed:', err);
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

interface LegacyDatabaseData {
  projects?: Project[];
  researchRecords?: ResearchRecord[];
  manuscripts?: Manuscript[];
  submissions?: Submission[];
  tasks?: Task[];
  researchAreas?: ResearchArea[];
  evidence?: Evidence[];
  schemaTemplates?: SchemaTemplate[];
  hypotheses?: Hypothesis[];
  experiments?: Experiment[];
  experimentResults?: ExperimentResult[];
  journalEntries?: JournalEntry[];
  settings?: Record<string, unknown>;
}

async function importLegacyDataToDexie(data: LegacyDatabaseData) {
  await db.transaction('rw', [
    db.projects,
    db.researchRecords,
    db.manuscripts,
    db.submissions,
    db.tasks,
    db.researchAreas,
    db.evidence,
    db.schemaTemplates,
    db.hypotheses,
    db.experiments,
    db.experimentResults,
    db.journalEntries,
  ], async () => {
    if (Array.isArray(data.projects) && data.projects.length > 0) {
      await db.projects.bulkPut(data.projects);
    }
    if (Array.isArray(data.researchRecords) && data.researchRecords.length > 0) {
      await db.researchRecords.bulkPut(data.researchRecords);
    }
    if (Array.isArray(data.manuscripts) && data.manuscripts.length > 0) {
      await db.manuscripts.bulkPut(data.manuscripts);
    }
    if (Array.isArray(data.submissions) && data.submissions.length > 0) {
      await db.submissions.bulkPut(data.submissions);
    }
    if (Array.isArray(data.tasks) && data.tasks.length > 0) {
      await db.tasks.bulkPut(data.tasks);
    }
    if (Array.isArray(data.researchAreas) && data.researchAreas.length > 0) {
      await db.researchAreas.bulkPut(data.researchAreas);
    }
    if (Array.isArray(data.evidence) && data.evidence.length > 0) {
      await db.evidence.bulkPut(data.evidence);
    }
    if (Array.isArray(data.schemaTemplates) && data.schemaTemplates.length > 0) {
      await db.schemaTemplates.bulkPut(data.schemaTemplates);
    }
    if (Array.isArray(data.hypotheses) && data.hypotheses.length > 0) {
      await db.hypotheses.bulkPut(data.hypotheses);
    }
    if (Array.isArray(data.experiments) && data.experiments.length > 0) {
      await db.experiments.bulkPut(data.experiments);
    }
    if (Array.isArray(data.experimentResults) && data.experimentResults.length > 0) {
      await db.experimentResults.bulkPut(data.experimentResults);
    }
    if (Array.isArray(data.journalEntries) && data.journalEntries.length > 0) {
      await db.journalEntries.bulkPut(data.journalEntries);
    }
  });
}
