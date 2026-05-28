import React from 'react';
import { cn } from '@/ui/cn';
import { useLang } from '@/i18n';
import {
  LayoutDashboard,
  FolderOpen,
  FileText,
  Columns3,
  Send,
  Microscope,
  Beaker,
  BookOpen,
  PenLine,
  BookOpenCheck,
  BookMarked,
  Settings,
  Globe,
  type LucideIcon,
} from 'lucide-react';

export type NavItem = {
  id: string;
  labelKey: string;
  icon: LucideIcon;
  count?: number;
};

interface SidebarProps {
  activeView: string;
  onNavigate: (view: string) => void;
  className?: string;
}

const labelKeys: Record<string, string> = {
  dashboard: 'sidebar.dashboard',
  projects: 'sidebar.projects',
  records: 'sidebar.records',
  kanban: 'sidebar.kanban',
  submissions: 'sidebar.submissions',
  evidence: 'sidebar.evidence',
  planning: 'sidebar.planning',
  journal: 'sidebar.journal',
  reading: 'sidebar.reading',
  writing: 'sidebar.writing',
  citations: 'sidebar.citations',
  settings: 'sidebar.settings',
};

const navGroups = [
  { id: 'overview', items: [{ id: 'dashboard', icon: LayoutDashboard }] },
  {
    id: 'research', labelKey: 'sidebar.group.research',
    items: [
      { id: 'projects', icon: FolderOpen },
      { id: 'planning', icon: Beaker },
      { id: 'journal', icon: BookOpenCheck },
    ]
  },
  {
    id: 'collect', labelKey: 'sidebar.group.collect',
    items: [
      { id: 'records', icon: FileText },
      { id: 'evidence', icon: Microscope },
      { id: 'reading', icon: BookOpen },
    ]
  },
  {
    id: 'produce', labelKey: 'sidebar.group.produce',
    items: [
      { id: 'writing', icon: PenLine },
      { id: 'citations', icon: BookMarked },
      { id: 'kanban', icon: Columns3 },
      { id: 'submissions', icon: Send },
    ]
  },
  {
    id: 'config', labelKey: 'sidebar.group.settings',
    items: [{ id: 'settings', icon: Settings }]
  },
];

export function Sidebar({ activeView, onNavigate, className }: SidebarProps) {
  const { t, lang, switchLang } = useLang();

  return (
    <aside
      className={cn(
        'w-56 flex-shrink-0 h-screen flex flex-col border-r border-slate-800 bg-slate-950/80',
        className
      )}
    >
      {/* Logo */}
      <div className="p-4 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center">
            <span className="text-sm font-bold text-white">SF</span>
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-100 font-display">ScholarFlow</h1>
            <p className="text-3xs text-slate-500">{t('sidebar.researchOS')}</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {navGroups.map((group, groupIdx) => (
          <div key={group.id}>
            {group.labelKey && (
              <p className="text-3xs font-semibold uppercase tracking-wider text-slate-600 px-3 mb-1 mt-3">
                {t(group.labelKey as any)}
              </p>
            )}
            {group.items.map((item) => {
              const Icon = item.icon;
              const isActive = activeView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  className={cn(
                    'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-150',
                    isActive
                      ? 'bg-primary-600/15 text-primary-400 border border-primary-600/20'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent'
                  )}
                >
                  <Icon size={15} />
                  <span>{t(labelKeys[item.id] as any)}</span>
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-slate-800 space-y-2">
        <button
          onClick={() => switchLang(lang === 'en' ? 'zh' : 'en')}
          className="w-full flex items-center justify-center gap-2 px-2 py-1.5 rounded-lg text-3xs font-medium text-slate-500 hover:text-slate-300 hover:bg-slate-800/60 transition"
          title={t('sidebar.switchLang' as any)}
        >
          <Globe size={12} />
          <span>{lang === 'en' ? '中文' : 'English'}</span>
        </button>
        <p className="text-3xs text-slate-600 text-center">ScholarFlow v2.1</p>
      </div>
    </aside>
  );
}
