/**
 * Verification test script for The Slot Finder matching engine and business rules.
 */
import {
  evaluateCandidatesForRequirement,
  getAvailableCapacityForWeek,
  getCommittedHoursForWeek,
} from '../engine/matchingEngine.ts';
import type {
  Assignment,
  Employee,
  EmployeeWeeklyCapacity,
  ProjectSprint,
  SprintStaffingRequirement,
} from '../types.ts';

console.log('🧪 Bắt đầu kiểm thử Matching Engine & Quy tắc Nghiệp vụ...');

// Setup test data
const testEmployees: Employee[] = [
  { id: 'dev-1', name: 'Dev Đủ Giờ (Senior)', role: 'Developer', seniority: 'Senior', baseWeeklyHours: 40, avatar: '👨‍💻' },
  { id: 'dev-2', name: 'Dev Thiếu Tuần 2 (Senior)', role: 'Developer', seniority: 'Senior', baseWeeklyHours: 40, avatar: '👩‍💻' },
  { id: 'dev-3', name: 'Dev Junior', role: 'Developer', seniority: 'Junior', baseWeeklyHours: 40, avatar: '👦' },
  { id: 'ba-1', name: 'BA Senior', role: 'Business Analyst', seniority: 'Senior', baseWeeklyHours: 40, avatar: '👨‍💼' },
];

const testSprints: ProjectSprint[] = [
  {
    id: 'sprint-1',
    projectId: 'proj-test',
    sprintNumber: 1,
    name: 'Sprint 1',
    startDate: '2026-10-12', // Monday Week 1
    endDate: '2026-10-25',   // Sunday Week 2
  },
];

// dev-2 has leave in week 2 (2026-10-19): available hours only 10h
const testCapacities: EmployeeWeeklyCapacity[] = [
  { id: 'cap-1', employeeId: 'dev-2', weekStartDate: '2026-10-19', availableHours: 10 },
];

// dev-1 already has 10h committed in Week 1
const testAssignments: Assignment[] = [];

// Requirement: Need 1 Senior Developer, 20 hours/week
const requirement: SprintStaffingRequirement = {
  id: 'req-test',
  sprintId: 'sprint-1',
  role: 'Developer',
  seniority: 'Senior',
  requiredCount: 1,
  hoursPerWeek: 20,
};

// RUN EVALUATION
const results = evaluateCandidatesForRequirement(
  requirement,
  testSprints[0],
  testEmployees,
  testCapacities,
  testAssignments,
  testSprints,
  { allowHigherSeniority: false } // strict seniority match
);

let passed = true;

// 1. Check dev-1 is eligible
const dev1Result = results.find((r) => r.employee.id === 'dev-1');
if (dev1Result?.isEligible) {
  console.log('✅ Test 1: dev-1 (Senior Dev đủ giờ cả 2 tuần) -> ĐƯỢC CHỌN');
} else {
  console.error('❌ Test 1 Thất bại: dev-1 bị từ chối');
  passed = false;
}

// 2. Check dev-2 is NOT eligible because week 2 only has 10h < 20h required
const dev2Result = results.find((r) => r.employee.id === 'dev-2');
if (!dev2Result?.isEligible && dev2Result?.reasons.some((r) => r.includes('2026-10-19'))) {
  console.log('✅ Test 2: dev-2 (Đủ giờ tuần 1 nhưng tuần 2 chỉ có 10h < 20h) -> BỊ LOẠI CHÍNH XÁC');
  console.log(`   Lý do: "${dev2Result.reasons[0]}"`);
} else {
  console.error('❌ Test 2 Thất bại: dev-2 không bị loại hoặc không có lý do đúng');
  passed = false;
}

// 3. Check dev-3 is NOT eligible because seniority Junior < Senior
const dev3Result = results.find((r) => r.employee.id === 'dev-3');
if (!dev3Result?.isEligible && dev3Result?.reasons.some((r) => r.includes('Cấp độ'))) {
  console.log('✅ Test 3: dev-3 (Junior < Senior) -> BỊ LOẠI VÌ SAI CẤP ĐỘ');
} else {
  console.error('❌ Test 3 Thất bại: dev-3 không bị loại đúng cấp độ');
  passed = false;
}

// 4. Check ba-1 is NOT eligible because of role mismatch
const ba1Result = results.find((r) => r.employee.id === 'ba-1');
if (!ba1Result?.isEligible && ba1Result?.reasons.some((r) => r.includes('Vai trò không khớp'))) {
  console.log('✅ Test 4: ba-1 (Role BA != Developer) -> BỊ LOẠI VÌ SAI VAI TRÒ');
} else {
  console.error('❌ Test 4 Thất bại: ba-1 không bị loại');
  passed = false;
}

if (passed) {
  console.log('\n🎉 TẤT CẢ 4/4 KIỂM THỬ THUẬT TOÁN ĐÃ ĐẠT 100%!');
} else {
  console.error('\n⚠️ Có kiểm thử thất bại!');
  process.exit(1);
}
