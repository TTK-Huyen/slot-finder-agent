import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, CalendarClock, CheckCircle2, X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { applyDelayReallocation, planDelayReallocation } from '../engine/delayReallocator';
import type { DelayStaffingNeed, Project } from '../types';
import { formatShortDate } from '../utils/dateUtils';

export const DelayReallocationModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  project: Project | null;
}> = ({ isOpen, onClose, project }) => {
  const { projects, requirements, assignments, employees, capacities, allowHigherSeniority, commitProjectDelay } = useApp();
  const active = project || projects[0];
  const [newDeadline, setNewDeadline] = useState(active?.endDate || '');
  const [staffingNeeds, setStaffingNeeds] = useState<DelayStaffingNeed[]>([]);
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!active) return;
    setNewDeadline(active.endDate);
    setStaffingNeeds(requirements.filter((r) => r.projectId === active.id).map((r) => ({ requirementId: r.id, requiredCount: r.requiredCount, hoursPerWeek: r.hoursPerWeek })));
    setConfirmed(false);
    setError(null);
  }, [active, requirements]);

  const plan = useMemo(() => {
    if (!active || !newDeadline || !confirmed) return null;
    return planDelayReallocation({
      projectId: active.id,
      newDeadline,
      staffingNeeds,
      allProjects: projects,
      allRequirements: requirements,
      allAssignments: assignments,
      allEmployees: employees,
      capacities,
      allowHigherSeniority,
    });
  }, [active, newDeadline, staffingNeeds, confirmed, projects, requirements, assignments, employees, capacities, allowHigherSeniority]);

  if (!isOpen || !active) return null;

  const updateNeed = (requirementId: string, field: 'requiredCount' | 'hoursPerWeek', value: number) => {
    setConfirmed(false);
    setStaffingNeeds((current) => current.map((need) => need.requirementId === requirementId ? { ...need, [field]: Math.max(0, value) } : need));
  };

  const approve = () => {
    if (!plan) return;
    const result = applyDelayReallocation(plan, projects, assignments, requirements, capacities, employees);
    if (!result.success || !result.updatedProjects || !result.updatedAssignments) {
      setError(result.reason || 'Data changed before approval. Please recalculate the plan.');
      return;
    }
    commitProjectDelay(result.updatedProjects, result.updatedAssignments);
    onClose();
  };

  return <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
    <div className="bg-white border border-gray-200 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
      <div className="p-5 border-b border-gray-200 flex justify-between">
        <div><h2 className="text-lg font-bold text-gray-900">Reallocate staff for a delayed project (UC04)</h2>
          <p className="text-xs text-gray-500">Confirm the revised schedule and staffing needs before reviewing recommendations.</p></div>
        <button onClick={onClose}><X className="w-5 h-5 text-gray-500" /></button>
      </div>
      <div className="p-5 space-y-4 text-xs">
        <div className="grid grid-cols-2 gap-3">
          <div><label className="block text-gray-500 mb-1">Current deadline</label><div className="p-2 bg-gray-50 rounded-lg text-gray-900">{formatShortDate(active.endDate)}</div></div>
          <div><label className="block text-gray-500 mb-1">New deadline</label><input type="date" min={active.endDate} value={newDeadline} onChange={e => { setNewDeadline(e.target.value); setConfirmed(false); }} className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900" /></div>
        </div>
        <div className="p-3 bg-gray-50 rounded-lg space-y-2">
          <div className="font-semibold text-gray-900">Staffing needs for the revised schedule</div>
          {staffingNeeds.map((need) => {
            const req = requirements.find((r) => r.id === need.requirementId);
            if (!req) return null;
            return <div key={need.requirementId} className="grid grid-cols-[1fr_90px_100px] gap-2 items-center">
              <span className="text-gray-700">{req.role} ({req.seniority})</span>
              <label className="text-gray-500">People<input type="number" min="0" value={need.requiredCount} onChange={e => updateNeed(need.requirementId, 'requiredCount', Number(e.target.value))} className="w-full mt-1 p-1.5 bg-white border border-gray-200 rounded text-gray-900" /></label>
              <label className="text-gray-500">Hours/week<input type="number" min="0" value={need.hoursPerWeek} onChange={e => updateNeed(need.requirementId, 'hoursPerWeek', Number(e.target.value))} className="w-full mt-1 p-1.5 bg-white border border-gray-200 rounded text-gray-900" /></label>
            </div>;
          })}
          <label className="flex gap-2 items-start text-gray-700 pt-2"><input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} className="mt-0.5" /> I confirm the revised schedule and staffing needs for all affected weeks.</label>
        </div>
        {error && <div className="p-3 bg-gray-100 border border-gray-300 text-gray-700 rounded-lg flex gap-2"><AlertCircle className="w-4 h-4" />{error}</div>}
        {plan && <><div className="p-3 bg-gray-50 rounded-lg text-gray-700"><CalendarClock className="inline w-4 h-4 mr-1" />Affected weeks: {plan.affectedWeeks.map(formatShortDate).join(", ")}</div>
          {plan.proposals.map(p => <div key={p.id} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex justify-between"><strong className="text-gray-900">{p.role} ({p.seniority})</strong><span className={p.isFeasible ? 'text-gray-700' : 'text-gray-700'}>{p.isFeasible ? 'Feasible' : 'Unfilled'}</span></div>
            <div className="text-gray-700 mt-1">{p.retainedIncumbent ? `Retain ${p.employeeName}` : p.employeeName ? `Replace with ${p.employeeName}` : 'No replacement available'}</div>
            {p.conflicts.length > 0 && <div className="text-gray-700 mt-1">Conflicts: {p.conflicts.join("; ")}</div>}
            <div className="text-gray-500 mt-1">{p.weeklyWorkloads.map(w => `${formatShortDate(w.weekStartDate)}: ${w.existingAllocatedHours + w.proposedHours}h/${w.availableWorkingHours}h (${w.projectedUtilization}%)`).join(" ? ")}</div>
          </div>)}
          {plan.unfilledPositions.length > 0 && <div className="text-gray-700">{plan.unfilledPositions.length} position(s) remain unfilled. No changes will be saved until the plan is feasible.</div>}
        </>}
      </div>
      <div className="p-4 border-t border-gray-200 flex justify-end gap-2">
        <button onClick={onClose} className="px-4 py-2 bg-gray-50 rounded-lg text-gray-700">Cancel</button>
        {plan?.isFeasible && <button onClick={approve} className="px-4 py-2 bg-gray-900 rounded-lg text-white flex gap-1"><CheckCircle2 className="w-4 h-4" />Approve revised schedule</button>}
      </div>
    </div>
  </div>;
};




