import { useState, useCallback, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@storage/dexie';
import { generateId } from '@storage/id';
import { parseBibTeX, generateBibTeX, entryToRecord, recordToBibTeX, type BibTeXEntry } from '@core/citation/bibtex';
import { parseRIS, entryToRecord as risEntryToRecord } from '@core/citation/ris';
import { formatCitation, formatCitationsBatch, type CitationFormat, type CitationData } from '@core/citation/formatter';

export function useCitations() {
  const records = useLiveQuery(() => db.researchRecords.where('userId').equals('user').toArray()) ?? [];

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [yearFilter, setYearFilter] = useState('');
  const [sortBy, setSortBy] = useState<'year' | 'title' | 'author'>('year');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [exportFormat, setExportFormat] = useState<CitationFormat>('apa7');

  const literatureRecords = useMemo(() =>
    records.filter(r => r.recordType === 'literature_review' || r.tags.includes('literature')),
    [records]
  );

  const citations = useMemo(() => {
    let filtered = literatureRecords;

    if (search.trim()) {
      const q = search.toLowerCase();
      filtered = filtered.filter(r =>
        r.title.toLowerCase().includes(q) ||
        r.summary.toLowerCase().includes(q) ||
        r.tags.some(t => t.toLowerCase().includes(q)) ||
        (r.externalRef || '').toLowerCase().includes(q)
      );
    }

    if (typeFilter) {
      filtered = filtered.filter(r => r.tags.includes(typeFilter));
    }

    if (yearFilter) {
      filtered = filtered.filter(r => {
        const match = r.externalRef?.match(/\b(19|20)\d{2}\b/);
        return match?.[0] === yearFilter;
      });
    }

    filtered.sort((a, b) => {
      if (sortBy === 'title') return a.title.localeCompare(b.title);
      if (sortBy === 'author') {
        const aAuthor = a.tags.find(t => t.startsWith('author:'))?.replace('author:', '') || '';
        const bAuthor = b.tags.find(t => t.startsWith('author:'))?.replace('author:', '') || '';
        return aAuthor.localeCompare(bAuthor);
      }
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });

    return filtered;
  }, [literatureRecords, search, typeFilter, yearFilter, sortBy]);

  const years = useMemo(() => {
    const yearSet = new Set<string>();
    literatureRecords.forEach(r => {
      const match = r.externalRef?.match(/\b(19|20)\d{2}\b/);
      if (match) yearSet.add(match[0]);
    });
    return Array.from(yearSet).sort((a, b) => Number(b) - Number(a));
  }, [literatureRecords]);

  const types = useMemo(() => {
    const typeSet = new Set<string>();
    literatureRecords.forEach(r => {
      r.tags.forEach(t => typeSet.add(t));
    });
    return Array.from(typeSet).sort();
  }, [literatureRecords]);

  const stats = useMemo(() => ({
    total: literatureRecords.length,
    withDoi: literatureRecords.filter(r => r.externalRef?.includes('10.')).length,
    withAbstract: literatureRecords.filter(r => r.summary.length > 0).length,
    recent: literatureRecords.filter(r => {
      const year = new Date(r.updatedAt).getFullYear();
      return year >= new Date().getFullYear() - 1;
    }).length,
  }), [literatureRecords]);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelectedIds(new Set(citations.map(r => r.id)));
  }, [citations]);

  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

  const recordToCitationData = useCallback((record: typeof records[0]): CitationData => {
    const doi = record.externalRef?.match(/10\.\d{4,}\/[^\s]+/)?.[0] || '';
    const year = record.externalRef?.match(/\b(19|20)\d{2}\b/)?.[0] || '';
    return {
      title: record.title,
      authors: record.tags.find(t => t.startsWith('author:'))?.replace('author:', '') || '',
      year,
      journal: record.tags.find(t => t.startsWith('journal:'))?.replace('journal:', '') || '',
      doi,
      url: record.dataPath || '',
      abstract: record.summary,
    };
  }, []);

  const exportSelected = useCallback(() => {
    const selected = citations.filter(r => selectedIds.has(r.id));
    const data = selected.map(recordToCitationData);
    return formatCitationsBatch(data, exportFormat);
  }, [citations, selectedIds, exportFormat, recordToCitationData]);

  const exportSingle = useCallback((recordId: string, format: CitationFormat) => {
    const record = citations.find(r => r.id === recordId);
    if (!record) return '';
    return formatCitation(recordToCitationData(record), format);
  }, [citations, recordToCitationData]);

  const importBibTeX = useCallback(async (text: string) => {
    const entries = parseBibTeX(text);
    let imported = 0;
    try {
      for (const entry of entries) {
        const data = entryToRecord(entry);
        if (!data.title) continue;
        await db.researchRecords.add({
          id: generateId('rec'),
          userId: 'user',
          projectId: 'proj_general',
          schemaTemplateId: null,
          recordType: 'literature_review',
          title: data.title,
          summary: data.abstract || '',
          methodology: '',
          recordedDate: new Date().toISOString(),
          attributes: {},
          dataPath: data.doi ? `https://doi.org/${data.doi}` : data.url || '',
          tags: [
            ...data.keywords,
            ...(data.authors ? [`author:${data.authors}`] : []),
            ...(data.journal ? [`journal:${data.journal}`] : []),
            'literature',
            'bibtex-import',
          ],
          externalRef: data.doi || data.bibtexKey || null,
          readingStatus: 'unread',
          starred: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        imported++;
      }
    } catch (e: unknown) {
      console.error('BibTeX import error:', e);
    }
    return imported;
  }, []);

  const importRIS = useCallback(async (text: string) => {
    const entries = parseRIS(text);
    let imported = 0;
    try {
      for (const entry of entries) {
        const data = risEntryToRecord(entry);
        if (!data.title) continue;
        await db.researchRecords.add({
          id: generateId('rec'),
          userId: 'user',
          projectId: 'proj_general',
          schemaTemplateId: null,
          recordType: 'literature_review',
          title: data.title,
          summary: data.abstract || '',
          methodology: '',
          recordedDate: new Date().toISOString(),
          attributes: {},
          dataPath: data.doi ? `https://doi.org/${data.doi}` : data.url || '',
          tags: [
            ...data.keywords,
            ...(data.authors ? [`author:${data.authors}`] : []),
            ...(data.journal ? [`journal:${data.journal}`] : []),
            'literature',
            'ris-import',
          ],
          externalRef: data.doi || null,
          readingStatus: 'unread',
          starred: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        imported++;
      }
    } catch (e: unknown) {
      console.error('RIS import error:', e);
    }
    return imported;
  }, []);

  const exportAsBibTeX = useCallback(() => {
    const selected = citations.filter(r => selectedIds.has(r.id));
    const entries: BibTeXEntry[] = selected.map(r => {
      const doi = r.externalRef?.match(/10\.\d{4,}\/[^\s]+/)?.[0] || '';
      const year = r.externalRef?.match(/\b(19|20)\d{2}\b/)?.[0] || '';
      const authors = r.tags.find(t => t.startsWith('author:'))?.replace('author:', '') || '';
      const journal = r.tags.find(t => t.startsWith('journal:'))?.replace('journal:', '') || '';
      return recordToBibTeX(
        r.title.toLowerCase().replace(/\s+/g, '').slice(0, 20) + year,
        'article',
        { title: r.title, authors, year, journal, doi, url: r.dataPath, abstract: r.summary }
      );
    });
    return generateBibTeX(entries);
  }, [citations, selectedIds]);

  return {
    citations,
    records: literatureRecords,
    search,
    setSearch,
    typeFilter,
    setTypeFilter,
    yearFilter,
    setYearFilter,
    sortBy,
    setSortBy,
    years,
    types,
    stats,
    selectedIds,
    toggleSelect,
    selectAll,
    clearSelection,
    exportFormat,
    setExportFormat,
    exportSelected,
    exportSingle,
    exportAsBibTeX,
    importBibTeX,
    importRIS,
  };
}
