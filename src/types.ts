export type Role = 'Project Manager' | 'Business Analyst' | 'Developer' | 'QA';

export type Seniority = 'Junior' | 'Mid' | 'Senior' | 'Lead';

export interface Employee {
  id: string;
  name: string;
  role: Role;
  seniority: Seniority;
  avatar: string;
  baseWeeklyHours: number; // Mặc định 40h/tuần
}

export interface EmployeeWeeklyCapacity {
  id: string;
  employeeId: string;
  weekStartDate: string; // YYYY-MM-DD (Thứ Hai)
  availableHours: number; // Đã trừ ngày nghỉ lễ/phép
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
  requiredCount: number; // Số lượng người cần
  hoursPerWeek: number;  // Số giờ/người/tuần
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
