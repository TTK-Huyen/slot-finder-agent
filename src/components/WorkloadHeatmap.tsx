import React, { useMemo, useState } from 'react';
import { Edit2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { getAvailableCapacityForWeek, getCommittedHoursForWeek } from '../engine/matchingEngine';
import type { Role } from '../types';
import { formatShortDate, formatWeekLabel, getWeeksCovered } from '../utils/dateUtils';

export const WorkloadHeatmap: React.FC = () => {
  const {
    employees,
    capacities,
    assignments,
    projects,
    updateEmployeeCapacity,
  } = useApp();

  const [selectedRole, setSelectedRole] = useState<Role | 'All'>('All');
  const [editingCapacity, setEditingCapacity] = useState<{
    employeeId: string;
    weekStartDate: string;
    currentHours: number;
  } | null>(null);

  // Extract unique sorted calendar weeks from all projects
  const calendarWeeks = useMemo(() => {
    const weeksSet = new Set<string>();
    projects.forEach((p) => {
      const weeks = getWeeksCovered(p.startDate, p.endDate);
      weeks.forEach((w) => weeksSet.add(w));
    });

    return Array.from(weeksSet).sort();
  }, [projects]);

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
      <div className="bg-gray-50 border border-gray-200 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-700 border border-gray-300 font-semibold">
              Real-time Capacity Matrix
            </span>
            <span className="text-xs text-gray-500">Team workload check</span>
          </div>
          <h2 className="text-xl font-bold text-gray-900 m-0">Team workload & capacity matrix</h2>
          <p className="text-xs text-gray-500 mt-1">
            Track actual workload week by week after projects are staffed.
          </p>
        </div>

        {/* Role filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs bg-white p-1 rounded-xl border border-gray-200">
            {(['All', 'Developer', 'QA', 'Business Analyst', 'Project Manager'] as const).map(
              (role) => (
                <button
                  key={role}
                  onClick={() => setSelectedRole(role)}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                    selectedRole === role
                      ? 'bg-gray-900 text-white shadow-sm'
                      : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  {role === 'All' ? 'All' : role}
                </button>
              )
            )}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-between text-xs text-gray-500 px-2 flex-wrap gap-2">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-gray-100 border border-gray-300" />
            <span>Available (&lt; 80%)</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-gray-100 border border-gray-300" />
            <span>At capacity (80%-100%)</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-gray-100 border border-gray-300" />
            <span className="text-gray-700 font-semibold">Overloaded (&gt; 100%)</span>
          </span>
        </div>
        <span className="text-gray-500 italic">
          ?? Click a cell to adjust leave or working hours
        </span>
      </div>

      {/* Matrix Table */}
      <div className="bg-gray-50 border border-gray-200 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-gray-200 bg-white">
                <th className="p-4 font-semibold text-gray-700 min-w-[220px]">Employee</th>
                <th className="p-4 font-semibold text-gray-700">Role</th>
                <th className="p-4 font-semibold text-gray-700">Seniority</th>
                {calendarWeeks.map((week) => (
                  <th
                    key={week}
                    className="p-4 font-semibold text-gray-700 text-center min-w-[140px] border-l border-gray-200"
                  >
                    <div className="text-gray-900 font-bold">{formatShortDate(week)}</div>
                    <div className="text-[10px] text-gray-500 font-normal">
                      {formatWeekLabel(week).split(' ')[1]}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredEmployees.map((emp) => (
                <tr key={emp.id} className="hover:bg-gray-50 transition-colors">
                  {/* Name */}
                  <td className="p-4">
                    <div className="flex items-center gap-2.5">
                      <span className="text-xl">{emp.avatar}</span>
                      <div>
                        <div className="font-bold text-gray-900 text-sm">{emp.name}</div>
                        <div className="text-[11px] text-gray-500">Baseline: {emp.baseWeeklyHours}h/weeks</div>
                      </div>
                    </div>
                  </td>

                  {/* Role */}
                  <td className="p-4">
                    <span className="text-gray-700">{emp.role}</span>
                  </td>

                  {/* Seniority */}
                  <td className="p-4">
                    <span
                      className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                        emp.seniority === 'Lead'
                          ? 'bg-gray-100 text-gray-700'
                          : emp.seniority === 'Senior'
                          ? 'bg-gray-100/20 text-gray-700'
                          : emp.seniority === 'Mid'
                          ? 'bg-gray-100 text-gray-700'
                          : 'bg-gray-100 text-gray-700'
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
                      projects
                    );
                    const remaining = capacity - committed;
                    const utilPercent =
                      capacity > 0 ? Math.round((committed / capacity) * 100) : committed > 0 ? 999 : 0;
                    const isOverAllocated = committed > capacity;

                    return (
                      <td
                        key={week}
                        className="p-3 text-center border-l border-gray-200 align-top"
                      >
                        <div
                          className={`p-2 rounded-xl border transition-all ${
                            isOverAllocated
                              ? 'bg-gray-100 border-gray-300 text-gray-700 shadow-sm shadow-gray-900/10 animate-pulse'
                              : utilPercent >= 80
                              ? 'bg-gray-100 border-gray-300 text-gray-700'
                              : 'bg-white border-gray-200 text-gray-700'
                          }`}
                        >
                          <div className="flex items-center justify-between text-[11px] mb-1">
                            <span className="text-gray-500">
                              {committed}/{capacity}h
                            </span>
                            <span
                              className={`font-bold ${
                                isOverAllocated
                                  ? 'text-gray-700'
                                  : utilPercent >= 80
                                  ? 'text-gray-700'
                                  : 'text-gray-700'
                              }`}
                            >
                              {utilPercent}%
                            </span>
                          </div>

                          {/* Progress bar */}
                          <div className="w-full bg-gray-50 h-1.5 rounded-full overflow-hidden mb-1.5">
                            <div
                              className={`h-full rounded-full transition-all ${
                                isOverAllocated
                                  ? 'bg-gray-100'
                                  : utilPercent >= 80
                                  ? 'bg-gray-100'
                                  : 'bg-gray-100'
                              }`}
                              style={{ width: `${Math.min(100, utilPercent)}%` }}
                            />
                          </div>

                          <div className="flex items-center justify-between text-[10px]">
                            <span
                              className={`font-semibold ${
                                isOverAllocated
                                  ? 'text-gray-700'
                                  : remaining > 0
                                  ? 'text-gray-700'
                                  : 'text-gray-500'
                              }`}
                            >
                              {isOverAllocated
                                ? `Over by ${Math.abs(remaining)}h`
                                : `Remaining ${remaining}h`}
                            </span>

                            <button
                              onClick={() =>
                                setEditingCapacity({
                                  employeeId: emp.id,
                                  weekStartDate: week,
                                  currentHours: capacity,
                                })
                              }
                              title="Edit available hours (leave/overtime)"
                              className="text-gray-500 hover:text-gray-700 transition-colors p-0.5 cursor-pointer"
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
          <div className="bg-white border border-gray-200 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-base font-bold text-gray-900 mb-1">
              Edit weekly capacity ({editingCapacity.weekStartDate})
            </h3>
            <p className="text-xs text-gray-500 mb-4">
              Simulate leave (1 day = 32h, 2 days = 24h, full week = 0h).
            </p>

            <div className="space-y-3 mb-6">
              <label className="block text-xs font-semibold text-gray-700">
                Available hours this week:
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[0, 16, 24, 32, 40].map((hours) => (
                  <button
                    key={hours}
                    onClick={() => handleSaveCapacity(hours)}
                    className={`py-2 px-3 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                      editingCapacity.currentHours === hours
                        ? 'bg-gray-900 border-gray-300 text-white'
                        : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    {hours} hours
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 text-xs">
              <button
                onClick={() => setEditingCapacity(null)}
                className="px-4 py-2 rounded-lg bg-gray-50 text-gray-500 hover:bg-gray-100 cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

