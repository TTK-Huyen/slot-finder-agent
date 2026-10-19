/**
 * Unit tests for Use Case UC03: Reallocate Employee After Departure
 */
import {
  applyDepartureReallocation,
  planDepartureReallocation,
} from '../engine/departureReallocator.ts';
import { getCommittedHoursForWeek } from '../engine/matchingEngine.ts';
import type {
  Assignment,
  Employee,
  EmployeeWeeklyCapacity,
  Project,
  ProjectStaffingRequirement,
} from '../types.ts';

console.log('🧪 Bắt đầu kiểm thử Use Case UC03: Reallocate Employee After Departure...\n');

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

// 4-week Project: 2026-10-12 (W1) to 2026-11-08 (W4)
const testProject: Project = {
  id: 'proj-uc03',
  name: 'Omni Banking Transformation',
  client: 'Global Bank',
  startDate: '2026-10-12',
  endDate: '2026-11-08',
  status: 'Active',
};

const testRequirement: ProjectStaffingRequirement = {
  id: 'req-uc03-dev',
  projectId: 'proj-uc03',
  role: 'Developer',
  seniority: 'Senior',
  requiredCount: 1,
  hoursPerWeek: 20,
};

// Employees
const devDeparting: Employee = {
  id: 'dev-leave',
  name: 'Dev Rời Đi',
  role: 'Developer',
  seniority: 'Senior',
  baseWeeklyHours: 40,
  avatar: '🚶',
};

const devCandidate1: Employee = {
  id: 'dev-cand-1',
  name: 'Dev Ứng Viên 1 (Rảnh)',
  role: 'Developer',
  seniority: 'Senior',
  baseWeeklyHours: 40,
  avatar: '👨‍💻',
};

const devCandidate2: Employee = {
  id: 'dev-cand-2',
  name: 'Dev Ứng Viên 2 (Bận 30h)',
  role: 'Developer',
  seniority: 'Senior',
  baseWeeklyHours: 40,
  avatar: '👨‍💻',
};

const testEmployees = [devDeparting, devCandidate1, devCandidate2];

// Initial Assignment: devDeparting is on proj-uc03 for 20h/week
const initialAssignments: Assignment[] = [
  {
    id: 'asg-departing',
    projectId: 'proj-uc03',
    requirementId: 'req-uc03-dev',
    employeeId: 'dev-leave',
    allocatedHoursPerWeek: 20,
    status: 'Confirmed',
  },
  // devCandidate2 already has 30h committed on another project
  {
    id: 'asg-cand2-other',
    projectId: 'proj-other',
    requirementId: 'req-other',
    employeeId: 'dev-cand-2',
    allocatedHoursPerWeek: 30,
    status: 'Confirmed',
  },
];

const testProjects = [
  testProject,
  {
    id: 'proj-other',
    name: 'Other Project',
    client: 'Other',
    startDate: '2026-10-12',
    endDate: '2026-11-08',
    status: 'Active' as const,
  },
];

// ============================================================================
// TEST 1: UC03 Main Flow 1-6 (Plan Departure Reallocation mid-project)
// ============================================================================
console.log('--- TEST 1: Main Flow 1-6 (Lập kế hoạch thay thế khi nhân viên rời đi giữa dự án) ---');

// Employee departs at Week 2 (2026-10-19)
const departureDate = '2026-10-19';

const plan = planDepartureReallocation({
  projectId: 'proj-uc03',
  departingEmployeeId: 'dev-leave',
  departureDate,
  allProjects: testProjects,
  allRequirements: [testRequirement],
  allAssignments: initialAssignments,
  allEmployees: testEmployees,
  capacities: [],
  allowHigherSeniority: false,
});

assert(plan.isFeasible === true, 'Hệ thống tìm được phương án thay thế khả thi');
assert(
  plan.affectedWeeks.length === 3 && plan.affectedWeeks.includes('2026-10-19'),
  'Xác định đúng 3 tuần còn lại của dự án cần thay thế (từ 19/10 đến hết dự án)'
);
assert(
  plan.proposedReplacement !== null &&
    plan.proposedReplacement.selectedEmployeeIds[0] === 'dev-cand-1',
  'Đề xuất đúng dev-cand-1 (người có đủ giờ trống, trong khi dev-cand-2 chỉ còn 10h < 20h)'
);

// ============================================================================
// TEST 2: UC03 Main Flow 7-8 (PM Phê duyệt & Cập nhật phân công)
// ============================================================================
console.log('\n--- TEST 2: Main Flow 7-8 (PM phê duyệt và hệ thống cập nhật phân công) ---');

const executionResult = applyDepartureReallocation(
  plan,
  initialAssignments,
  [],
  testProjects,
  testEmployees
);

assert(executionResult.success === true, 'Phê duyệt và cập nhật phân công thành công');
const updatedAssignments = executionResult.updatedAssignments!;

// Check that departing employee assignment is truncated before departureDate
const truncatedAsg = updatedAssignments.find(
  (a) => a.projectId === 'proj-uc03' && a.employeeId === 'dev-leave'
);
assert(
  truncatedAsg !== undefined && truncatedAsg.endDate === '2026-10-18',
  'Phân công của nhân viên rời đi chỉ được giữ lại đến hết ngày 18/10 (trước ngày rời đi)'
);

// Check that replacement assignment is created starting from departureDate
const replacementAsg = updatedAssignments.find(
  (a) => a.projectId === 'proj-uc03' && a.employeeId === 'dev-cand-1'
);
assert(
  replacementAsg !== undefined &&
    replacementAsg.startDate === '2026-10-19' &&
    replacementAsg.endDate === '2026-11-08' &&
    replacementAsg.allocatedHoursPerWeek === 20,
  'Phân công mới cho người thay thế bắt đầu chính xác từ ngày 19/10 đến 08/11'
);

// Verify weekly committed hours:
// In Week 1 (2026-10-12): dev-leave has 20h, dev-cand-1 has 0h
const w1DepartingCommitted = getCommittedHoursForWeek('dev-leave', '2026-10-12', updatedAssignments, testProjects);
const w1ReplacementCommitted = getCommittedHoursForWeek('dev-cand-1', '2026-10-12', updatedAssignments, testProjects);
assert(
  w1DepartingCommitted === 20 && w1ReplacementCommitted === 0,
  'Tuần 1: Nhân viên cũ vẫn làm 20h, người thay thế chưa nhận dự án (0h)'
);

// In Week 2 (2026-10-19): dev-leave has 0h, dev-cand-1 has 20h
const w2DepartingCommitted = getCommittedHoursForWeek('dev-leave', '2026-10-19', updatedAssignments, testProjects);
const w2ReplacementCommitted = getCommittedHoursForWeek('dev-cand-1', '2026-10-19', updatedAssignments, testProjects);
assert(
  w2DepartingCommitted === 0 && w2ReplacementCommitted === 20,
  'Tuần 2 trở đi: Giờ làm của nhân viên cũ được giải phóng (0h), người thay thế nhận 20h'
);

// ============================================================================
// TEST 3: Alternative Flow A1 (Không có ứng viên phù hợp)
// ============================================================================
console.log('\n--- TEST 3: Alternative Flow A1 (Không tìm được ứng viên khả thi) ---');

// Suppose devCandidate1 is also fully booked (e.g. 35h committed)
const tightAssignments: Assignment[] = [
  ...initialAssignments,
  {
    id: 'asg-cand1-busy',
    projectId: 'proj-other',
    requirementId: 'req-other',
    employeeId: 'dev-cand-1',
    allocatedHoursPerWeek: 35,
    status: 'Confirmed',
  },
];

const unfeasiblePlan = planDepartureReallocation({
  projectId: 'proj-uc03',
  departingEmployeeId: 'dev-leave',
  departureDate,
  allProjects: testProjects,
  allRequirements: [testRequirement],
  allAssignments: tightAssignments,
  allEmployees: testEmployees,
  capacities: [],
  allowHigherSeniority: false,
});

assert(
  unfeasiblePlan.isFeasible === false,
  'Hệ thống thông báo không tìm được phương án khả thi khi không ai đủ giờ'
);
assert(
  unfeasiblePlan.proposedReplacement === null,
  'Hệ thống không tự ý gán nhân viên khi không có phương án khả thi'
);

// ============================================================================
// TEST 4: Alternative Flow A3 (Dữ liệu thay đổi trước khi phê duyệt)
// ============================================================================
console.log('\n--- TEST 4: Alternative Flow A3 (Dữ liệu thay đổi trước khi phê duyệt) ---');

// Initially, plan was generated with dev-cand-1 available.
// Before PM clicks Approve, dev-cand-1 capacity drops (e.g. approved leave or booked elsewhere).
const concurrentCapacities: EmployeeWeeklyCapacity[] = [
  {
    id: 'cap-concurrent',
    employeeId: 'dev-cand-1',
    weekStartDate: '2026-10-19',
    availableHours: 10, // only 10h available < 20h needed
  },
];

const preValidationResult = applyDepartureReallocation(
  plan,
  initialAssignments,
  concurrentCapacities,
  testProjects,
  testEmployees
);

assert(
  preValidationResult.success === false,
  'Hệ thống phát hiện dữ liệu thay đổi trước khi lưu và hủy cập nhật phân công'
);
assert(
  preValidationResult.reason !== undefined &&
    preValidationResult.reason.includes('Dữ liệu thay đổi trước khi phê duyệt'),
  'Hệ thống thông báo rõ nguyên nhân do capacity thay đổi trước khi phê duyệt'
);

// ============================================================================
// FINAL SUMMARY
// ============================================================================
if (allPassed) {
  console.log('\n🎉 TẤT CẢ CÁC BÀI TEST USE CASE UC03 ĐỀU ĐẠT 100%!');
} else {
  console.error('\n❌ CÓ BÀI TEST THẤT BẠI!');
}
