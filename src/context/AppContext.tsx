import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  INITIAL_ASSIGNMENTS,
  INITIAL_CAPACITIES,
  INITIAL_EMPLOYEES,
  INITIAL_PROJECTS,
  INITIAL_REQUIREMENTS,
  INITIAL_SPRINTS,
} from '../data/mockData';
import {
  getAvailableCapacityForWeek,
  getCommittedHoursForWeek,
} from '../engine/matchingEngine';
import type {
  Assignment,
  Employee,
  EmployeeWeeklyCapacity,
  Project,
  ProjectSprint,
  Role,
  Seniority,
  SprintStaffingRequirement,
} from '../types';
import { addDays, formatDate, getMonday, parseDate } from '../utils/dateUtils';

interface AppContextType {
  employees: Employee[];
  capacities: EmployeeWeeklyCapacity[];
  projects: Project[];
  sprints: ProjectSprint[];
  requirements: SprintStaffingRequirement[];
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
    sprintCount: number
  ) => Project;
  addRequirement: (
    sprintId: string,
    role: Role,
    seniority: Seniority,
    requiredCount: number,
    hoursPerWeek: number
  ) => void;
  removeRequirement: (reqId: string) => void;
  assignEmployee: (
    requirementId: string,
    sprintId: string,
    employeeId: string,
    hoursPerWeek: number
  ) => void;
  unassignEmployee: (assignmentId: string) => void;
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

const STORAGE_KEY = 'the_slot_finder_state_v1';

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

  const [sprints, setSprints] = useState<ProjectSprint[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_spr`);
    return saved ? JSON.parse(saved) : INITIAL_SPRINTS;
  });

  const [requirements, setRequirements] = useState<SprintStaffingRequirement[]>(() => {
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
    localStorage.setItem(`${STORAGE_KEY}_spr`, JSON.stringify(sprints));
    localStorage.setItem(`${STORAGE_KEY}_req`, JSON.stringify(requirements));
    localStorage.setItem(`${STORAGE_KEY}_asg`, JSON.stringify(assignments));
  }, [employees, capacities, projects, sprints, requirements, assignments]);

  const resetAllData = () => {
    setEmployees(INITIAL_EMPLOYEES);
    setCapacities(INITIAL_CAPACITIES);
    setProjects(INITIAL_PROJECTS);
    setSprints(INITIAL_SPRINTS);
    setRequirements(INITIAL_REQUIREMENTS);
    setAssignments(INITIAL_ASSIGNMENTS);
    setSelectedProjectId('proj-2');
  };

  const addProject = (
    name: string,
    client: string,
    startDateStr: string,
    sprintCount: number
  ): Project => {
    const projId = `proj-${Date.now()}`;
    const startMon = getMonday(parseDate(startDateStr));

    // Create 2-week sprints
    const newSprints: ProjectSprint[] = [];
    let currentSprintStart = new Date(startMon);

    for (let i = 1; i <= sprintCount; i++) {
      const sprintEnd = addDays(currentSprintStart, 13); // 2 weeks (14 days total, 0-indexed 13 days)
      newSprints.push({
        id: `sprint-${Date.now()}-${i}`,
        projectId: projId,
        sprintNumber: i,
        name: `Sprint ${i}`,
        startDate: formatDate(currentSprintStart),
        endDate: formatDate(sprintEnd),
      });
      currentSprintStart = addDays(currentSprintStart, 14);
    }

    const lastSprintEnd = newSprints[newSprints.length - 1].endDate;

    const newProject: Project = {
      id: projId,
      name,
      client,
      startDate: formatDate(startMon),
      endDate: lastSprintEnd,
      status: 'Planning',
    };

    setProjects((prev) => [newProject, ...prev]);
    setSprints((prev) => [...prev, ...newSprints]);
    setSelectedProjectId(projId);
    return newProject;
  };

  const addRequirement = (
    sprintId: string,
    role: Role,
    seniority: Seniority,
    requiredCount: number,
    hoursPerWeek: number
  ) => {
    const newReq: SprintStaffingRequirement = {
      id: `req-${Date.now()}`,
      sprintId,
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
    requirementId: string,
    sprintId: string,
    employeeId: string,
    hoursPerWeek: number
  ) => {
    const newAssignment: Assignment = {
      id: `asg-${Date.now()}`,
      requirementId,
      sprintId,
      employeeId,
      allocatedHoursPerWeek: hoursPerWeek,
      status: 'Confirmed',
    };
    setAssignments((prev) => [...prev, newAssignment]);
  };

  const unassignEmployee = (assignmentId: string) => {
    setAssignments((prev) => prev.filter((a) => a.id !== assignmentId));
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
    const committed = getCommittedHoursForWeek(employeeId, weekStartDate, assignments, sprints);
    return capacity - committed;
  };

  const getEmployeeUtilization = (employeeId: string, weekStartDate: string): number => {
    const emp = employees.find((e) => e.id === employeeId);
    if (!emp) return 0;
    const capacity = getAvailableCapacityForWeek(emp, weekStartDate, capacities);
    const committed = getCommittedHoursForWeek(employeeId, weekStartDate, assignments, sprints);
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

    // Collect all active week start dates from all sprints
    const allWeeks = new Set<string>();
    sprints.forEach((s) => {
      const mon = s.startDate;
      allWeeks.add(mon);
      const nextMon = formatDate(addDays(parseDate(mon), 7));
      allWeeks.add(nextMon);
    });

    for (const emp of employees) {
      for (const week of allWeeks) {
        const cap = getAvailableCapacityForWeek(emp, week, capacities);
        const committed = getCommittedHoursForWeek(emp.id, week, assignments, sprints);
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
        sprints,
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
