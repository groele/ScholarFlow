import React, { useState, useMemo, useCallback } from 'react';
import { useRecords, type ReadingStatus } from './useRecords';
import { useLang } from '@/i18n';
import { PageHeader } from '@components/layout/PageHeader';
import { Card } from '@components/primitives/Card';
import { Button } from '@components/primitives/Button';
import { Badge } from '@components/primitives/Badge';
import { Modal, ModalFooter } from '@components/primitives/Modal';
import { Input } from '@components/primitives/Input';
import { Textarea } from '@components/primitives/Textarea';
import { Select } from '@components/primitives/Select';
import { EmptyState } from '@components/primitives/EmptyState';
import { IconButton } from '@components/primitives/IconButton';
import { ConfirmDialog } from '@components/primitives/ConfirmDialog';
import { FileText, Plus, Trash2, Edit2, Search, Star, BookOpen, Eye, CheckCircle2, RotateCcw } from 'lucide-react';

export function RecordsView() {
  const { t } = useLang();
  const [deleteRecordId, setDeleteRecordId] = useState<string | null>(null);
  const {
    filteredRecords, projects, recordTypes,
    recordSearch, setRecordSearch,
    projectFilter, setProjectFilter,
    typeFilter, setTypeFilter,
    isRecordModalOpen, setIsRecordModalOpen,
    editingRecordId, recordForm, setRecordForm,
    handleSaveRecord, openEditRecord, resetForm, handleDeleteRecord,
    handleToggleStar, handleReadingStatusChange,
  } = useRecords();

  const statusConfig = useMemo<Record<ReadingStatus, { label: string; variant: string; icon: React.ReactNode }>>(() => ({
    unread: { label: t('records.unread'), variant: 'default', icon: <BookOpen size={11} /> },
    reading: { label: t('records.reading'), variant: 'info', icon: <Eye size={11} /> },
    read: { label: t('records.read'), variant: 'success', icon: <CheckCircle2 size={11} /> },
    'to-reread': { label: t('records.toReread'), variant: 'warning', icon: <RotateCcw size={11} /> },
  }), [t]);

  const projectFilterOptions = useMemo(
    () => projects.map(p => ({ value: p.id, label: p.title })),
    [projects]
  );

  const typeFilterOptions = useMemo(
    () => recordTypes.map(ty => ({ value: ty, label: ty.replace(/_/g, ' ') })),
    [recordTypes]
  );

  const handleNewRecord = useCallback(() => { resetForm(); setIsRecordModalOpen(true); }, [resetForm, setIsRecordModalOpen]);
  const handleCloseModal = useCallback(() => setIsRecordModalOpen(false), [setIsRecordModalOpen]);
  const handleDeleteConfirm = useCallback(async () => {
    if (deleteRecordId) await handleDeleteRecord(deleteRecordId);
    setDeleteRecordId(null);
  }, [deleteRecordId, handleDeleteRecord]);

  return (
    <div>
      <PageHeader
        title={t('records.title')}
        description={t('records.description')}
        icon={<FileText size={18} />}
        actions={
          <Button
            variant="primary"
            size="sm"
            onClick={handleNewRecord}
            leftIcon={<Plus size={14} />}
          >
            {t('records.record')}
          </Button>
        }
      />

      {/* Filters */}
      <div className="flex gap-3 mb-4">
        <div className="flex-1">
          <Input
            placeholder={t('records.searchPlaceholder')}
            value={recordSearch}
            onChange={(e) => setRecordSearch(e.target.value)}
            leftIcon={<Search size={14} />}
          />
        </div>
        <Select
          value={projectFilter}
          onChange={(e) => setProjectFilter(e.target.value)}
          options={[
            { value: '', label: t('records.allProjects') },
            ...projectFilterOptions
          ]}
          className="w-44"
        />
        <Select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          options={[
            { value: '', label: t('records.allTypes') },
            ...typeFilterOptions
          ]}
          className="w-40"
        />
      </div>

      {/* Records Table */}
      {filteredRecords.length === 0 ? (
        <EmptyState
          title={t('records.noRecords')}
          description={recordSearch || projectFilter || typeFilter ? t('records.noRecordsFilter') : t('records.noRecordsDesc')}
        />
      ) : (
        <Card variant="solid" padding="none">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-800">
                  <th className="text-left px-3 py-2.5 text-2xs font-semibold uppercase tracking-wider text-slate-400 w-8"></th>
                  <th className="text-left px-4 py-2.5 text-2xs font-semibold uppercase tracking-wider text-slate-400">{t('records.title')}</th>
                  <th className="text-left px-4 py-2.5 text-2xs font-semibold uppercase tracking-wider text-slate-400">{t('records.type')}</th>
                  <th className="text-left px-4 py-2.5 text-2xs font-semibold uppercase tracking-wider text-slate-400">{t('records.status')}</th>
                  <th className="text-left px-4 py-2.5 text-2xs font-semibold uppercase tracking-wider text-slate-400">{t('records.tags')}</th>
                  <th className="text-left px-4 py-2.5 text-2xs font-semibold uppercase tracking-wider text-slate-400">{t('records.date')}</th>
                  <th className="text-right px-4 py-2.5 text-2xs font-semibold uppercase tracking-wider text-slate-400">{t('records.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecords.map((rec) => {
                  const status = (rec.readingStatus || 'unread') as ReadingStatus;
                  const cfg = statusConfig[status];
                  return (
                    <tr key={rec.id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                      <td className="px-3 py-2.5">
                        <button
                          onClick={() => handleToggleStar(rec.id)}
                          className={`transition ${rec.starred ? 'text-warning-400' : 'text-slate-600 hover:text-slate-400'}`}
                        >
                          <Star size={14} fill={rec.starred ? 'currentColor' : 'none'} />
                        </button>
                      </td>
                      <td className="px-4 py-2.5">
                        <p className="font-medium text-slate-200 truncate max-w-[280px]">{rec.title}</p>
                        {rec.summary && <p className="text-2xs text-slate-500 truncate max-w-[280px] mt-0.5">{rec.summary}</p>}
                      </td>
                      <td className="px-4 py-2.5">
                        <Badge size="sm" variant="primary">{rec.recordType.replace(/_/g, ' ')}</Badge>
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-1">
                          {Object.entries(statusConfig).map(([key, sCfg]) => (
                            <button
                              key={key}
                              onClick={() => handleReadingStatusChange(rec.id, key as ReadingStatus)}
                              className={`p-1 rounded transition ${
                                status === key
                                  ? 'bg-primary-600/20 text-primary-400'
                                  : 'text-slate-600 hover:text-slate-400 hover:bg-slate-800'
                              }`}
                              title={sCfg.label}
                            >
                              {sCfg.icon}
                            </button>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex gap-1 flex-wrap">
                          {rec.tags.slice(0, 3).map((tag) => (
                            <Badge key={tag} size="sm">{tag}</Badge>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-slate-500 font-mono text-2xs whitespace-nowrap">
                        {new Date(rec.recordedDate).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <div className="flex justify-end gap-1">
                          <IconButton variant="ghost" size="sm" icon={<Edit2 size={13} />} aria-label={t('a11y.edit')} onClick={() => openEditRecord(rec)} />
                          <IconButton variant="danger" size="sm" icon={<Trash2 size={13} />} aria-label={t('a11y.delete')} onClick={() => setDeleteRecordId(rec.id)} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deleteRecordId}
        onClose={() => setDeleteRecordId(null)}
        onConfirm={handleDeleteConfirm}
        title={t('common.confirm') + ' — ' + t('common.delete')}
        description={t('records.deleteDesc')}
        confirmLabel={t('common.delete')}
        variant="danger"
      />

      {/* Record Modal */}
      <Modal
        isOpen={isRecordModalOpen}
        onClose={handleCloseModal}
        title={editingRecordId ? t('records.editRecord') : t('records.newRecord')}
        size="md"
      >
        <div className="space-y-3">
          <Input label={t('records.title')} value={recordForm.title} onChange={(e) => setRecordForm({ ...recordForm, title: e.target.value })} placeholder={t('records.title')} />
          <Select
            label={t('records.type')}
            value={recordForm.recordType}
            onChange={(e) => setRecordForm({ ...recordForm, recordType: e.target.value })}
            options={[
              { value: 'literature_review', label: t('records.literatureReview') },
              { value: 'experiment', label: t('records.experiment') },
              { value: 'data_analysis', label: t('records.dataAnalysis') },
              { value: 'note', label: t('records.note') },
              { value: 'idea', label: t('records.idea') },
            ]}
          />
          <Select
            label={t('kanban.project')}
            value={recordForm.projectId}
            onChange={(e) => setRecordForm({ ...recordForm, projectId: e.target.value })}
            options={[
              { value: '', label: t('kanban.noProject') },
              ...projectFilterOptions
            ]}
          />
          <Input label={t('records.doi')} value={recordForm.doi} onChange={(e) => setRecordForm({ ...recordForm, doi: e.target.value })} placeholder={t('records.doiPlaceholder')} />
          <Textarea label={t('records.methodology')} value={recordForm.methodology} onChange={(e) => setRecordForm({ ...recordForm, methodology: e.target.value })} placeholder={t('records.methodologyPlaceholder')} />
          <Textarea label={t('records.summary')} value={recordForm.summary} onChange={(e) => setRecordForm({ ...recordForm, summary: e.target.value })} placeholder={t('records.summaryPlaceholder')} />
          <Input label={t('records.tagsLabel')} value={recordForm.tags} onChange={(e) => setRecordForm({ ...recordForm, tags: e.target.value })} placeholder={t('records.tagsPlaceholder')} hint={t('records.tagsHint')} />
        </div>
        <ModalFooter>
          <Button variant="secondary" size="sm" onClick={handleCloseModal}>{t('common.cancel')}</Button>
          <Button variant="primary" size="sm" onClick={handleSaveRecord}>{editingRecordId ? t('common.update') : t('common.create')}</Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
