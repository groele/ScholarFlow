import { useState, useCallback, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type ResearchRecord } from '@storage/dexie';
import { generateId } from '@storage/id';

export type ReadingStatus = 'unread' | 'reading' | 'read' | 'to-reread';

export function useRecords() {
  const records = useLiveQuery(() => db.researchRecords.where('userId').equals('user').toArray()) ?? [];
  const projects = useLiveQuery(() => db.projects.where('userId').equals('user').toArray()) ?? [];

  const [recordSearch, setRecordSearch] = useState('');
  const [projectFilter, setProjectFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  const [recordForm, setRecordForm] = useState({
    title: '',
    recordType: 'literature_review',
    methodology: '',
    projectId: '',
    summary: '',
    doi: '',
    tags: ''
  });

  const [error, setError] = useState<string | null>(null);
  const clearError = useCallback(() => setError(null), []);

  const filteredRecords = useMemo(() => {
    let filtered = records;

    if (projectFilter) {
      filtered = filtered.filter(r => r.projectId === projectFilter);
    }

    if (typeFilter) {
      filtered = filtered.filter(r => r.recordType === typeFilter);
    }

    if (recordSearch.trim()) {
      const q = recordSearch.toLowerCase();
      filtered = filtered.filter(r =>
        r.title.toLowerCase().includes(q) ||
        r.summary.toLowerCase().includes(q) ||
        r.tags.some(t => t.toLowerCase().includes(q))
      );
    }

    return filtered;
  }, [records, recordSearch, projectFilter, typeFilter]);

  const recordTypes = useMemo(() => {
    const types = new Set(records.map(r => r.recordType));
    return Array.from(types).sort();
  }, [records]);

  const resetForm = useCallback(() => {
    setEditingRecordId(null);
    setRecordForm({ title: '', recordType: 'literature_review', methodology: '', projectId: '', summary: '', doi: '', tags: '' });
  }, []);

  const openEditRecord = useCallback((rec: ResearchRecord) => {
    setEditingRecordId(rec.id);
    setRecordForm({
      title: rec.title,
      recordType: rec.recordType,
      methodology: rec.methodology,
      projectId: rec.projectId,
      summary: rec.summary,
      doi: rec.externalRef || '',
      tags: rec.tags.join(', ')
    });
    setIsRecordModalOpen(true);
  }, []);

  const handleSaveRecord = useCallback(async () => {
    if (!recordForm.title.trim()) return;
    try {
      const now = new Date().toISOString();
      const existing = editingRecordId ? await db.researchRecords.get(editingRecordId) : null;
      await db.researchRecords.put({
        id: editingRecordId || generateId('rec'),
        userId: 'user',
        projectId: recordForm.projectId || 'proj_general',
        schemaTemplateId: null,
        title: recordForm.title.trim(),
        recordType: recordForm.recordType,
        methodology: recordForm.methodology.trim(),
        recordedDate: existing?.recordedDate || now,
        attributes: recordForm.doi ? { doi: recordForm.doi } : {},
        dataPath: '',
        externalRef: recordForm.doi || null,
        summary: recordForm.summary.trim(),
        tags: recordForm.tags.split(',').map(t => t.trim()).filter(Boolean),
        readingStatus: existing?.readingStatus || 'unread',
        starred: existing?.starred || false,
        createdAt: existing?.createdAt || now,
        updatedAt: now,
      });
      resetForm();
      setIsRecordModalOpen(false);
    } catch (e: unknown) {
      console.error('Failed to save record:', e);
      setError('Failed to save record. Please try again.');
    }
  }, [editingRecordId, recordForm, resetForm]);

  const handleDeleteRecord = useCallback(async (id: string) => {
    try {
      await db.researchRecords.delete(id);
    } catch (e: unknown) {
      console.error('Failed to delete record:', e);
      setError('Failed to delete record. Please try again.');
    }
  }, []);

  const handleToggleStar = useCallback(async (id: string) => {
    try {
      const rec = await db.researchRecords.get(id);
      if (rec) {
        await db.researchRecords.update(id, { starred: !rec.starred, updatedAt: new Date().toISOString() });
      }
    } catch (e: unknown) {
      console.error('Failed to toggle star:', e);
      setError('Failed to update star. Please try again.');
    }
  }, []);

  const handleReadingStatusChange = useCallback(async (id: string, status: ReadingStatus) => {
    try {
      await db.researchRecords.update(id, { readingStatus: status, updatedAt: new Date().toISOString() });
    } catch (e: unknown) {
      console.error('Failed to update reading status:', e);
      setError('Failed to update reading status. Please try again.');
    }
  }, []);

  return {
    records,
    filteredRecords,
    projects,
    recordTypes,
    recordSearch,
    setRecordSearch,
    projectFilter,
    setProjectFilter,
    typeFilter,
    setTypeFilter,
    isRecordModalOpen,
    setIsRecordModalOpen,
    editingRecordId,
    recordForm,
    setRecordForm,
    handleSaveRecord,
    openEditRecord,
    resetForm,
    handleDeleteRecord,
    handleToggleStar,
    handleReadingStatusChange,
    error,
    clearError,
  };
}
