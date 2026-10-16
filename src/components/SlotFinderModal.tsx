import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Clock,
  Filter,
  ShieldCheck,
  Star,
  UserCheck,
  UserX,
  X,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { evaluateCandidatesForRequirement } from '../engine/matchingEngine';
import type { ProjectSprint, SprintStaffingRequirement } from '../types';
import { formatShortDate } from '../utils/dateUtils';

interface SlotFinderModalProps {
  isOpen: boolean;
  onClose: () => void;
  requirement: SprintStaffingRequirement | null;
  sprint: ProjectSprint | null;
}

export const SlotFinderModal: React.FC<SlotFinderModalProps> = ({
  isOpen,
  onClose,
  requirement,
  sprint,
}) => {
  const {
    employees,
    capacities,
    assignments,
    sprints,
    projects,
    allowHigherSeniority,
    setAllowHigherSeniority,
    assignEmployee,
  } = useApp();

  const [showIneligible, setShowIneligible] = useState(false);

  // Evaluate all candidates
  const evaluatedCandidates = useMemo(() => {
    if (!requirement || !sprint) return [];
    return evaluateCandidatesForRequirement(
      requirement,
      sprint,
      employees,
      capacities,
      assignments,
      sprints,
      { allowHigherSeniority }
    );
  }, [
    requirement,
    sprint,
    employees,
    capacities,
    assignments,
    sprints,
    allowHigherSeniority,
  ]);

  if (!isOpen || !requirement || !sprint) return null;

  const currentProject = projects.find((p) => p.id === sprint.projectId);
  const eligibleCandidates = evaluatedCandidates.filter((c) => c.isEligible);
  const ineligibleCandidates = evaluatedCandidates.filter((c) => !c.isEligible);

  // Check how many slots are already assigned
  const currentAssignedCount = assignments.filter(
    (a) => a.requirementId === requirement.id
  ).length;
  const remainingSlotsNeeded = Math.max(
    0,
    requirement.requiredCount - currentAssignedCount
  );

  const handleAssign = (employeeId: string) => {
    assignEmployee(
      requirement.id,
      sprint.id,
      employeeId,
      requirement.hoursPerWeek
    );
    if (remainingSlotsNeeded <= 1) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-slate-800 bg-slate-800/50 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                The Slot Finder Engine
              </span>
              <span className="text-xs text-slate-400">
                {currentProject?.name} • {sprint.name}
              </span>
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
                Cần: <strong className="text-white">{requirement.hoursPerWeek}h/tuần</strong>
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                Thời gian:{' '}
                <strong className="text-white">
                  {formatShortDate(sprint.startDate)} - {formatShortDate(sprint.endDate)} (2 tuần)
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
                Cho phép cấp bậc cao hơn (ví dụ: Senior có thể nhận slot Mid)
              </span>
            </label>
          </div>

          <div className="text-slate-400">
            Tìm thấy{' '}
            <strong className="text-emerald-400">{eligibleCandidates.length}</strong> ứng viên phù hợp
          </div>
        </div>

        {/* Candidate List (Scrollable) */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {/* Eligible section */}
          {eligibleCandidates.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-slate-700 rounded-xl bg-slate-800/20">
              <UserX className="w-12 h-12 text-slate-500 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-slate-300 m-0">
                Không tìm thấy nhân viên nào phù hợp 100% điều kiện
              </h3>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                Tất cả nhân sự cùng vai trò đều đang kín lịch, không đủ giờ trống trong cả 2 tuần
                của sprint hoặc chưa đạt cấp bậc yêu cầu.
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
                <span>Ứng viên đủ điều kiện (Đã xếp hạng theo độ tối ưu)</span>
                <span>Điểm phù hợp</span>
              </div>

              {eligibleCandidates.map((candidate, idx) => (
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
                            Gợi ý hàng đầu
                          </span>
                        )}

                        {candidate.continuityBonus && (
                          <span className="text-xs px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3" />
                            Tính kế thừa (Đã làm dự án này)
                          </span>
                        )}
                      </div>

                      {/* Weekly remaining hours breakdown */}
                      <div className="mt-2.5 flex items-center gap-3 text-xs">
                        {candidate.weeklyBreakdown.map((wb) => (
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
                              / {wb.capacity}h
                            </span>
                          </div>
                        ))}

                        <div className="text-slate-400 ml-1">
                          Tải hiện tại:{' '}
                          <span
                            className={
                              candidate.averageUtilizationPercent > 70
                                ? 'text-amber-400 font-semibold'
                                : 'text-slate-300'
                            }
                          >
                            {candidate.averageUtilizationPercent}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 pt-3 md:pt-0 border-slate-800">
                    <div className="text-right hidden sm:block">
                      <div className="text-lg font-bold text-indigo-400">
                        {candidate.score}
                      </div>
                      <div className="text-[10px] text-slate-500 uppercase">Match Score</div>
                    </div>

                    <button
                      onClick={() => handleAssign(candidate.employee.id)}
                      className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs transition-all flex items-center gap-1.5 shadow-md shadow-indigo-600/20 cursor-pointer"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Phân công vào slot</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Ineligible candidates toggle & list */}
          <div className="pt-4 border-t border-slate-800">
            <button
              onClick={() => setShowIneligible(!showIneligible)}
              className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1.5 font-medium transition-colors"
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
              Quy tắc: Ứng viên phải đủ thời gian trống ở <strong>từng tuần</strong> trong Sprint 2 tuần
            </span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
