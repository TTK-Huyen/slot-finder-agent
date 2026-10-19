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
      setError(result.reason || 'D? li?u d� thay d?i tru?c khi ph� duy?t.');
      return;
    }
    commitProjectDelay(result.updatedProjects, result.updatedAssignments);
    onClose();
  };

  return <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
    <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
      <div className="p-5 border-b border-slate-800 flex justify-between">
        <div><h2 className="text-lg font-bold text-white">Ph�n b? l?i khi d? �n tr� ho�n (UC04)</h2>
          <p className="text-xs text-slate-400">X�c nh?n l?ch v� nhu c?u theo tu?n tru?c khi h? th?ng d? xu?t ph�n c�ng.</p></div>
        <button onClick={onClose}><X className="w-5 h-5 text-slate-400" /></button>
      </div>
      <div className="p-5 space-y-4 text-xs">
        <div className="grid grid-cols-2 gap-3">
          <div><label className="block text-slate-400 mb-1">H?n hi?n t?i</label><div className="p-2 bg-slate-800 rounded-lg text-white">{formatShortDate(active.endDate)}</div></div>
          <div><label className="block text-slate-400 mb-1">H?n m?i</label><input type="date" min={active.endDate} value={newDeadline} onChange={e => { setNewDeadline(e.target.value); setConfirmed(false); }} className="w-full p-2 bg-slate-800 border border-slate-700 rounded-lg text-white" /></div>
        </div>
        <div className="p-3 bg-slate-800/60 rounded-lg space-y-2">
          <div className="font-semibold text-slate-200">Nhu c?u nh�n s? cho l?ch th?c hi?n m?i</div>
          {staffingNeeds.map((need) => {
            const req = requirements.find((r) => r.id === need.requirementId);
            if (!req) return null;
            return <div key={need.requirementId} className="grid grid-cols-[1fr_90px_100px] gap-2 items-center">
              <span className="text-slate-300">{req.role} ({req.seniority})</span>
              <label className="text-slate-400">Ngu?i<input type="number" min="0" value={need.requiredCount} onChange={e => updateNeed(need.requirementId, 'requiredCount', Number(e.target.value))} className="w-full mt-1 p-1.5 bg-slate-900 border border-slate-700 rounded text-white" /></label>
              <label className="text-slate-400">Gi?/tu?n<input type="number" min="0" value={need.hoursPerWeek} onChange={e => updateNeed(need.requirementId, 'hoursPerWeek', Number(e.target.value))} className="w-full mt-1 p-1.5 bg-slate-900 border border-slate-700 rounded text-white" /></label>
            </div>;
          })}
          <label className="flex gap-2 items-start text-slate-300 pt-2"><input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} className="mt-0.5" /> T�i x�c nh?n l?ch th?c hi?n m?i v� nhu c?u nh�n s? theo t?ng tu?n b? ?nh hu?ng.</label>
        </div>
        {error && <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-300 rounded-lg flex gap-2"><AlertCircle className="w-4 h-4" />{error}</div>}
        {plan && <><div className="p-3 bg-slate-800/60 rounded-lg text-slate-300"><CalendarClock className="inline w-4 h-4 mr-1" />?nh hu?ng {plan.affectedWeeks.length} tu?n: {plan.affectedWeeks.map(formatShortDate).join(', ')}</div>
          {plan.proposals.map(p => <div key={p.id} className="p-3 bg-slate-800/50 rounded-lg border border-slate-700">
            <div className="flex justify-between"><strong className="text-white">{p.role} ({p.seniority})</strong><span className={p.isFeasible ? 'text-emerald-400' : 'text-rose-400'}>{p.isFeasible ? 'Kh? thi' : 'Chua d? ngu?i'}</span></div>
            <div className="text-slate-300 mt-1">{p.retainedIncumbent ? `Gi? l?i ${p.employeeName}` : p.employeeName ? `Thay b?ng ${p.employeeName}` : 'Chua c� phuong �n thay th?'}</div>
            {p.conflicts.length > 0 && <div className="text-amber-300 mt-1">Xung d?t: {p.conflicts.join('; ')}</div>}
            <div className="text-slate-500 mt-1">{p.weeklyWorkloads.map(w => `${formatShortDate(w.weekStartDate)}: ${w.existingAllocatedHours + w.proposedHours}h/${w.availableWorkingHours}h (${w.projectedUtilization}%)`).join(' � ')}</div>
          </div>)}
          {plan.unfilledPositions.length > 0 && <div className="text-rose-300">C�n tr?ng {plan.unfilledPositions.length} v? tr�. Kh�ng thay d?i d? li?u n?u chua c� k? ho?ch kh? thi.</div>}
        </>}
      </div>
      <div className="p-4 border-t border-slate-800 flex justify-end gap-2">
        <button onClick={onClose} className="px-4 py-2 bg-slate-800 rounded-lg text-slate-300">H?y</button>
        {plan?.isFeasible && <button onClick={approve} className="px-4 py-2 bg-emerald-600 rounded-lg text-white flex gap-1"><CheckCircle2 className="w-4 h-4" />Ph� duy?t l?ch m?i</button>}
      </div>
    </div>
  </div>;
};
