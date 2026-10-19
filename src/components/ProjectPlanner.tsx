import React, { useState } from 'react';
import {
  Calendar,
  CheckCircle,
  Clock,
  Layers,
  Plus,
  RefreshCw,
  Trash2,
  UserMinus,
  Users,
  X,
  Zap,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import type { Employee, Project, ProjectStaffingRequirement, Role, Seniority } from '../types';
import { formatShortDate, getWeeksCovered } from '../utils/dateUtils';
import { DepartureReallocationModal } from './DepartureReallocationModal';
import { DelayReallocationModal } from './DelayReallocationModal';
import { SlotFinderModal } from './SlotFinderModal';

export const ProjectPlanner: React.FC = () => {
  const {
    projects,
    selectedProjectId,
    requirements,
    assignments,
    employees,
    addRequirement,
    removeRequirement,
    unassignEmployee,
    autoAssignRequirement,
    autoAssignProject,
  } = useApp();

  const currentProject = projects.find((p) => p.id === selectedProjectId) || projects[0];

  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    requirement: ProjectStaffingRequirement | null;
  }>({
    isOpen: false,
    requirement: null,
  });

  const [departureModalState, setDepartureModalState] = useState<{
    isOpen: boolean;
    project: Project | null;
    employee: Employee | null;
  }>({
    isOpen: false,
    project: null,
    employee: null,
  });

  const [isAddingReq, setIsAddingReq] = useState(false);
  const [newRole, setNewRole] = useState<Role>('Developer');
  const [newSeniority, setNewSeniority] = useState<Seniority>('Senior');
  const [newCount, setNewCount] = useState<number>(2);
  const [newHours, setNewHours] = useState<number>(20);
  const [autoAssignNotice, setAutoAssignNotice] = useState<string | null>(null);
  const [delayModalOpen, setDelayModalOpen] = useState(false);

  if (!currentProject) {
    return (
      <div className="text-center py-16 text-gray-500">
        No project selected. Create a new project to get started!
      </div>
    );
  }

  const projectReqs = requirements.filter((r) => r.projectId === currentProject.id);
  const projectWeeks = getWeeksCovered(currentProject.startDate, currentProject.endDate);

  const totalSlots = projectReqs.reduce((acc, r) => acc + r.requiredCount, 0);
  const filledSlots = projectReqs.reduce((acc, r) => {
    const assigned = assignments.filter((a) => a.requirementId === r.id).length;
    return acc + Math.min(assigned, r.requiredCount);
  }, 0);

  const isFullyStaffed = totalSlots > 0 && filledSlots === totalSlots;

  // Auto assign all open slots in project
  const handleAutoAssignAll = () => {
    const res = autoAssignProject(currentProject.id);
    if (res.successCount > 0) {
      setAutoAssignNotice(
        `Automatically assigned ${res.successCount} best-fit team members with the most balanced workload.`
      );
    } else if (res.unfulfilledCount > 0) {
      setAutoAssignNotice(
        `The team does not have enough available hours to fill all open positions.`
      );
    } else {
      setAutoAssignNotice(`The project is fully staffed!`);
    }

    setTimeout(() => setAutoAssignNotice(null), 5000);
  };

  // Auto assign for a specific requirement
  const handleAutoAssignSingleReq = (reqId: string) => {
    const ok = autoAssignRequirement(currentProject.id, reqId);
    if (ok) {
      setAutoAssignNotice(`Automatically selected the best available, workload-balanced team member.`);
    } else {
      setAutoAssignNotice(`No team member has enough availability for this role.`);
    }
    setTimeout(() => setAutoAssignNotice(null), 4000);
  };

  const handleCreateRequirement = () => {
    addRequirement(currentProject.id, newRole, newSeniority, newCount, newHours);
    setIsAddingReq(false);
    setNewCount(1);
    setNewHours(20);
  };

  return (
    <div className="space-y-6">
      {/* Project Overview Card */}
      <div className="bg-gray-50 border border-gray-200 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-gray-100/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-gray-100/20 text-gray-700 border border-gray-300/30 font-semibold">
                {currentProject.client}
              </span>
              <span className="text-xs text-gray-500">- Project</span>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 m-0">{currentProject.name}</h2>
            <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-gray-500" />
                Timeline:{' '}
                <strong className="text-gray-900">
                  {formatShortDate(currentProject.startDate)} to {formatShortDate(currentProject.endDate)}
                </strong>
              </span>
              <span className="flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-gray-500" />
                Duration: <strong className="text-gray-900">{projectWeeks.length} weeks</strong>
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div
              className={`text-xs px-3 py-1.5 rounded-full font-semibold flex items-center gap-1.5 ${
                isFullyStaffed
                  ? 'bg-gray-100 text-gray-700 border border-gray-300'
                  : filledSlots > 0
                  ? 'bg-gray-100 text-gray-700 border border-gray-300'
                  : 'bg-gray-100 text-gray-500'
              }`}
            >
              {isFullyStaffed ? (
                <CheckCircle className="w-4 h-4 text-gray-700" />
              ) : (
                <Users className="w-4 h-4" />
              )}
              <span>
                Staffing: {filledSlots}/{totalSlots} people
              </span>
            </div>

            {/* UC03: Reallocate on Departure button */}
            {filledSlots > 0 && (
              <button
                onClick={() =>
                  setDepartureModalState({
                    isOpen: true,
                    project: currentProject,
                    employee: null,
                  })
                }
                className="px-3.5 py-2 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-900 border border-gray-200 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-all"
                title="Record employee departure and find a replacement (UC03)"
              >
                <UserMinus className="w-4 h-4 text-gray-700" />
                <span>Record departure (UC03)</span>
              </button>
            )}
            <button
              onClick={() => setDelayModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-gray-100 hover:bg-gray-100 text-gray-700 border border-gray-300 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
              title="Adjust the project deadline and reallocate staff (UC04)"
            >
              <Calendar className="w-4 h-4" />
              <span>Delayed project (UC04)</span>
            </button>

            {/* BIG 1-CLICK AUTO-ASSIGN PROJECT BUTTON */}
            {!isFullyStaffed && (
              <button
                onClick={handleAutoAssignAll}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-gray-900 to-gray-900 hover:from-gray-800 hover:to-gray-800 text-white font-bold text-xs shadow-lg shadow-gray-900/25 flex items-center gap-2 cursor-pointer transition-all animate-pulse"
              >
                <Zap className="w-4 h-4 text-gray-700 fill-gray-700" />
                <span>Auto-staff project</span>
              </button>
            )}
          </div>
        </div>

        {/* Notice feedback */}
        {autoAssignNotice && (
          <div className="mt-4 p-3 rounded-xl bg-white border border-gray-300 text-xs text-gray-700 animate-fadeIn flex items-center justify-between">
            <span>{autoAssignNotice}</span>
            <button
              onClick={() => setAutoAssignNotice(null)}
              className="text-gray-500 hover:text-gray-900"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Staffing Requirements Panel */}
      <div className="bg-gray-50 border border-gray-200 rounded-2xl p-6 shadow-lg space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-gray-200 gap-3">
          <div>
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2 m-0">
              <Users className="w-5 h-5 text-gray-700" />
              Role staffing plan
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              The system automatically selects available people and balances workload across the team.
            </p>
          </div>

          <button
            onClick={() => setIsAddingReq(!isAddingReq)}
            className="px-3.5 py-2 rounded-xl bg-gray-900 hover:bg-gray-800 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-gray-900/20 transition-all cursor-pointer self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Add role requirement</span>
          </button>
        </div>

        {/* Add Requirement Inline Form */}
        {isAddingReq && (
          <div className="p-4 rounded-xl bg-white border border-gray-300/40 animate-fadeIn">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-gray-700">
                Define the role and time needed for this project
              </span>
              <button
                onClick={() => setIsAddingReq(false)}
                className="text-gray-500 hover:text-gray-900"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <label className="block text-gray-500 mb-1">Role</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as Role)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-gray-900"
                >
                  <option value="Developer">Developer</option>
                  <option value="QA">QA</option>
                  <option value="Business Analyst">Business Analyst</option>
                  <option value="Project Manager">Project Manager</option>
                </select>
              </div>

              <div>
                <label className="block text-gray-500 mb-1">Seniority</label>
                <select
                  value={newSeniority}
                  onChange={(e) => setNewSeniority(e.target.value as Seniority)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-gray-900"
                >
                  <option value="Lead">Lead</option>
                  <option value="Senior">Senior</option>
                  <option value="Mid">Mid</option>
                  <option value="Junior">Junior</option>
                </select>
              </div>

              <div>
                <label className="block text-gray-500 mb-1">People needed</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={newCount}
                  onChange={(e) => setNewCount(Number(e.target.value))}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-gray-900"
                />
              </div>

              <div>
                <label className="block text-gray-500 mb-1">Hours needed (per person/week)</label>
                <input
                  type="number"
                  min="5"
                  max="40"
                  step="5"
                  value={newHours}
                  onChange={(e) => setNewHours(Number(e.target.value))}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-gray-900"
                />
              </div>
            </div>

            <div className="mt-3.5 flex justify-end gap-2 text-xs">
              <button
                onClick={() => setIsAddingReq(false)}
                className="px-3.5 py-1.5 rounded-lg bg-gray-50 text-gray-500 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateRequirement}
                className="px-4 py-1.5 rounded-lg bg-gray-900 hover:bg-gray-800 text-white font-semibold cursor-pointer"
              >
                Save requirement
              </button>
            </div>
          </div>
        )}

        {/* Requirements Rows */}
        {projectReqs.length === 0 ? (
          <div className="text-center py-10 text-gray-500 text-xs border border-dashed border-gray-200 rounded-xl">
            No staffing requirements yet. Click "Add role requirement" to begin.
          </div>
        ) : (
          <div className="space-y-3">
            {projectReqs.map((req) => {
              const reqAssignments = assignments.filter((a) => a.requirementId === req.id);
              const isFulfilled = reqAssignments.length >= req.requiredCount;
              const slotsLeft = req.requiredCount - reqAssignments.length;

              return (
                <div
                  key={req.id}
                  className="p-4 rounded-xl border border-gray-200 bg-white flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs transition-all hover:border-gray-200"
                >
                  {/* Requirement details */}
                  <div className="flex items-center gap-3 flex-wrap">
                    <span
                      className={`px-3 py-1.5 rounded-lg font-bold text-xs ${
                        req.role === 'Developer'
                          ? 'bg-gray-100 text-gray-700 border border-gray-300'
                          : req.role === 'QA'
                          ? 'bg-gray-100 text-gray-700 border border-gray-300'
                          : req.role === 'Business Analyst'
                          ? 'bg-gray-100/15 text-gray-700 border border-gray-300/30'
                          : 'bg-gray-100 text-gray-700 border border-gray-300'
                      }`}
                    >
                      {req.role}
                    </span>

                    <span className="px-2 py-0.5 rounded bg-gray-50 text-gray-700 border border-gray-200 font-medium">
                      {req.seniority}
                    </span>

                    <span className="flex items-center gap-1 text-gray-700">
                      <Clock className="w-3.5 h-3.5 text-gray-500" />
                      <strong>{req.hoursPerWeek}h</strong>/people/weeks
                    </span>

                    <span className="text-gray-500">
                      (Needed {req.requiredCount} people)
                    </span>
                  </div>

                  {/* Assigned Employees & Action */}
                  <div className="flex items-center gap-2 flex-wrap justify-between md:justify-end">
                    {/* List of assigned people */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {reqAssignments.map((asg) => {
                        const emp = employees.find((e) => e.id === asg.employeeId);
                        if (!emp) return null;
                        return (
                          <div
                            key={asg.id}
                            className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-gray-100 border border-gray-300 text-gray-900"
                          >
                            <span>{emp.avatar}</span>
                            <span className="font-semibold text-gray-700">{emp.name}</span>
                            <span className="text-[10px] text-gray-500">({asg.allocatedHoursPerWeek}h/weeks)</span>
                            <button
                              onClick={() =>
                                setDepartureModalState({
                                  isOpen: true,
                                  project: currentProject,
                                  employee: emp,
                                })
                              }
                              title="Record employee departure (UC03)"
                              className="p-0.5 text-gray-500 hover:text-gray-700 rounded transition-colors cursor-pointer"
                            >
                              <UserMinus className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => unassignEmployee(asg.id)}
                              title="Unassign this person"
                              className="p-0.5 text-gray-500 hover:text-gray-700 rounded transition-colors cursor-pointer"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        );
                      })}
                    </div>

                    {/* Auto-assign or Manual adjust */}
                    {!isFulfilled ? (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleAutoAssignSingleReq(req.id)}
                          className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-gray-900 to-gray-900 hover:from-gray-800 hover:to-gray-800 text-white font-semibold flex items-center gap-1.5 shadow-md shadow-gray-900/20 cursor-pointer transition-all"
                        >
                          <Zap className="w-3.5 h-3.5 text-gray-700 fill-gray-700" />
                          <span>Auto-select {slotsLeft} people</span>
                        </button>

                        <button
                          onClick={() => setModalState({ isOpen: true, requirement: req })}
                          title="View other options"
                          className="px-2.5 py-1.5 rounded-lg bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200 transition-colors cursor-pointer"
                        >
                          View more
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-1 rounded-lg bg-gray-100 text-gray-700 border border-gray-300 flex items-center gap-1 font-medium">
                          <CheckCircle className="w-3.5 h-3.5" />
                          Assigned (best balance)
                        </span>

                        <button
                          onClick={() => setModalState({ isOpen: true, requirement: req })}
                          title="Choose another option"
                          className="p-1.5 text-gray-500 hover:text-gray-700 rounded hover:bg-gray-50 transition-colors cursor-pointer"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}

                    <button
                      onClick={() => removeRequirement(req.id)}
                      title="Delete requirement"
                      className="p-1.5 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal for optional detailed inspection or manual swap */}
      <SlotFinderModal
        isOpen={modalState.isOpen}
        onClose={() => setModalState({ isOpen: false, requirement: null })}
        requirement={modalState.requirement}
        project={currentProject}
      />
      <DepartureReallocationModal
        isOpen={departureModalState.isOpen}
        onClose={() => setDepartureModalState({ isOpen: false, project: null, employee: null })}
        preselectedProject={departureModalState.project}
        preselectedEmployee={departureModalState.employee}
      />
      <DelayReallocationModal
        isOpen={delayModalOpen}
        onClose={() => setDelayModalOpen(false)}
        project={currentProject}
      />
    </div>
  );
};
