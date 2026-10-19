import React from 'react';
import { Plus, RefreshCw, Sparkles, Users } from 'lucide-react';
import { useApp } from '../context/AppContext';

interface HeaderProps {
  onNewProjectClick: () => void;
  activeTab: 'planner' | 'heatmap';
  setActiveTab: (tab: 'planner' | 'heatmap') => void;
}

export const Header: React.FC<HeaderProps> = ({
  onNewProjectClick,
  activeTab,
  setActiveTab,
}) => {
  const {
    projects,
    selectedProjectId,
    setSelectedProjectId,
    resetAllData,
  } = useApp();

  return (
    <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur sticky top-0 z-30 px-6 py-4">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/25">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-white m-0">The Slot Finder</h1>
              <span className="text-xs bg-indigo-500/20 text-indigo-300 font-semibold px-2 py-0.5 rounded-full border border-indigo-500/30">
                MVP
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Ước lượng thời gian theo Role & Tối ưu hóa cân bằng Workload toàn team
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center bg-slate-800/80 p-1 rounded-xl border border-slate-700/60">
          <button
            onClick={() => setActiveTab('planner')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${
              activeTab === 'planner'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
            }`}
          >
            Quản lý Dự án & Nhu cầu Role
          </button>
          <button
            onClick={() => setActiveTab('heatmap')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
              activeTab === 'heatmap'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
            }`}
          >
            <Users className="w-4 h-4" />
            Ma trận Tải (Heatmap)
          </button>
        </div>

        {/* Actions & Alerts */}
        <div className="flex items-center gap-3">
          {/* Project selector */}
          <select
            value={selectedProjectId || ''}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="bg-slate-800 border border-slate-700 text-slate-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500"
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.status})
              </option>
            ))}
          </select>

          {/* New Project Button */}
          <button
            onClick={onNewProjectClick}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Tạo Dự án</span>
          </button>

          {/* Reset sample data */}
          <button
            onClick={resetAllData}
            title="Khôi phục dữ liệu mẫu ban đầu"
            className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors border border-slate-700/60"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
