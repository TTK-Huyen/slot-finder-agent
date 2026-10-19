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
      setErrorMessage(result.reason || 'Data changed before saving. The assignment could not be completed.');
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
      <div className="bg-white border border-gray-200 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 bg-gray-50 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gray-100 border border-gray-300 flex items-center justify-center text-gray-700">
              <UserMinus className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-gray-900 m-0">
                  Staff reallocation when an employee leaves (UC03)
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-gray-100 text-gray-700 border border-gray-300">
                  UC03
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                Automatically find and recommend a workload-balanced replacement when an employee leaves the project.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-gray-500 hover:text-gray-900 rounded-lg hover:bg-gray-50 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs flex-1">
          {/* Main flow 1: PM selects project, departing employee, departure date */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-gray-50 p-4 rounded-xl border border-gray-200">
            <div>
              <label className="block text-gray-500 font-semibold mb-1">Project</label>
              <select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2 text-gray-900"
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-gray-500 font-semibold mb-1">Departing employee</label>
              <select
                value={selectedEmployeeId}
                onChange={(e) => setSelectedEmployeeId(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2 text-gray-900"
              >
                {projectAssignedEmployees.length === 0 ? (
                  <option value="">(No assigned employees)</option>
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
              <label className="block text-gray-500 font-semibold mb-1">Departure date</label>
              <input
                type="date"
                value={departureDate}
                min={activeProject.startDate}
                max={activeProject.endDate}
                onChange={(e) => setDepartureDate(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2 text-gray-900"
              />
            </div>
          </div>

          {/* Error / Alert Message (Alternative Flow A3) */}
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-gray-100 border border-gray-300 text-gray-700 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-gray-700" />
              <div>
                <strong className="block font-semibold">Warning:</strong>
                <span>{errorMessage}</span>
              </div>
            </div>
          )}

          {/* Reallocation Plan Results */}
          {plan && (
            <div className="space-y-4">
              {/* Departing Summary */}
              <div className="p-3.5 rounded-xl bg-white border border-gray-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl p-1 bg-gray-50 rounded-lg">
                    {departingEmp?.avatar || '??'}
                  </span>
                  <div>
                    <div className="font-bold text-gray-900 text-sm">
                      {plan.departingEmployeeName}
                    </div>
                    <div className="text-gray-500 text-[11px]">
                      Role: {plan.role} ({plan.seniority}) ? Replacement needed: <strong>{plan.hoursPerWeek}h/week</strong>
                    </div>
                  </div>
                </div>

                <div className="text-right text-gray-500 text-[11px]">
                  <div>From: <strong className="text-gray-900">{formatShortDate(plan.departureDate)}</strong></div>
                  <div>Impact period: <strong className="text-gray-700">{plan.affectedWeeks.length} weeks</strong></div>
                </div>
              </div>

              {/* Main flow 6: Proposed Replacement */}
              {plan.isFeasible && replacementEmp && replacementCombo ? (
                <div className="p-4 rounded-xl bg-white border border-gray-300 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs uppercase tracking-wider font-bold text-gray-700 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-gray-700" />
                      Recommended replacement (best team workload balance)
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] bg-gray-100 text-gray-700 border border-gray-300 font-semibold">
                      100% feasible
                    </span>
                  </div>

                  <div className="p-3 bg-white rounded-xl border border-gray-200 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl p-1 bg-gray-50 rounded-lg">
                        {replacementEmp.avatar}
                      </span>
                      <div>
                        <div className="font-bold text-gray-900 text-sm">
                          {replacementEmp.name}
                        </div>
                        <div className="text-[11px] text-gray-500">
                          {replacementEmp.role} ? {replacementEmp.seniority}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-gray-700 font-bold">
                        Projected utilization: {replacementCombo.projectedWorkloads[0]?.averageProjectedUtilization}%
                      </div>
                      <div className="text-[10px] text-gray-500">
                        Team workload imbalance: {replacementCombo.averageImbalance}% (Lowest)
                      </div>
                    </div>
                  </div>

                  <div className="text-[11px] text-gray-500 leading-relaxed flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-gray-700 flex-shrink-0" />
                    <span>
                      This employee has enough availability for the remaining {plan.affectedWeeks.length} weeks without exceeding 100% capacity.
                    </span>
                  </div>
                </div>
              ) : (
                /* Alternative flow A1: No feasible candidate */
                <div className="p-6 rounded-xl border border-dashed border-gray-300 bg-gray-100 text-center space-y-2">
                  <UserX className="w-10 h-10 text-gray-700 mx-auto" />
                  <h4 className="text-sm font-bold text-gray-700 m-0">
                    No feasible replacement found (Flow A1)
                  </h4>
                  <p className="text-xs text-gray-700 max-w-md mx-auto leading-relaxed">
                    {plan.unfeasibleReason || 'No team member has enough availability for the remaining project period.'}
                  </p>
                  <p className="text-[11px] text-gray-500 italic">
                    Rule enforced: no employee is assigned without a feasible option.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between text-xs">
          <span className="text-gray-500 text-[11px]">
            {plan?.isFeasible
              ? 'PM approval is required to apply the new assignment'
              : 'The PM can adjust the timeline or hand over the work'}
          </span>

          <div className="flex items-center gap-2">
            {/* Alternative flow A2: PM rejects plan */}
            <button
              onClick={handleReject}
              className="px-4 py-2 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-700 font-medium transition-colors cursor-pointer"
            >
              {plan?.isFeasible ? 'Reject option (A2)' : 'Close'}
            </button>

            {/* Main flow 7: PM approves plan */}
            {plan?.isFeasible && (
              <button
                onClick={handleApprove}
                className="px-5 py-2 rounded-xl bg-gray-100 hover:bg-gray-100 text-gray-900 font-semibold shadow-lg shadow-gray-900/30 flex items-center gap-1.5 cursor-pointer transition-all"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Approve replacement</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

