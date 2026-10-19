import React, { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Play,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { optimizeWorkloadSelection } from '../engine/workloadOptimizer';
import { formatShortDate } from '../utils/dateUtils';

export const PlanChangeSimulator: React.FC = () => {
  const {
    employees,
    capacities,
    assignments,
    projects,
    requirements,
    updateEmployeeCapacity,
    assignEmployee,
    unassignEmployee,
    getOverAllocatedWarnings,
    resetAllData,
  } = useApp();

  const warnings = getOverAllocatedWarnings();
  const [simulationLog, setSimulationLog] = useState<string | null>(null);

  // Scenario 1: Simulate Dev Khoa going on sick leave
  const handleSimulateLeave = () => {
    const khoa = employees.find((e) => e.name.includes('Khoa'));
    if (!khoa) return;

    updateEmployeeCapacity(khoa.id, '2026-10-12', 0);
    setSimulationLog(
      `⚠️ Đã kích hoạt: Senior Dev Hoàng Minh Khoa xin nghỉ ốm đột xuất tuần 12/10 (Khả dụng: 40h -> 0h). Hệ thống phát hiện ngay tình trạng quá tải/hụt giờ dự án!`
    );
  };

  // Auto-replace using workload balance optimizer
  const handleAutoReplace = (warning: {
    employee: any;
    weekStartDate: string;
    deficit: number;
  }) => {
    const conflictingAssignment = assignments.find(
      (a) => a.employeeId === warning.employee.id
    );
    if (!conflictingAssignment) return;

    const project = projects.find((p) => p.id === conflictingAssignment.projectId);
    const req = requirements.find((r) => r.id === conflictingAssignment.requirementId);
    if (!project || !req) return;

    // Run workload selection for 1 replacement, excluding the sick employee
    const otherEmployees = employees.filter((e) => e.id !== warning.employee.id);
    const otherAssignments = assignments.filter((a) => a.id !== conflictingAssignment.id);

    const result = optimizeWorkloadSelection(
      { ...req, requiredCount: 1 },
      project,
      otherEmployees,
      capacities,
      otherAssignments,
      projects,
      { allowHigherSeniority: true }
    );

    const bestCombo = result.bestCombination;
    if (bestCombo && bestCombo.employees.length > 0) {
      const replacement = bestCombo.employees[0];
      unassignEmployee(conflictingAssignment.id);
      assignEmployee(
        project.id,
        req.id,
        replacement.id,
        req.hoursPerWeek
      );
      setSimulationLog(
        `✅ Đã tự động thay thế thành công: Chuyển vị trí từ ${warning.employee.name} sang ${replacement.name}. Lựa chọn này giúp độ lệch tải cả team thấp nhất (${bestCombo.averageImbalance}%).`
      );
    } else {
      setSimulationLog(
        `❌ Không tìm thấy ứng viên thay thế nào có đủ giờ trống trong suốt thời gian của dự án.`
      );
    }
  };

  return (
    <div className="space-y-6">
      {/* Introduction Card */}
      <div className="bg-slate-800/60 border border-slate-700/80 rounded-2xl p-6 shadow-xl">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold">
            Crisis & Change Management
          </span>
          <span className="text-xs text-slate-400">Xử lý khi kế hoạch thay đổi (When plans change)</span>
        </div>
        <h2 className="text-xl font-bold text-white m-0">
          Mô phỏng Xử lý Biến động & Tự động Cân bằng lại Tải
        </h2>
        <p className="text-xs text-slate-400 mt-2 leading-relaxed">
          Khi nhân sự đột ngột xin nghỉ phép hoặc dự án phát sinh biến động, hệ thống tức thì quét ma trận công suất,
          phát hiện xung đột và đề xuất người thay thế đảm bảo **mức cân bằng tải toàn team đạt mức cao nhất**.
        </p>

        {/* Action buttons */}
        <div className="mt-5 flex items-center gap-3 flex-wrap">
          <button
            onClick={handleSimulateLeave}
            className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold flex items-center gap-2 transition-all shadow-md shadow-amber-600/20 cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 fill-white" />
            <span>Mô phỏng: Nhân viên xin nghỉ ốm đột xuất</span>
          </button>

          <button
            onClick={resetAllData}
            className="px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Khôi phục dữ liệu ban đầu</span>
          </button>
        </div>

        {/* Simulation Log Notice */}
        {simulationLog && (
          <div className="mt-4 p-3.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-slate-200 animate-fadeIn">
            {simulationLog}
          </div>
        )}
      </div>

      {/* Warnings & Over-allocation feed */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-white flex items-center gap-2 m-0">
            <AlertTriangle className="w-4 h-4 text-rose-400" />
            Danh sách Cảnh báo Quá tải & Hụt giờ
          </h3>
          <span className="text-xs text-slate-400">
            {warnings.length} sự cố quá tải cần xử lý
          </span>
        </div>

        {warnings.length === 0 ? (
          <div className="text-center py-12 rounded-2xl border border-dashed border-emerald-500/30 bg-emerald-500/5">
            <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
            <h4 className="text-sm font-semibold text-emerald-300 m-0">
              Tuyệt vời! Không có nhân sự nào bị quá tải (Tải toàn team ổn định)
            </h4>
            <p className="text-xs text-slate-400 mt-1">
              Tất cả các cam kết dự án đều nằm trong giới hạn công suất thực tế của nhân sự.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {warnings.map((warn, idx) => (
              <div
                key={idx}
                className="p-4 rounded-xl border border-rose-500/40 bg-rose-500/10 flex flex-col md:flex-row md:items-center justify-between gap-4 animate-pulse"
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl p-1 bg-slate-900 rounded-lg border border-slate-800">
                    {warn.employee.avatar}
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-sm">
                        {warn.employee.name}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 font-medium">
                        Quá tải {warn.deficit}h
                      </span>
                      <span className="text-xs text-slate-400">
                        {warn.employee.role} • {warn.employee.seniority}
                      </span>
                    </div>

                    <div className="text-xs text-rose-300 mt-1 flex items-center gap-2">
                      <span>Tuần {formatShortDate(warn.weekStartDate)}:</span>
                      <span>
                        Khả dụng: <strong>{warn.capacity}h</strong>
                      </span>
                      <span>•</span>
                      <span>
                        Đã cam kết: <strong>{warn.committed}h</strong>
                      </span>
                      <span>(Bị hụt {warn.deficit}h so với lịch trình dự án!)</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 justify-end">
                  <button
                    onClick={() => handleAutoReplace(warn)}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold text-xs transition-all flex items-center gap-1.5 shadow-md shadow-indigo-600/30 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                    <span>Tự động tìm người thay thế tối ưu tải (Auto Re-assign)</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
