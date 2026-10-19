import type {
  Assignment,
  DepartureReallocationPlan,
  Employee,
  EmployeeWeeklyCapacity,
  Project,
  ProjectStaffingRequirement,
} from '../types';
import { getDayBefore, getWeeksCovered } from '../utils/dateUtils';
import {
  getAvailableCapacityForWeek,
  getCommittedHoursForWeek,
} from './matchingEngine';
import { optimizeWorkloadSelection } from './workloadOptimizer';

export interface PlanDepartureParams {
  projectId: string;
  departingEmployeeId: string;
  departureDate: string; // YYYY-MM-DD
  allProjects: Project[];
  allRequirements: ProjectStaffingRequirement[];
  allAssignments: Assignment[];
  allEmployees: Employee[];
  capacities: EmployeeWeeklyCapacity[];
  allowHigherSeniority?: boolean;
}

/**
 * UC03 Main Flow 1-6:
 * Analyzes employee departure, determines required replacement from departureDate to project.endDate,
 * and finds the optimal replacement candidate to balance team workload.
 */
export function planDepartureReallocation({
  projectId,
  departingEmployeeId,
  departureDate,
  allProjects,
  allRequirements,
  allAssignments,
  allEmployees,
  capacities,
  allowHigherSeniority = true,
}: PlanDepartureParams): DepartureReallocationPlan {
  const project = allProjects.find((p) => p.id === projectId);
  const departingEmp = allEmployees.find((e) => e.id === departingEmployeeId);

  if (!project || !departingEmp) {
    return {
      projectId,
      departingEmployeeId,
      departingEmployeeName: departingEmp?.name || 'Không xác định',
      requirementId: '',
      role: 'Developer',
      seniority: 'Senior',
      hoursPerWeek: 0,
      departureDate,
      affectedWeeks: [],
      proposedReplacement: null,
      isFeasible: false,
      unfeasibleReason: 'Không tìm thấy thông tin dự án hoặc nhân viên.',
    };
  }

  // 1. Find departing employee's assignment in this project
  const currentAssignment = allAssignments.find(
    (a) => a.projectId === projectId && a.employeeId === departingEmployeeId
  );

  if (!currentAssignment) {
    return {
      projectId,
      departingEmployeeId,
      departingEmployeeName: departingEmp.name,
      requirementId: '',
      role: departingEmp.role,
      seniority: departingEmp.seniority,
      hoursPerWeek: 0,
      departureDate,
      affectedWeeks: [],
      proposedReplacement: null,
      isFeasible: false,
      unfeasibleReason: `Nhân viên ${departingEmp.name} hiện không có phân công trong dự án này.`,
    };
  }

  // 2. Identify requirement
  const requirement = allRequirements.find((r) => r.id === currentAssignment.requirementId);
  const role = requirement ? requirement.role : departingEmp.role;
  const seniority = requirement ? requirement.seniority : departingEmp.seniority;
  const hoursPerWeek = currentAssignment.allocatedHoursPerWeek;

  // 3. Determine remaining affected weeks from departureDate to project.endDate
  // If departureDate is before project start, clamp to project start
  const effectiveStart = departureDate < project.startDate ? project.startDate : departureDate;
  if (effectiveStart > project.endDate) {
    return {
      projectId,
      departingEmployeeId,
      departingEmployeeName: departingEmp.name,
      requirementId: currentAssignment.requirementId,
      role,
      seniority,
      hoursPerWeek,
      departureDate,
      affectedWeeks: [],
      proposedReplacement: null,
      isFeasible: false,
      unfeasibleReason: 'Ngày rời đi sau khi dự án đã kết thúc. Không cần thay thế.',
    };
  }

  const affectedWeeks = getWeeksCovered(effectiveStart, project.endDate);

  // 4. Temporary virtual project & requirement spanning the affected weeks
  const virtualProject: Project = {
    ...project,
    startDate: effectiveStart,
    endDate: project.endDate,
  };

  const virtualRequirement: ProjectStaffingRequirement = {
    id: `virtual-req-${Date.now()}`,
    projectId,
    role,
    seniority,
    requiredCount: 1,
    hoursPerWeek,
  };

  // Simulate current assignments with departing employee freed for the affected weeks
  const simulatedAssignments: Assignment[] = allAssignments.map((a) => {
    if (a.id === currentAssignment.id) {
      // Departing employee only occupies up to day before departure
      return {
        ...a,
        endDate: getDayBefore(effectiveStart),
      };
    }
    return a;
  });

  // Filter candidates: exclude departing employee
  const candidates = allEmployees.filter((e) => e.id !== departingEmployeeId);

  // 5. Run workload optimizer to find the best replacement
  const optimizationResult = optimizeWorkloadSelection(
    virtualRequirement,
    virtualProject,
    candidates,
    capacities,
    simulatedAssignments,
    allProjects,
    { allowHigherSeniority, exactPositionMatch: !allowHigherSeniority }
  );

  const bestCombo = optimizationResult.bestCombination;

  // Flow A1: No feasible candidate
  if (!bestCombo || bestCombo.employees.length === 0 || !bestCombo.isValid) {
    return {
      projectId,
      departingEmployeeId,
      departingEmployeeName: departingEmp.name,
      requirementId: currentAssignment.requirementId,
      role,
      seniority,
      hoursPerWeek,
      departureDate,
      affectedWeeks,
      proposedReplacement: null,
      isFeasible: false,
      unfeasibleReason: `Không có ứng viên nào có đủ thời gian trống để thay thế trong ${affectedWeeks.length} tuần còn lại của dự án.`,
    };
  }

  // Main Flow 6: Return feasible proposal
  return {
    projectId,
    departingEmployeeId,
    departingEmployeeName: departingEmp.name,
    requirementId: currentAssignment.requirementId,
    role,
    seniority,
    hoursPerWeek,
    departureDate,
    affectedWeeks,
    proposedReplacement: bestCombo,
    isFeasible: true,
  };
}

export interface ExecuteReallocationResult {
  success: boolean;
  updatedAssignments?: Assignment[];
  reason?: string;
}

/**
 * UC03 Main Flow 7-8 and Alternative Flows A2, A3:
 * Applies departure reallocation after PM approval, with A3 pre-commit validation.
 */
export function applyDepartureReallocation(
  plan: DepartureReallocationPlan,
  currentAssignments: Assignment[],
  capacities: EmployeeWeeklyCapacity[],
  projects: Project[],
  employees: Employee[]
): ExecuteReallocationResult {
  if (!plan.isFeasible || !plan.proposedReplacement || plan.proposedReplacement.employees.length === 0) {
    return {
      success: false,
      reason: plan.unfeasibleReason || 'Phương án không khả thi để phê duyệt.',
    };
  }

  const project = projects.find((p) => p.id === plan.projectId);
  if (!project) {
    return { success: false, reason: 'Không tìm thấy dự án tương ứng.' };
  }

  const replacementEmp = plan.proposedReplacement.employees[0];

  // Alternative Flow A3: Validate data has not changed concurrently before saving
  for (const week of plan.affectedWeeks) {
    const cap = getAvailableCapacityForWeek(replacementEmp, week, capacities);
    const comm = getCommittedHoursForWeek(replacementEmp.id, week, currentAssignments, projects);
    const remaining = cap - comm;
    if (remaining < plan.hoursPerWeek) {
      return {
        success: false,
        reason: `Dữ liệu thay đổi trước khi phê duyệt: ${replacementEmp.name} hiện chỉ còn ${remaining}h tại tuần ${week}, không đủ ${plan.hoursPerWeek}h. Hệ thống đã hủy phân công tự động.`,
      };
    }
  }

  // Main Flow 8: Update assignments
  const effectiveStart = plan.departureDate < project.startDate ? project.startDate : plan.departureDate;
  const isLeavingFromStart = effectiveStart <= project.startDate;

  const updatedAssignments: Assignment[] = [];

  for (const a of currentAssignments) {
    if (a.projectId === plan.projectId && a.employeeId === plan.departingEmployeeId) {
      if (!isLeavingFromStart) {
        // Truncate assignment to day before departure
        updatedAssignments.push({
          ...a,
          endDate: getDayBefore(effectiveStart),
        });
      }
      // If leaving from start, do not include (removed)
    } else {
      updatedAssignments.push(a);
    }
  }

  // Add replacement employee assignment
  const newAssignment: Assignment = {
    id: `asg-realloc-${Date.now()}`,
    projectId: plan.projectId,
    requirementId: plan.requirementId,
    employeeId: replacementEmp.id,
    allocatedHoursPerWeek: plan.hoursPerWeek,
    startDate: effectiveStart,
    endDate: project.endDate,
    status: 'Confirmed',
  };

  updatedAssignments.push(newAssignment);

  return {
    success: true,
    updatedAssignments,
  };
}
