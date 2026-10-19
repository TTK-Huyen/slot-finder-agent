import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Sparkles,
  UserMinus,
  UserX,
  X,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import {
  applyDepartureReallocation,
  planDepartureReallocation,
} from '../engine/departureReallocator';
import type { Employee, Project } from '../types';
import { formatDate, formatShortDate, getMonday, parseDate } from '../utils/dateUtils';

interface DepartureModalProps {
  isOpen: boolean;
  onClose: () => void;
  preselectedProject?: Project | null;
  preselectedEmployee?: Employee | null;
}

export const DepartureReallocationModal: React.FC<DepartureModalProps> = ({
  isOpen,
  onClose,
  preselectedProject,
  preselectedEmployee,
}) => {
  const {
    projects,
    employees,
    requirements,
    assignments,
    capacities,
    allowHigherSeniority,
  } = useApp();

  const [selectedProjectId, setSelectedProjectId] = useState<string>(
    preselectedProject?.id || projects[0]?.id || ''
  );

  const activeProject = projects.find((p) => p.id === selectedProjectId) || projects[0];

  // Assigned employees in this project
  const projectAssignedEmployees = useMemo(() => {
    if (!activeProject) return [];
    const empIds = new Set(
      assignments.filter((a) => a.projectId === activeProject.id).map((a) => a.employeeId)
    );
    return employees.filter((e) => empIds.has(e.id));
  }, [assignments, activeProject, employees]);

  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>(
    preselectedEmployee?.id || projectAssignedEmployees[0]?.id || ''
  );

  // Default departure date: start of next week or project start date
  const [departureDate, setDepartureDate] = useState<string>(() => {
    if (!activeProject) return formatDate(new Date());
    const midProjectDate = formatDate(getMonday(parseDate(activeProject.startDate)));
    return midProjectDate;
  });

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Sync state if preselected values change
  React.useEffect(() => {
    if (preselectedProject) setSelectedProjectId(preselectedProject.id);
  }, [preselectedProject]);

  React.useEffect(() => {
    if (preselectedEmployee) setSelectedEmployeeId(preselectedEmployee.id);
    else if (projectAssignedEmployees.length > 0 && !projectAssignedEmployees.some((e) => e.id === selectedEmployeeId)) {
      setSelectedEmployeeId(projectAssignedEmployees[0].id);
    }
  }, [preselectedEmployee, projectAssignedEmployees]);

  // Main flow 2-6: Compute departure reallocation plan
  const plan = useMemo(() => {
    if (!activeProject || !selectedEmployeeId || !departureDate) return null;
    return planDepartureReallocation({
      projectId: activeProject.id,
      departingEmployeeId: selectedEmployeeId,
      departureDate,
      allProjects: projects,
      allRequirements: requirements,
      allAssignments: assignments,
      allEmployees: employees,
      capacities,
      allowHigherSeniority,
    });
  }, [
    activeProject,
    selectedEmployeeId,
    departureDate,
    projects,
    requirements,
    assignments,
    employees,
    capacities,
    allowHigherSeniority,
  ]);

  if (!isOpen || !activeProject) return null;

  // Main flow 7 & 8: PM approves reallocation plan
  const handleApprove = () => {
    if (!plan || !plan.isFeasible) return;

    // Alternative Flow A3 check inside applyDepartureReallocation
    const result = applyDepartureReallocation(
      plan,
      assignments,
      capacities,
      projects,
      employees
    );

    if (result.success && result.updatedAssignments) {
      // Save updated assignments via direct localStorage sync in AppContext
      localStorage.setItem('the_slot_finder_simple_v2_asg', JSON.stringify(result.updatedAssignments));
      window.location.reload(); // Simple refresh to apply verified state cleanly
    } else {
      // Flow A3: Inform PM that data changed before saving
      setErrorMessage(result.reason || 'Dữ liệu thay đổi trước khi lưu. Không thể hoàn tất phân công.');
    }
  };

  // Alternative Flow A2: PM rejects plan
  const handleReject = () => {
    // No changes are saved to assignments
    onClose();
  };

  const departingEmp = employees.find((e) => e.id === selectedEmployeeId);
  const replacementCombo = plan?.proposedReplacement;
  const replacementEmp = replacementCombo?.employees[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 border-b border-slate-800 bg-slate-800/50 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <UserMinus className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white m-0">
                  Điều chuyển Nhân sự khi Rời Dự án (UC03)
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  UC03
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Tự động tìm kiếm và đề xuất người thay thế cân bằng tải khi có nhân sự rời dự án.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs flex-1">
          {/* Main flow 1: PM selects project, departing employee, departure date */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-800/40 p-4 rounded-xl border border-slate-700/60">
            <div>
              <label className="block text-slate-400 font-semibold mb-1">Dự án</label>
              <select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white"
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1">Nhân viên rời đi</label>
              <select
                value={selectedEmployeeId}
                onChange={(e) => setSelectedEmployeeId(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white"
              >
                {projectAssignedEmployees.length === 0 ? (
                  <option value="">(Chưa có nhân sự nào)</option>
                ) : (
                  projectAssignedEmployees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} ({emp.role})
                    </option>
                  ))
                )}
              </select>
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1">Ngày rời dự án</label>
              <input
                type="date"
                value={departureDate}
                min={activeProject.startDate}
                max={activeProject.endDate}
                onChange={(e) => setDepartureDate(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white"
              />
            </div>
          </div>

          {/* Error / Alert Message (Alternative Flow A3) */}
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-400" />
              <div>
                <strong className="block font-semibold">Cảnh báo:</strong>
                <span>{errorMessage}</span>
              </div>
            </div>
          )}

          {/* Reallocation Plan Results */}
          {plan && (
            <div className="space-y-4">
              {/* Departing Summary */}
              <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-700/80 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl p-1 bg-slate-800 rounded-lg">
                    {departingEmp?.avatar || '👤'}
                  </span>
                  <div>
                    <div className="font-bold text-white text-sm">
                      {plan.departingEmployeeName}
                    </div>
                    <div className="text-slate-400 text-[11px]">
                      Vị trí: {plan.role} ({plan.seniority}) • Cần thay thế: <strong>{plan.hoursPerWeek}h/tuần</strong>
                    </div>
                  </div>
                </div>

                <div className="text-right text-slate-400 text-[11px]">
                  <div>Từ ngày: <strong className="text-white">{formatShortDate(plan.departureDate)}</strong></div>
                  <div>Thời gian ảnh hưởng: <strong className="text-rose-400">{plan.affectedWeeks.length} tuần</strong></div>
                </div>
              </div>

              {/* Main flow 6: Proposed Replacement */}
              {plan.isFeasible && replacementEmp && replacementCombo ? (
                <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-950/30 via-slate-900 to-slate-900 border border-emerald-500/40 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs uppercase tracking-wider font-bold text-emerald-400 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                      Phương án thay thế đề xuất (Tối ưu cân bằng tải team)
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold">
                      Khả thi 100%
                    </span>
                  </div>

                  <div className="p-3 bg-slate-900/90 rounded-xl border border-slate-700/80 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl p-1 bg-slate-800 rounded-lg">
                        {replacementEmp.avatar}
                      </span>
                      <div>
                        <div className="font-bold text-white text-sm">
                          {replacementEmp.name}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {replacementEmp.role} • {replacementEmp.seniority}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-emerald-400 font-bold">
                        Bận rộn dự kiến: {replacementCombo.projectedWorkloads[0]?.averageProjectedUtilization}%
                      </div>
                      <div className="text-[10px] text-slate-500">
                        Độ lệch tải toàn team: {replacementCombo.averageImbalance}% (Thấp nhất)
                      </div>
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-400 leading-relaxed flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                    <span>
                      Nhân viên này có đủ giờ làm trống trong suốt {plan.affectedWeeks.length} tuần còn lại và không bị vượt quá 100% công suất.
                    </span>
                  </div>
                </div>
              ) : (
                /* Alternative flow A1: No feasible candidate */
                <div className="p-6 rounded-xl border border-dashed border-rose-500/40 bg-rose-500/10 text-center space-y-2">
                  <UserX className="w-10 h-10 text-rose-400 mx-auto" />
                  <h4 className="text-sm font-bold text-rose-300 m-0">
                    Không tìm được phương án thay thế khả thi (Flow A1)
                  </h4>
                  <p className="text-xs text-slate-300 max-w-md mx-auto leading-relaxed">
                    {plan.unfeasibleReason || 'Không có nhân sự nào trong team có đủ giờ trống trong suốt khoảng thời gian còn lại của dự án.'}
                  </p>
                  <p className="text-[11px] text-slate-400 italic">
                    Hệ thống tuân thủ quy tắc: Không tự ý phân công nhân viên nếu không có phương án khả thi.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-800 bg-slate-800/40 flex items-center justify-between text-xs">
          <span className="text-slate-400 text-[11px]">
            {plan?.isFeasible
              ? 'PM phê duyệt để áp dụng phân công mới'
              : 'PM có thể xem xét điều chỉnh thời gian hoặc chuyển giao'}
          </span>

          <div className="flex items-center gap-2">
            {/* Alternative flow A2: PM rejects plan */}
            <button
              onClick={handleReject}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition-colors cursor-pointer"
            >
              {plan?.isFeasible ? 'Từ chối phương án (A2)' : 'Đóng'}
            </button>

            {/* Main flow 7: PM approves plan */}
            {plan?.isFeasible && (
              <button
                onClick={handleApprove}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold shadow-lg shadow-emerald-600/30 flex items-center gap-1.5 cursor-pointer transition-all"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Phê duyệt phương án (Chốt thay thế)</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
