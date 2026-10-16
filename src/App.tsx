import React, { useState } from 'react';
import { Header } from './components/Header';
import { NewProjectModal } from './components/NewProjectModal';
import { PlanChangeSimulator } from './components/PlanChangeSimulator';
import { ProjectPlanner } from './components/ProjectPlanner';
import { WorkloadHeatmap } from './components/WorkloadHeatmap';
import { AppProvider } from './context/AppContext';

const DashboardContent: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'planner' | 'heatmap' | 'simulator'>('planner');
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onNewProjectClick={() => setIsNewProjectModalOpen(true)}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {activeTab === 'planner' && <ProjectPlanner />}
        {activeTab === 'heatmap' && <WorkloadHeatmap />}
        {activeTab === 'simulator' && <PlanChangeSimulator />}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 py-6 text-center text-xs text-slate-500">
        <p>
          The Slot Finder MVP • Phân bổ nhân sự theo Sprint & Khả dụng tuần độc lập
        </p>
      </footer>

      <NewProjectModal
        isOpen={isNewProjectModalOpen}
        onClose={() => setIsNewProjectModalOpen(false)}
      />
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <DashboardContent />
    </AppProvider>
  );
}

