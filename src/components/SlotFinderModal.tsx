import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Filter,
  Scale,
  Sparkles,
  Star,
  UserCheck,
  UserX,
  X,
  Zap,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { evaluateCandidatesForRequirement } from '../engine/matchingEngine';
import { optimizeWorkloadSelection } from '../engine/workloadOptimizer';
import type { Project, ProjectStaffingRequirement } from '../types';
import { formatShortDate } from '../utils/dateUtils';

interface SlotFinderModalProps {
  isOpen: boolean;
  onClose: () => void;
  requirement: ProjectStaffingRequirement | null;
  project: Project | null;
}

export const SlotFinderModal: React.FC<SlotFinderModalProps> = ({
  isOpen,
  onClose,
  requirement,
  project,
}) => {
  const {
    employees,
    capacities,
    assignments,
    projects,
    allowHigherSeniority,
    setAllowHigherSeniority,
    assignEmployee,
  } = useApp();

  const [showIneligible, setShowIneligible] = useState(false);
  const [showAlternativeCombos, setShowAlternativeCombos] = useState(false);

  // Remaining slots needed
  const currentAssignedCount = useMemo(() => {
    if (!requirement) return 0;
    return assignments.filter((a) => a.requirementId === requirement.id).length;
  }, [assignments, requirement]);

  const remainingSlotsNeeded = useMemo(() => {
    if (!requirement) return 0;
    return Math.max(0, requirement.requiredCount - currentAssignedCount);
  }, [requirement, currentAssignedCount]);

  // 1. WORKLOAD-BASED OPTIMIZATION (Evaluates combinations of size = remainingSlotsNeeded)
  const workloadOptResult = useMemo(() => {
    if (!requirement || !project || remainingSlotsNeeded <= 0) return null;
    const adjustedRequirement = {
      ...requirement,
      requiredCount: remainingSlotsNeeded,
    };

    return optimizeWorkloadSelection(
      adjustedRequirement,
      project,
      employees,
      capacities,
      assignments,
      projects,
      {
        allowHigherSeniority,
        exactPositionMatch: !allowHigherSeniority,
      }
    );
  }, [
    requirement,
    project,
    remainingSlotsNeeded,
    employees,
    capacities,
    assignments,
    projects,
    allowHigherSeniority,
  ]);

  // 2. Individual Candidate Evaluations
  const evaluatedCandidates = useMemo(() => {
    if (!requirement || !project) return [];
    return evaluateCandidatesForRequirement(
      requirement,
      project,
      employees,
      capacities,
      assignments,
      projects,
      { allowHigherSeniority }
    );
  }, [
    requirement,
    project,
    employees,
    capacities,
    assignments,
    projects,
    allowHigherSeniority,
  ]);

  if (!isOpen || !requirement || !project) return null;

  const eligibleCandidates = evaluatedCandidates.filter((c) => c.isEligible);
  const ineligibleCandidates = evaluatedCandidates.filter((c) => !c.isEligible);

  const bestCombo = workloadOptResult?.bestCombination;
  const otherCombos = workloadOptResult ? workloadOptResult.combinations.slice(1, 4) : [];

  const handleAssignSingle = (employeeId: string) => {
    assignEmployee(
      project.id,
      requirement.id,
      employeeId,
      requirement.hoursPerWeek
    );
    if (remainingSlotsNeeded <= 1) {
      onClose();
    }
  };

  const handleAssignCombination = (employeeIds: string[]) => {
    for (const empId of employeeIds) {
      assignEmployee(
        project.id,
        requirement.id,
        empId,
        requirement.hoursPerWeek
      );
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-slate-800 bg-slate-800/50 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center gap-1.5">
                <Scale className="w-3.5 h-3.5 text-indigo-400" />
                Workload Balance Optimizer
              </span>
              <span className="text-xs text-slate-400">{project.name}</span>
            </div>
            <h2 className="text-xl font-bold text-white m-0">
              Gợi ý nhân sự cho vị trí:{' '}
              <span className="text-indigo-400">
                {requirement.role} ({requirement.seniority})
              </span>
            </h2>
            <div className="flex items-center gap-4 mt-2 text-xs text-slate-400">
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                Thời gian cần: <strong className="text-white">{requirement.hoursPerWeek}h/tuần</strong>
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                Thời gian dự án:{' '}
                <strong className="text-white">
                  {formatShortDate(project.startDate)} - {formatShortDate(project.endDate)}
                </strong>
              </span>
              <span className="flex items-center gap-1">
                <UserCheck className="w-3.5 h-3.5 text-slate-400" />
                Còn cần: <strong className="text-emerald-400">{remainingSlotsNeeded} người</strong>
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-700/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter bar */}
        <div className="px-6 py-3 bg-slate-900/60 border-b border-slate-800 flex items-center justify-between text-xs">
          <div className="flex items-center gap-3">
            <Filter className="w-4 h-4 text-slate-400" />
            <label className="flex items-center gap-2 cursor-pointer select-none text-slate-300">
              <input
                type="checkbox"
                checked={allowHigherSeniority}
                onChange={(e) => setAllowHigherSeniority(e.target.checked)}
                className="rounded border-slate-700 text-indigo-600 focus:ring-indigo-500 bg-slate-800"
              />
              <span>
                Cho phép cấp bậc cao hơn (ví dụ: Senior có thể nhận việc Mid/Junior)
              </span>
            </label>
          </div>

          <div className="text-slate-400">
            Ứng viên khả dụng: <strong className="text-emerald-400">{eligibleCandidates.length}</strong>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* SECTION 1: WORKLOAD-BASED OPTIMAL COMBINATION CARD */}
          {bestCombo && (
            <div className="rounded-2xl border border-indigo-500/40 bg-gradient-to-br from-indigo-950/40 via-slate-900/80 to-slate-900/90 p-5 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-4 border-b border-indigo-500/20 gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-indigo-600/30 border border-indigo-500/50 flex items-center justify-center text-indigo-300">
                    <Sparkles className="w-5 h-5 text-amber-300" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs uppercase tracking-wider font-bold text-indigo-300">
                        {bestCombo.employees.length > 1
                          ? `Tổ hợp ${bestCombo.employees.length} người Tối Ưu Cân Bằng Tải Nhất`
                          : 'Ứng viên Giúp Đạt Mức Cân Bằng Tải Cao Nhất'}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        Top 1 Workload Balance
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Lựa chọn này giúp thu hẹp khoảng cách khối lượng công việc giữa các nhân viên trong team.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleAssignCombination(bestCombo.selectedEmployeeIds)}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold text-xs shadow-lg shadow-indigo-600/25 transition-all flex items-center gap-2 cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>
                      {bestCombo.employees.length > 1
                        ? `Phân công cả tổ hợp (${bestCombo.employees.length} người)`
                        : 'Phân công ngay'}
                    </span>
                  </button>
                </div>
              </div>

              {/* Metrics Bar */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4 text-xs">
                <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-700/60">
                  <div className="text-slate-400 text-[11px]">Chênh lệch giữa người bận nhất và rảnh nhất</div>
                  <div className="text-base font-bold text-indigo-300 mt-0.5">
                    {bestCombo.averageImbalance}%
                    <span className="text-[10px] text-emerald-400 font-normal ml-1">
                      (Mức chênh lệch thấp nhất)
                    </span>
                  </div>
                </div>

                <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-700/60">
                  <div className="text-slate-400 text-[11px]">Đánh giá chia việc</div>
                  <div className="text-base font-bold text-emerald-400 mt-0.5 flex items-center gap-1">
                    <span>Chia đều tối ưu</span>
                  </div>
                </div>

                <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-700/60">
                  <div className="text-slate-400 text-[11px]">Đảm bảo không quá tải</div>
                  <div className="text-base font-bold text-emerald-400 mt-0.5 flex items-center gap-1">
                    <Zap className="w-4 h-4 text-emerald-400" />
                    <span>Không ai bị quá 100% giờ làm</span>
                  </div>
                </div>
              </div>

              {/* Selected Employees in the Combo */}
              <div className="space-y-2">
                <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Dự kiến công suất từng nhân sự trong tổ hợp:
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {bestCombo.projectedWorkloads.map((pw) => (
                    <div
                      key={pw.employee.id}
                      className="p-3 rounded-xl bg-slate-900/90 border border-slate-700/80 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="text-2xl p-1 bg-slate-800 rounded-lg border border-slate-700">
                          {pw.employee.avatar}
                        </span>
                        <div>
                          <div className="font-bold text-white text-sm">
                            {pw.employee.name}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            {pw.employee.role} • {pw.employee.seniority}
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="flex items-center gap-1.5 justify-end">
                          <span className="text-slate-400 text-[11px]">Tải dự kiến:</span>
                          <span
                            className={`font-bold ${
                              pw.averageProjectedUtilization > 85
                                ? 'text-amber-400'
                                : 'text-emerald-400'
                            }`}
                          >
                            {pw.averageProjectedUtilization}%
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {pw.weeklyWorkloads.map((w, idx) => (
                            <span key={w.weekStartDate} className="mr-1.5">
                              T{idx + 1}: {w.projectedUtilization}%
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Alternative Combinations Toggle */}
              {otherCombos.length > 0 && (
                <div className="mt-4 pt-3 border-t border-slate-800">
                  <button
                    onClick={() => setShowAlternativeCombos(!showAlternativeCombos)}
                    className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-medium transition-colors cursor-pointer"
                  >
                    <span>
                      {showAlternativeCombos ? 'Ẩn' : 'Xem thêm'} {otherCombos.length} phương án khả thi khác để so sánh
                    </span>
                    {showAlternativeCombos ? (
                      <ChevronUp className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5" />
                    )}
                  </button>

                  {showAlternativeCombos && (
                    <div className="mt-3 space-y-2">
                      {otherCombos.map((combo, idx) => (
                        <div
                          key={combo.id}
                          className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-slate-500 font-bold">#{idx + 2}</span>
                            <div className="flex items-center gap-2">
                              {combo.employees.map((e) => (
                                <span
                                  key={e.id}
                                  className="px-2 py-1 rounded bg-slate-800 border border-slate-700 text-slate-200"
                                >
                                  {e.avatar} {e.name}
                                </span>
                              ))}
                            </div>
                          </div>

                          <div className="flex items-center gap-4 text-slate-400 justify-between sm:justify-end">
                            <span>
                              Độ lệch: <strong className="text-slate-200">{combo.averageImbalance}%</strong>
                            </span>
                            <span>
                              Phương sai: <strong className="text-slate-200">{combo.overallVariance}</strong>
                            </span>
                            <button
                              onClick={() => handleAssignCombination(combo.selectedEmployeeIds)}
                              className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-slate-700 transition-colors"
                            >
                              Chọn phương án này
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* SECTION 2: ALL INDIVIDUAL CANDIDATES */}
          {eligibleCandidates.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-slate-700 rounded-xl bg-slate-800/20">
              <UserX className="w-12 h-12 text-slate-500 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-slate-300 m-0">
                Không tìm thấy nhân viên nào phù hợp điều kiện
              </h3>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                Tất cả nhân sự cùng vai trò đều đang kín lịch hoặc không đủ giờ trống trong suốt thời gian dự án.
              </p>
              <button
                onClick={() => setShowIneligible(true)}
                className="mt-4 px-3 py-1.5 rounded-lg bg-slate-800 text-indigo-400 text-xs hover:bg-slate-700 transition-colors"
              >
                Xem danh sách không đủ điều kiện & lý do
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                <span>Danh sách từng ứng viên khả dụng</span>
                <span>Tải sau phân bổ (Projected)</span>
              </div>

              {eligibleCandidates.map((candidate, idx) => {
                const projectedBreakdown = candidate.weeklyBreakdown.map((wb) => {
                  const proj = wb.capacity > 0 ? ((wb.committed + wb.required) / wb.capacity) * 100 : 100;
                  return {
                    ...wb,
                    projected: Math.round(proj),
                  };
                });
                const avgProjected = Math.round(
                  projectedBreakdown.reduce((acc, b) => acc + b.projected, 0) /
                    (projectedBreakdown.length || 1)
                );

                return (
                  <div
                    key={candidate.employee.id}
                    className="p-4 rounded-xl border border-slate-700/80 bg-slate-800/40 hover:bg-slate-800/70 hover:border-indigo-500/50 transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4 group"
                  >
                    <div className="flex items-start gap-3 flex-1">
                      <div className="text-3xl p-1 bg-slate-800 rounded-xl border border-slate-700 flex-shrink-0">
                        {candidate.employee.avatar}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-white text-base">
                            {candidate.employee.name}
                          </span>
                          <span className="text-xs px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700">
                            {candidate.employee.role}
                          </span>
                          <span
                            className={`text-xs px-2 py-0.5 rounded-md font-medium ${
                              candidate.employee.seniority === 'Lead'
                                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                : candidate.employee.seniority === 'Senior'
                                ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                                : candidate.employee.seniority === 'Mid'
                                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                                : 'bg-slate-700/50 text-slate-300'
                            }`}
                          >
                            {candidate.employee.seniority}
                          </span>

                          {idx === 0 && (
                            <span className="text-xs px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1 font-semibold">
                              <Star className="w-3 h-3 fill-amber-300" />
                              Ưu tiên cao
                            </span>
                          )}
                        </div>

                        {/* Weekly remaining hours breakdown */}
                        <div className="mt-2.5 flex items-center gap-3 text-xs flex-wrap">
                          {projectedBreakdown.map((wb) => (
                            <div
                              key={wb.weekStartDate}
                              className="flex items-center gap-1.5 bg-slate-900/60 px-2.5 py-1 rounded-lg border border-slate-700/60"
                            >
                              <span className="text-slate-400">
                                {formatShortDate(wb.weekStartDate)}:
                              </span>
                              <span className="font-semibold text-emerald-400">
                                Rảnh {wb.remaining}h
                              </span>
                              <span className="text-slate-500">
                                &rarr; Sau gán: <strong className="text-slate-200">{wb.projected}%</strong>
                              </span>
                            </div>
                          ))}

                          <div className="text-slate-400 ml-1">
                            Tải dự kiến:{' '}
                            <span
                              className={
                                avgProjected > 85
                                  ? 'text-amber-400 font-semibold'
                                  : 'text-slate-200 font-semibold'
                              }
                            >
                              {avgProjected}%
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 pt-3 md:pt-0 border-slate-800">
                      <button
                        onClick={() => handleAssignSingle(candidate.employee.id)}
                        className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-indigo-600 text-white font-medium text-xs transition-all flex items-center gap-1.5 shadow-sm border border-slate-700 hover:border-indigo-500 cursor-pointer"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Phân công người này</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* SECTION 3: INELIGIBLE CANDIDATES WITH REASONS */}
          <div className="pt-4 border-t border-slate-800">
            <button
              onClick={() => setShowIneligible(!showIneligible)}
              className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1.5 font-medium transition-colors cursor-pointer"
            >
              <span>
                {showIneligible ? 'Ẩn' : 'Xem'} {ineligibleCandidates.length} nhân sự không đủ điều
                kiện
              </span>
              <span className="text-[10px] bg-slate-800 px-1.5 py-0.5 rounded text-slate-400">
                {showIneligible ? '▲' : '▼'}
              </span>
            </button>

            {showIneligible && (
              <div className="mt-3 space-y-2">
                {ineligibleCandidates.map((candidate) => (
                  <div
                    key={candidate.employee.id}
                    className="p-3 rounded-lg border border-slate-800 bg-slate-900/40 flex items-start justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{candidate.employee.avatar}</span>
                      <span className="font-medium text-slate-300">
                        {candidate.employee.name}
                      </span>
                      <span className="text-slate-500">
                        ({candidate.employee.role} • {candidate.employee.seniority})
                      </span>
                    </div>

                    <div className="flex flex-col items-end gap-1">
                      {candidate.reasons.map((r, i) => (
                        <span
                          key={i}
                          className="flex items-center gap-1 text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20 text-[11px]"
                        >
                          <AlertCircle className="w-3 h-3 flex-shrink-0" />
                          {r}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-800/30 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
            <span>
              Tự động chọn tổ hợp giúp độ cân bằng workload cả team đạt mức cao nhất
            </span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
