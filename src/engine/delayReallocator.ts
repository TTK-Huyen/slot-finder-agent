import type {
  Assignment,
  DelayReallocationPlan,
  DelayStaffingNeed,
  DelayStaffingProposal,
  Employee,
  EmployeeWeeklyCapacity,
  EmployeeWeeklyWorkload,
  Project,
  ProjectStaffingRequirement,
} from '../types';
import { addDays, formatDate, getWeeksCovered, parseDate } from '../utils/dateUtils';
import { getAvailableCapacityForWeek, getCommittedHoursForWeek } from './matchingEngine';
import { optimizeWorkloadSelection } from './workloadOptimizer';

export interface PlanDelayParams {
  projectId: string;
  newDeadline: string;
  staffingNeeds: DelayStaffingNeed[];
  allProjects: Project[];
  allRequirements: ProjectStaffingRequirement[];
  allAssignments: Assignment[];
  allEmployees: Employee[];
  capacities: EmployeeWeeklyCapacity[];
  allowHigherSeniority?: boolean;
}

export interface ApplyDelayResult {
  success: boolean;
  updatedProjects?: Project[];
  updatedAssignments?: Assignment[];
  reason?: string;
}

function dateAfter(date: string): string {
  return formatDate(addDays(parseDate(date), 1));
}

function validationKey(project: Project, staffingNeeds: DelayStaffingNeed[], assignments: Assignment[]): string {
  return JSON.stringify({
    project: [project.id, project.endDate],
    staffingNeeds: [...staffingNeeds].sort((a, b) => a.requirementId.localeCompare(b.requirementId)),
    assignments: assignments
      .filter((a) => a.projectId === project.id)
      .map((a) => [a.id, a.employeeId, a.allocatedHoursPerWeek, a.startDate || '', a.endDate || '', a.status])
      .sort(),
  });
}

function weeklyWorkload(
  employee: Employee,
  week: string,
  proposedHours: number,
  assignments: Assignment[],
  projects: Project[],
  capacities: EmployeeWeeklyCapacity[]
): EmployeeWeeklyWorkload {
  const availableWorkingHours = getAvailableCapacityForWeek(employee, week, capacities);
  const existingAllocatedHours = getCommittedHoursForWeek(employee.id, week, assignments, projects);
  const projectedUtilization = availableWorkingHours > 0
    ? ((existingAllocatedHours + proposedHours) / availableWorkingHours) * 100
    : existingAllocatedHours + proposedHours > 0 ? 999 : 0;
  return {
    weekStartDate: week,
    existingAllocatedHours,
    proposedHours,
    availableWorkingHours,
    projectedUtilization: Number(projectedUtilization.toFixed(2)),
  };
}

function proposal(
  req: ProjectStaffingRequirement,
  assignment: Assignment | null,
  employee: Employee | null,
  hours: number,
  weeks: string[],
  assignments: Assignment[],
  projects: Project[],
  capacities: EmployeeWeeklyCapacity[],
  retainedIncumbent: boolean,
  replacement: DelayStaffingProposal['replacement'],
  conflicts: string[],
  feasible: boolean
): DelayStaffingProposal {
  return {
    id: `delay-proposal-${req.id}-${assignment?.id || 'unfilled'}`,
    assignmentId: assignment?.id || null,
    requirementId: req.id,
    employeeId: employee?.id || null,
    employeeName: employee?.name || null,
    role: req.role,
    seniority: req.seniority,
    hoursPerWeek: hours,
    affectedWeeks: weeks,
    retainedIncumbent,
    replacement,
    weeklyWorkloads: employee
      ? weeks.map((week) => weeklyWorkload(employee, week, hours, assignments, projects, capacities))
      : [],
    conflicts,
    isFeasible: feasible,
  };
}

export function planDelayReallocation({
  projectId,
  newDeadline,
  staffingNeeds,
  allProjects,
  allRequirements,
  allAssignments,
  allEmployees,
  capacities,
  allowHigherSeniority = true,
}: PlanDelayParams): DelayReallocationPlan {
  const project = allProjects.find((p) => p.id === projectId);
  const empty = (reason: string, key = ''): DelayReallocationPlan => ({
    projectId,
    originalDeadline: project?.endDate || '',
    newDeadline,
    affectedWeeks: [],
    staffingNeeds,
    proposals: [],
    unfilledPositions: [],
    isFeasible: false,
    unfeasibleReason: reason,
    validationKey: key,
  });
  if (!project) return empty('Project not found.');
  const key = validationKey(project, staffingNeeds, allAssignments);
  if (newDeadline <= project.endDate) return empty('The new deadline must be after the current project deadline.', key);

  const affectedWeeks = getWeeksCovered(dateAfter(project.endDate), newDeadline);
  const extendedProject = { ...project, endDate: newDeadline };
  const baseAssignments = allAssignments.map((a) =>
    a.projectId === projectId ? { ...a, endDate: project.endDate } : a
  );
  const projectAssignments = allAssignments.filter((a) => a.projectId === projectId);
  const proposals: DelayStaffingProposal[] = [];
  const unfilledPositions: DelayReallocationPlan['unfilledPositions'] = [];
  let simulated = [...baseAssignments];

  for (const need of staffingNeeds) {
    const req = allRequirements.find((r) => r.id === need.requirementId && r.projectId === projectId);
    if (!req) return empty(`Staffing requirement ${need.requirementId} was not found.`, key);
    const assigned = projectAssignments.filter((a) => a.requirementId === req.id).slice(0, need.requiredCount);

    for (let index = 0; index < need.requiredCount; index += 1) {
      const incumbentAssignment = assigned[index] || null;
      const incumbent = incumbentAssignment
        ? allEmployees.find((e) => e.id === incumbentAssignment.employeeId) || null
        : null;
      const hours = need.hoursPerWeek;
      const incumbentConflicts = incumbent
        ? affectedWeeks.flatMap((week) => {
            const w = weeklyWorkload(incumbent, week, hours, simulated, [extendedProject, ...allProjects], capacities);
            return w.projectedUtilization > 100
              ? [`${incumbent.name}: ${week} ${w.existingAllocatedHours + hours}h/${w.availableWorkingHours}h`] : [];
          })
        : ['No current assignment exists for this role'];

      if (incumbentAssignment && incumbent && incumbentAssignment.allocatedHoursPerWeek === hours && incumbentConflicts.length === 0) {
        proposals.push(proposal(req, incumbentAssignment, incumbent, hours, affectedWeeks, simulated, [extendedProject, ...allProjects], capacities, true, null, [], true));
        simulated = simulated.map((a) => a.id === incumbentAssignment.id ? { ...a, endDate: newDeadline } : a);
        continue;
      }

      const virtualReq = { ...req, id: `delay-req-${req.id}-${index}`, requiredCount: 1, hoursPerWeek: hours };
      const result = optimizeWorkloadSelection(
        virtualReq,
        extendedProject,
        allEmployees.filter((e) => e.id !== incumbent?.id),
        capacities,
        simulated,
        [extendedProject, ...allProjects],
        { allowHigherSeniority, exactPositionMatch: !allowHigherSeniority }
      );
      const replacement = result.bestCombination && result.bestCombination.isValid ? result.bestCombination : null;
      if (!replacement || replacement.employees.length === 0) {
        proposals.push(proposal(req, incumbentAssignment, null, hours, affectedWeeks, simulated, [extendedProject, ...allProjects], capacities, false, null, incumbentConflicts, false));
        unfilledPositions.push({ requirementId: req.id, role: req.role, seniority: req.seniority, hoursPerWeek: hours });
        continue;
      }

      const employee = replacement.employees[0];
      proposals.push(proposal(req, incumbentAssignment, employee, hours, affectedWeeks, simulated, [extendedProject, ...allProjects], capacities, false, replacement, incumbentConflicts, true));
      simulated.push({
        id: `delay-sim-${req.id}-${index}`,
        projectId,
        requirementId: req.id,
        employeeId: employee.id,
        allocatedHoursPerWeek: hours,
        startDate: dateAfter(project.endDate),
        endDate: newDeadline,
        status: 'Confirmed',
      });
    }
  }

  return {
    projectId,
    originalDeadline: project.endDate,
    newDeadline,
    affectedWeeks,
    staffingNeeds,
    proposals,
    unfilledPositions,
    isFeasible: unfilledPositions.length === 0,
    unfeasibleReason: unfilledPositions.length ? 'No feasible capacity is available for all positions during the affected weeks.' : undefined,
    validationKey: key,
  };
}

export function applyDelayReallocation(
  plan: DelayReallocationPlan,
  projects: Project[],
  assignments: Assignment[],
  requirements: ProjectStaffingRequirement[],
  capacities: EmployeeWeeklyCapacity[],
  employees: Employee[]
): ApplyDelayResult {
  if (!plan.isFeasible) return { success: false, reason: plan.unfeasibleReason || 'The proposed plan is not feasible.' };
  const project = projects.find((p) => p.id === plan.projectId);
  if (!project) return { success: false, reason: 'The matching project was not found.' };
  if (validationKey(project, plan.staffingNeeds, assignments) !== plan.validationKey) {
    return { success: false, reason: 'Data changed before approval. The plan must be recalculated.' };
  }

  const start = dateAfter(project.endDate);
  const updatedProjects = projects.map((p) => p.id === project.id ? { ...p, endDate: plan.newDeadline } : p);
  let updatedAssignments = [...assignments];
  for (const p of plan.proposals) {
    const assignment = p.assignmentId ? updatedAssignments.find((a) => a.id === p.assignmentId) : null;
    const employee = p.employeeId ? employees.find((e) => e.id === p.employeeId) : null;
    const req = requirements.find((r) => r.id === p.requirementId);
    if (!employee || !req) return { success: false, reason: 'Employee or staffing requirement data changed before approval.' };
    const check = updatedAssignments.filter((a) => a.id !== assignment?.id);
    const conflicts = plan.affectedWeeks.filter((week) => weeklyWorkload(employee, week, p.hoursPerWeek, check, updatedProjects, capacities).projectedUtilization > 100);
    if (conflicts.length) return { success: false, reason: `Data changed before approval: ${employee.name} has capacity conflicts in ${conflicts.join(', ')}.` };
    if (p.retainedIncumbent && assignment) {
      updatedAssignments = updatedAssignments.map((a) => a.id === assignment.id ? { ...a, endDate: plan.newDeadline, allocatedHoursPerWeek: p.hoursPerWeek } : a);
    } else {
      if (assignment) updatedAssignments = updatedAssignments.map((a) => a.id === assignment.id ? { ...a, endDate: project.endDate } : a);
      updatedAssignments.push({ id: `asg-delay-${Date.now()}-${p.requirementId}`, projectId: project.id, requirementId: p.requirementId, employeeId: employee.id, allocatedHoursPerWeek: p.hoursPerWeek, startDate: start, endDate: plan.newDeadline, status: 'Confirmed' });
    }
  }
  return { success: true, updatedProjects, updatedAssignments };
}
