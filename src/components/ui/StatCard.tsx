import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  color?: 'indigo' | 'emerald' | 'amber' | 'red' | 'blue' | 'purple';
  change?: string;
  changeType?: 'up' | 'down';
}

const colorMap = {
  indigo: 'bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400',
  emerald: 'bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400',
  amber: 'bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400',
  red: 'bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400',
  blue: 'bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400',
  purple: 'bg-purple-50 dark:bg-purple-950 text-purple-600 dark:text-purple-400',
};

export function StatCard({ title, value, icon: Icon, color = 'indigo', change, changeType }: StatCardProps) {
  return (
    <div className="dashboard-stat-card group rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm shadow-slate-900/[0.02] transition-all duration-200 hover:-translate-y-1 hover:border-indigo-200 hover:shadow-lg hover:shadow-indigo-950/[0.06] dark:border-slate-800 dark:bg-slate-900 dark:hover:border-indigo-900 dark:hover:shadow-black/10">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{title}</p>
          <p className="mt-1 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">{value}</p>
          {change && (
            <p className={`text-xs mt-1 font-medium ${changeType === 'up' ? 'text-emerald-600' : 'text-red-500'}`}>
              {changeType === 'up' ? '↑' : '↓'} {change}
            </p>
          )}
        </div>
        <div className={`flex h-11 w-11 items-center justify-center rounded-2xl transition-transform duration-200 group-hover:rotate-[-4deg] group-hover:scale-105 ${colorMap[color]}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}
