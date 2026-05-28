import React, { useState, useMemo, useCallback } from 'react';
import { useProjects, type ViewMode } from './useProjects';
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
import { ProgressBar } from '@components/primitives/ProgressBar';
import {
  FolderOpen, Plus, Trash2, Edit2, Filter,
  LayoutList, LayoutGrid, FileText, ListTodo, Clock,
} from 'lucide-react';
import { useLang } from '@/i18n';

function getRelativeTime(dateStr: string): string {
  const now = Date.now();
  const date = new Date(dateStr).getTime();
  const diffMs = now - date;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHour = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return '刚刚';
  if (diffMin < 60) return `${diffMin} 分钟前`;
  if (diffHour < 24) return `${diffHour} 小时前`;
  if (diffDay < 30) return `${diffDay} 天前`;
  return new Date(dateStr).toLocaleDateString();
}

export function ProjectsView() {
  const { t } = useLang();
  const [confirmDelete, setConfirmDelete] = useState<{ type: 'project' | 'area'; id: string } | null>(null);

  const {
    projects, enrichedProjects, researchAreas,
    viewMode, setViewMode,
    isAreaModalOpen, setIsAreaModalOpen,
    newAreaName, setNewAreaName,
    newAreaDesc, setNewAreaDesc,
    newAreaColor, setNewAreaColor,
    handleSaveArea,
    isProjModalOpen, setIsProjModalOpen,
    editingProjectId,
    newProjTitle, setNewProjTitle,
    newProjDiscipline, setNewProjDiscipline,
    newProjHypothesis, setNewProjHypothesis,
    newProjAbstract, setNewProjAbstract,
    newProjAreaId, setNewProjAreaId,
    areaFilter, setAreaFilter,
    handleSaveProject, openEditProject, resetProjectForm,
    handleDeleteProject, handleDeleteArea,
  } = useProjects();

  const areaProjectCounts = useMemo(
    () => Object.fromEntries(researchAreas.map(area => [area.id, projects.filter(p => p.areaId === area.id).length])),
    [researchAreas, projects]
  );

  const areaOptionsForSelect = useMemo(
    () => researchAreas.map(a => ({ value: a.id, label: a.name })),
    [researchAreas]
  );

  const viewToggle = (
    <div className="flex border border-slate-800 rounded-lg overflow-hidden">
      <button
        onClick={() => setViewMode('list')}
        className={`px-2 py-1 flex items-center gap-1 text-xs transition ${
          viewMode === 'list'
            ? 'bg-primary-600/20 text-primary-400'
            : 'text-slate-500 hover:text-slate-300'
        }`}
        title={t('projects.viewList')}
      >
        <LayoutList size={14} />
      </button>
      <button
        onClick={() => setViewMode('card')}
        className={`px-2 py-1 flex items-center gap-1 text-xs transition ${
          viewMode === 'card'
            ? 'bg-primary-600/20 text-primary-400'
            : 'text-slate-500 hover:text-slate-300'
        }`}
        title={t('projects.viewCard')}
      >
        <LayoutGrid size={14} />
      </button>
    </div>
  );

  return (
    <div>
      <PageHeader
        title={t('projects.title')}
        description={t('projects.description')}
        icon={<FolderOpen size={18} />}
        actions={
          <div className="flex items-center gap-3">
            {viewToggle}
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={() => setIsAreaModalOpen(true)} leftIcon={<Plus size={14} />}>
                {t('projects.area')}
              </Button>
              <Button variant="primary" size="sm" onClick={() => { resetProjectForm(); setIsProjModalOpen(true); }} leftIcon={<Plus size={14} />}>
                {t('projects.project')}
              </Button>
            </div>
          </div>
        }
      />

      {/* Research Areas */}
      {researchAreas.length > 0 && (
        <div className="mb-6">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">{t('projects.researchAreas')}</h2>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setAreaFilter(null)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition ${
                areaFilter === null
                  ? 'border-primary-500 bg-primary-600/15 text-primary-400'
                  : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:text-slate-200'
              }`}
            >
              <Filter size={12} /> {t('common.all')} ({projects.length})
            </button>
            {researchAreas.map((area) => {
              const count = areaProjectCounts[area.id] ?? 0;
              return (
                <button
                  key={area.id}
                  onClick={() => setAreaFilter(areaFilter === area.id ? null : area.id)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition ${
                    areaFilter === area.id
                      ? 'border-primary-500 bg-primary-600/15 text-primary-400'
                      : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: area.color || '#14b8a6' }} />
                  {area.name} ({count})
                  <IconButton
                    variant="ghost"
                    size="xs"
                    icon={<Trash2 size={10} />}
                    aria-label="Delete area"
                    onClick={(e) => { e.stopPropagation(); setConfirmDelete({ type: 'area', id: area.id }); }}
                  />
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Projects */}
      {enrichedProjects.length === 0 ? (
        <EmptyState
          title={areaFilter ? t('projects.noAreaProjects') : t('projects.noProjects')}
          description={areaFilter ? t('projects.noAreaProjectsDesc') : t('projects.noProjectsDesc')}
          action={
            !areaFilter && (
              <Button variant="primary" size="sm" onClick={() => { resetProjectForm(); setIsProjModalOpen(true); }} leftIcon={<Plus size={14} />}>
                {t('projects.createProject')}
              </Button>
            )
          }
        />
      ) : viewMode === 'card' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {enrichedProjects.map((proj) => {
            const area = researchAreas.find(a => a.id === proj.areaId);
            return (
              <Card key={proj.id} variant="solid" padding="md" hover="lift">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-sm font-semibold text-slate-100 flex-1">{proj.title}</h3>
                  <div className="flex gap-1 ml-2">
                    <IconButton
                      variant="ghost"
                      size="sm"
                      icon={<Edit2 size={13} />}
                      aria-label="Edit project"
                      onClick={() => openEditProject(proj)}
                    />
                    <IconButton
                      variant="danger"
                      size="sm"
                      icon={<Trash2 size={13} />}
                      aria-label="Delete project"
                      onClick={() => setConfirmDelete({ type: 'project', id: proj.id })}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2 mb-2">
                  {proj.discipline && <Badge size="sm" variant="primary">{proj.discipline}</Badge>}
                  {area && (
                    <Badge size="sm">
                      <span className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: area.color || '#14b8a6' }} />
                        {area.name}
                      </span>
                    </Badge>
                  )}
                </div>
                {proj.hypothesis && (
                  <p className="text-2xs text-slate-400 italic line-clamp-2 mb-3">{proj.hypothesis}</p>
                )}
                {/* Progress */}
                <div className="mb-3">
                  <ProgressBar
                    value={proj.progress}
                    color={proj.progress === 100 ? 'success' : 'primary'}
                    size="sm"
                    showValue
                    label={t('projects.progress')}
                  />
                </div>
                {/* Stats row */}
                <div className="flex items-center gap-3 text-2xs text-slate-500">
                  <span className="flex items-center gap-1">
                    <ListTodo size={12} /> {proj.taskCount} {t('projects.tasks')}
                  </span>
                  <span className="flex items-center gap-1">
                    <FileText size={12} /> {proj.recordCount} {t('projects.records')}
                  </span>
                  <span className="flex items-center gap-1 ml-auto">
                    <Clock size={12} /> {getRelativeTime(proj.updatedAt)}
                  </span>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="space-y-2">
          {enrichedProjects.map((proj) => {
            const area = researchAreas.find(a => a.id === proj.areaId);
            return (
              <Card key={proj.id} variant="solid" padding="sm" hover="subtle">
                <div className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-sm font-semibold text-slate-100 truncate">{proj.title}</h3>
                      {proj.discipline && <Badge size="sm" variant="primary">{proj.discipline}</Badge>}
                      {area && (
                        <Badge size="sm">
                          <span className="flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: area.color || '#14b8a6' }} />
                            {area.name}
                          </span>
                        </Badge>
                      )}
                    </div>
                    {proj.hypothesis && (
                      <p className="text-2xs text-slate-400 italic truncate">{proj.hypothesis}</p>
                    )}
                  </div>
                  {/* Progress bar compact */}
                  <div className="w-24 shrink-0">
                    <ProgressBar
                      value={proj.progress}
                      color={proj.progress === 100 ? 'success' : 'primary'}
                      size="sm"
                    />
                    <span className="text-3xs text-slate-500 text-right block mt-0.5">{proj.progress}%</span>
                  </div>
                  {/* Stats */}
                  <div className="flex items-center gap-3 text-2xs text-slate-500 shrink-0">
                    <span className="flex items-center gap-1" title={t('projects.tasks')}>
                      <ListTodo size={12} /> {proj.taskCount}
                    </span>
                    <span className="flex items-center gap-1" title={t('projects.records')}>
                      <FileText size={12} /> {proj.recordCount}
                    </span>
                    <span className="flex items-center gap-1" title={t('projects.updated')}>
                      <Clock size={12} /> {getRelativeTime(proj.updatedAt)}
                    </span>
                  </div>
                  {/* Actions */}
                  <div className="flex gap-1 shrink-0">
                    <IconButton
                      variant="ghost"
                      size="sm"
                      icon={<Edit2 size={13} />}
                      aria-label="Edit project"
                      onClick={() => openEditProject(proj)}
                    />
                    <IconButton
                      variant="danger"
                      size="sm"
                      icon={<Trash2 size={13} />}
                      aria-label="Delete project"
                      onClick={() => setConfirmDelete({ type: 'project', id: proj.id })}
                    />
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Area Modal */}
      <Modal isOpen={isAreaModalOpen} onClose={() => setIsAreaModalOpen(false)} title={t('projects.newArea')} size="sm">
        <div className="space-y-3">
          <Input label={t('projects.areaName')} value={newAreaName} onChange={(e) => setNewAreaName(e.target.value)} placeholder={t('projects.areaNamePlaceholder')} />
          <Textarea label={t('projects.descriptionLabel')} value={newAreaDesc} onChange={(e) => setNewAreaDesc(e.target.value)} placeholder={t('projects.descriptionPlaceholder')} />
          <Input label={t('projects.color')} type="color" value={newAreaColor} onChange={(e) => setNewAreaColor(e.target.value)} className="h-10 w-20" />
        </div>
        <ModalFooter>
          <Button variant="secondary" size="sm" onClick={() => setIsAreaModalOpen(false)}>{t('common.cancel')}</Button>
          <Button variant="primary" size="sm" onClick={handleSaveArea}>{t('projects.saveArea')}</Button>
        </ModalFooter>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={async () => {
          if (!confirmDelete) return;
          if (confirmDelete.type === 'project') await handleDeleteProject(confirmDelete.id);
          else await handleDeleteArea(confirmDelete.id);
          setConfirmDelete(null);
        }}
        title={confirmDelete?.type === 'project' ? t('common.confirm') + ' — ' + t('projects.project') : t('common.confirm') + ' — ' + t('projects.area')}
        description={confirmDelete?.type === 'project'
          ? t('projects.deleteProjectDesc')
          : t('projects.deleteAreaDesc')}
        confirmLabel={t('common.delete')}
        variant="danger"
      />

      {/* Project Modal */}
      <Modal
        isOpen={isProjModalOpen}
        onClose={() => setIsProjModalOpen(false)}
        title={editingProjectId ? t('projects.editProject') : t('projects.newProject')}
        size="md"
      >
        <div className="space-y-3">
          <Input label={t('projects.projectTitle')} value={newProjTitle} onChange={(e) => setNewProjTitle(e.target.value)} placeholder={t('projects.projectTitlePlaceholder')} />
          {researchAreas.length > 0 && (
            <Select
              label={t('projects.researchArea')}
              value={newProjAreaId || ''}
              onChange={(e) => setNewProjAreaId(e.target.value || null)}
              options={[
                { value: '', label: t('projects.noArea') },
                ...areaOptionsForSelect
              ]}
            />
          )}
          <Input label={t('projects.discipline')} value={newProjDiscipline} onChange={(e) => setNewProjDiscipline(e.target.value)} placeholder={t('projects.disciplinePlaceholder')} />
          <Textarea label={t('projects.hypothesis')} value={newProjHypothesis} onChange={(e) => setNewProjHypothesis(e.target.value)} placeholder={t('projects.hypothesisPlaceholder')} />
          <Textarea label={t('projects.abstract')} value={newProjAbstract} onChange={(e) => setNewProjAbstract(e.target.value)} placeholder={t('projects.abstractPlaceholder')} />
        </div>
        <ModalFooter>
          <Button variant="secondary" size="sm" onClick={() => setIsProjModalOpen(false)}>{t('common.cancel')}</Button>
          <Button variant="primary" size="sm" onClick={handleSaveProject}>{editingProjectId ? t('common.update') : t('common.create')}</Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
