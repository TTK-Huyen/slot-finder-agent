import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  INITIAL_ASSIGNMENTS,
  INITIAL_CAPACITIES,
  INITIAL_EMPLOYEES,
  INITIAL_PROJECTS,
  INITIAL_REQUIREMENTS,
} from '../data/mockData';
import {
  getAvailableCapacityForWeek,
  getCommittedHoursForWeek,
} from '../engine/matchingEngine';
import { optimizeWorkloadSelection } from '../engine/workloadOptimizer';
import type {
  Assignment,
  Employee,
  EmployeeWeeklyCapacity,
  Project,
  ProjectStaffingRequirement,
  Role,
  Seniority,
} from '../types';
import { addDays, formatDate, getMonday, getWeeksCovered, parseDate } from '../utils/dateUtils';

interface AppContextType {
  employees: Employee[];
  capacities: EmployeeWeeklyCapacity[];
  projects: Project[];
  requirements: ProjectStaffingRequirement[];
  assignments: Assignment[];
  selectedProjectId: string | null;
  setSelectedProjectId: (id: string | null) => void;

  allowHigherSeniority: boolean;
  setAllowHigherSeniority: (val: boolean) => void;

  // Actions
  addProject: (
    name: string,
    client: string,
    startDate: string,
    durationWeeks: number
  ) => Project;
  addRequirement: (
    projectId: string,
    role: Role,
    seniority: Seniority,
    requiredCount: number,
    hoursPerWeek: number
  ) => void;
  removeRequirement: (reqId: string) => void;
  assignEmployee: (
    projectId: string,
    requirementId: string,
    employeeId: string,
    hoursPerWeek: number
  ) => void;
  unassignEmployee: (assignmentId: string) => void;
  autoAssignRequirement: (projectId: string, requirementId: string) => boolean;
  autoAssignProject: (projectId: string) => { successCount: number; unfulfilledCount: number };
  updateEmployeeCapacity: (
    employeeId: string,
    weekStartDate: string,
    availableHours: number
  ) => void;
  resetAllData: () => void;

  // Helpers
  getRemainingHours: (employeeId: string, weekStartDate: string) => number;
  getEmployeeUtilization: (employeeId: string, weekStartDate: string) => number;
  getOverAllocatedWarnings: () => {
    employee: Employee;
    weekStartDate: string;
    capacity: number;
    committed: number;
    deficit: number;
  }[];
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const STORAGE_KEY = 'the_slot_finder_simple_v2';

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [employees, setEmployees] = useState<Employee[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_emp`);
    return saved ? JSON.parse(saved) : INITIAL_EMPLOYEES;
  });

  const [capacities, setCapacities] = useState<EmployeeWeeklyCapacity[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_cap`);
    return saved ? JSON.parse(saved) : INITIAL_CAPACITIES;
  });

  const [projects, setProjects] = useState<Project[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_proj`);
    return saved ? JSON.parse(saved) : INITIAL_PROJECTS;
  });

  const [requirements, setRequirements] = useState<ProjectStaffingRequirement[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_req`);
    return saved ? JSON.parse(saved) : INITIAL_REQUIREMENTS;
  });

  const [assignments, setAssignments] = useState<Assignment[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_asg`);
    return saved ? JSON.parse(saved) : INITIAL_ASSIGNMENTS;
  });

  const [selectedProjectId, setSelectedProjectId] = useState<string | null>('proj-2');
  const [allowHigherSeniority, setAllowHigherSeniority] = useState<boolean>(true);

  // Sync to local storage
  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_emp`, JSON.stringify(employees));
    localStorage.setItem(`${STORAGE_KEY}_cap`, JSON.stringify(capacities));
    localStorage.setItem(`${STORAGE_KEY}_proj`, JSON.stringify(projects));
    localStorage.setItem(`${STORAGE_KEY}_req`, JSON.stringify(requirements));
    localStorage.setItem(`${STORAGE_KEY}_asg`, JSON.stringify(assignments));
  }, [employees, capacities, projects, requirements, assignments]);

  const resetAllData = () => {
    setEmployees(INITIAL_EMPLOYEES);
    setCapacities(INITIAL_CAPACITIES);
    setProjects(INITIAL_PROJECTS);
    setRequirements(INITIAL_REQUIREMENTS);
    setAssignments(INITIAL_ASSIGNMENTS);
    setSelectedProjectId('proj-2');
  };

  const addProject = (
    name: string,
    client: string,
    startDateStr: string,
    durationWeeks: number
  ): Project => {
    const projId = `proj-${Date.now()}`;
    const startMon = getMonday(parseDate(startDateStr));
    const endDate = addDays(startMon, durationWeeks * 7 - 1);

    const newProject: Project = {
      id: projId,
      name,
      client,
      startDate: formatDate(startMon),
      endDate: formatDate(endDate),
      status: 'Planning',
    };

    setProjects((prev) => [newProject, ...prev]);
    setSelectedProjectId(projId);
    return newProject;
  };

  const addRequirement = (
    projectId: string,
    role: Role,
    seniority: Seniority,
    requiredCount: number,
    hoursPerWeek: number
  ) => {
    const newReq: ProjectStaffingRequirement = {
      id: `req-${Date.now()}`,
      projectId,
      role,
      seniority,
      requiredCount,
      hoursPerWeek,
    };
    setRequirements((prev) => [...prev, newReq]);
  };

  const removeRequirement = (reqId: string) => {
    setRequirements((prev) => prev.filter((r) => r.id !== reqId));
    setAssignments((prev) => prev.filter((a) => a.requirementId !== reqId));
  };

  const assignEmployee = (
    projectId: string,
    requirementId: string,
    employeeId: string,
    hoursPerWeek: number
  ) => {
    const newAssignment: Assignment = {
      id: `asg-${Date.now()}`,
      projectId,
      requirementId,
      employeeId,
      allocatedHoursPerWeek: hoursPerWeek,
      status: 'Confirmed',
    };
    setAssignments((prev) => [...prev, newAssignment]);
  };

  const unassignEmployee = (assignmentId: string) => {
    setAssignments((prev) => prev.filter((a) => a.id !== assignmentId));
  };

  const autoAssignRequirement = (projectId: string, requirementId: string): boolean => {
    const project = projects.find((p) => p.id === projectId);
    const req = requirements.find((r) => r.id === requirementId);
    if (!project || !req) return false;

    const currentCount = assignments.filter((a) => a.requirementId === requirementId).length;
    const needed = Math.max(0, req.requiredCount - currentCount);
    if (needed === 0) return true;

    const result = optimizeWorkloadSelection(
      { ...req, requiredCount: needed },
      project,
      employees,
      capacities,
      assignments,
      projects,
      { allowHigherSeniority, exactPositionMatch: !allowHigherSeniority }
    );

    if (result.bestCombination && result.bestCombination.employees.length > 0) {
      const newAssignments: Assignment[] = result.bestCombination.selectedEmployeeIds.map(
        (empId, idx) => ({
          id: `asg-${Date.now()}-${idx}`,
          projectId,
          requirementId,
          employeeId: empId,
          allocatedHoursPerWeek: req.hoursPerWeek,
          status: 'Confirmed',
        })
      );
      setAssignments((prev) => [...prev, ...newAssignments]);
      return true;
    }
    return false;
  };

  const autoAssignProject = (
    projectId: string
  ): { successCount: number; unfulfilledCount: number } => {
    const project = projects.find((p) => p.id === projectId);
    if (!project) return { successCount: 0, unfulfilledCount: 0 };

    const projectReqs = requirements.filter((r) => r.projectId === projectId);
    let currentAsgs = [...assignments];
    let successCount = 0;
    let unfulfilledCount = 0;

    for (const req of projectReqs) {
      const assignedToReq = currentAsgs.filter((a) => a.requirementId === req.id).length;
      const needed = Math.max(0, req.requiredCount - assignedToReq);
      if (needed === 0) continue;

      const result = optimizeWorkloadSelection(
        { ...req, requiredCount: needed },
        project,
        employees,
        capacities,
        currentAsgs,
        projects,
        { allowHigherSeniority, exactPositionMatch: !allowHigherSeniority }
      );

      if (result.bestCombination && result.bestCombination.employees.length > 0) {
        const added = result.bestCombination.selectedEmployeeIds.map((empId, idx) => ({
          id: `asg-${Date.now()}-${req.id}-${idx}`,
          projectId,
          requirementId: req.id,
          employeeId: empId,
          allocatedHoursPerWeek: req.hoursPerWeek,
          status: 'Confirmed' as const,
        }));
        currentAsgs = [...currentAsgs, ...added];
        successCount += added.length;
      } else {
        unfulfilledCount += needed;
      }
    }

    setAssignments(currentAsgs);
    return { successCount, unfulfilledCount };
  };

  const updateEmployeeCapacity = (
    employeeId: string,
    weekStartDate: string,
    availableHours: number
  ) => {
    setCapacities((prev) => {
      const idx = prev.findIndex(
        (c) => c.employeeId === employeeId && c.weekStartDate === weekStartDate
      );
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = { ...copy[idx], availableHours };
        return copy;
      } else {
        return [
          ...prev,
          {
            id: `cap-${Date.now()}`,
            employeeId,
            weekStartDate,
            availableHours,
          },
        ];
      }
    });
  };

  const getRemainingHours = (employeeId: string, weekStartDate: string): number => {
    const emp = employees.find((e) => e.id === employeeId);
    if (!emp) return 0;
    const capacity = getAvailableCapacityForWeek(emp, weekStartDate, capacities);
    const committed = getCommittedHoursForWeek(employeeId, weekStartDate, assignments, projects);
    return capacity - committed;
  };

  const getEmployeeUtilization = (employeeId: string, weekStartDate: string): number => {
    const emp = employees.find((e) => e.id === employeeId);
    if (!emp) return 0;
    const capacity = getAvailableCapacityForWeek(emp, weekStartDate, capacities);
    const committed = getCommittedHoursForWeek(employeeId, weekStartDate, assignments, projects);
    if (capacity <= 0) return committed > 0 ? 999 : 0;
    return Math.round((committed / capacity) * 100);
  };

  const getOverAllocatedWarnings = () => {
    const warnings: {
      employee: Employee;
      weekStartDate: string;
      capacity: number;
      committed: number;
      deficit: number;
    }[] = [];

    const allWeeks = new Set<string>();
    projects.forEach((p) => {
      const weeks = getWeeksCovered(p.startDate, p.endDate);
      weeks.forEach((w) => allWeeks.add(w));
    });

    for (const emp of employees) {
      for (const week of allWeeks) {
        const cap = getAvailableCapacityForWeek(emp, week, capacities);
        const committed = getCommittedHoursForWeek(emp.id, week, assignments, projects);
        if (committed > cap) {
          warnings.push({
            employee: emp,
            weekStartDate: week,
            capacity: cap,
            committed,
            deficit: committed - cap,
          });
        }
      }
    }

    return warnings;
  };

  return (
    <AppContext.Provider
      value={{
        employees,
        capacities,
        projects,
        requirements,
        assignments,
        selectedProjectId,
        setSelectedProjectId,
        allowHigherSeniority,
        setAllowHigherSeniority,
        addProject,
        addRequirement,
        removeRequirement,
        assignEmployee,
        unassignEmployee,
        autoAssignRequirement,
        autoAssignProject,
        updateEmployeeCapacity,
        resetAllData,
        getRemainingHours,
        getEmployeeUtilization,
        getOverAllocatedWarnings,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
};
