import React, { useState, lazy, Suspense } from 'react';
import { Sidebar } from '../../src/ui/components/layout/Sidebar';
import { PageContainer } from '../../src/ui/components/layout/PageContainer';
import { ToastProvider } from '../../src/ui/components/primitives/Toast';
import { Spinner } from '../../src/ui/components/primitives/Spinner';
import { ErrorBoundary } from '../../src/ui/components/primitives/ErrorBoundary';
import './style.css';

type ActiveView = 'dashboard' | 'projects' | 'records' | 'kanban' | 'submissions' | 'evidence' | 'planning' | 'reading' | 'writing' | 'citations' | 'journal' | 'settings';

// Lazy-loaded feature views for code splitting
const DashboardView = lazy(() => import('../../src/features/dashboard/DashboardView').then(m => ({ default: m.DashboardView })));
const ProjectsView = lazy(() => import('../../src/features/projects/ProjectsView').then(m => ({ default: m.ProjectsView })));
const RecordsView = lazy(() => import('../../src/features/records/RecordsView').then(m => ({ default: m.RecordsView })));
const KanbanView = lazy(() => import('../../src/features/kanban/KanbanView').then(m => ({ default: m.KanbanView })));
const SettingsView = lazy(() => import('../../src/features/settings/SettingsView').then(m => ({ default: m.SettingsView })));
const SubmissionsView = lazy(() => import('../../src/features/submissions/SubmissionsView').then(m => ({ default: m.SubmissionsView })));
const EvidenceView = lazy(() => import('../../src/features/evidence/EvidenceView').then(m => ({ default: m.EvidenceView })));
const PlanningView = lazy(() => import('../../src/features/planning/PlanningView').then(m => ({ default: m.PlanningView })));
const ReadingQueueView = lazy(() => import('../../src/features/reading/ReadingQueueView').then(m => ({ default: m.ReadingQueueView })));
const WritingView = lazy(() => import('../../src/features/writing/WritingView').then(m => ({ default: m.WritingView })));
const CitationsView = lazy(() => import('../../src/features/citations/CitationsView').then(m => ({ default: m.CitationsView })));
const JournalView = lazy(() => import('../../src/features/journal/JournalView').then(m => ({ default: m.JournalView })));

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center h-64">
      <Spinner size="lg" />
    </div>
  );
}

function App() {
  const [activeView, setActiveView] = useState<ActiveView>('dashboard');

  return (
    <ToastProvider>
      <div className="flex h-screen overflow-hidden bg-slate-950">
        <Sidebar activeView={activeView} onNavigate={(v) => setActiveView(v as ActiveView)} />
        <PageContainer>
          <ErrorBoundary>
          <Suspense fallback={<LoadingFallback />}>
            {activeView === 'dashboard' && <DashboardView onNavigate={(v) => setActiveView(v as ActiveView)} />}
            {activeView === 'projects' && <ProjectsView />}
            {activeView === 'records' && <RecordsView />}
            {activeView === 'kanban' && <KanbanView />}
            {activeView === 'submissions' && <SubmissionsView />}
            {activeView === 'evidence' && <EvidenceView />}
            {activeView === 'planning' && <PlanningView />}
            {activeView === 'reading' && <ReadingQueueView />}
            {activeView === 'writing' && <WritingView />}
            {activeView === 'citations' && <CitationsView />}
            {activeView === 'journal' && <JournalView />}
            {activeView === 'settings' && <SettingsView />}
          </Suspense>
          </ErrorBoundary>
        </PageContainer>
      </div>
    </ToastProvider>
  );
}

export default App;
