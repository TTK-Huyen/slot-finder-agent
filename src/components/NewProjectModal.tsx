import React, { useState } from 'react';
import { Plus, Sparkles, X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { formatDate, getMonday } from '../utils/dateUtils';

interface NewProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NewProjectModal: React.FC<NewProjectModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { addProject } = useApp();

  const defaultMonday = formatDate(getMonday(new Date()));

  const [name, setName] = useState('');
  const [client, setClient] = useState('');
  const [startDate, setStartDate] = useState(defaultMonday);
  const [durationWeeks, setDurationWeeks] = useState<number>(4);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !client.trim()) return;

    addProject(name.trim(), client.trim(), startDate, durationWeeks);
    onClose();
    setName('');
    setClient('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white border border-gray-200 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="p-6 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gray-900/30 border border-gray-300/40 flex items-center justify-center text-gray-700">
              <Plus className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900 m-0">Create a new project</h3>
              <p className="text-xs text-gray-500">Set up project timeline</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-900 p-1 rounded-lg hover:bg-gray-50 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-gray-700 mb-1">
              Project name <span className="text-gray-700">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g.: Omni-Channel Banking App"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-gray-300"
            />
          </div>

          <div>
            <label className="block font-semibold text-gray-700 mb-1">
              Client / partner <span className="text-gray-700">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g.: Acme Corp"
              value={client}
              onChange={(e) => setClient(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-gray-300"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-gray-700 mb-1">
                Start date (Monday)
              </label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-gray-900 focus:outline-none focus:border-gray-300"
              />
            </div>

            <div>
              <label className="block font-semibold text-gray-700 mb-1">
                Project duration
              </label>
              <select
                value={durationWeeks}
                onChange={(e) => setDurationWeeks(Number(e.target.value))}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-gray-900 focus:outline-none focus:border-gray-300"
              >
                <option value={2}>2 weeks</option>
                <option value={4}>4 weeks (1 month)</option>
                <option value={6}>6 weeks</option>
                <option value={8}>8 weeks (2 month)</option>
                <option value={12}>12 weeks (3 month)</option>
              </select>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-gray-100/10 border border-gray-300/20 text-gray-700 text-[11px] flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-gray-700 flex-shrink-0" />
            <span>
              The project will last {durationWeeks} weeks. After creation, you can estimate staffing and hours needed for each role.
            </span>
          </div>

          {/* Form Actions */}
          <div className="pt-3 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-700 font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-gray-900 hover:bg-gray-800 text-gray-900 font-semibold shadow-md shadow-gray-900/30 transition-all cursor-pointer"
            >
              Create project
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};


