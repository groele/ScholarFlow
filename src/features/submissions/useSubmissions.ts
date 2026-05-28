import { useState, useCallback, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Submission } from '@storage/dexie';
import { generateId } from '@storage/id';

export function useSubmissions() {
  const submissions = useLiveQuery(() => db.submissions.toArray()) ?? [];
  const manuscripts = useLiveQuery(() => db.manuscripts.toArray()) ?? [];

  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    manuscriptId: '',
    journal: '',
    status: 'preparing',
    initialSubmissionDate: '',
    deadlineDate: '',
    notes: '',
  });

  const [error, setError] = useState<string | null>(null);
  const clearError = useCallback(() => setError(null), []);

  const filtered = useMemo(() => {
    if (!search.trim()) return submissions;
    const q = search.toLowerCase();
    return submissions.filter(s =>
      s.journal.toLowerCase().includes(q) ||
      s.status.toLowerCase().includes(q) ||
      s.notes.toLowerCase().includes(q)
    );
  }, [submissions, search]);

  const resetForm = useCallback(() => {
    setEditingId(null);
    setForm({ manuscriptId: '', journal: '', status: 'preparing', initialSubmissionDate: '', deadlineDate: '', notes: '' });
  }, []);

  const openEdit = useCallback((item: Submission) => {
    setEditingId(item.id);
    setForm({
      manuscriptId: item.manuscriptId,
      journal: item.journal,
      status: item.status,
      initialSubmissionDate: item.initialSubmissionDate || '',
      deadlineDate: item.deadlineDate || '',
      notes: item.notes || '',
    });
    setIsModalOpen(true);
  }, []);

  const handleSave = useCallback(async () => {
    if (!form.journal.trim() || !form.manuscriptId) return;
    try {
      const now = new Date().toISOString();
      const existing = editingId ? await db.submissions.get(editingId) : null;
      await db.submissions.put({
        id: editingId || generateId('sub'),
        manuscriptId: form.manuscriptId,
        journal: form.journal.trim(),
        status: form.status,
        initialSubmissionDate: form.initialSubmissionDate || null,
        deadlineDate: form.deadlineDate || null,
        firstDecisionDate: existing?.firstDecisionDate || null,
        revisionDueDate: existing?.revisionDueDate || null,
        acceptanceDate: existing?.acceptanceDate || null,
        publicationDate: existing?.publicationDate || null,
        notes: form.notes.trim(),
        timelineNodes: existing?.timelineNodes || [],
        createdAt: existing?.createdAt || now,
        updatedAt: now,
      });
      resetForm();
      setIsModalOpen(false);
    } catch (e: unknown) {
      console.error('Failed to save submission:', e);
      setError('Failed to save submission. Please try again.');
    }
  }, [editingId, form, resetForm]);

  const handleDelete = useCallback(async (id: string) => {
    try {
      await db.submissions.delete(id);
    } catch (e: unknown) {
      console.error('Failed to delete submission:', e);
      setError('Failed to delete submission. Please try again.');
    }
  }, []);

  const handleStatusChange = useCallback(async (id: string, newStatus: string) => {
    try {
      const sub = await db.submissions.get(id);
      if (!sub) return;
      const now = new Date().toISOString();
      const updates: Partial<Submission> & { status: string; updatedAt: string } = { status: newStatus, updatedAt: now };
      if (newStatus === 'submitted' && !sub.initialSubmissionDate) updates.initialSubmissionDate = now;
      if (newStatus === 'accepted' && !sub.acceptanceDate) updates.acceptanceDate = now;
      if (newStatus === 'published' && !sub.publicationDate) updates.publicationDate = now;
      await db.submissions.update(id, updates);
    } catch (e: unknown) {
      console.error('Failed to update submission status:', e);
      setError('Failed to update submission status. Please try again.');
    }
  }, []);

  return {
    submissions,
    filtered,
    manuscripts,
    search,
    setSearch,
    isModalOpen,
    setIsModalOpen,
    editingId,
    form,
    setForm,
    handleSave,
    openEdit,
    resetForm,
    handleDelete,
    handleStatusChange,
    error,
    clearError,
  };
}
