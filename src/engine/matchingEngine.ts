import type {
  Assignment,
  CandidateEvaluation,
  Employee,
  EmployeeWeeklyCapacity,
  Project,
  ProjectStaffingRequirement,
  Seniority,
} from '../types';
import { getWeeksCovered } from '../utils/dateUtils';

const SENIORITY_LEVELS: Record<Seniority, number> = {
  Junior: 1,
  Mid: 2,
  Senior: 3,
  Lead: 4,
};

export interface MatchingOptions {
  allowHigherSeniority?: boolean; // Default true: Senior can take Mid slot
}

/**
 * Calculates committed hours for an employee in a specific calendar week across all active projects.
 */
export function getCommittedHoursForWeek(
  employeeId: string,
  weekStartDate: string,
  assignments: Assignment[],
  projects: Project[]
): number {
  const projectMap = new Map<string, Project>(projects.map((p) => [p.id, p]));

  let totalCommitted = 0;
  for (const assignment of assignments) {
    if (assignment.employeeId !== employeeId) continue;
    const project = projectMap.get(assignment.projectId);
    if (!project) continue;

    const asgStart = assignment.startDate || project.startDate;
    const asgEnd = assignment.endDate || project.endDate;
    const weeksCovered = getWeeksCovered(asgStart, asgEnd);
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
 * Evaluates candidates for a specific Project Staffing Requirement across the project timeline.
 */
export function evaluateCandidatesForRequirement(
  requirement: ProjectStaffingRequirement,
  currentProject: Project,
  allEmployees: Employee[],
  capacities: EmployeeWeeklyCapacity[],
  assignments: Assignment[],
  allProjects: Project[],
  options: MatchingOptions = { allowHigherSeniority: true }
): CandidateEvaluation[] {
  const projectWeeks = getWeeksCovered(currentProject.startDate, currentProject.endDate);

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
      reasons.push('Already assigned to this position');
    }

    // 2. Check Role
    if (employee.role !== requirement.role) {
      isEligible = false;
      reasons.push(`Role mismatch (Current: ${employee.role}, Required: ${requirement.role})`);
    }

    // 3. Check Seniority
    const empSeniorityVal = SENIORITY_LEVELS[employee.seniority];
    const reqSeniorityVal = SENIORITY_LEVELS[requirement.seniority];

    if (options.allowHigherSeniority) {
      if (empSeniorityVal < reqSeniorityVal) {
        isEligible = false;
        reasons.push(`Seniority level is insufficient (Current: ${employee.seniority}, Required: ${requirement.seniority})`);
      }
    } else {
      if (employee.seniority !== requirement.seniority) {
        isEligible = false;
        reasons.push(`Seniority level mismatch (Current: ${employee.seniority}, Required: ${requirement.seniority})`);
      }
    }

    // 4. Check Capacity in each calendar week of the project
    let totalUtilization = 0;
    const weeklyBreakdown = projectWeeks.map((weekStartDate) => {
      const capacity = getAvailableCapacityForWeek(employee, weekStartDate, capacities);
      const committed = getCommittedHoursForWeek(employee.id, weekStartDate, assignments, allProjects);
      const remaining = capacity - committed;
      const isWeekSufficient = remaining >= requirement.hoursPerWeek;

      if (!isWeekSufficient) {
        isEligible = false;
        const missing = requirement.hoursPerWeek - remaining;
        reasons.push(
          `Missing ${missing}h in week ${weekStartDate} (Available: ${remaining}h, Required: ${requirement.hoursPerWeek}h)`
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
      projectWeeks.length > 0 ? totalUtilization / projectWeeks.length : 0;

    let score = 0;
    if (isEligible) {
      score = 100;
      if (employee.seniority === requirement.seniority) score += 20;
      score += Math.max(0, 30 - averageUtilizationPercent * 0.3);
    } else {
      score = -50;
    }

    return {
      employee,
      isEligible,
      reasons,
      weeklyBreakdown,
      averageUtilizationPercent: Math.round(averageUtilizationPercent),
      score: Math.round(score),
    };
  });

  return evaluations.sort((a, b) => {
    if (a.isEligible && !b.isEligible) return -1;
    if (!a.isEligible && b.isEligible) return 1;
    return b.score - a.score;
  });
}
