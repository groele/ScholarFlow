import { useState, useCallback, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Evidence } from '@storage/dexie';
import { generateId } from '@storage/id';

export function useEvidence() {
  const evidence = useLiveQuery(() => db.evidence.where('userId').equals('user').toArray()) ?? [];
  const projects = useLiveQuery(() => db.projects.where('userId').equals('user').toArray()) ?? [];

  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: '',
    description: '',
    evidenceType: 'figure',
    projectId: '',
    filePath: '',
    fileSize: 0,
  });

  const filtered = useMemo(() => {
    if (!search.trim()) return evidence;
    const q = search.toLowerCase();
    return evidence.filter(e =>
      e.title.toLowerCase().includes(q) ||
      e.description.toLowerCase().includes(q) ||
      e.evidenceType.toLowerCase().includes(q)
    );
  }, [evidence, search]);

  const resetForm = useCallback(() => {
    setEditingId(null);
    setForm({ title: '', description: '', evidenceType: 'figure', projectId: '', filePath: '', fileSize: 0 });
  }, []);

  const openEdit = useCallback((item: Evidence) => {
    setEditingId(item.id);
    setForm({
      title: item.title,
      description: item.description,
      evidenceType: item.evidenceType,
      projectId: item.projectId,
      filePath: item.filePath,
      fileSize: item.fileSize,
    });
    setIsModalOpen(true);
  }, []);

  const handleSave = useCallback(async () => {
    if (!form.title.trim()) return;
    try {
      const now = new Date().toISOString();
      await db.evidence.put({
        id: editingId || generateId('evi'),
        userId: 'user',
        projectId: form.projectId || 'proj_general',
        title: form.title.trim(),
        description: form.description.trim(),
        evidenceType: form.evidenceType,
        filePath: form.filePath.trim(),
        fileSize: form.fileSize,
        createdAt: editingId ? (await db.evidence.get(editingId))?.createdAt || now : now,
        updatedAt: now,
      });
      resetForm();
      setIsModalOpen(false);
    } catch (e: unknown) {
      console.error('Failed to save evidence:', e);
    }
  }, [editingId, form, resetForm]);

  const handleDelete = useCallback(async (id: string) => {
    try {
      await db.evidence.delete(id);
    } catch (e: unknown) {
      console.error('Failed to delete evidence:', e);
    }
  }, []);

  return {
    evidence,
    filtered,
    projects,
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
  };
}
