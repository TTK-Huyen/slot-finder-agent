import React, { useState } from 'react';
import {
  Calendar,
  Check,
  CheckCircle,
  Clock,
  Layers,
  Plus,
  Sparkles,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import type { ProjectSprint, Role, Seniority, SprintStaffingRequirement } from '../types';
import { formatShortDate, getWeeksCovered } from '../utils/dateUtils';
import { SlotFinderModal } from './SlotFinderModal';

export const ProjectPlanner: React.FC = () => {
  const {
    projects,
    selectedProjectId,
    sprints,
    requirements,
    assignments,
    employees,
    addRequirement,
    removeRequirement,
    unassignEmployee,
  } = useApp();

  const currentProject = projects.find((p) => p.id === selectedProjectId) || projects[0];
  const projectSprints = sprints.filter((s) => s.projectId === currentProject?.id);

  // Modal state for Slot Finder
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    requirement: SprintStaffingRequirement | null;
    sprint: ProjectSprint | null;
  }>({
    isOpen: false,
    requirement: null,
    sprint: null,
  });

  // State for Add Requirement dialog per sprint
  const [addingReqSprintId, setAddingReqSprintId] = useState<string | null>(null);
  const [newRole, setNewRole] = useState<Role>('Developer');
  const [newSeniority, setNewSeniority] = useState<Seniority>('Senior');
  const [newCount, setNewCount] = useState<number>(1);
  const [newHours, setNewHours] = useState<number>(20);

  if (!currentProject) {
    return (
      <div className="text-center py-16 text-slate-400">
        Chưa có dự án nào được chọn. Hãy tạo dự án mới!
      </div>
    );
  }

  const handleOpenSlotFinder = (
    req: SprintStaffingRequirement,
    sprint: ProjectSprint
  ) => {
    setModalState({
      isOpen: true,
      requirement: req,
      sprint,
    });
  };

  const handleCreateRequirement = (sprintId: string) => {
    addRequirement(sprintId, newRole, newSeniority, newCount, newHours);
    setAddingReqSprintId(null);
    // Reset to defaults
    setNewCount(1);
    setNewHours(20);
  };

  return (
    <div className="space-y-6">
      {/* Project Overview Card */}
      <div className="bg-slate-800/60 border border-slate-700/80 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-semibold">
                {currentProject.client}
              </span>
              <span className="text-xs text-slate-400">• Dự án khách hàng</span>
            </div>
            <h2 className="text-2xl font-bold text-white m-0">{currentProject.name}</h2>
            <div className="flex items-center gap-4 mt-2 text-xs text-slate-400">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-slate-400" />
                Thời gian:{' '}
                <strong className="text-slate-200">
                  {currentProject.startDate} đến {currentProject.endDate}
                </strong>
              </span>
              <span className="flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-slate-400" />
                Quy mô: <strong className="text-slate-200">{projectSprints.length} Sprints</strong>{' '}
                (2 tuần/sprint)
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`px-3 py-1 rounded-full text-xs font-semibold ${
                currentProject.status === 'Active'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
              }`}
            >
              {currentProject.status === 'Active' ? 'Đang thực hiện' : 'Đang lên kế hoạch'}
            </span>
          </div>
        </div>
      </div>

      {/* Sprints List */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-white flex items-center gap-2 m-0">
            <Layers className="w-5 h-5 text-indigo-400" />
            Danh sách Sprints & Kế hoạch nhân sự
          </h3>
          <span className="text-xs text-slate-400">
            Mỗi sprint kéo dài 2 tuần - Nhân sự được phân công theo số giờ cam kết/tuần
          </span>
        </div>

        {projectSprints.map((sprint) => {
          const sprintReqs = requirements.filter((r) => r.sprintId === sprint.id);
          const sprintWeeks = getWeeksCovered(sprint.startDate, sprint.endDate);

          // Calculate total slots & filled slots
          const totalSlots = sprintReqs.reduce((acc, r) => acc + r.requiredCount, 0);
          const filledSlots = sprintReqs.reduce((acc, r) => {
            const assigned = assignments.filter((a) => a.requirementId === r.id).length;
            return acc + Math.min(assigned, r.requiredCount);
          }, 0);

          const isFullyStaffed = totalSlots > 0 && filledSlots === totalSlots;

          return (
            <div
              key={sprint.id}
              className="bg-slate-800/40 border border-slate-700/70 rounded-2xl p-6 transition-all hover:border-slate-600 shadow-lg"
            >
              {/* Sprint Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-4 border-b border-slate-700/60 gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-slate-700/60 border border-slate-600 flex items-center justify-center font-bold text-indigo-300 text-sm">
                    S{sprint.sprintNumber}
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-white m-0">{sprint.name}</h4>
                    <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                      <span>
                        {formatShortDate(sprint.startDate)} – {formatShortDate(sprint.endDate)}
                      </span>
                      <span>•</span>
                      <span>{sprintWeeks.map(formatShortDate).join(' & ')} (2 tuần lịch)</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div
                    className={`text-xs px-3 py-1 rounded-full font-semibold flex items-center gap-1.5 ${
                      isFullyStaffed
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : filledSlots > 0
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        : 'bg-slate-700/60 text-slate-400'
                    }`}
                  >
                    {isFullyStaffed ? (
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Users className="w-3.5 h-3.5" />
                    )}
                    <span>
                      Đã phân bổ: {filledSlots}/{totalSlots} nhân sự
                    </span>
                  </div>

                  <button
                    onClick={() =>
                      setAddingReqSprintId(
                        addingReqSprintId === sprint.id ? null : sprint.id
                      )
                    }
                    className="px-3 py-1.5 rounded-lg bg-slate-700/70 hover:bg-slate-600 text-slate-200 text-xs font-medium transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Thêm vị trí cần</span>
                  </button>
                </div>
              </div>

              {/* Add Requirement Form Inline */}
              {addingReqSprintId === sprint.id && (
                <div className="mb-4 p-4 rounded-xl bg-slate-900/80 border border-indigo-500/40 animate-fadeIn">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold text-indigo-300">
                      Thêm yêu cầu nhân lực mới cho {sprint.name}
                    </span>
                    <button
                      onClick={() => setAddingReqSprintId(null)}
                      className="text-slate-400 hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                    <div>
                      <label className="block text-slate-400 mb-1">Vai trò (Role)</label>
                      <select
                        value={newRole}
                        onChange={(e) => setNewRole(e.target.value as Role)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white"
                      >
                        <option value="Developer">Developer</option>
                        <option value="QA">QA</option>
                        <option value="Business Analyst">Business Analyst</option>
                        <option value="Project Manager">Project Manager</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-slate-400 mb-1">Cấp độ (Seniority)</label>
                      <select
                        value={newSeniority}
                        onChange={(e) => setNewSeniority(e.target.value as Seniority)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white"
                      >
                        <option value="Lead">Lead</option>
                        <option value="Senior">Senior</option>
                        <option value="Mid">Mid</option>
                        <option value="Junior">Junior</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-slate-400 mb-1">Số lượng người cần</label>
                      <input
                        type="number"
                        min="1"
                        max="10"
                        value={newCount}
                        onChange={(e) => setNewCount(Number(e.target.value))}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-400 mb-1">Số giờ/người/tuần</label>
                      <input
                        type="number"
                        min="5"
                        max="40"
                        step="5"
                        value={newHours}
                        onChange={(e) => setNewHours(Number(e.target.value))}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white"
                      />
                    </div>
                  </div>

                  <div className="mt-3 flex justify-end gap-2">
                    <button
                      onClick={() => setAddingReqSprintId(null)}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-400 text-xs hover:bg-slate-700"
                    >
                      Hủy
                    </button>
                    <button
                      onClick={() => handleCreateRequirement(sprint.id)}
                      className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
                    >
                      Lưu yêu cầu
                    </button>
                  </div>
                </div>
              )}

              {/* Requirements Rows */}
              {sprintReqs.length === 0 ? (
                <div className="text-center py-6 text-slate-500 text-xs border border-dashed border-slate-700/60 rounded-xl">
                  Sprint này chưa có yêu cầu nhân lực nào. Nhấn "Thêm vị trí cần" để thiết lập.
                </div>
              ) : (
                <div className="space-y-3">
                  {sprintReqs.map((req) => {
                    const reqAssignments = assignments.filter((a) => a.requirementId === req.id);
                    const isFulfilled = reqAssignments.length >= req.requiredCount;
                    const slotsLeft = req.requiredCount - reqAssignments.length;

                    return (
                      <div
                        key={req.id}
                        className="p-3.5 rounded-xl border border-slate-700/60 bg-slate-900/40 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs"
                      >
                        {/* Requirement details */}
                        <div className="flex items-center gap-3">
                          <span
                            className={`px-2.5 py-1 rounded-lg font-semibold ${
                              req.role === 'Developer'
                                ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                                : req.role === 'QA'
                                ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                                : req.role === 'Business Analyst'
                                ? 'bg-blue-500/15 text-blue-300 border border-blue-500/30'
                                : 'bg-purple-500/15 text-purple-300 border border-purple-500/30'
                            }`}
                          >
                            {req.role}
                          </span>

                          <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 font-medium">
                            {req.seniority}
                          </span>

                          <span className="flex items-center gap-1 text-slate-300">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            <strong>{req.hoursPerWeek}h</strong>/người/tuần
                          </span>

                          <span className="text-slate-400">
                            (Cần {req.requiredCount} người)
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
                                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-900/40 border border-indigo-500/40 text-slate-200"
                                >
                                  <span>{emp.avatar}</span>
                                  <span className="font-medium">{emp.name}</span>
                                  <button
                                    onClick={() => unassignEmployee(asg.id)}
                                    title="Hủy phân công"
                                    className="p-0.5 text-slate-400 hover:text-rose-400 rounded transition-colors"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              );
                            })}
                          </div>

                          {/* Find Slot Button */}
                          {!isFulfilled ? (
                            <button
                              onClick={() => handleOpenSlotFinder(req, sprint)}
                              className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold flex items-center gap-1.5 shadow-md shadow-indigo-600/20 cursor-pointer animate-pulse"
                            >
                              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                              <span>Tìm người ({slotsLeft} slot trống)</span>
                            </button>
                          ) : (
                            <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1 font-medium">
                              <Check className="w-3.5 h-3.5" />
                              Đã đủ người
                            </span>
                          )}

                          <button
                            onClick={() => removeRequirement(req.id)}
                            title="Xóa yêu cầu"
                            className="p-1.5 text-slate-500 hover:text-rose-400 rounded hover:bg-slate-800 transition-colors"
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
          );
        })}
      </div>

      {/* The Slot Finder Modal */}
      <SlotFinderModal
        isOpen={modalState.isOpen}
        onClose={() => setModalState({ isOpen: false, requirement: null, sprint: null })}
        requirement={modalState.requirement}
        sprint={modalState.sprint}
      />
    </div>
  );
};
