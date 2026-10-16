import type {
  Assignment,
  CandidateEvaluation,
  Employee,
  EmployeeWeeklyCapacity,
  ProjectSprint,
  Seniority,
  SprintStaffingRequirement,
} from '../types';
import { getWeeksCovered } from '../utils/dateUtils';

const SENIORITY_LEVELS: Record<Seniority, number> = {
  Junior: 1,
  Mid: 2,
  Senior: 3,
  Lead: 4,
};

export interface MatchingOptions {
  allowHigherSeniority?: boolean; // Default true: Senior can take Mid slot, but exact gets higher priority
  sprintsList?: ProjectSprint[];  // List of all project sprints to map assignments back to calendar weeks
}

/**
 * Calculates committed hours for an employee in a specific calendar week.
 */
export function getCommittedHoursForWeek(
  employeeId: string,
  weekStartDate: string,
  assignments: Assignment[],
  sprints: ProjectSprint[]
): number {
  const sprintMap = new Map<string, ProjectSprint>(sprints.map((s) => [s.id, s]));

  let totalCommitted = 0;
  for (const assignment of assignments) {
    if (assignment.employeeId !== employeeId) continue;
    const sprint = sprintMap.get(assignment.sprintId);
    if (!sprint) continue;

    // Check if this sprint covers the weekStartDate
    const weeksCovered = getWeeksCovered(sprint.startDate, sprint.endDate);
    if (weeksCovered.includes(weekStartDate)) {
      totalCommitted += assignment.allocatedHoursPerWeek;
    }
  }

  return totalCommitted;
}

/**
 * Calculates available capacity for an employee in a specific calendar week.
 */
export function getAvailableCapacityForWeek(
  employee: Employee,
  weekStartDate: string,
  capacities: EmployeeWeeklyCapacity[]
): number {
  const customCapacity = capacities.find(
    (c) => c.employeeId === employee.id && c.weekStartDate === weekStartDate
  );

  return customCapacity !== undefined
    ? customCapacity.availableHours
    : employee.baseWeeklyHours;
}

/**
 * Evaluates all candidates for a specific Sprint Staffing Requirement.
 */
export function evaluateCandidatesForRequirement(
  requirement: SprintStaffingRequirement,
  currentSprint: ProjectSprint,
  allEmployees: Employee[],
  capacities: EmployeeWeeklyCapacity[],
  assignments: Assignment[],
  allSprints: ProjectSprint[],
  options: MatchingOptions = { allowHigherSeniority: true }
): CandidateEvaluation[] {
  // Sprints covered weeks
  const sprintWeeks = getWeeksCovered(currentSprint.startDate, currentSprint.endDate);

  // Find employees already assigned to other sprints of this SAME project (Continuity check)
  const employeesInThisProject = new Set<string>();
  const projectSprints = allSprints.filter((s) => s.projectId === currentSprint.projectId);
  const projectSprintIds = new Set(projectSprints.map((s) => s.id));

  for (const assignment of assignments) {
    if (projectSprintIds.has(assignment.sprintId)) {
      employeesInThisProject.add(assignment.employeeId);
    }
  }

  // Already assigned to THIS specific requirement
  const alreadyAssignedToThisReq = new Set<string>(
    assignments
      .filter((a) => a.requirementId === requirement.id)
      .map((a) => a.employeeId)
  );

  const evaluations: CandidateEvaluation[] = allEmployees.map((employee) => {
    const reasons: string[] = [];
    let isEligible = true;

    // 1. Check if already assigned to this slot
    if (alreadyAssignedToThisReq.has(employee.id)) {
      isEligible = false;
      reasons.push('Đã được phân công vào vị trí này');
    }

    // 2. Check Role
    if (employee.role !== requirement.role) {
      isEligible = false;
      reasons.push(`Vai trò không khớp (Hiện tại: ${employee.role}, Cần: ${requirement.role})`);
    }

    // 3. Check Seniority
    const empSeniorityVal = SENIORITY_LEVELS[employee.seniority];
    const reqSeniorityVal = SENIORITY_LEVELS[requirement.seniority];

    if (options.allowHigherSeniority) {
      if (empSeniorityVal < reqSeniorityVal) {
        isEligible = false;
        reasons.push(`Cấp độ chưa đủ (Hiện tại: ${employee.seniority}, Cần tối thiểu: ${requirement.seniority})`);
      }
    } else {
      if (employee.seniority !== requirement.seniority) {
        isEligible = false;
        reasons.push(`Cấp độ không trùng (Hiện tại: ${employee.seniority}, Cần: ${requirement.seniority})`);
      }
    }

    // 4. Check Capacity in each calendar week of the sprint
    let totalUtilization = 0;
    const weeklyBreakdown = sprintWeeks.map((weekStartDate) => {
      const capacity = getAvailableCapacityForWeek(employee, weekStartDate, capacities);
      const committed = getCommittedHoursForWeek(employee.id, weekStartDate, assignments, allSprints);
      const remaining = capacity - committed;
      const isWeekSufficient = remaining >= requirement.hoursPerWeek;

      if (!isWeekSufficient) {
        isEligible = false;
        const missing = requirement.hoursPerWeek - remaining;
        reasons.push(
          `Thiếu ${missing}h tại tuần ${weekStartDate} (Còn trống: ${remaining}h, Cần: ${requirement.hoursPerWeek}h)`
        );
      }

      const util = capacity > 0 ? (committed / capacity) * 100 : 100;
      totalUtilization += util;

      return {
        weekStartDate,
        capacity,
        committed,
        remaining,
        required: requirement.hoursPerWeek,
        isWeekSufficient,
      };
    });

    const averageUtilizationPercent =
      sprintWeeks.length > 0 ? totalUtilization / sprintWeeks.length : 0;

    const continuityBonus = employeesInThisProject.has(employee.id);

    // Scoring formula for ranking:
    // Base 100
    // + 30 if continuity with project
    // + 20 if exact seniority match (less overqualification)
    // - penalize high utilization to balance load across team
    let score = 0;
    if (isEligible) {
      score = 100;
      if (continuityBonus) score += 30;
      if (employee.seniority === requirement.seniority) score += 20;
      // Balance workload: lower current utilization gets a bonus up to 25 pts
      score += Math.max(0, 25 - (averageUtilizationPercent * 0.25));
    } else {
      score = -50;
    }

    return {
      employee,
      isEligible,
      reasons,
      weeklyBreakdown,
      continuityBonus,
      averageUtilizationPercent: Math.round(averageUtilizationPercent),
      score: Math.round(score),
    };
  });

  // Sort: Eligible first, sorted by score descending, then ineligible
  return evaluations.sort((a, b) => {
    if (a.isEligible && !b.isEligible) return -1;
    if (!a.isEligible && b.isEligible) return 1;
    return b.score - a.score;
  });
}
