import { useState, useCallback, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@storage/dexie';
import { generateId } from '@storage/id';

export type ViewMode = 'list' | 'card';

export function useProjects() {
  const projects = useLiveQuery(() => db.projects.where('userId').equals('user').toArray()) ?? [];
  const researchAreas = useLiveQuery(() => db.researchAreas.where('userId').equals('user').toArray()) ?? [];
  const tasks = useLiveQuery(() => db.tasks.where('userId').equals('user').toArray()) ?? [];
  const researchRecords = useLiveQuery(() => db.researchRecords.where('userId').equals('user').toArray()) ?? [];

  const [viewMode, setViewMode] = useState<ViewMode>('card');

  // Area modal state
  const [isAreaModalOpen, setIsAreaModalOpen] = useState(false);
  const [newAreaName, setNewAreaName] = useState('');
  const [newAreaDesc, setNewAreaDesc] = useState('');
  const [newAreaColor, setNewAreaColor] = useState('#14b8a6');

  // Project modal state
  const [isProjModalOpen, setIsProjModalOpen] = useState(false);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [newProjTitle, setNewProjTitle] = useState('');
  const [newProjDiscipline, setNewProjDiscipline] = useState('');
  const [newProjHypothesis, setNewProjHypothesis] = useState('');
  const [newProjAbstract, setNewProjAbstract] = useState('');
  const [newProjAreaId, setNewProjAreaId] = useState<string | null>(null);
  const [areaFilter, setAreaFilter] = useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);
  const clearError = useCallback(() => setError(null), []);

  const resetAreaForm = useCallback(() => {
    setNewAreaName('');
    setNewAreaDesc('');
    setNewAreaColor('#14b8a6');
  }, []);

  const resetProjectForm = useCallback(() => {
    setEditingProjectId(null);
    setNewProjTitle('');
    setNewProjDiscipline('');
    setNewProjHypothesis('');
    setNewProjAbstract('');
    setNewProjAreaId(null);
  }, []);

  const openEditProject = useCallback((proj: any) => {
    setEditingProjectId(proj.id);
    setNewProjTitle(proj.title);
    setNewProjDiscipline(proj.discipline || '');
    setNewProjHypothesis(proj.hypothesis || '');
    setNewProjAbstract(proj.abstract || '');
    setNewProjAreaId(proj.areaId || null);
    setIsProjModalOpen(true);
  }, []);

  const handleSaveArea = useCallback(async () => {
    if (!newAreaName.trim()) return;
    try {
      const now = new Date().toISOString();
      await db.researchAreas.put({
        id: generateId('area'),
        userId: 'user',
        name: newAreaName.trim(),
        description: newAreaDesc.trim() || null,
        color: newAreaColor,
        createdAt: now,
        updatedAt: now,
      });
      resetAreaForm();
      setIsAreaModalOpen(false);
    } catch (e: any) {
      console.error('Failed to save area:', e);
      setError('Failed to save research area. Please try again.');
    }
  }, [newAreaName, newAreaDesc, newAreaColor, resetAreaForm]);

  const filteredProjects = useMemo(() =>
    areaFilter ? projects.filter(p => p.areaId === areaFilter) : projects,
    [projects, areaFilter]
  );

  const enrichedProjects = useMemo(() => {
    return filteredProjects.map(proj => {
      const projTasks = tasks.filter(t => t.projectId === proj.id);
      const completedTasks = projTasks.filter(t => t.status === 'completed').length;
      const progress = projTasks.length > 0 ? Math.round((completedTasks / projTasks.length) * 100) : 0;
      const recordCount = researchRecords.filter(r => r.projectId === proj.id).length;
      return { ...proj, progress, taskCount: projTasks.length, recordCount };
    });
  }, [filteredProjects, tasks, researchRecords]);

  const handleSaveProject = useCallback(async () => {
    if (!newProjTitle.trim()) return;
    try {
      const now = new Date().toISOString();
      await db.projects.put({
        id: editingProjectId || generateId('proj'),
        userId: 'user',
        title: newProjTitle.trim(),
        discipline: newProjDiscipline.trim(),
        hypothesis: newProjHypothesis.trim(),
        abstract: newProjAbstract.trim(),
        status: 'active',
        areaId: newProjAreaId,
        createdAt: editingProjectId ? (await db.projects.get(editingProjectId))?.createdAt || now : now,
        updatedAt: now,
      });
      resetProjectForm();
      setIsProjModalOpen(false);
    } catch (e: any) {
      console.error('Failed to save project:', e);
      setError('Failed to save project. Please try again.');
    }
  }, [editingProjectId, newProjTitle, newProjDiscipline, newProjHypothesis, newProjAbstract, newProjAreaId, resetProjectForm]);

  const handleDeleteProject = useCallback(async (id: string) => {
    try {
      // Cascade: delete related records, manuscripts, submissions, tasks, hypotheses, experiments, evidence
      const relatedRecords = await db.researchRecords.where('projectId').equals(id).toArray();
      const relatedTasks = await db.tasks.where('projectId').equals(id).toArray();
      const relatedHyps = await db.hypotheses.where('projectId').equals(id).toArray();
      const relatedExps = await db.experiments.where('projectId').equals(id).toArray();
      const relatedEvidence = await db.evidence.where('projectId').equals(id).toArray();
      const relatedManuscripts = await db.manuscripts.where('projectId').equals(id).toArray();

      for (const ms of relatedManuscripts) {
        const subs = await db.submissions.where('manuscriptId').equals(ms.id).toArray();
        await db.submissions.bulkDelete(subs.map(s => s.id));
      }

      await db.researchRecords.bulkDelete(relatedRecords.map(r => r.id));
      await db.tasks.bulkDelete(relatedTasks.map(t => t.id));
      await db.hypotheses.bulkDelete(relatedHyps.map(h => h.id));
      await db.experiments.bulkDelete(relatedExps.map(e => e.id));
      await db.evidence.bulkDelete(relatedEvidence.map(e => e.id));
      await db.manuscripts.bulkDelete(relatedManuscripts.map(m => m.id));
      await db.projects.delete(id);
    } catch (e: any) {
      console.error('Failed to delete project:', e);
      setError('Failed to delete project. Please try again.');
    }
  }, []);

  const handleDeleteArea = useCallback(async (id: string) => {
    try {
      // Unlink projects from this area before deleting
      const linkedProjects = await db.projects.where('areaId').equals(id).toArray();
      for (const p of linkedProjects) {
        await db.projects.update(p.id, { areaId: null });
      }
      await db.researchAreas.delete(id);
    } catch (e: any) {
      console.error('Failed to delete area:', e);
      setError('Failed to delete research area. Please try again.');
    }
  }, []);

  return {
    projects,
    filteredProjects,
    enrichedProjects,
    researchAreas,
    // View mode
    viewMode, setViewMode,
    // Area modal
    isAreaModalOpen,
    setIsAreaModalOpen,
    newAreaName, setNewAreaName,
    newAreaDesc, setNewAreaDesc,
    newAreaColor, setNewAreaColor,
    handleSaveArea,
    // Project modal
    isProjModalOpen,
    setIsProjModalOpen,
    editingProjectId,
    newProjTitle, setNewProjTitle,
    newProjDiscipline, setNewProjDiscipline,
    newProjHypothesis, setNewProjHypothesis,
    newProjAbstract, setNewProjAbstract,
    newProjAreaId, setNewProjAreaId,
    areaFilter, setAreaFilter,
    handleSaveProject,
    openEditProject,
    resetProjectForm,
    // Delete
    handleDeleteProject,
    handleDeleteArea,
    // Error state
    error,
    clearError,
  };
}
