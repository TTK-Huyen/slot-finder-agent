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
      <div className="text-center py-16 text-slate-400">
        Chưa có dự án nào được chọn. Hãy tạo dự án mới!
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
        `✓ Đã tự động chọn và xếp xong ${res.successCount} nhân sự phù hợp nhất (công việc được chia đều nhất cho team)!`
      );
    } else if (res.unfulfilledCount > 0) {
      setAutoAssignNotice(
        `⚠️ Team hiện không có đủ người còn rảnh giờ để đáp ứng toàn bộ các vị trí còn thiếu.`
      );
    } else {
      setAutoAssignNotice(`Dự án đã đủ nhân sự!`);
    }

    setTimeout(() => setAutoAssignNotice(null), 5000);
  };

  // Auto assign for a specific requirement
  const handleAutoAssignSingleReq = (reqId: string) => {
    const ok = autoAssignRequirement(currentProject.id, reqId);
    if (ok) {
      setAutoAssignNotice(`✓ Đã tự động chọn người có thời gian làm việc phù hợp và chia đều việc nhất!`);
    } else {
      setAutoAssignNotice(`⚠️ Không tìm thấy người có đủ thời gian trống phù hợp cho vị trí này.`);
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
      <div className="bg-slate-800/60 border border-slate-700/80 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-semibold">
                {currentProject.client}
              </span>
              <span className="text-xs text-slate-400">• Dự án</span>
            </div>
            <h2 className="text-2xl font-bold text-white m-0">{currentProject.name}</h2>
            <div className="flex items-center gap-4 mt-2 text-xs text-slate-400">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-slate-400" />
                Thời gian:{' '}
                <strong className="text-slate-200">
                  {formatShortDate(currentProject.startDate)} đến {formatShortDate(currentProject.endDate)}
                </strong>
              </span>
              <span className="flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-slate-400" />
                Thời lượng: <strong className="text-slate-200">{projectWeeks.length} tuần</strong>
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div
              className={`text-xs px-3 py-1.5 rounded-full font-semibold flex items-center gap-1.5 ${
                isFullyStaffed
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : filledSlots > 0
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  : 'bg-slate-700/60 text-slate-400'
              }`}
            >
              {isFullyStaffed ? (
                <CheckCircle className="w-4 h-4 text-emerald-400" />
              ) : (
                <Users className="w-4 h-4" />
              )}
              <span>
                Nhân sự: {filledSlots}/{totalSlots} người
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
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-all"
                title="Ghi nhận nhân viên rời dự án và tìm người thay thế (UC03)"
              >
                <UserMinus className="w-4 h-4 text-rose-400" />
                <span>Ghi nhận rời dự án (UC03)</span>
              </button>
            )}
            <button
              onClick={() => setDelayModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-amber-600/20 hover:bg-amber-600/30 text-amber-200 border border-amber-500/30 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
              title="Điều chỉnh hạn dự án và phân bổ lại nhân sự (UC04)"
            >
              <Calendar className="w-4 h-4" />
              <span>Dự án trì hoãn (UC04)</span>
            </button>

            {/* BIG 1-CLICK AUTO-ASSIGN PROJECT BUTTON */}
            {!isFullyStaffed && (
              <button
                onClick={handleAutoAssignAll}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/25 flex items-center gap-2 cursor-pointer transition-all animate-pulse"
              >
                <Zap className="w-4 h-4 text-amber-300 fill-amber-300" />
                <span>Tự động xếp người cho cả dự án</span>
              </button>
            )}
          </div>
        </div>

        {/* Notice feedback */}
        {autoAssignNotice && (
          <div className="mt-4 p-3 rounded-xl bg-slate-900 border border-emerald-500/40 text-xs text-emerald-300 animate-fadeIn flex items-center justify-between">
            <span>{autoAssignNotice}</span>
            <button
              onClick={() => setAutoAssignNotice(null)}
              className="text-slate-500 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Staffing Requirements Panel */}
      <div className="bg-slate-800/40 border border-slate-700/70 rounded-2xl p-6 shadow-lg space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-700/60 gap-3">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2 m-0">
              <Users className="w-5 h-5 text-indigo-400" />
              Kế hoạch Nhân sự theo Vai trò
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Hệ thống tự động tính toán và chọn người có giờ trống phù hợp, đảm bảo khối lượng công việc được chia đều nhất cho cả team.
            </p>
          </div>

          <button
            onClick={() => setIsAddingReq(!isAddingReq)}
            className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-indigo-600/20 transition-all cursor-pointer self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm vai trò cần</span>
          </button>
        </div>

        {/* Add Requirement Inline Form */}
        {isAddingReq && (
          <div className="p-4 rounded-xl bg-slate-900/90 border border-indigo-500/40 animate-fadeIn">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-indigo-300">
                Khai báo vai trò và thời gian cần cho dự án
              </span>
              <button
                onClick={() => setIsAddingReq(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Vai trò</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as Role)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white"
                >
                  <option value="Developer">Developer</option>
                  <option value="QA">QA</option>
                  <option value="Business Analyst">Business Analyst</option>
                  <option value="Project Manager">Project Manager</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Cấp độ</label>
                <select
                  value={newSeniority}
                  onChange={(e) => setNewSeniority(e.target.value as Seniority)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white"
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
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Số giờ cần (giờ/người/tuần)</label>
                <input
                  type="number"
                  min="5"
                  max="40"
                  step="5"
                  value={newHours}
                  onChange={(e) => setNewHours(Number(e.target.value))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white"
                />
              </div>
            </div>

            <div className="mt-3.5 flex justify-end gap-2 text-xs">
              <button
                onClick={() => setIsAddingReq(false)}
                className="px-3.5 py-1.5 rounded-lg bg-slate-800 text-slate-400 hover:bg-slate-700"
              >
                Hủy
              </button>
              <button
                onClick={handleCreateRequirement}
                className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold cursor-pointer"
              >
                Lưu yêu cầu
              </button>
            </div>
          </div>
        )}

        {/* Requirements Rows */}
        {projectReqs.length === 0 ? (
          <div className="text-center py-10 text-slate-500 text-xs border border-dashed border-slate-700/60 rounded-xl">
            Dự án này chưa có yêu cầu nhân lực nào. Nhấn "Thêm vai trò cần" để bắt đầu.
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
                  className="p-4 rounded-xl border border-slate-700/60 bg-slate-900/40 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs transition-all hover:border-slate-600"
                >
                  {/* Requirement details */}
                  <div className="flex items-center gap-3 flex-wrap">
                    <span
                      className={`px-3 py-1.5 rounded-lg font-bold text-xs ${
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
                            className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-950/40 border border-emerald-500/40 text-slate-200"
                          >
                            <span>{emp.avatar}</span>
                            <span className="font-semibold text-emerald-300">{emp.name}</span>
                            <span className="text-[10px] text-slate-400">({asg.allocatedHoursPerWeek}h/tuần)</span>
                            <button
                              onClick={() =>
                                setDepartureModalState({
                                  isOpen: true,
                                  project: currentProject,
                                  employee: emp,
                                })
                              }
                              title="Ghi nhận nhân viên rời dự án (UC03)"
                              className="p-0.5 text-slate-400 hover:text-amber-400 rounded transition-colors cursor-pointer"
                            >
                              <UserMinus className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => unassignEmployee(asg.id)}
                              title="Hủy gán người này"
                              className="p-0.5 text-slate-400 hover:text-rose-400 rounded transition-colors cursor-pointer"
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
                          className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold flex items-center gap-1.5 shadow-md shadow-emerald-600/20 cursor-pointer transition-all"
                        >
                          <Zap className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
                          <span>Tự động chọn {slotsLeft} người</span>
                        </button>

                        <button
                          onClick={() => setModalState({ isOpen: true, requirement: req })}
                          title="Xem chi tiết các phương án khác"
                          className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors cursor-pointer"
                        >
                          Xem thêm
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1 font-medium">
                          <CheckCircle className="w-3.5 h-3.5" />
                          Đã xếp xong (Chia đều việc nhất)
                        </span>

                        <button
                          onClick={() => setModalState({ isOpen: true, requirement: req })}
                          title="Đổi phương án khác"
                          className="p-1.5 text-slate-400 hover:text-indigo-300 rounded hover:bg-slate-800 transition-colors cursor-pointer"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}

                    <button
                      onClick={() => removeRequirement(req.id)}
                      title="Xóa yêu cầu"
                      className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
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
