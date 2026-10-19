import React, { useState } from 'react';
import { Header } from './components/Header';
import { NewProjectModal } from './components/NewProjectModal';
import { ProjectPlanner } from './components/ProjectPlanner';
import { WorkloadHeatmap } from './components/WorkloadHeatmap';
import { AppProvider } from './context/AppContext';

const DashboardContent: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'planner' | 'heatmap'>('planner');
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 flex flex-col">
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onNewProjectClick={() => setIsNewProjectModalOpen(true)}
      />
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {activeTab === 'planner' && <ProjectPlanner />}
        {activeTab === 'heatmap' && <WorkloadHeatmap />}
      </main>
      <footer className="border-t border-gray-200 py-6 text-center text-xs text-gray-500">
        <p>The Slot Finder MVP • Weekly capacity and workload planning</p>
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

