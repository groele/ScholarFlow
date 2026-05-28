import React, { useState } from 'react';
import { useJournal } from './useJournal';
import { useLang } from '@/i18n';
import { PageHeader } from '@components/layout/PageHeader';
import { Card } from '@components/primitives/Card';
import { Button } from '@components/primitives/Button';
import { Badge } from '@components/primitives/Badge';
import { Modal, ModalFooter } from '@components/primitives/Modal';
import { Textarea } from '@components/primitives/Textarea';
import { Select } from '@components/primitives/Select';
import { Input } from '@components/primitives/Input';
import { EmptyState } from '@components/primitives/EmptyState';
import { IconButton } from '@components/primitives/IconButton';
import { ConfirmDialog } from '@components/primitives/ConfirmDialog';
import {
  BookOpen,
  Plus,
  Trash2,
  Edit2,
  Zap,
  Frown,
  Lightbulb,
  Minus,
  FolderOpen,
} from 'lucide-react';

const moodIcons: Record<string, React.ReactNode> = {
  productive: <Zap size={14} />,
  stuck: <Frown size={14} />,
  breakthrough: <Lightbulb size={14} />,
  neutral: <Minus size={14} />,
};

const moodColors: Record<string, string> = {
  productive: 'success',
  stuck: 'warning',
  breakthrough: 'info',
  neutral: 'default',
};

export function JournalView() {
  const { t } = useLang();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const {
    filtered, projects,
    selectedProjectId, setSelectedProjectId,
    isModalOpen, setIsModalOpen,
    editingId, form, setForm,
    handleSave, openEdit, resetForm, handleDelete,
  } = useJournal();

  const moodLabel: Record<string, string> = {
    productive: t('journal.moodProductive'),
    stuck: t('journal.moodStuck'),
    breakthrough: t('journal.moodBreakthrough'),
    neutral: t('journal.moodNeutral'),
  };

  const projectMap = Object.fromEntries(projects.map(p => [p.id, p.title]));

  return (
    <div>
      <PageHeader
        title={t('journal.title')}
        description={t('journal.description')}
        icon={<BookOpen size={18} />}
        actions={
          <Button
            variant="primary"
            size="sm"
            onClick={() => { resetForm(); setIsModalOpen(true); }}
            leftIcon={<Plus size={14} />}
          >
            {t('journal.newEntry')}
          </Button>
        }
      />

      <div className="mb-4">
        <Select
          value={selectedProjectId}
          onChange={(e) => setSelectedProjectId(e.target.value)}
          options={[
            { value: 'all', label: t('journal.allProjects') },
            ...projects.map(p => ({ value: p.id, label: p.title })),
          ]}
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<BookOpen size={32} />}
          title={t('journal.noEntries')}
          description={t('journal.noEntriesDesc')}
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((entry) => (
            <Card key={entry.id} variant="solid" padding="md" hover="lift">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <Badge variant={(moodColors[entry.mood] as any) || 'default'} size="sm">
                      <span className="flex items-center gap-1">
                        {moodIcons[entry.mood] || <Minus size={12} />}
                        {moodLabel[entry.mood] || entry.mood}
                      </span>
                    </Badge>
                    {entry.projectId && (
                      <span className="flex items-center gap-1 text-2xs text-slate-500">
                        <FolderOpen size={11} />
                        {projectMap[entry.projectId] || entry.projectId}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-300 whitespace-pre-wrap">{entry.content}</p>
                  {entry.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {entry.tags.map(tag => (
                        <Badge key={tag} variant="default" size="sm">{tag}</Badge>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-1 shrink-0">
                  <IconButton variant="ghost" size="sm" icon={<Edit2 size={13} />} aria-label={t('a11y.edit')} onClick={() => openEdit(entry)} />
                  <IconButton variant="danger" size="sm" icon={<Trash2 size={13} />} aria-label={t('a11y.delete')} onClick={() => setDeleteId(entry.id)} />
                </div>
              </div>
              <div className="mt-2 pt-2 border-t border-slate-800/50 text-2xs text-slate-600">
                {entry.date}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={async () => {
          if (deleteId) await handleDelete(deleteId);
          setDeleteId(null);
        }}
        title={t('common.confirm') + ' — ' + t('common.delete')}
        description={t('journal.deleteDesc')}
        confirmLabel={t('common.delete')}
        variant="danger"
      />

      {/* Create / Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingId ? t('journal.editEntry') : t('journal.newEntry')}
        size="md"
      >
        <div className="space-y-3">
          <Input
            label={t('journal.dateLabel')}
            type="date"
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
          />
          <Select
            label={t('journal.moodLabel')}
            value={form.mood}
            onChange={(e) => setForm({ ...form, mood: e.target.value })}
            options={[
              { value: 'productive', label: t('journal.moodProductive') },
              { value: 'breakthrough', label: t('journal.moodBreakthrough') },
              { value: 'stuck', label: t('journal.moodStuck') },
              { value: 'neutral', label: t('journal.moodNeutral') },
            ]}
          />
          <Select
            label={t('journal.projectLabel')}
            value={form.projectId}
            onChange={(e) => setForm({ ...form, projectId: e.target.value })}
            options={[
              { value: '', label: t('journal.noProject') },
              ...projects.map(p => ({ value: p.id, label: p.title })),
            ]}
          />
          <Textarea
            label={t('journal.contentLabel')}
            value={form.content}
            onChange={(e) => setForm({ ...form, content: e.target.value })}
            placeholder={t('journal.contentPlaceholder')}
            rows={6}
          />
          <Input
            label={t('journal.tagsLabel')}
            value={form.tags}
            onChange={(e) => setForm({ ...form, tags: e.target.value })}
            placeholder={t('journal.tagsPlaceholder')}
          />
        </div>
        <ModalFooter>
          <Button variant="secondary" size="sm" onClick={() => setIsModalOpen(false)}>{t('common.cancel')}</Button>
          <Button variant="primary" size="sm" onClick={handleSave}>{editingId ? t('common.update') : t('common.add')}</Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
