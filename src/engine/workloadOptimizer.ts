import type {
  AllocationCombination,
  Assignment,
  Employee,
  EmployeeProjectedWorkload,
  EmployeeWeeklyCapacity,
  EmployeeWeeklyWorkload,
  Project,
  ProjectStaffingRequirement,
  WorkloadOptimizationResult,
} from '../types';
import { getWeeksCovered } from '../utils/dateUtils';
import {
  getAvailableCapacityForWeek,
  getCommittedHoursForWeek,
} from './matchingEngine';

export interface WorkloadOptimizerOptions {
  allowHigherSeniority?: boolean; // Default true: higher seniority can take lower level
  exactPositionMatch?: boolean;   // If true, strictly matches exact seniority
}

const SENIORITY_LEVELS: Record<string, number> = {
  Junior: 1,
  Mid: 2,
  Senior: 3,
  Lead: 4,
};

/**
 * Generate all combinations of k elements from array.
 */
export function getCombinations<T>(arr: T[], k: number): T[][] {
  if (k === 0) return [[]];
  if (arr.length < k) return [];
  if (arr.length === k) return [arr];

  const head = arr[0];
  const tail = arr.slice(1);

  const withHead = getCombinations(tail, k - 1).map((combo) => [head, ...combo]);
  const withoutHead = getCombinations(tail, k);

  return [...withHead, ...withoutHead];
}

/**
 * Workload-Based Employee Selection Algorithm.
 * Optimizes team workload balance for a project requirement without needing sprints.
 */
export function optimizeWorkloadSelection(
  requirement: ProjectStaffingRequirement,
  project: Project,
  allEmployees: Employee[],
  capacities: EmployeeWeeklyCapacity[],
  assignments: Assignment[],
  allProjects: Project[],
  options: WorkloadOptimizerOptions = { allowHigherSeniority: false }
): WorkloadOptimizationResult {
  const relevantWeeks = getWeeksCovered(project.startDate, project.endDate);
  const requiredCount = requirement.requiredCount;
  const proposedHoursPerWeek = requirement.hoursPerWeek;

  const alreadyAssignedIds = new Set<string>(
    assignments
      .filter((a) => a.requirementId === requirement.id)
      .map((a) => a.employeeId)
  );

  // 1. Filter eligible employees and comparable pool
  const eligibleEmployees: Employee[] = [];
  const ineligibleEmployees: { employee: Employee; reasons: string[] }[] = [];
  const comparablePool: Employee[] = [];

  const reqSeniorityVal = SENIORITY_LEVELS[requirement.seniority] || 1;

  for (const emp of allEmployees) {
    const reasons: string[] = [];
    const isRoleMatch = emp.role === requirement.role;
    let isSeniorityMatch = false;

    const empSeniorityVal = SENIORITY_LEVELS[emp.seniority] || 1;
    if (options.exactPositionMatch) {
      isSeniorityMatch = emp.seniority === requirement.seniority;
    } else if (options.allowHigherSeniority) {
      isSeniorityMatch = empSeniorityVal >= reqSeniorityVal;
    } else {
      isSeniorityMatch = emp.seniority === requirement.seniority;
    }

    if (!isRoleMatch) {
      reasons.push(`Vai trò không khớp (Hiện tại: ${emp.role}, Cần: ${requirement.role})`);
    }

    if (!isSeniorityMatch) {
      reasons.push(`Cấp độ không khớp (Hiện tại: ${emp.seniority}, Cần: ${requirement.seniority})`);
    }

    const isComparable = isRoleMatch && isSeniorityMatch;
    if (isComparable) {
      comparablePool.push(emp);
    }

    if (alreadyAssignedIds.has(emp.id)) {
      reasons.push('Đã được phân công vào vị trí này');
    }

    // Check capacity & remaining available hours separately for each week
    let hasInsufficientHoursInAnyWeek = false;
    for (const week of relevantWeeks) {
      const capacity = getAvailableCapacityForWeek(emp, week, capacities);
      const committed = getCommittedHoursForWeek(emp.id, week, assignments, allProjects);
      const remaining = capacity - committed;

      if (capacity <= 0 || remaining < proposedHoursPerWeek) {
        hasInsufficientHoursInAnyWeek = true;
        reasons.push(
          `Không đủ giờ khả dụng tại tuần ${week} (Còn trống: ${Math.max(
            0,
            remaining
          )}h, Cần: ${proposedHoursPerWeek}h)`
        );
      }
    }

    if (isComparable && !alreadyAssignedIds.has(emp.id) && !hasInsufficientHoursInAnyWeek) {
      eligibleEmployees.push(emp);
    } else {
      ineligibleEmployees.push({ employee: emp, reasons });
    }
  }

  // Not enough eligible employees to form a complete combination
  if (eligibleEmployees.length < requiredCount || requiredCount <= 0) {
    return {
      requirement,
      project,
      relevantWeeks,
      eligibleEmployees,
      ineligibleEmployees,
      comparablePool,
      combinations: [],
      bestCombination: null,
    };
  }

  // 2. Generate and evaluate all combinations
  const rawCombos = getCombinations(eligibleEmployees, requiredCount);
  const evaluationPool =
    comparablePool.length >= eligibleEmployees.length ? comparablePool : eligibleEmployees;

  const combinations: AllocationCombination[] = rawCombos.map((comboEmployees) => {
    const selectedIds = new Set(comboEmployees.map((e) => e.id));
    const sortedIds = [...selectedIds].sort();
    const tieBreakerKey = sortedIds.join(',');

    // Calculate projected workload for selected employees
    const projectedWorkloads: EmployeeProjectedWorkload[] = comboEmployees.map((emp) => {
      const weeklyWorkloads: EmployeeWeeklyWorkload[] = relevantWeeks.map((week) => {
        const capacity = getAvailableCapacityForWeek(emp, week, capacities);
        const existing = getCommittedHoursForWeek(emp.id, week, assignments, allProjects);
        const proposed = proposedHoursPerWeek;
        const projectedUtil = capacity > 0 ? ((existing + proposed) / capacity) * 100 : 999;

        return {
          weekStartDate: week,
          existingAllocatedHours: existing,
          proposedHours: proposed,
          availableWorkingHours: capacity,
          projectedUtilization: Number(projectedUtil.toFixed(2)),
        };
      });

      const avgUtil =
        weeklyWorkloads.reduce((acc, w) => acc + w.projectedUtilization, 0) /
        weeklyWorkloads.length;
      const maxUtil = Math.max(...weeklyWorkloads.map((w) => w.projectedUtilization));

      return {
        employee: emp,
        weeklyWorkloads,
        averageProjectedUtilization: Number(avgUtil.toFixed(2)),
        maxProjectedUtilization: Number(maxUtil.toFixed(2)),
      };
    });

    // Check no employee exceeds 100% in any week
    let isValid = true;
    for (const pw of projectedWorkloads) {
      for (const ww of pw.weeklyWorkloads) {
        if (ww.projectedUtilization > 100.0) {
          isValid = false;
          break;
        }
      }
      if (!isValid) break;
    }

    // Measure workload imbalance across the comparable pool in each week
    const weeklyImbalances = relevantWeeks.map((week) => {
      const projectedRates = evaluationPool.map((emp) => {
        const capacity = getAvailableCapacityForWeek(emp, week, capacities);
        const existing = getCommittedHoursForWeek(emp.id, week, assignments, allProjects);
        const proposed = selectedIds.has(emp.id) ? proposedHoursPerWeek : 0;
        return capacity > 0 ? ((existing + proposed) / capacity) * 100 : 0;
      });

      const highest = Math.max(...projectedRates);
      const lowest = Math.min(...projectedRates);
      const difference = highest - lowest;

      const mean = projectedRates.reduce((a, b) => a + b, 0) / (projectedRates.length || 1);
      const variance =
        projectedRates.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) /
        (projectedRates.length || 1);

      return {
        weekStartDate: week,
        highestUtilization: Number(highest.toFixed(2)),
        lowestUtilization: Number(lowest.toFixed(2)),
        difference: Number(difference.toFixed(4)),
        variance: Number(variance.toFixed(4)),
      };
    });

    const averageImbalance =
      weeklyImbalances.reduce((acc, w) => acc + w.difference, 0) /
      (weeklyImbalances.length || 1);

    const maxImbalance = Math.max(...weeklyImbalances.map((w) => w.difference));

    const overallVariance =
      weeklyImbalances.reduce((acc, w) => acc + w.variance, 0) /
      (weeklyImbalances.length || 1);

    return {
      id: `combo-${tieBreakerKey}`,
      employees: comboEmployees,
      selectedEmployeeIds: sortedIds,
      projectedWorkloads,
      weeklyImbalances,
      maxImbalance: Number(maxImbalance.toFixed(4)),
      averageImbalance: Number(averageImbalance.toFixed(4)),
      overallVariance: Number(overallVariance.toFixed(4)),
      isValid,
      tieBreakerKey,
    };
  });

  // Sort combinations:
  // 1. Valid first (<= 100%)
  // 2. Minimum average imbalance (maximizing team balance)
  // 3. Minimum max imbalance
  // 4. Minimum overall variance
  // 5. Consistent tie-breaker: employee ID string
  combinations.sort((a, b) => {
    if (a.isValid && !b.isValid) return -1;
    if (!a.isValid && b.isValid) return 1;

    const imbalanceDiff = a.averageImbalance - b.averageImbalance;
    if (Math.abs(imbalanceDiff) > 1e-4) {
      return imbalanceDiff;
    }

    const maxImbDiff = a.maxImbalance - b.maxImbalance;
    if (Math.abs(maxImbDiff) > 1e-4) {
      return maxImbDiff;
    }

    const varianceDiff = a.overallVariance - b.overallVariance;
    if (Math.abs(varianceDiff) > 1e-4) {
      return varianceDiff;
    }

    return a.tieBreakerKey.localeCompare(b.tieBreakerKey);
  });

  return {
    requirement,
    project,
    relevantWeeks,
    eligibleEmployees,
    ineligibleEmployees,
    comparablePool: evaluationPool,
    combinations,
    bestCombination: combinations.length > 0 ? combinations[0] : null,
  };
}
