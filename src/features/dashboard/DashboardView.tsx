import React, { useMemo, useCallback } from 'react';
import { useDashboardData } from './useDashboardData';
import { PageHeader } from '@components/layout/PageHeader';
import { StatCard } from '@components/layout/StatCard';
import { Card, CardHeader, CardTitle, CardContent } from '@components/primitives/Card';
import { Badge } from '@components/primitives/Badge';
import { EmptyState } from '@components/primitives/EmptyState';
import { ProgressBar } from '@components/primitives/ProgressBar';
import { Tooltip } from '@components/primitives/Tooltip';
import { SubmissionTimeline } from '@components/domain/SubmissionTimeline';
import { ChartBar } from '@components/domain/ChartBar';
import { ChartDonut } from '@components/domain/ChartDonut';
import { ChartLine } from '@components/domain/ChartLine';
import {
  LayoutDashboard, FileText, FolderOpen, Clock, CheckCircle2,
  AlertTriangle, Send, Columns3, ListTodo, BookOpen, TrendingUp, ChevronRight,
  CalendarDays, Flame, Zap, ArrowRight
} from 'lucide-react';
import { useLang } from '@/i18n';

interface DashboardViewProps {
  onNavigate?: (view: string) => void;
}

export function DashboardView({ onNavigate }: DashboardViewProps) {
  const { t } = useLang();

  const {
    projects, records, manuscripts, submissions, analyses,
    timelineAlerts, metrics, recentRecords, taskStats,
    monthlyTrend, recordTypeDistribution, projectProgress,
    overdueTasks, readingStats, weeklyActivity, monthlyActivity,
    urgentTasks,
  } = useDashboardData();

  const pipelineStages = useMemo(() => [
    { key: 'preparing', label: t('dashboard.preparing'), color: 'bg-slate-500' },
    { key: 'submitted', label: t('dashboard.submitted'), color: 'bg-info-500' },
    { key: 'under_review', label: t('dashboard.underReview'), color: 'bg-warning-500' },
    { key: 'accepted', label: t('dashboard.accepted'), color: 'bg-success-500' },
  ], [t]);

  const pipelineCounts = useMemo(
    () => pipelineStages.map(stage => ({
      ...stage,
      count: submissions.filter(s => s.status === stage.key).length,
    })),
    [pipelineStages, submissions]
  );

  const taskCompletionPercent = taskStats.total > 0
    ? Math.round((taskStats.completed / taskStats.total) * 100)
    : 0;

  const readingStatsChartData = useMemo(
    () => [
      { label: t('reading.unread'), value: readingStats.unread, color: '#64748b' },
      { label: t('reading.reading'), value: readingStats.reading, color: '#3b82f6' },
      { label: t('reading.read'), value: readingStats.read, color: '#10b981' },
    ],
    [t, readingStats]
  );

  const navigateRecords = useCallback(() => onNavigate?.('records'), [onNavigate]);
  const navigateKanban = useCallback(() => onNavigate?.('kanban'), [onNavigate]);
  const navigateProjects = useCallback(() => onNavigate?.('projects'), [onNavigate]);
  const navigateSubmissions = useCallback(() => onNavigate?.('submissions'), [onNavigate]);
  const navigateReading = useCallback(() => onNavigate?.('reading'), [onNavigate]);

  return (
    <div>
      <PageHeader
        title={t('dashboard.title')}
        description={t('dashboard.description')}
        icon={<LayoutDashboard size={18} />}
      />

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatCard label={t('dashboard.projects')} value={projects.length} icon={<FolderOpen size={16} />} onClick={navigateProjects} />
        <StatCard label={t('dashboard.records')} value={records.length} icon={<FileText size={16} />} onClick={navigateRecords} />
        <StatCard label={t('dashboard.manuscripts')} value={manuscripts.length} icon={<Send size={16} />} onClick={navigateKanban} />
        <StatCard label={t('dashboard.tasksDone')} value={`${taskStats.completed}/${taskStats.total}`} icon={<ListTodo size={16} />} />
      </div>

      {/* Research Activity Overview */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {/* This Week */}
        <Card variant="solid" padding="md">
          <div className="flex items-center gap-2 mb-3">
            <div className="h-7 w-7 rounded-lg bg-primary-950 text-primary-400 flex items-center justify-center">
              <CalendarDays size={14} />
            </div>
            <p className="text-2xs font-semibold uppercase tracking-wider text-slate-400">{t('dashboard.thisWeek')}</p>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <Tooltip content={t('dashboard.recordsThisWeek')}>
              <div className="text-center">
                <p className="text-sm font-bold text-slate-100 font-display">{weeklyActivity.records}</p>
                <p className="text-3xs text-slate-500">{t('dashboard.recordsShort')}</p>
              </div>
            </Tooltip>
            <Tooltip content={t('dashboard.tasksThisWeek')}>
              <div className="text-center">
                <p className="text-sm font-bold text-slate-100 font-display">{weeklyActivity.tasksCompleted}</p>
                <p className="text-3xs text-slate-500">{t('dashboard.tasksShort')}</p>
              </div>
            </Tooltip>
            <Tooltip content={t('dashboard.readingThisWeek')}>
              <div className="text-center">
                <p className="text-sm font-bold text-slate-100 font-display">{weeklyActivity.papersRead}</p>
                <p className="text-3xs text-slate-500">{t('dashboard.papersShort')}</p>
              </div>
            </Tooltip>
          </div>
        </Card>

        {/* This Month */}
        <Card variant="solid" padding="md">
          <div className="flex items-center gap-2 mb-3">
            <div className="h-7 w-7 rounded-lg bg-info-950 text-info-400 flex items-center justify-center">
              <Flame size={14} />
            </div>
            <p className="text-2xs font-semibold uppercase tracking-wider text-slate-400">{t('dashboard.thisMonth')}</p>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <Tooltip content={t('dashboard.recordsThisMonth')}>
              <div className="text-center">
                <p className="text-sm font-bold text-slate-100 font-display">{monthlyActivity.records}</p>
                <p className="text-3xs text-slate-500">{t('dashboard.recordsShort')}</p>
              </div>
            </Tooltip>
            <Tooltip content={t('dashboard.tasksThisMonth')}>
              <div className="text-center">
                <p className="text-sm font-bold text-slate-100 font-display">{monthlyActivity.tasksCompleted}</p>
                <p className="text-3xs text-slate-500">{t('dashboard.tasksShort')}</p>
              </div>
            </Tooltip>
            <Tooltip content={t('dashboard.readingThisMonth')}>
              <div className="text-center">
                <p className="text-sm font-bold text-slate-100 font-display">{monthlyActivity.papersRead}</p>
                <p className="text-3xs text-slate-500">{t('dashboard.papersShort')}</p>
              </div>
            </Tooltip>
          </div>
        </Card>

        {/* Quick Actions */}
        <Card variant="solid" padding="md">
          <div className="flex items-center gap-2 mb-3">
            <div className="h-7 w-7 rounded-lg bg-success-950 text-success-400 flex items-center justify-center">
              <Zap size={14} />
            </div>
            <p className="text-2xs font-semibold uppercase tracking-wider text-slate-400">{t('dashboard.quickActions')}</p>
          </div>
          <div className="space-y-1.5">
            <button
              onClick={navigateRecords}
              className="w-full flex items-center justify-between p-1.5 rounded-md hover:bg-slate-800/60 transition-colors text-left group"
            >
              <span className="text-2xs text-slate-300 group-hover:text-slate-100">{t('dashboard.quickNewRecord')}</span>
              <ArrowRight size={11} className="text-slate-600 group-hover:text-primary-400 transition-colors" />
            </button>
            <button
              onClick={navigateKanban}
              className="w-full flex items-center justify-between p-1.5 rounded-md hover:bg-slate-800/60 transition-colors text-left group"
            >
              <span className="text-2xs text-slate-300 group-hover:text-slate-100">{t('dashboard.quickNewManuscript')}</span>
              <ArrowRight size={11} className="text-slate-600 group-hover:text-primary-400 transition-colors" />
            </button>
            <button
              onClick={navigateProjects}
              className="w-full flex items-center justify-between p-1.5 rounded-md hover:bg-slate-800/60 transition-colors text-left group"
            >
              <span className="text-2xs text-slate-300 group-hover:text-slate-100">{t('dashboard.quickNewProject')}</span>
              <ArrowRight size={11} className="text-slate-600 group-hover:text-primary-400 transition-colors" />
            </button>
          </div>
        </Card>
      </div>

      {/* Task Progress */}
      {taskStats.total > 0 && (
        <Card variant="solid" padding="md" className="mb-6">
          <ProgressBar
            value={taskStats.completed}
            max={taskStats.total}
            color={taskCompletionPercent === 100 ? 'success' : 'primary'}
            label={t('dashboard.taskCompletion')}
            showValue
            size="md"
          />
        </Card>
      )}

      {/* Manuscript Pipeline */}
      <Card variant="solid" padding="md" className="mb-6">
        <CardHeader>
          <CardTitle>
            <button onClick={navigateKanban} className="flex items-center gap-2 hover:text-primary-400 transition-colors cursor-pointer">
              <Columns3 size={14} className="text-primary-400" />
              {t('dashboard.manuscriptPipeline')}
              <ChevronRight size={12} className="text-slate-600" />
            </button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {submissions.length === 0 ? (
            <EmptyState
              title={t('dashboard.noSubmissions')}
              description={t('dashboard.noSubmissionsDesc')}
            />
          ) : (
            <div className="grid grid-cols-4 gap-2">
              {pipelineCounts.map(stage => (
                <button
                  key={stage.key}
                  onClick={navigateKanban}
                  className="text-center p-3 rounded-lg border border-slate-800 bg-slate-900/40 hover:border-primary-600/30 hover:bg-slate-800/60 transition-all cursor-pointer"
                >
                  <div className={`w-2.5 h-2.5 rounded-full ${stage.color} mx-auto mb-2`} />
                  <p className="text-lg font-bold text-slate-100 font-display">{stage.count}</p>
                  <p className="text-3xs text-slate-500 uppercase tracking-wider mt-0.5">{stage.label}</p>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Metrics Averages */}
      {(metrics.avgExpToSubmit !== null || metrics.avgSubmitToAccept !== null) && (
        <div className="grid grid-cols-2 gap-3 mb-6">
          {metrics.avgExpToSubmit !== null && (
            <Card variant="solid" padding="md" hover="subtle" className="cursor-pointer" onClick={navigateSubmissions}>
              <p className="text-2xs font-semibold uppercase tracking-wider text-slate-400">{t('dashboard.avgExpToSubmit')}</p>
              <p className="mt-1.5 text-xl font-bold text-primary-400 font-display">{metrics.avgExpToSubmit} {t('dashboard.days')}</p>
            </Card>
          )}
          {metrics.avgSubmitToAccept !== null && (
            <Card variant="solid" padding="md" hover="subtle" className="cursor-pointer" onClick={navigateSubmissions}>
              <p className="text-2xs font-semibold uppercase tracking-wider text-slate-400">{t('dashboard.avgSubmitToAccept')}</p>
              <p className="mt-1.5 text-xl font-bold text-success-400 font-display">{metrics.avgSubmitToAccept} {t('dashboard.days')}</p>
            </Card>
          )}
        </div>
      )}

      {/* Active Submission Timelines */}
      {analyses.length > 0 && (
        <div className="space-y-3 mb-6">
          <button
            onClick={navigateSubmissions}
            className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2 hover:text-primary-400 transition-colors cursor-pointer"
          >
            <Clock size={13} /> {t('dashboard.activeSubmissions')}
            <ChevronRight size={12} />
          </button>
          {analyses.slice(0, 4).map(({ submission, manuscript, analysis }) => (
            <SubmissionTimeline
              key={submission.id}
              analysis={analysis}
              manuscriptTitle={manuscript?.title}
              journal={submission.journal}
              onClick={navigateSubmissions}
            />
          ))}
        </div>
      )}

      {/* Timeline Alerts */}
      {timelineAlerts.length > 0 && (
        <Card variant="solid" padding="md" className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle size={14} className="text-warning-400" />
              {t('dashboard.timelineAlerts')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {timelineAlerts.map(({ submission, manuscript, analysis }) => (
                <button
                  key={submission.id}
                  onClick={navigateSubmissions}
                  className="w-full flex items-center justify-between p-2.5 rounded-lg border border-slate-800 bg-slate-900/40 hover:border-primary-600/30 hover:bg-slate-800/60 transition-all cursor-pointer text-left"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-slate-200 truncate">
                      {manuscript?.title || t('common.untitled')}
                    </p>
                    <p className="text-2xs text-slate-500 mt-0.5">{analysis.display.label}</p>
                  </div>
                  <div className="flex items-center gap-2 ml-3">
                    <Badge variant={analysis.display.mode === 'r1-active' ? 'error' : 'warning'} size="sm">
                      {analysis.display.value !== null ? `${analysis.display.value}d` : t('common.na')}
                    </Badge>
                    <ChevronRight size={14} className="text-slate-600" />
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Analytics Charts */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        {/* Monthly Trend */}
        <Card variant="solid" padding="md" hover="subtle" className="cursor-pointer" onClick={navigateRecords}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp size={14} className="text-primary-400" />
              {t('dashboard.recordsTrend')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartLine data={monthlyTrend} height={100} color="#14b8a6" />
          </CardContent>
        </Card>

        {/* Record Type Distribution */}
        <Card variant="solid" padding="md" hover="subtle" className="cursor-pointer" onClick={navigateRecords}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText size={14} className="text-info-400" />
              {t('dashboard.recordTypes')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recordTypeDistribution.length > 0 ? (
              <ChartDonut
                data={recordTypeDistribution}
                size={110}
                thickness={16}
                centerValue={String(records.length)}
                centerLabel={t('common.total')}
              />
            ) : (
              <EmptyState title={t('dashboard.noRecordTypes')} description={t('dashboard.noRecordTypesDesc')} />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Project Progress + Reading Stats */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        {/* Per-Project Records */}
        <Card variant="solid" padding="md" hover="subtle" className="cursor-pointer" onClick={navigateProjects}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FolderOpen size={14} className="text-warning-400" />
              {t('dashboard.recordsPerProject')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {projectProgress.length > 0 ? (
              <ChartBar data={projectProgress} height={120} />
            ) : (
              <EmptyState title={t('dashboard.noProjects')} description={t('dashboard.noProjectsDesc')} />
            )}
          </CardContent>
        </Card>

        {/* Reading Progress */}
        <Card variant="solid" padding="md" hover="subtle" className="cursor-pointer" onClick={navigateReading}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen size={14} className="text-success-400" />
              {t('dashboard.readingProgress')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {readingStats.total > 0 ? (
              <ChartDonut
                data={readingStatsChartData}
                size={110}
                thickness={16}
                centerValue={String(readingStats.total)}
                centerLabel={t('dashboard.papers')}
              />
            ) : (
              <EmptyState title={t('dashboard.noLiterature')} description={t('dashboard.noLiteratureDesc')} />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Overdue Tasks */}
      {overdueTasks.length > 0 && (
        <Card variant="solid" padding="md" className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle size={14} className="text-error-400" />
              {t('dashboard.overdueTasks')} ({overdueTasks.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1.5">
              {overdueTasks.slice(0, 5).map(task => (
                <div key={task.id} className="flex items-center justify-between p-2 rounded-lg border border-error-600/20 bg-error-600/5">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-200 truncate">{task.title}</p>
                    <p className="text-3xs text-error-400">{t('common.due')} {task.dueDate}</p>
                  </div>
                  <Badge variant="error" size="sm">{t('common.overdue')}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Records */}
      <Card variant="solid" padding="md">
        <CardHeader>
          <CardTitle>
            <button onClick={navigateRecords} className="flex items-center gap-2 hover:text-primary-400 transition-colors cursor-pointer">
              <FileText size={14} className="text-slate-400" />
              {t('dashboard.recentRecords')}
              <ChevronRight size={12} className="text-slate-600" />
            </button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentRecords.length === 0 ? (
            <EmptyState
              title={t('dashboard.noRecords')}
              description={t('dashboard.noRecordsDesc')}
            />
          ) : (
            <div className="space-y-1.5">
              {recentRecords.map((rec) => (
                <button
                  key={rec.id}
                  onClick={navigateRecords}
                  className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-slate-800/40 transition-colors cursor-pointer text-left"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-slate-200 truncate">{rec.title}</p>
                    <p className="text-2xs text-slate-500 mt-0.5">
                      {rec.recordType.replace(/_/g, ' ')} &middot; {new Date(rec.updatedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 ml-2">
                    {rec.tags.length > 0 && rec.tags.slice(0, 2).map((tag) => (
                      <Badge key={tag} size="sm">{tag}</Badge>
                    ))}
                    <ChevronRight size={14} className="text-slate-600" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
