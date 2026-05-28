import { useState, useCallback, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type JournalEntry } from '@storage/dexie';
import { generateId } from '@storage/id';

export function useJournal() {
  const entries = useLiveQuery(() => db.journalEntries.orderBy('date').reverse().toArray()) ?? [];
  const projects = useLiveQuery(() => db.projects.toArray()) ?? [];

  const [selectedProjectId, setSelectedProjectId] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    content: '',
    mood: 'neutral' as string,
    tags: '',
    projectId: '',
    date: new Date().toISOString().slice(0, 10),
  });

  const filtered = useMemo(() => {
    if (selectedProjectId === 'all') return entries;
    return entries.filter(e => e.projectId === selectedProjectId);
  }, [entries, selectedProjectId]);

  const resetForm = useCallback(() => {
    setEditingId(null);
    setForm({ content: '', mood: 'neutral', tags: '', projectId: '', date: new Date().toISOString().slice(0, 10) });
  }, []);

  const openEdit = useCallback((entry: JournalEntry) => {
    setEditingId(entry.id);
    setForm({
      content: entry.content,
      mood: entry.mood,
      tags: entry.tags.join(', '),
      projectId: entry.projectId ?? '',
      date: entry.date,
    });
    setIsModalOpen(true);
  }, []);

  const handleSave = useCallback(async () => {
    if (!form.content.trim()) return;
    try {
      const now = new Date().toISOString();
      const tags = form.tags.split(',').map(t => t.trim()).filter(Boolean);
      await db.journalEntries.put({
        id: editingId || generateId('journal'),
        userId: 'user',
        projectId: form.projectId || null,
        date: form.date,
        content: form.content.trim(),
        mood: form.mood,
        tags,
        createdAt: editingId ? (await db.journalEntries.get(editingId))?.createdAt || now : now,
        updatedAt: now,
      });
      resetForm();
      setIsModalOpen(false);
    } catch (e: unknown) {
      console.error('Failed to save journal entry:', e);
    }
  }, [editingId, form, resetForm]);

  const handleDelete = useCallback(async (id: string) => {
    try {
      await db.journalEntries.delete(id);
    } catch (e: unknown) {
      console.error('Failed to delete journal entry:', e);
    }
  }, []);

  return {
    entries,
    filtered,
    projects,
    selectedProjectId,
    setSelectedProjectId,
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
