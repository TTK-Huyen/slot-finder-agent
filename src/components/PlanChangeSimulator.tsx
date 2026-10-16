import React, { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Play,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { evaluateCandidatesForRequirement } from '../engine/matchingEngine';
import { formatShortDate } from '../utils/dateUtils';

export const PlanChangeSimulator: React.FC = () => {
  const {
    employees,
    capacities,
    assignments,
    sprints,
    updateEmployeeCapacity,
    assignEmployee,
    unassignEmployee,
    getOverAllocatedWarnings,
    resetAllData,
  } = useApp();

  const warnings = getOverAllocatedWarnings();
  const [simulationLog, setSimulationLog] = useState<string | null>(null);

  // Scenario 1: Simulate Dev Khoa going on leave
  const handleSimulateLeave = () => {
    // Find Hoàng Minh Khoa
    const khoa = employees.find((e) => e.name.includes('Khoa'));
    if (!khoa) return;

    // Set his available hours in week 2026-10-12 to 0 (Unplanned sick leave)
    updateEmployeeCapacity(khoa.id, '2026-10-12', 0);
    setSimulationLog(
      `⚠️ Đã kích hoạt mô phỏng: Senior Dev Hoàng Minh Khoa xin nghỉ ốm đột xuất tuần 12/10 (Công suất giảm từ 40h -> 0h).`
    );
  };

  // Quick fix for a warning: Find alternative replacement
  const handleAutoReplace = (warning: {
    employee: any;
    weekStartDate: string;
    deficit: number;
  }) => {
    // Find the assignment causing this
    const conflictingAssignment = assignments.find(
      (a) => a.employeeId === warning.employee.id
    );
    if (!conflictingAssignment) return;

    const sprint = sprints.find((s) => s.id === conflictingAssignment.sprintId);
    if (!sprint) return;

    // Evaluate candidates for that requirement
    const req = {
      id: conflictingAssignment.requirementId,
      sprintId: conflictingAssignment.sprintId,
      role: warning.employee.role,
      seniority: warning.employee.seniority,
      requiredCount: 1,
      hoursPerWeek: conflictingAssignment.allocatedHoursPerWeek,
    };

    // Temporarily exclude current employee
    const evaluations = evaluateCandidatesForRequirement(
      req,
      sprint,
      employees.filter((e) => e.id !== warning.employee.id),
      capacities,
      assignments.filter((a) => a.id !== conflictingAssignment.id),
      sprints
    );

    const bestReplacement = evaluations.find((e) => e.isEligible);

    if (bestReplacement) {
      // Unassign current, assign new
      unassignEmployee(conflictingAssignment.id);
      assignEmployee(
        req.id,
        sprint.id,
        bestReplacement.employee.id,
        req.hoursPerWeek
      );
      setSimulationLog(
        `✅ Đã tự động thay thế thành công: Chuyển vị trí từ ${warning.employee.name} sang ${bestReplacement.employee.name} (Rảnh ${bestReplacement.weeklyBreakdown[0].remaining}h). Không còn quá tải!`
      );
    } else {
      setSimulationLog(
        `❌ Không tìm thấy ứng viên thay thế nào có đủ giờ trống trong toàn bộ các tuần của sprint này.`
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
          <span className="text-xs text-slate-400">Giải quyết bài toán "When plans change"</span>
        </div>
        <h2 className="text-xl font-bold text-white m-0">
          Mô phỏng Xử lý Biến động & Quá tải (Crunch Resolution)
        </h2>
        <p className="text-xs text-slate-400 mt-2 leading-relaxed">
          Trong thực tế, khi có người xin nghỉ phép đột xuất hoặc dự án bị delay (project slipping),
          các PM thường phải mất hàng giờ họp và tính toán lại lịch bằng tay trên Excel.
          Tại đây, bạn có thể thử nghiệm cách <strong>The Slot Finder</strong> tự động phát hiện và
          tìm người thay thế trong tích tắc.
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
            className="px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-medium flex items-center gap-1.5 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Khôi phục dữ liệu ban đầu</span>
          </button>
        </div>

        {/* Simulation Log Notice */}
        {simulationLog && (
          <div className="mt-4 p-3 rounded-xl bg-slate-900 border border-slate-700 text-xs text-slate-200 animate-fadeIn">
            {simulationLog}
          </div>
        )}
      </div>

      {/* Warnings & Over-allocation feed */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-white flex items-center gap-2 m-0">
            <AlertTriangle className="w-4 h-4 text-rose-400" />
            Danh sách Cảnh báo Quá tải (Crunch Detector)
          </h3>
          <span className="text-xs text-slate-400">
            {warnings.length} sự cố quá tải cần xử lý
          </span>
        </div>

        {warnings.length === 0 ? (
          <div className="text-center py-12 rounded-2xl border border-dashed border-emerald-500/30 bg-emerald-500/5">
            <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
            <h4 className="text-sm font-semibold text-emerald-300 m-0">
              Tuyệt vời! Không có nhân viên nào bị quá tải (No Crunch)
            </h4>
            <p className="text-xs text-slate-400 mt-1">
              Tất cả các cam kết dự án đều nằm trong giới hạn công suất khả dụng thực tế của nhân sự.
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
                    <span>Tìm người thay thế & Cứu slot (Auto Re-assign)</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Explanatory infographic */}
      <div className="p-6 rounded-2xl bg-slate-800/40 border border-slate-700/60 grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
        <div>
          <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold mb-2">
            1
          </div>
          <h4 className="font-bold text-white text-sm mb-1">Kiểm tra đa tuần độc lập</h4>
          <p className="text-slate-400 leading-relaxed">
            Hệ thống luôn tính công suất theo từng tuần riêng lẻ. Nếu 1 tuần nhân viên đủ 40h nhưng tuần sau chỉ còn 15h, hệ thống sẽ loại ngay thay vì để PM vô tình gán vào rồi vỡ nợ tiến độ.
          </p>
        </div>

        <div>
          <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold mb-2">
            2
          </div>
          <h4 className="font-bold text-white text-sm mb-1">Cảnh báo tự động (Real-time)</h4>
          <p className="text-slate-400 leading-relaxed">
            Ngay khi nhân viên bấm nộp phép hoặc dự án trễ hạn, ma trận công suất tức thì quét qua toàn bộ các dự án để phát hiện xung đột và đổi sang màu đỏ.
          </p>
        </div>

        <div>
          <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold mb-2">
            3
          </div>
          <h4 className="font-bold text-white text-sm mb-1">Đổi slot chỉ với 1 Click</h4>
          <p className="text-slate-400 leading-relaxed">
            Không cần mở file Excel tính lại toàn bộ công ty. PM chỉ cần bấm "Tìm người thay thế", hệ thống tự tìm người có cùng chuyên môn và đủ giờ để gán vào.
          </p>
        </div>
      </div>
    </div>
  );
};
