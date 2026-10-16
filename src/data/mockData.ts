import type {
  Assignment,
  Employee,
  EmployeeWeeklyCapacity,
  Project,
  ProjectSprint,
  SprintStaffingRequirement,
} from '../types';

export const INITIAL_EMPLOYEES: Employee[] = [
  // PM
  { id: 'emp-1', name: 'Nguyễn Văn An', role: 'Project Manager', seniority: 'Senior', baseWeeklyHours: 40, avatar: '👨‍💼' },
  { id: 'emp-2', name: 'Trần Thị Bích', role: 'Project Manager', seniority: 'Mid', baseWeeklyHours: 40, avatar: '👩‍💼' },

  // BA
  { id: 'emp-3', name: 'Lê Hoàng Cường', role: 'Business Analyst', seniority: 'Senior', baseWeeklyHours: 40, avatar: '👨‍💻' },
  { id: 'emp-4', name: 'Phạm Mỹ Duyên', role: 'Business Analyst', seniority: 'Mid', baseWeeklyHours: 40, avatar: '👩‍💻' },
  { id: 'emp-5', name: 'Đỗ Gia Hân', role: 'Business Analyst', seniority: 'Junior', baseWeeklyHours: 40, avatar: '👧' },

  // Developer
  { id: 'emp-6', name: 'Vũ Quốc Huy', role: 'Developer', seniority: 'Lead', baseWeeklyHours: 40, avatar: '🧑‍💻' },
  { id: 'emp-7', name: 'Hoàng Minh Khoa', role: 'Developer', seniority: 'Senior', baseWeeklyHours: 40, avatar: '👨‍💻' },
  { id: 'emp-8', name: 'Đặng Thuỳ Linh', role: 'Developer', seniority: 'Senior', baseWeeklyHours: 40, avatar: '👩‍💻' },
  { id: 'emp-9', name: 'Ngô Tiến Nam', role: 'Developer', seniority: 'Mid', baseWeeklyHours: 40, avatar: '🧑‍💻' },
  { id: 'emp-10', name: 'Bùi Hải Phong', role: 'Developer', seniority: 'Junior', baseWeeklyHours: 40, avatar: '👦' },

  // QA
  { id: 'emp-11', name: 'Trịnh Diệu Quỳnh', role: 'QA', seniority: 'Senior', baseWeeklyHours: 40, avatar: '👩‍🔬' },
  { id: 'emp-12', name: 'Lý Gia Sơn', role: 'QA', seniority: 'Mid', baseWeeklyHours: 40, avatar: '👨‍🔬' },
  { id: 'emp-13', name: 'Mai Thu Thảo', role: 'QA', seniority: 'Junior', baseWeeklyHours: 40, avatar: '👧' },
];

// Sample baseline dates (Weeks in Oct/Nov 2026)
// W1: 2026-10-12
// W2: 2026-10-19
// W3: 2026-10-26
// W4: 2026-11-02
// W5: 2026-11-09
// W6: 2026-11-16

export const INITIAL_CAPACITIES: EmployeeWeeklyCapacity[] = [
  // Đặng Thuỳ Linh xin nghỉ phép 2 ngày ở tuần 2026-10-19 -> Available chỉ còn 24h
  { id: 'cap-1', employeeId: 'emp-8', weekStartDate: '2026-10-19', availableHours: 24 },
  // Trịnh Diệu Quỳnh nghỉ phép 1 ngày ở tuần 2026-10-26 -> Available còn 32h
  { id: 'cap-2', employeeId: 'emp-11', weekStartDate: '2026-10-26', availableHours: 32 },
  // Vũ Quốc Huy (Lead) chỉ có 30h cho project vì 10h làm internal tech training
  { id: 'cap-3', employeeId: 'emp-6', weekStartDate: '2026-10-12', availableHours: 30 },
  { id: 'cap-4', employeeId: 'emp-6', weekStartDate: '2026-10-19', availableHours: 30 },
  { id: 'cap-5', employeeId: 'emp-6', weekStartDate: '2026-10-26', availableHours: 30 },
  { id: 'cap-6', employeeId: 'emp-6', weekStartDate: '2026-11-02', availableHours: 30 },
];

export const INITIAL_PROJECTS: Project[] = [
  {
    id: 'proj-1',
    name: 'Fintech Mobile Banking App',
    client: 'VietBank Corp',
    startDate: '2026-10-12',
    endDate: '2026-11-08', // 4 weeks = 2 sprints
    status: 'Active',
  },
  {
    id: 'proj-2',
    name: 'Logistics Smart Routing AI',
    client: 'FastShip Global',
    startDate: '2026-10-12',
    endDate: '2026-11-22', // 6 weeks = 3 sprints
    status: 'Planning',
  },
];

export const INITIAL_SPRINTS: ProjectSprint[] = [
  // Project 1 Sprints
  {
    id: 'sprint-101',
    projectId: 'proj-1',
    sprintNumber: 1,
    name: 'Sprint 1: Core Wallet & Auth',
    startDate: '2026-10-12',
    endDate: '2026-10-25', // 2 weeks
  },
  {
    id: 'sprint-102',
    projectId: 'proj-1',
    sprintNumber: 2,
    name: 'Sprint 2: Payment Gateway & QR',
    startDate: '2026-10-26',
    endDate: '2026-11-08', // 2 weeks
  },

  // Project 2 Sprints (Need staffing!)
  {
    id: 'sprint-201',
    projectId: 'proj-2',
    sprintNumber: 1,
    name: 'Sprint 1: Architecture & Fleet Tracking',
    startDate: '2026-10-12',
    endDate: '2026-10-25', // 2 weeks
  },
  {
    id: 'sprint-202',
    projectId: 'proj-2',
    sprintNumber: 2,
    name: 'Sprint 2: Route Optimization Engine',
    startDate: '2026-10-26',
    endDate: '2026-11-08', // 2 weeks
  },
  {
    id: 'sprint-203',
    projectId: 'proj-2',
    sprintNumber: 3,
    name: 'Sprint 3: Pilot Rollout & UAT',
    startDate: '2026-11-09',
    endDate: '2026-11-22', // 2 weeks
  },
];

export const INITIAL_REQUIREMENTS: SprintStaffingRequirement[] = [
  // Project 1 - Already staffed
  {
    id: 'req-101',
    sprintId: 'sprint-101',
    role: 'Project Manager',
    seniority: 'Senior',
    requiredCount: 1,
    hoursPerWeek: 15,
  },
  {
    id: 'req-102',
    sprintId: 'sprint-101',
    role: 'Developer',
    seniority: 'Senior',
    requiredCount: 1,
    hoursPerWeek: 25,
  },
  {
    id: 'req-103',
    sprintId: 'sprint-101',
    role: 'QA',
    seniority: 'Mid',
    requiredCount: 1,
    hoursPerWeek: 20,
  },

  // Project 2 (The one PM will assign!)
  // Sprint 1
  {
    id: 'req-201',
    sprintId: 'sprint-201',
    role: 'Business Analyst',
    seniority: 'Senior',
    requiredCount: 1,
    hoursPerWeek: 20,
  },
  {
    id: 'req-202',
    sprintId: 'sprint-201',
    role: 'Developer',
    seniority: 'Senior',
    requiredCount: 2, // Needs 2 Senior Devs, 20h/week each
    hoursPerWeek: 20,
  },
  {
    id: 'req-203',
    sprintId: 'sprint-201',
    role: 'QA',
    seniority: 'Mid',
    requiredCount: 1,
    hoursPerWeek: 15,
  },

  // Sprint 2
  {
    id: 'req-204',
    sprintId: 'sprint-202',
    role: 'Developer',
    seniority: 'Senior',
    requiredCount: 2,
    hoursPerWeek: 25,
  },
  {
    id: 'req-205',
    sprintId: 'sprint-202',
    role: 'QA',
    seniority: 'Senior',
    requiredCount: 1,
    hoursPerWeek: 20,
  },
];

export const INITIAL_ASSIGNMENTS: Assignment[] = [
  // Project 1 Sprint 1 assignments:
  // PM: Nguyễn Văn An (15h/week)
  {
    id: 'asg-1',
    requirementId: 'req-101',
    sprintId: 'sprint-101',
    employeeId: 'emp-1',
    allocatedHoursPerWeek: 15,
    status: 'Confirmed',
  },
  // Senior Dev: Hoàng Minh Khoa (25h/week)
  {
    id: 'asg-2',
    requirementId: 'req-102',
    sprintId: 'sprint-101',
    employeeId: 'emp-7',
    allocatedHoursPerWeek: 25,
    status: 'Confirmed',
  },
  // QA: Lý Gia Sơn (20h/week)
  {
    id: 'asg-3',
    requirementId: 'req-103',
    sprintId: 'sprint-101',
    employeeId: 'emp-12',
    allocatedHoursPerWeek: 20,
    status: 'Confirmed',
  },
];
