import { useState, useCallback, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Manuscript, type Submission } from '@storage/dexie';
import { generateId } from '@storage/id';

export type KanbanStatus = 'preparing' | 'submitted' | 'under_review' | 'accepted';

export function useManuscripts() {
  const manuscripts = useLiveQuery(() => db.manuscripts.toArray()) ?? [];
  const submissions = useLiveQuery(() => db.submissions.toArray()) ?? [];
  const projects = useLiveQuery(() => db.projects.where('userId').equals('user').toArray()) ?? [];

  const [isManuscriptModalOpen, setIsManuscriptModalOpen] = useState(false);
  const [editingManuscriptId, setEditingManuscriptId] = useState<string | null>(null);
  const [manuscriptForm, setManuscriptForm] = useState({
    title: '',
    projectId: '',
    abstract: '',
    status: 'preparing',
    journal: '',
    authors: ''
  });

  const [error, setError] = useState<string | null>(null);
  const clearError = useCallback(() => setError(null), []);

  // Group manuscripts by kanban status
  const kanbanColumns = useMemo(() => {
    // Build a map of latest submission per manuscript
    const latestSubByMs = new Map<string, Submission>();
    for (const sub of submissions) {
      const existing = latestSubByMs.get(sub.manuscriptId);
      if (!existing || new Date(sub.updatedAt).getTime() > new Date(existing.updatedAt).getTime()) {
        latestSubByMs.set(sub.manuscriptId, sub);
      }
    }

    const columns: Record<KanbanStatus, typeof manuscripts> = {
      preparing: [],
      submitted: [],
      under_review: [],
      accepted: [],
    };

    for (const ms of manuscripts) {
      const latestSub = latestSubByMs.get(ms.id);
      const status = (latestSub?.status || ms.status) as string;
      if (status === 'accepted' || status === 'published') {
        columns.accepted.push(ms);
      } else if (status === 'under_review' || status === 'revision') {
        columns.under_review.push(ms);
      } else if (status === 'submitted') {
        columns.submitted.push(ms);
      } else {
        columns.preparing.push(ms);
      }
    }
    return columns;
  }, [manuscripts, submissions]);

  const resetForm = useCallback(() => {
    setEditingManuscriptId(null);
    setManuscriptForm({ title: '', projectId: '', abstract: '', status: 'preparing', journal: '', authors: '' });
  }, []);

  const openEditManuscript = useCallback((ms: Manuscript) => {
    setEditingManuscriptId(ms.id);
    setManuscriptForm({
      title: ms.title,
      projectId: ms.projectId,
      abstract: ms.abstract,
      status: ms.status,
      journal: ms.journal,
      authors: ms.authors.join(', ')
    });
    setIsManuscriptModalOpen(true);
  }, []);

  const handleSaveManuscript = useCallback(async () => {
    if (!manuscriptForm.title.trim()) return;
    try {
      const now = new Date().toISOString();
      const msId = editingManuscriptId || generateId('ms');

      await db.manuscripts.put({
        id: msId,
        projectId: manuscriptForm.projectId || 'proj_general',
        title: manuscriptForm.title.trim(),
        abstract: manuscriptForm.abstract.trim(),
        status: manuscriptForm.status,
        authors: manuscriptForm.authors.split(',').map(a => a.trim()).filter(Boolean),
        journal: manuscriptForm.journal.trim(),
        sections: [],
        createdAt: editingManuscriptId ? (await db.manuscripts.get(msId))?.createdAt || now : now,
        updatedAt: now,
      });

      // Auto-create submission if journal specified and no existing submission
      if (manuscriptForm.journal.trim() && !editingManuscriptId) {
        const subId = generateId('sub');
        await db.submissions.put({
          id: subId,
          manuscriptId: msId,
          journal: manuscriptForm.journal.trim(),
          status: 'preparing',
          initialSubmissionDate: null,
          deadlineDate: null,
          firstDecisionDate: null,
          revisionDueDate: null,
          acceptanceDate: null,
          publicationDate: null,
          notes: '',
          timelineNodes: [],
          createdAt: now,
          updatedAt: now,
        });
      }

      resetForm();
      setIsManuscriptModalOpen(false);
    } catch (e: unknown) {
      console.error('Failed to save manuscript:', e);
      setError('Failed to save manuscript. Please try again.');
    }
  }, [editingManuscriptId, manuscriptForm, resetForm]);

  const handleDeleteManuscript = useCallback(async (id: string) => {
    try {
      await db.manuscripts.delete(id);
      const relatedSubs = await db.submissions.where('manuscriptId').equals(id).toArray();
      for (const sub of relatedSubs) {
        await db.submissions.delete(sub.id);
      }
    } catch (e: unknown) {
      console.error('Failed to delete manuscript:', e);
      setError('Failed to delete manuscript. Please try again.');
    }
  }, []);

  const handleMoveManuscript = useCallback(async (manuscriptId: string, targetStatus: KanbanStatus) => {
    try {
      const ms = await db.manuscripts.get(manuscriptId);
      if (!ms) return;

      const msSubs = await db.submissions.where('manuscriptId').equals(manuscriptId).toArray();
      const latestSub = msSubs.sort((a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      )[0];

      const currentStatus = (latestSub?.status || ms.status) as string;
      const statusMap: Record<KanbanStatus, string> = {
        preparing: 'preparing',
        submitted: 'submitted',
        under_review: 'under_review',
        accepted: 'accepted',
      };
      const newStatus = statusMap[targetStatus];

      // Guard: skip if already in target column
      const currentColumn = currentStatus === 'accepted' || currentStatus === 'published' ? 'accepted'
        : currentStatus === 'under_review' || currentStatus === 'revision' ? 'under_review'
        : currentStatus === 'submitted' ? 'submitted'
        : 'preparing';
      if (currentColumn === targetStatus) return;

      const now = new Date().toISOString();
      if (latestSub) {
        await db.submissions.put({ ...latestSub, status: newStatus, updatedAt: now });
      } else {
        await db.manuscripts.put({ ...ms, status: newStatus, updatedAt: now });
      }
    } catch (e) {
      console.error('Failed to move manuscript:', e);
      setError('Failed to move manuscript. Please try again.');
    }
  }, []);

  return {
    manuscripts,
    submissions,
    projects,
    kanbanColumns,
    isManuscriptModalOpen,
    setIsManuscriptModalOpen,
    editingManuscriptId,
    manuscriptForm,
    setManuscriptForm,
    handleSaveManuscript,
    openEditManuscript,
    resetForm,
    handleDeleteManuscript,
    handleMoveManuscript,
    error,
    clearError,
  };
}
