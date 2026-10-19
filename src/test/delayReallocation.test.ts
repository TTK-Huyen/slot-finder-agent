import { applyDelayReallocation, planDelayReallocation } from '../engine/delayReallocator';
import type { Assignment, Employee, Project, ProjectStaffingRequirement } from '../types';

const project: Project = { id: 'delay-project', name: 'Delay', client: 'Client', startDate: '2026-10-12', endDate: '2026-10-25', status: 'Active' };
const req: ProjectStaffingRequirement = { id: 'delay-req', projectId: project.id, role: 'Developer', seniority: 'Senior', requiredCount: 1, hoursPerWeek: 20 };
const incumbent: Employee = { id: 'incumbent', name: 'Incumbent', role: 'Developer', seniority: 'Senior', baseWeeklyHours: 40, avatar: 'I' };
const replacement: Employee = { id: 'replacement', name: 'Replacement', role: 'Developer', seniority: 'Senior', baseWeeklyHours: 40, avatar: 'R' };
const assignment: Assignment = { id: 'delay-assignment', projectId: project.id, requirementId: req.id, employeeId: incumbent.id, allocatedHoursPerWeek: 20, status: 'Confirmed' };

const plan = planDelayReallocation({
  projectId: project.id, newDeadline: '2026-11-08', staffingNeeds: [{ requirementId: req.id, requiredCount: 1, hoursPerWeek: 20 }], allProjects: [project],
  allRequirements: [req], allAssignments: [assignment], allEmployees: [incumbent, replacement], capacities: [],
  allowHigherSeniority: false,
});
if (!plan.isFeasible || plan.affectedWeeks.length !== 2 || !plan.proposals[0].retainedIncumbent) {
  throw new Error('UC04 should retain an incumbent when capacity is available');
}
const applied = applyDelayReallocation(plan, [project], [assignment], [req], [], [incumbent, replacement]);
if (!applied.success || applied.updatedProjects?.[0].endDate !== '2026-11-08' || applied.updatedAssignments?.[0].endDate !== '2026-11-08') {
  throw new Error('UC04 approval should update the project and retained assignment atomically');
}
console.log('✅ UC04 delay reallocation tests passed');

