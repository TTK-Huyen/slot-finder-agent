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
      <div className="bg-white border border-gray-200 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 bg-gray-50 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100/20 text-gray-700 border border-gray-300/30 flex items-center gap-1.5">
                <Scale className="w-3.5 h-3.5 text-gray-700" />
                Workload Balance Optimizer
              </span>
              <span className="text-xs text-gray-500">{project.name}</span>
            </div>
            <h2 className="text-xl font-bold text-gray-900 m-0">
              Staffing suggestions for:{' '}
              <span className="text-gray-700">
                {requirement.role} ({requirement.seniority})
              </span>
            </h2>
            <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-gray-500" />
                Time needed: <strong className="text-gray-900">{requirement.hoursPerWeek}h/weeks</strong>
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-gray-500" />
                Project timeline:{' '}
                <strong className="text-gray-900">
                  {formatShortDate(project.startDate)} - {formatShortDate(project.endDate)}
                </strong>
              </span>
              <span className="flex items-center gap-1">
                <UserCheck className="w-3.5 h-3.5 text-gray-500" />
                Still needed: <strong className="text-gray-700">{remainingSlotsNeeded} people</strong>
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-gray-900 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter bar */}
        <div className="px-6 py-3 bg-white border-b border-gray-200 flex items-center justify-between text-xs">
          <div className="flex items-center gap-3">
            <Filter className="w-4 h-4 text-gray-500" />
            <label className="flex items-center gap-2 cursor-pointer select-none text-gray-700">
              <input
                type="checkbox"
                checked={allowHigherSeniority}
                onChange={(e) => setAllowHigherSeniority(e.target.checked)}
                className="rounded border-gray-200 text-gray-700 focus:ring-gray-400 bg-gray-50"
              />
              <span>
                Allow higher seniority (e.g. Senior can take Mid/Junior work)
              </span>
            </label>
          </div>

          <div className="text-gray-500">
            Available candidates: <strong className="text-gray-700">{eligibleCandidates.length}</strong>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* SECTION 1: WORKLOAD-BASED OPTIMAL COMBINATION CARD */}
          {bestCombo && (
            <div className="rounded-2xl border border-gray-300/40 bg-white from-gray-100 via-white/80 to-white p-5 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-gray-100/10 rounded-full blur-3xl pointer-events-none" />

              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-4 border-b border-gray-300/20 gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-gray-900/30 border border-gray-300/50 flex items-center justify-center text-gray-700">
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs uppercase tracking-wider font-bold text-gray-700">
                        {bestCombo.employees.length > 1
                          ? `Combination ${bestCombo.employees.length} people Best Workload Balance`
                          : 'Candidate with best workload balance'}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-700 border border-gray-300">
                        Top 1 Workload Balance
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      This choice narrows the workload gap across the team.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleAssignCombination(bestCombo.selectedEmployeeIds)}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-gray-900 to-gray-900 hover:from-gray-800 hover:to-gray-700 text-white font-semibold text-xs shadow-lg shadow-gray-900/25 transition-all flex items-center gap-2 cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>
                      {bestCombo.employees.length > 1
                        ? `Assign combination (${bestCombo.employees.length} people)`
                        : 'Assign now'}
                    </span>
                  </button>
                </div>
              </div>

              {/* Metrics Bar */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4 text-xs">
                <div className="bg-white p-3 rounded-xl border border-gray-200">
                  <div className="text-gray-500 text-[11px]">Busiest-to-least-busy gap</div>
                  <div className="text-base font-bold text-gray-700 mt-0.5">
                    {bestCombo.averageImbalance}%
                    <span className="text-[10px] text-gray-700 font-normal ml-1">
                      (Smallest gap)
                    </span>
                  </div>
                </div>

                <div className="bg-white p-3 rounded-xl border border-gray-200">
                  <div className="text-gray-500 text-[11px]">Workload assessment</div>
                  <div className="text-base font-bold text-gray-700 mt-0.5 flex items-center gap-1">
                    <span>Optimally balanced</span>
                  </div>
                </div>

                <div className="bg-white p-3 rounded-xl border border-gray-200">
                  <div className="text-gray-500 text-[11px]">Overload protection</div>
                  <div className="text-base font-bold text-gray-700 mt-0.5 flex items-center gap-1">
                    <Zap className="w-4 h-4 text-gray-700" />
                    <span>No one exceeds 100% capacity</span>
                  </div>
                </div>
              </div>

              {/* Selected Employees in the Combo */}
              <div className="space-y-2">
                <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                  Projected capacity for each selected person:
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {bestCombo.projectedWorkloads.map((pw) => (
                    <div
                      key={pw.employee.id}
                      className="p-3 rounded-xl bg-white border border-gray-200 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="text-2xl p-1 bg-gray-50 rounded-lg border border-gray-200">
                          {pw.employee.avatar}
                        </span>
                        <div>
                          <div className="font-bold text-gray-900 text-sm">
                            {pw.employee.name}
                          </div>
                          <div className="text-[11px] text-gray-500">
                            {pw.employee.role} • {pw.employee.seniority}
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="flex items-center gap-1.5 justify-end">
                          <span className="text-gray-500 text-[11px]">Projected load:</span>
                          <span
                            className={`font-bold ${
                              pw.averageProjectedUtilization > 85
                                ? 'text-gray-700'
                                : 'text-gray-700'
                            }`}
                          >
                            {pw.averageProjectedUtilization}%
                          </span>
                        </div>
                        <div className="text-[10px] text-gray-500">
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
                <div className="mt-4 pt-3 border-t border-gray-200">
                  <button
                    onClick={() => setShowAlternativeCombos(!showAlternativeCombos)}
                    className="text-xs text-gray-700 hover:text-gray-700 flex items-center gap-1 font-medium transition-colors cursor-pointer"
                  >
                    <span>
                      {showAlternativeCombos ? 'Hide' : 'View more'} {otherCombos.length} other feasible options to compare
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
                          className="p-3 rounded-xl bg-white border border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-gray-500 font-bold">#{idx + 2}</span>
                            <div className="flex items-center gap-2">
                              {combo.employees.map((e) => (
                                <span
                                  key={e.id}
                                  className="px-2 py-1 rounded bg-gray-50 border border-gray-200 text-gray-900"
                                >
                                  {e.avatar} {e.name}
                                </span>
                              ))}
                            </div>
                          </div>

                          <div className="flex items-center gap-4 text-gray-500 justify-between sm:justify-end">
                            <span>
                              Imbalance: <strong className="text-gray-900">{combo.averageImbalance}%</strong>
                            </span>
                            <span>
                              Variance: <strong className="text-gray-900">{combo.overallVariance}</strong>
                            </span>
                            <button
                              onClick={() => handleAssignCombination(combo.selectedEmployeeIds)}
                              className="px-3 py-1 rounded-lg bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200 transition-colors"
                            >
                              Choose this option
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
            <div className="text-center py-12 border border-dashed border-gray-200 rounded-xl bg-gray-50">
              <UserX className="w-12 h-12 text-gray-500 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-gray-700 m-0">
                No eligible employees found
              </h3>
              <p className="text-xs text-gray-500 mt-1 max-w-md mx-auto">
                All employees in this role are booked or lack availability throughout the project.
              </p>
              <button
                onClick={() => setShowIneligible(true)}
                className="mt-4 px-3 py-1.5 rounded-lg bg-gray-50 text-gray-700 text-xs hover:bg-gray-100 transition-colors"
              >
                View ineligible employees and reasons
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center justify-between">
                <span>Available candidates</span>
                <span>Projected load</span>
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
                    className="p-4 rounded-xl border border-gray-200 bg-gray-50 hover:bg-gray-50 hover:border-gray-300/50 transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4 group"
                  >
                    <div className="flex items-start gap-3 flex-1">
                      <div className="text-3xl p-1 bg-gray-50 rounded-xl border border-gray-200 flex-shrink-0">
                        {candidate.employee.avatar}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-gray-900 text-base">
                            {candidate.employee.name}
                          </span>
                          <span className="text-xs px-2 py-0.5 rounded-md bg-gray-50 text-gray-700 border border-gray-200">
                            {candidate.employee.role}
                          </span>
                          <span
                            className={`text-xs px-2 py-0.5 rounded-md font-medium ${
                              candidate.employee.seniority === 'Lead'
                                ? 'bg-gray-100 text-gray-700 border border-gray-300'
                                : candidate.employee.seniority === 'Senior'
                                ? 'bg-gray-100/20 text-gray-700 border border-gray-300/30'
                                : candidate.employee.seniority === 'Mid'
                                ? 'bg-gray-100 text-gray-700 border border-gray-300'
                                : 'bg-gray-100 text-gray-700'
                            }`}
                          >
                            {candidate.employee.seniority}
                          </span>

                          {idx === 0 && (
                            <span className="text-xs px-2 py-0.5 rounded-md bg-gray-100 text-gray-700 border border-gray-300 flex items-center gap-1 font-semibold">
                              <Star className="w-3 h-3 fill-gray-700" />
                              High priority
                            </span>
                          )}
                        </div>

                        {/* Weekly remaining hours breakdown */}
                        <div className="mt-2.5 flex items-center gap-3 text-xs flex-wrap">
                          {projectedBreakdown.map((wb) => (
                            <div
                              key={wb.weekStartDate}
                              className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-lg border border-gray-200"
                            >
                              <span className="text-gray-500">
                                {formatShortDate(wb.weekStartDate)}:
                              </span>
                              <span className="font-semibold text-gray-700">
                                Available {wb.remaining}h
                              </span>
                              <span className="text-gray-500">
                                &rarr; After assignment: <strong className="text-gray-900">{wb.projected}%</strong>
                              </span>
                            </div>
                          ))}

                          <div className="text-gray-500 ml-1">
                            Projected load:{' '}
                            <span
                              className={
                                avgProjected > 85
                                  ? 'text-gray-700 font-semibold'
                                  : 'text-gray-900 font-semibold'
                              }
                            >
                              {avgProjected}%
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 pt-3 md:pt-0 border-gray-200">
                      <button
                        onClick={() => handleAssignSingle(candidate.employee.id)}
                        className="px-4 py-2 rounded-xl bg-gray-50 hover:bg-gray-900 text-gray-900 hover:text-white font-medium text-xs transition-all flex items-center gap-1.5 shadow-sm border border-gray-200 hover:border-gray-300 cursor-pointer"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Assign this person</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* SECTION 3: INELIGIBLE CANDIDATES WITH REASONS */}
          <div className="pt-4 border-t border-gray-200">
            <button
              onClick={() => setShowIneligible(!showIneligible)}
              className="text-xs text-gray-500 hover:text-gray-900 flex items-center gap-1.5 font-medium transition-colors cursor-pointer"
            >
              <span>
                {showIneligible ? 'Hide' : 'View'} {ineligibleCandidates.length} ineligible employees
              </span>
              <span className="text-[10px] bg-gray-50 px-1.5 py-0.5 rounded text-gray-500">
                {showIneligible ? '▲' : '▼'}
              </span>
            </button>

            {showIneligible && (
              <div className="mt-3 space-y-2">
                {ineligibleCandidates.map((candidate) => (
                  <div
                    key={candidate.employee.id}
                    className="p-3 rounded-lg border border-gray-200 bg-white flex items-start justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{candidate.employee.avatar}</span>
                      <span className="font-medium text-gray-700">
                        {candidate.employee.name}
                      </span>
                      <span className="text-gray-500">
                        ({candidate.employee.role} • {candidate.employee.seniority})
                      </span>
                    </div>

                    <div className="flex flex-col items-end gap-1">
                      {candidate.reasons.map((r, i) => (
                        <span
                          key={i}
                          className="flex items-center gap-1 text-gray-700 bg-gray-100 px-2 py-0.5 rounded border border-gray-300 text-[11px]"
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
        <div className="p-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-gray-100" />
            <span>
              Automatically select the combination that best balances team workload
            </span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-gray-50 hover:bg-gray-100 text-gray-700 transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
