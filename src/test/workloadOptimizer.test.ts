/**
 * Unit tests for Workload-Based Employee Selection Algorithm (Project level)
 */
import { optimizeWorkloadSelection } from '../engine/workloadOptimizer.ts';
import type {
  Assignment,
  Employee,
  EmployeeWeeklyCapacity,
  Project,
  ProjectStaffingRequirement,
} from '../types.ts';

console.log('🧪 Bắt đầu kiểm thử Workload-Based Employee Selection Algorithm...\n');

let allPassed = true;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`✅ PASS: ${testName}`);
  } else {
    console.error(`❌ FAIL: ${testName}`);
    if (detail) console.error(`   ${detail}`);
    allPassed = false;
  }
}

// Common Project setup: 2 weeks (2026-10-12 to 2026-10-25)
const testProject: Project = {
  id: 'proj-workload',
  name: 'Project Workload Test',
  client: 'Test Client',
  startDate: '2026-10-12',
  endDate: '2026-10-25',
  status: 'Planning',
};

// ============================================================================
// TEST 1: Filter eligible employees (Multi-week Slicing & Role/Position check)
// ============================================================================
console.log('--- TEST 1: Lọc ứng viên đủ điều kiện (Role, Position, Multi-week capacity) ---');

const testEmployees1: Employee[] = [
  { id: 'dev-ok-1', name: 'Dev 1 (Senior)', role: 'Developer', seniority: 'Senior', baseWeeklyHours: 40, avatar: '👨‍💻' },
  { id: 'dev-ok-2', name: 'Dev 2 (Senior)', role: 'Developer', seniority: 'Senior', baseWeeklyHours: 40, avatar: '👩‍💻' },
  { id: 'dev-short-w2', name: 'Dev Thiếu tuần 2 (Senior)', role: 'Developer', seniority: 'Senior', baseWeeklyHours: 40, avatar: '🧑‍💻' },
  { id: 'dev-junior', name: 'Dev Junior', role: 'Developer', seniority: 'Junior', baseWeeklyHours: 40, avatar: '👦' },
  { id: 'qa-senior', name: 'QA Senior', role: 'QA', seniority: 'Senior', baseWeeklyHours: 40, avatar: '👩‍🔬' },
];

// dev-short-w2 has leave in week 2 (2026-10-19): available hours is only 10h
const testCapacities1: EmployeeWeeklyCapacity[] = [
  { id: 'cap-1', employeeId: 'dev-short-w2', weekStartDate: '2026-10-19', availableHours: 10 },
];

const testAssignments1: Assignment[] = [];

// Requirement: 2 Senior Developers, 20 hours/week
const req1: ProjectStaffingRequirement = {
  id: 'req-1',
  projectId: 'proj-workload',
  role: 'Developer',
  seniority: 'Senior',
  requiredCount: 2,
  hoursPerWeek: 20,
};

const result1 = optimizeWorkloadSelection(
  req1,
  testProject,
  testEmployees1,
  testCapacities1,
  testAssignments1,
  [testProject],
  { exactPositionMatch: true }
);

assert(
  result1.eligibleEmployees.length === 2 &&
    result1.eligibleEmployees.some((e) => e.id === 'dev-ok-1') &&
    result1.eligibleEmployees.some((e) => e.id === 'dev-ok-2'),
  'Chỉ chọn đúng dev-ok-1 và dev-ok-2 là đủ điều kiện'
);

assert(
  result1.ineligibleEmployees.some((i) => i.employee.id === 'dev-short-w2'),
  'Loại dev-short-w2 vì thiếu giờ ở tuần 2 (ngay cả khi tuần 1 đủ 40h)'
);

assert(
  result1.ineligibleEmployees.some((i) => i.employee.id === 'dev-junior'),
  'Loại dev-junior vì sai cấp độ chuyên môn (Junior != Senior)'
);

assert(
  result1.ineligibleEmployees.some((i) => i.employee.id === 'qa-senior'),
  'Loại qa-senior vì sai vai trò (QA != Developer)'
);

// ============================================================================
// TEST 2: Calculate projected workload and optimize workload balance
// ============================================================================
console.log('\n--- TEST 2: Tính toán Projected Workload & Tối ưu Cân bằng Tải ---');

// 4 Senior Devs with different initial loads:
// Dev A (emp-a): 30h allocated / 40h capacity (75% current)
// Dev B (emp-b): 20h allocated / 40h capacity (50% current)
// Dev C (emp-c): 10h allocated / 40h capacity (25% current)
// Dev D (emp-d):  0h allocated / 40h capacity (0% current)
const testEmployees2: Employee[] = [
  { id: 'emp-a', name: 'Dev A (Bận 75%)', role: 'Developer', seniority: 'Senior', baseWeeklyHours: 40, avatar: '👨‍💻' },
  { id: 'emp-b', name: 'Dev B (Bận 50%)', role: 'Developer', seniority: 'Senior', baseWeeklyHours: 40, avatar: '👨‍💻' },
  { id: 'emp-c', name: 'Dev C (Bận 25%)', role: 'Developer', seniority: 'Senior', baseWeeklyHours: 40, avatar: '👩‍💻' },
  { id: 'emp-d', name: 'Dev D (Rảnh 0%)', role: 'Developer', seniority: 'Senior', baseWeeklyHours: 40, avatar: '👩‍💻' },
];

const existingProject: Project = {
  id: 'proj-other',
  name: 'Existing Project',
  client: 'Other Client',
  startDate: '2026-10-12',
  endDate: '2026-10-25',
  status: 'Active',
};

const testAssignments2: Assignment[] = [
  { id: 'asg-a', projectId: 'proj-other', requirementId: 'r-a', employeeId: 'emp-a', allocatedHoursPerWeek: 30, status: 'Confirmed' },
  { id: 'asg-b', projectId: 'proj-other', requirementId: 'r-b', employeeId: 'emp-b', allocatedHoursPerWeek: 20, status: 'Confirmed' },
  { id: 'asg-c', projectId: 'proj-other', requirementId: 'r-c', employeeId: 'emp-c', allocatedHoursPerWeek: 10, status: 'Confirmed' },
];

// Requirement: Need 2 Senior Developers, 10 hours/week each
const req2: ProjectStaffingRequirement = {
  id: 'req-2',
  projectId: 'proj-workload',
  role: 'Developer',
  seniority: 'Senior',
  requiredCount: 2,
  hoursPerWeek: 10,
};

const result2 = optimizeWorkloadSelection(
  req2,
  testProject,
  testEmployees2,
  [], // default 40h
  testAssignments2,
  [testProject, existingProject],
  { exactPositionMatch: true }
);

assert(result2.bestCombination !== null, 'Tìm thấy combination tốt nhất');
const bestCombo = result2.bestCombination!;

assert(
  bestCombo.selectedEmployeeIds.includes('emp-c') &&
    bestCombo.selectedEmployeeIds.includes('emp-d'),
  'Combo tốt nhất là {Dev C, Dev D} vì giúp cân bằng tải tối ưu nhất',
  `Thực tế chọn: ${bestCombo.selectedEmployeeIds.join(', ')}`
);

assert(
  bestCombo.averageImbalance === 50,
  `Độ lệch tải (Imbalance) sau phân bổ là 50% (75% - 25%)`,
  `Thực tế: ${bestCombo.averageImbalance}%`
);

assert(
  bestCombo.isValid === true &&
    bestCombo.projectedWorkloads.every((p) => p.maxProjectedUtilization <= 100),
  'Tất cả nhân sự trong combo tối ưu không ai vượt quá 100% công suất'
);

// ============================================================================
// TEST 3: Constraint: Disqualify combination exceeding 100% utilization
// ============================================================================
console.log('\n--- TEST 3: Ràng buộc không vượt quá 100% công suất ---');

const req3: ProjectStaffingRequirement = {
  id: 'req-3',
  projectId: 'proj-workload',
  role: 'Developer',
  seniority: 'Senior',
  requiredCount: 2,
  hoursPerWeek: 15,
};

const result3 = optimizeWorkloadSelection(
  req3,
  testProject,
  testEmployees2,
  [],
  testAssignments2,
  [testProject, existingProject],
  { exactPositionMatch: true }
);

assert(
  !result3.eligibleEmployees.some((e) => e.id === 'emp-a'),
  'emp-a bị loại trước vì chỉ còn 10h trống < 15h yêu cầu'
);

assert(
  result3.bestCombination !== null &&
    result3.bestCombination.selectedEmployeeIds.includes('emp-c') &&
    result3.bestCombination.selectedEmployeeIds.includes('emp-d'),
  'Combo {Dev C, Dev D} được chọn an toàn với 15h/tuần'
);

// ============================================================================
// TEST 4: Handle Ties (Secondary Variance & Employee ID tie-breaker)
// ============================================================================
console.log('\n--- TEST 4: Xử lý Hòa (Tie-Breaking by Variance & Employee ID) ---');

const testEmployees4: Employee[] = [
  { id: 'emp-z', name: 'Dev Z', role: 'Developer', seniority: 'Senior', baseWeeklyHours: 40, avatar: '👨‍💻' },
  { id: 'emp-a', name: 'Dev A', role: 'Developer', seniority: 'Senior', baseWeeklyHours: 40, avatar: '👨‍💻' },
];

const req4: ProjectStaffingRequirement = {
  id: 'req-4',
  projectId: 'proj-workload',
  role: 'Developer',
  seniority: 'Senior',
  requiredCount: 1, // pick 1
  hoursPerWeek: 20,
};

const result4 = optimizeWorkloadSelection(
  req4,
  testProject,
  testEmployees4,
  [],
  [],
  [testProject],
  { exactPositionMatch: true }
);

assert(
  result4.bestCombination !== null &&
    result4.bestCombination.selectedEmployeeIds[0] === 'emp-a',
  'Khi 2 ứng viên có cùng độ lệch tải và phương sai, ưu tiên theo ID tăng dần (emp-a trước emp-z)'
);

// ============================================================================
// FINAL SUMMARY
// ============================================================================
if (allPassed) {
  console.log('\n🎉 TẤT CẢ CÁC BÀI TEST WORKLOAD OPTIMIZER ĐỀU ĐẠT 100%!');
} else {
  console.error('\n❌ CÓ BÀI TEST THẤT BẠI!');
}
