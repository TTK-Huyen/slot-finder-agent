import React, { useMemo, useState } from 'react';
import { Edit2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { getAvailableCapacityForWeek, getCommittedHoursForWeek } from '../engine/matchingEngine';
import type { Role } from '../types';
import { addDays, formatDate, formatShortDate, formatWeekLabel, parseDate } from '../utils/dateUtils';

export const WorkloadHeatmap: React.FC = () => {
  const {
    employees,
    capacities,
    assignments,
    sprints,
    updateEmployeeCapacity,
  } = useApp();

  const [selectedRole, setSelectedRole] = useState<Role | 'All'>('All');
  const [editingCapacity, setEditingCapacity] = useState<{
    employeeId: string;
    weekStartDate: string;
    currentHours: number;
  } | null>(null);

  // Extract unique sorted calendar weeks from all sprints
  const calendarWeeks = useMemo(() => {
    const weeksSet = new Set<string>();
    sprints.forEach((s) => {
      const mon = s.startDate;
      weeksSet.add(mon);
      const nextMon = formatDate(addDays(parseDate(mon), 7));
      weeksSet.add(nextMon);
    });

    return Array.from(weeksSet).sort();
  }, [sprints]);

  const filteredEmployees = employees.filter((emp) =>
    selectedRole === 'All' ? true : emp.role === selectedRole
  );

  const handleSaveCapacity = (newHours: number) => {
    if (!editingCapacity) return;
    updateEmployeeCapacity(
      editingCapacity.employeeId,
      editingCapacity.weekStartDate,
      newHours
    );
    setEditingCapacity(null);
  };

  return (
    <div className="space-y-6">
      {/* Heatmap header */}
      <div className="bg-slate-800/60 border border-slate-700/80 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold">
              Real-time Capacity Matrix
            </span>
            <span className="text-xs text-slate-400">Kiểm tra tải theo tuần</span>
          </div>
          <h2 className="text-xl font-bold text-white m-0">Ma trận Tải & Công suất Nhân viên</h2>
          <p className="text-xs text-slate-400 mt-1">
            Màu sắc biểu thị tỷ lệ cam kết công việc so với công suất khả dụng trong từng tuần.
          </p>
        </div>

        {/* Role filters & legend */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs bg-slate-900/60 p-1 rounded-xl border border-slate-700">
            {(['All', 'Developer', 'QA', 'Business Analyst', 'Project Manager'] as const).map(
              (role) => (
                <button
                  key={role}
                  onClick={() => setSelectedRole(role)}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                    selectedRole === role
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {role === 'All' ? 'Tất cả' : role}
                </button>
              )
            )}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-between text-xs text-slate-400 px-2 flex-wrap gap-2">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-emerald-500/30 border border-emerald-500/50" />
            <span>Khả dụng (&lt; 80%)</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-amber-500/30 border border-amber-500/50" />
            <span>Đầy tải (80% - 100%)</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-rose-500/40 border border-rose-500/70" />
            <span className="text-rose-400 font-semibold">Quá tải / Crunch (&gt; 100%)</span>
          </span>
        </div>
        <span className="text-slate-500 italic">
          💡 Click vào số giờ khả dụng để mô phỏng nhân viên xin nghỉ phép
        </span>
      </div>

      {/* Matrix Table */}
      <div className="bg-slate-800/40 border border-slate-700/80 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-700/80 bg-slate-900/70">
                <th className="p-4 font-semibold text-slate-300 min-w-[220px]">Nhân viên</th>
                <th className="p-4 font-semibold text-slate-300">Vai trò</th>
                <th className="p-4 font-semibold text-slate-300">Cấp bậc</th>
                {calendarWeeks.map((week) => (
                  <th
                    key={week}
                    className="p-4 font-semibold text-slate-300 text-center min-w-[140px] border-l border-slate-700/50"
                  >
                    <div className="text-white font-bold">{formatShortDate(week)}</div>
                    <div className="text-[10px] text-slate-400 font-normal">
                      {formatWeekLabel(week).split(' ')[1]}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filteredEmployees.map((emp) => (
                <tr key={emp.id} className="hover:bg-slate-800/50 transition-colors">
                  {/* Name */}
                  <td className="p-4">
                    <div className="flex items-center gap-2.5">
                      <span className="text-xl">{emp.avatar}</span>
                      <div>
                        <div className="font-bold text-white text-sm">{emp.name}</div>
                        <div className="text-[11px] text-slate-400">Chuẩn: {emp.baseWeeklyHours}h/tuần</div>
                      </div>
                    </div>
                  </td>

                  {/* Role */}
                  <td className="p-4">
                    <span className="text-slate-300">{emp.role}</span>
                  </td>

                  {/* Seniority */}
                  <td className="p-4">
                    <span
                      className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                        emp.seniority === 'Lead'
                          ? 'bg-rose-500/20 text-rose-300'
                          : emp.seniority === 'Senior'
                          ? 'bg-indigo-500/20 text-indigo-300'
                          : emp.seniority === 'Mid'
                          ? 'bg-cyan-500/20 text-cyan-300'
                          : 'bg-slate-700 text-slate-300'
                      }`}
                    >
                      {emp.seniority}
                    </span>
                  </td>

                  {/* Weeks columns */}
                  {calendarWeeks.map((week) => {
                    const capacity = getAvailableCapacityForWeek(emp, week, capacities);
                    const committed = getCommittedHoursForWeek(
                      emp.id,
                      week,
                      assignments,
                      sprints
                    );
                    const remaining = capacity - committed;
                    const utilPercent =
                      capacity > 0 ? Math.round((committed / capacity) * 100) : committed > 0 ? 999 : 0;
                    const isOverAllocated = committed > capacity;

                    return (
                      <td
                        key={week}
                        className="p-3 text-center border-l border-slate-800/80 align-top"
                      >
                        <div
                          className={`p-2 rounded-xl border transition-all ${
                            isOverAllocated
                              ? 'bg-rose-500/20 border-rose-500/50 text-rose-200 shadow-sm shadow-rose-900/20 animate-pulse'
                              : utilPercent >= 80
                              ? 'bg-amber-500/15 border-amber-500/30 text-amber-200'
                              : 'bg-slate-900/40 border-slate-800 text-slate-300'
                          }`}
                        >
                          <div className="flex items-center justify-between text-[11px] mb-1">
                            <span className="text-slate-400">
                              {committed}/{capacity}h
                            </span>
                            <span
                              className={`font-bold ${
                                isOverAllocated
                                  ? 'text-rose-400'
                                  : utilPercent >= 80
                                  ? 'text-amber-400'
                                  : 'text-emerald-400'
                              }`}
                            >
                              {utilPercent}%
                            </span>
                          </div>

                          {/* Progress bar */}
                          <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mb-1.5">
                            <div
                              className={`h-full rounded-full transition-all ${
                                isOverAllocated
                                  ? 'bg-rose-500'
                                  : utilPercent >= 80
                                  ? 'bg-amber-500'
                                  : 'bg-emerald-500'
                              }`}
                              style={{ width: `${Math.min(100, utilPercent)}%` }}
                            />
                          </div>

                          <div className="flex items-center justify-between text-[10px]">
                            <span
                              className={`font-semibold ${
                                isOverAllocated
                                  ? 'text-rose-400'
                                  : remaining > 0
                                  ? 'text-emerald-400'
                                  : 'text-slate-500'
                              }`}
                            >
                              {isOverAllocated
                                ? `Âm ${Math.abs(remaining)}h`
                                : `Còn ${remaining}h`}
                            </span>

                            {/* Button to simulate leave */}
                            <button
                              onClick={() =>
                                setEditingCapacity({
                                  employeeId: emp.id,
                                  weekStartDate: week,
                                  currentHours: capacity,
                                })
                              }
                              title="Chỉnh sửa giờ khả dụng (nghỉ phép/tăng ca)"
                              className="text-slate-500 hover:text-indigo-400 transition-colors p-0.5"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal to edit capacity (Simulate leave) */}
      {editingCapacity && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-base font-bold text-white mb-1">
              Chỉnh sửa công suất tuần ({editingCapacity.weekStartDate})
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Dùng để mô phỏng trường hợp nhân viên xin nghỉ phép (nghỉ 1 ngày = 32h, nghỉ 2 ngày = 24h, nghỉ cả tuần = 0h).
            </p>

            <div className="space-y-3 mb-6">
              <label className="block text-xs font-semibold text-slate-300">
                Số giờ khả dụng tuần này:
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[0, 16, 24, 32, 40].map((hours) => (
                  <button
                    key={hours}
                    onClick={() => handleSaveCapacity(hours)}
                    className={`py-2 px-3 rounded-lg text-xs font-semibold border transition-all ${
                      editingCapacity.currentHours === hours
                        ? 'bg-indigo-600 border-indigo-500 text-white'
                        : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {hours} giờ
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 text-xs">
              <button
                onClick={() => setEditingCapacity(null)}
                className="px-4 py-2 rounded-lg bg-slate-800 text-slate-400 hover:bg-slate-700"
              >
                Hủy
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
