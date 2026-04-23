import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, Bell, CheckCircle2, Filter, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { api } from '../lib/api';

type Severity = 'high' | 'medium' | 'low';
type Category = 'arrivals' | 'folio' | 'inventory' | 'housekeeping';

interface NotificationItem {
  id: string;
  severity: Severity;
  category: Category;
  title: string;
  message: string;
  count?: number;
  actionPath?: string;
  createdAt: string;
}

interface NotificationResponse {
  summary: {
    total: number;
    high: number;
    medium: number;
    low: number;
  };
  items: NotificationItem[];
  generatedAt: string;
}

const tone: Record<Severity, string> = {
  high: 'border-red-200 bg-red-50 text-red-800',
  medium: 'border-amber-200 bg-amber-50 text-amber-800',
  low: 'border-blue-200 bg-blue-50 text-blue-800',
};

export function Notifications() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState<NotificationResponse | null>(null);
  const [severityFilter, setSeverityFilter] = useState<'all' | Severity>('all');

  async function load() {
    setLoading(true);
    setError('');
    try {
      const res = await api.get<NotificationResponse>('/api/notifications');
      setData(res);
    } catch (e) {
      setError((e as Error).message ?? 'Failed to load notifications');
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const items = useMemo(() => {
    const all = data?.items ?? [];
    return severityFilter === 'all' ? all : all.filter((i) => i.severity === severityFilter);
  }, [data, severityFilter]);

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
      <PageHeader
        title="Notification Center"
        subtitle="Exception-based alerts for front desk, inventory, folios, and operations."
        actions={
          <button
            onClick={load}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors text-sm font-medium"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">Total Alerts</p>
          <p className="text-2xl font-semibold text-slate-900 mt-1">{data?.summary.total ?? 0}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">High</p>
          <p className="text-2xl font-semibold text-red-700 mt-1">{data?.summary.high ?? 0}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">Medium</p>
          <p className="text-2xl font-semibold text-amber-700 mt-1">{data?.summary.medium ?? 0}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">Low</p>
          <p className="text-2xl font-semibold text-blue-700 mt-1">{data?.summary.low ?? 0}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
          <h3 className="font-semibold text-slate-900 flex items-center gap-2"><Bell className="w-4 h-4 text-amber-600" /> Alerts</h3>
          <div className="flex items-center gap-2 text-sm">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value as 'all' | Severity)}
              className="px-2.5 py-1.5 border border-slate-200 rounded-md text-slate-700 bg-white"
            >
              <option value="all">All severities</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
        </div>

        {error && <div className="px-4 py-3 text-sm text-red-700 bg-red-50 border-b border-red-100">{error}</div>}

        <div className="divide-y divide-slate-100">
          {loading ? (
            <div className="px-4 py-10 text-sm text-slate-500">Loading notifications...</div>
          ) : items.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
              <p className="text-sm text-slate-600 font-medium">No active alerts</p>
              <p className="text-xs text-slate-400 mt-1">Everything looks healthy right now.</p>
            </div>
          ) : items.map((item) => (
            <div key={item.id} className="px-4 py-4 hover:bg-slate-50 transition-colors">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className={`text-[11px] px-2 py-0.5 rounded-full border font-semibold uppercase ${tone[item.severity]}`}>
                      {item.severity}
                    </span>
                    <span className="text-[11px] px-2 py-0.5 rounded-full border border-slate-200 text-slate-600 bg-white uppercase">
                      {item.category}
                    </span>
                    {typeof item.count === 'number' && (
                      <span className="text-[11px] px-2 py-0.5 rounded-full border border-slate-200 text-slate-700 bg-white">
                        {item.count}
                      </span>
                    )}
                  </div>
                  <p className="font-semibold text-slate-900">{item.title}</p>
                  <p className="text-sm text-slate-600 mt-0.5">{item.message}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {item.actionPath && (
                    <button
                      onClick={() => navigate(item.actionPath!)}
                      className="px-3 py-1.5 text-xs font-medium rounded-lg bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100"
                    >
                      Open
                    </button>
                  )}
                  <AlertTriangle className={`w-4 h-4 ${item.severity === 'high' ? 'text-red-500' : item.severity === 'medium' ? 'text-amber-500' : 'text-blue-500'}`} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
