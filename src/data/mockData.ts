import type {
  Assignment,
  Employee,
  EmployeeWeeklyCapacity,
  Project,
  ProjectStaffingRequirement,
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

export const INITIAL_CAPACITIES: EmployeeWeeklyCapacity[] = [
  // Đặng Thuỳ Linh nghỉ phép 2 ngày tuần 2026-10-19 -> còn 24h
  { id: 'cap-1', employeeId: 'emp-8', weekStartDate: '2026-10-19', availableHours: 24 },
  // Trịnh Diệu Quỳnh nghỉ phép 1 ngày tuần 2026-10-26 -> còn 32h
  { id: 'cap-2', employeeId: 'emp-11', weekStartDate: '2026-10-26', availableHours: 32 },
  // Vũ Quốc Huy (Lead) dành 10h/tuần làm đào tạo nội bộ -> còn 30h
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
    endDate: '2026-11-08', // 4 tuần
    status: 'Active',
  },
  {
    id: 'proj-2',
    name: 'Logistics Smart Routing AI',
    client: 'FastShip Global',
    startDate: '2026-10-12',
    endDate: '2026-11-08', // 4 tuần
    status: 'Planning',
  },
];

export const INITIAL_REQUIREMENTS: ProjectStaffingRequirement[] = [
  // Project 1: Đã được bố trí xong nhân sự
  {
    id: 'req-101',
    projectId: 'proj-1',
    role: 'Project Manager',
    seniority: 'Senior',
    requiredCount: 1,
    hoursPerWeek: 15,
  },
  {
    id: 'req-102',
    projectId: 'proj-1',
    role: 'Developer',
    seniority: 'Senior',
    requiredCount: 1,
    hoursPerWeek: 25,
  },
  {
    id: 'req-103',
    projectId: 'proj-1',
    role: 'QA',
    seniority: 'Mid',
    requiredCount: 1,
    hoursPerWeek: 20,
  },

  // Project 2: Cần bố trí nhân sự (PM sẽ chọn để cân bằng tải)
  {
    id: 'req-201',
    projectId: 'proj-2',
    role: 'Business Analyst',
    seniority: 'Senior',
    requiredCount: 1,
    hoursPerWeek: 20,
  },
  {
    id: 'req-202',
    projectId: 'proj-2',
    role: 'Developer',
    seniority: 'Senior',
    requiredCount: 2, // Cần 2 Senior Dev, 20h/tuần
    hoursPerWeek: 20,
  },
  {
    id: 'req-203',
    projectId: 'proj-2',
    role: 'QA',
    seniority: 'Mid',
    requiredCount: 1,
    hoursPerWeek: 15,
  },
];

export const INITIAL_ASSIGNMENTS: Assignment[] = [
  // Project 1 Assignments
  {
    id: 'asg-1',
    projectId: 'proj-1',
    requirementId: 'req-101',
    employeeId: 'emp-1', // Nguyễn Văn An
    allocatedHoursPerWeek: 15,
    status: 'Confirmed',
  },
  {
    id: 'asg-2',
    projectId: 'proj-1',
    requirementId: 'req-102',
    employeeId: 'emp-7', // Hoàng Minh Khoa (25h/tuần)
    allocatedHoursPerWeek: 25,
    status: 'Confirmed',
  },
  {
    id: 'asg-3',
    projectId: 'proj-1',
    requirementId: 'req-103',
    employeeId: 'emp-12', // Lý Gia Sơn (20h/tuần)
    allocatedHoursPerWeek: 20,
    status: 'Confirmed',
  },
];
