export type Role = 'Project Manager' | 'Business Analyst' | 'Developer' | 'QA';

export type Seniority = 'Junior' | 'Mid' | 'Senior' | 'Lead';

export interface Employee {
  id: string;
  name: string;
  role: Role;
  seniority: Seniority;
  avatar: string;
  baseWeeklyHours: number; // Máº·c Ä‘á»‹nh 40h/tuáº§n
}

export interface EmployeeWeeklyCapacity {
  id: string;
  employeeId: string;
  weekStartDate: string; // YYYY-MM-DD (Thá»© Hai)
  availableHours: number; // ÄÃ£ trá»« ngÃ y nghá»‰ lá»…/phÃ©p
}

export interface Project {
  id: string;
  name: string;
  client: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  status: 'Planning' | 'Active' | 'Completed';
}

export interface ProjectStaffingRequirement {
  id: string;
  projectId: string;
  role: Role;
  seniority: Seniority;
  requiredCount: number; // Sá»‘ lÆ°á»£ng ngÆ°á»i cáº§n
  hoursPerWeek: number;  // Sá»‘ giá»/ngÆ°á»i/tuáº§n
}

export interface Assignment {
  id: string;
  projectId: string;
  requirementId: string;
  employeeId: string;
  allocatedHoursPerWeek: number;
  startDate?: string; // Optional: effective start date (defaults to project.startDate)
  endDate?: string;   // Optional: effective end date (defaults to project.endDate)
  status: 'Confirmed' | 'Tentative';
}

export interface DepartureReallocationPlan {
  projectId: string;
  departingEmployeeId: string;
  departingEmployeeName: string;
  requirementId: string;
  role: Role;
  seniority: Seniority;
  hoursPerWeek: number;
  departureDate: string;
  affectedWeeks: string[];
  proposedReplacement: AllocationCombination | null;
  isFeasible: boolean;
  unfeasibleReason?: string;
}

export interface CandidateEvaluation {
  employee: Employee;
  isEligible: boolean;
  reasons: string[];
  weeklyBreakdown: {
    weekStartDate: string;
    capacity: number;
    committed: number;
    remaining: number;
    required: number;
    isWeekSufficient: boolean;
  }[];
  averageUtilizationPercent: number;
  score: number;
}

export interface EmployeeWeeklyWorkload {
  weekStartDate: string;
  existingAllocatedHours: number;
  proposedHours: number;
  availableWorkingHours: number;
  projectedUtilization: number; // in %
}

export interface EmployeeProjectedWorkload {
  employee: Employee;
  weeklyWorkloads: EmployeeWeeklyWorkload[];
  averageProjectedUtilization: number;
  maxProjectedUtilization: number;
}

export interface AllocationCombination {
  id: string;
  employees: Employee[];
  selectedEmployeeIds: string[];
  projectedWorkloads: EmployeeProjectedWorkload[];
  
  // Imbalance metrics among comparable pool
  weeklyImbalances: {
    weekStartDate: string;
    highestUtilization: number;
    lowestUtilization: number;
    difference: number;
    variance: number;
  }[];
  maxImbalance: number;       // worst-case weekly (highest - lowest)
  averageImbalance: number;   // mean weekly (highest - lowest)
  overallVariance: number;    // secondary criterion
  
  isValid: boolean;           // true if no employee exceeds 100%
  tieBreakerKey: string;      // sorted employee IDs for consistent tie-breaking
}

export interface WorkloadOptimizationResult {
  requirement: ProjectStaffingRequirement;
  project: Project;
  relevantWeeks: string[];
  eligibleEmployees: Employee[];
  ineligibleEmployees: { employee: Employee; reasons: string[] }[];
  comparablePool: Employee[];
  combinations: AllocationCombination[];
  bestCombination: AllocationCombination | null;
}

export interface DelayStaffingNeed {
  requirementId: string;
  requiredCount: number;
  hoursPerWeek: number;
}

export interface DelayStaffingProposal {
  id: string;
  assignmentId: string | null;
  requirementId: string;
  employeeId: string | null;
  employeeName: string | null;
  role: Role;
  seniority: Seniority;
  hoursPerWeek: number;
  affectedWeeks: string[];
  retainedIncumbent: boolean;
  replacement: AllocationCombination | null;
  weeklyWorkloads: EmployeeWeeklyWorkload[];
  conflicts: string[];
  isFeasible: boolean;
}

export interface DelayReallocationPlan {
  projectId: string;
  originalDeadline: string;
  newDeadline: string;
  affectedWeeks: string[];
  staffingNeeds: DelayStaffingNeed[];
  proposals: DelayStaffingProposal[];
  unfilledPositions: {
    requirementId: string;
    role: Role;
    seniority: Seniority;
    hoursPerWeek: number;
  }[];
  isFeasible: boolean;
  unfeasibleReason?: string;
  validationKey: string;
}
