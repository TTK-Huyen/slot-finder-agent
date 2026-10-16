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

  // Default start date: next Monday
  const defaultMonday = formatDate(getMonday(new Date()));

  const [name, setName] = useState('');
  const [client, setClient] = useState('');
  const [startDate, setStartDate] = useState(defaultMonday);
  const [sprintCount, setSprintCount] = useState<number>(2);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !client.trim()) return;

    addProject(name.trim(), client.trim(), startDate, sprintCount);
    onClose();
    setName('');
    setClient('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-800 bg-slate-800/50 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
              <Plus className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white m-0">Tạo Dự Án Mới</h3>
              <p className="text-xs text-slate-400">Thiết lập tiến độ & chia các Sprint</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-300 mb-1">
              Tên dự án <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="ví dụ: Omni-Channel Banking App"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-300 mb-1">
              Khách hàng / Đối tác <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="ví dụ: Acme Corp"
              value={client}
              onChange={(e) => setClient(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-300 mb-1">
                Ngày bắt đầu (Thứ 2)
              </label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">
                Số lượng Sprint (2 tuần/sprint)
              </label>
              <select
                value={sprintCount}
                onChange={(e) => setSprintCount(Number(e.target.value))}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
              >
                <option value={1}>1 Sprint (2 tuần)</option>
                <option value={2}>2 Sprints (4 tuần)</option>
                <option value={3}>3 Sprints (6 tuần)</option>
                <option value={4}>4 Sprints (8 tuần)</option>
                <option value={5}>5 Sprints (10 tuần)</option>
                <option value={6}>6 Sprints (12 tuần)</option>
              </select>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-slate-300 text-[11px] flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-400 flex-shrink-0" />
            <span>
              Hệ thống sẽ tự động tạo {sprintCount} block Sprint (mỗi block 2 tuần) nối tiếp nhau và căn chỉnh theo các tuần dương lịch.
            </span>
          </div>

          {/* Form Actions */}
          <div className="pt-3 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow-md shadow-indigo-600/30 transition-all"
            >
              Tạo dự án ngay
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
