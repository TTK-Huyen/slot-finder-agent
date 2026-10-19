import React from 'react';
import { Plus, RefreshCw, Users } from 'lucide-react';
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
    <header className="border-b border-gray-200 bg-white backdrop-blur sticky top-0 z-30 px-6 py-4">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-gray-900 m-0">The Slot Finder</h1>
              <span className="text-xs bg-gray-100/20 text-gray-700 font-semibold px-2 py-0.5 rounded-full border border-gray-300/30">
                MVP
              </span>
            </div>
            <p className="text-xs text-gray-500">
              Estimate role capacity and balance team workload
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center bg-gray-50 p-1 rounded-xl border border-gray-200">
          <button
            onClick={() => setActiveTab('planner')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${
              activeTab === 'planner'
                ? 'bg-gray-900 text-white shadow-md'
                : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            Project planning & role needs
          </button>
          <button
            onClick={() => setActiveTab('heatmap')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
              activeTab === 'heatmap'
                ? 'bg-gray-900 text-white shadow-md'
                : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            <Users className="w-4 h-4" />
            Workload matrix
          </button>
        </div>

        {/* Actions & Alerts */}
        <div className="flex items-center gap-3">
          {/* Project selector */}
          <select
            value={selectedProjectId || ''}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-gray-300"
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
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-gray-900 hover:bg-gray-800 text-white text-sm font-medium transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Create project</span>
          </button>

          {/* Reset sample data */}
          <button
            onClick={resetAllData}
            title="Restore sample data"
            className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors border border-gray-200"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};

