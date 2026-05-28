import { useState, useCallback, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@storage/dexie';
import { generateId } from '@storage/id';

export interface Section {
  id: string;
  title: string;
  content: string;
  order: number;
}

const IMRAD_TEMPLATE: Omit<Section, 'id'>[] = [
  { title: 'Title', content: '', order: 0 },
  { title: 'Abstract', content: '', order: 1 },
  { title: 'Introduction', content: '', order: 2 },
  { title: 'Methods', content: '', order: 3 },
  { title: 'Results', content: '', order: 4 },
  { title: 'Discussion', content: '', order: 5 },
  { title: 'Conclusion', content: '', order: 6 },
  { title: 'References', content: '', order: 7 },
];

export function useWriting() {
  const manuscripts = useLiveQuery(() => db.manuscripts.toArray()) ?? [];
  const projects = useLiveQuery(() => db.projects.toArray()) ?? [];

  const [selectedMsId, setSelectedMsId] = useState('');
  const [activeSectionId, setActiveSectionId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const clearError = useCallback(() => setError(null), []);

  const selectedManuscript = manuscripts.find(m => m.id === selectedMsId);
  const sections: Section[] = (selectedManuscript?.sections || []).sort((a, b) => a.order - b.order);

  const activeSection = sections.find(s => s.id === activeSectionId) || sections[0] || null;

  const wordCount = useMemo(() => {
    if (!activeSection) return { current: 0, total: 0 };
    const current = activeSection.content.trim().split(/\s+/).filter(Boolean).length;
    const total = sections.reduce((sum, s) => sum + s.content.trim().split(/\s+/).filter(Boolean).length, 0);
    return { current, total };
  }, [activeSection, sections]);

  const progress = useMemo(() => {
    if (sections.length === 0) return 0;
    const filled = sections.filter(s => s.content.trim().length > 0).length;
    return Math.round((filled / sections.length) * 100);
  }, [sections]);

  const handleSelectManuscript = useCallback((msId: string) => {
    setSelectedMsId(msId);
    const ms = manuscripts.find(m => m.id === msId);
    const secs = (ms?.sections || []).sort((a, b) => a.order - b.order);
    setActiveSectionId(secs[0]?.id || '');
  }, [manuscripts]);

  const handleApplyTemplate = useCallback(async () => {
    if (!selectedMsId) return;
    try {
      const templateSections: Section[] = IMRAD_TEMPLATE.map(s => ({
        ...s,
        id: generateId('sec'),
      }));
      await db.manuscripts.update(selectedMsId, {
        sections: templateSections,
        updatedAt: new Date().toISOString(),
      });
      setActiveSectionId(templateSections[0].id);
    } catch (e: unknown) {
      console.error('Failed to apply template:', e);
      setError('Failed to apply template. Please try again.');
    }
  }, [selectedMsId]);

  const handleUpdateSection = useCallback(async (sectionId: string, content: string) => {
    if (!selectedMsId) return;
    try {
      const updatedSections = sections.map(s =>
        s.id === sectionId ? { ...s, content } : s
      );
      await db.manuscripts.update(selectedMsId, {
        sections: updatedSections,
        updatedAt: new Date().toISOString(),
      });
    } catch (e: unknown) {
      console.error('Failed to update section:', e);
    }
  }, [selectedMsId, sections]);

  const handleAddSection = useCallback(async (title: string) => {
    if (!selectedMsId || !title.trim()) return;
    try {
      const newSection: Section = {
        id: generateId('sec'),
        title: title.trim(),
        content: '',
        order: sections.length,
      };
      await db.manuscripts.update(selectedMsId, {
        sections: [...sections, newSection],
        updatedAt: new Date().toISOString(),
      });
      setActiveSectionId(newSection.id);
    } catch (e: unknown) {
      console.error('Failed to add section:', e);
    }
  }, [selectedMsId, sections]);

  const handleDeleteSection = useCallback(async (sectionId: string) => {
    if (!selectedMsId) return;
    try {
      const updated = sections.filter(s => s.id !== sectionId).map((s, i) => ({ ...s, order: i }));
      await db.manuscripts.update(selectedMsId, {
        sections: updated,
        updatedAt: new Date().toISOString(),
      });
      if (activeSectionId === sectionId) {
        setActiveSectionId(updated[0]?.id || '');
      }
    } catch (e: unknown) {
      console.error('Failed to delete section:', e);
    }
  }, [selectedMsId, sections, activeSectionId]);

  const handleReorderSection = useCallback(async (sectionId: string, direction: 'up' | 'down') => {
    if (!selectedMsId) return;
    try {
      const idx = sections.findIndex(s => s.id === sectionId);
      if (idx < 0) return;
      const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (targetIdx < 0 || targetIdx >= sections.length) return;
      const reordered = [...sections];
      [reordered[idx], reordered[targetIdx]] = [reordered[targetIdx], reordered[idx]];
      const updated = reordered.map((s, i) => ({ ...s, order: i }));
      await db.manuscripts.update(selectedMsId, {
        sections: updated,
        updatedAt: new Date().toISOString(),
      });
    } catch (e: unknown) {
      console.error('Failed to reorder section:', e);
    }
  }, [selectedMsId, sections]);

  return {
    manuscripts,
    projects,
    selectedMsId,
    selectedManuscript,
    sections,
    activeSection,
    activeSectionId,
    setActiveSectionId,
    wordCount,
    progress,
    handleSelectManuscript,
    handleApplyTemplate,
    handleUpdateSection,
    handleAddSection,
    handleDeleteSection,
    handleReorderSection,
  };
}
