export type Role = 'Project Manager' | 'Business Analyst' | 'Developer' | 'QA';

export type Seniority = 'Junior' | 'Mid' | 'Senior' | 'Lead';

export interface Employee {
  id: string;
  name: string;
  role: Role;
  seniority: Seniority;
  avatar: string;
  baseWeeklyHours: number; // e.g. 40
}

export interface EmployeeWeeklyCapacity {
  id: string;
  employeeId: string;
  weekStartDate: string; // YYYY-MM-DD (Monday)
  availableHours: number; // baseWeeklyHours - leave/holidays
}

export interface Project {
  id: string;
  name: string;
  client: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  status: 'Planning' | 'Active' | 'Completed';
}

export interface ProjectSprint {
  id: string;
  projectId: string;
  sprintNumber: number;
  name: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
}

export interface SprintStaffingRequirement {
  id: string;
  sprintId: string;
  role: Role;
  seniority: Seniority;
  requiredCount: number;
  hoursPerWeek: number; // hours per person per week
}

export interface Assignment {
  id: string;
  requirementId: string;
  sprintId: string;
  employeeId: string;
  allocatedHoursPerWeek: number;
  status: 'Confirmed' | 'Tentative';
}

export interface CandidateEvaluation {
  employee: Employee;
  isEligible: boolean;
  reasons: string[]; // reasons if not eligible
  weeklyBreakdown: {
    weekStartDate: string;
    capacity: number;
    committed: number;
    remaining: number;
    required: number;
    isWeekSufficient: boolean;
  }[];
  continuityBonus: boolean; // whether worked on previous sprint of this project
  averageUtilizationPercent: number;
  score: number;
}
