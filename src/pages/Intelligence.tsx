import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Brain, TrendingUp, TrendingDown, Minus, RefreshCw, Loader2,
  Zap, BarChart3, Banknote, AlertTriangle, Lightbulb, CheckCircle2, Sparkles,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { PageHeader } from '../components/PageHeader';
import { api } from '../lib/api';

// ── Types ────────────────────────────────────────────────────────────────────

interface ForecastDay {
  date: string; occupied: number; totalRooms: number;
  occupancyRate: number; isWeekend: boolean;
}

interface PricingRec {
  type: string; baseRate: number; recommended: number;
  change: number; occupancy7d: number;
  signal: 'surge' | 'high' | 'normal' | 'low' | 'discount';
  rationale: string;
  source?: 'ai' | 'rules';
  confidence?: number;
}

interface AiInsight {
  category: string; title: string; body: string;
  priority: 'high' | 'medium' | 'low';
}

interface AiResponse {
  insights: AiInsight[];
  summary:  string;
  kpis:     Record<string, string | number>;
  generatedAt: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const SIGNAL_META = {
  surge:    { label: 'Surge',     bg: 'bg-red-100',     text: 'text-red-700',     border: 'border-red-200',     icon: TrendingUp   },
  high:     { label: 'High',      bg: 'bg-amber-100',   text: 'text-amber-700',   border: 'border-amber-200',   icon: TrendingUp   },
  normal:   { label: 'Normal',    bg: 'bg-slate-100',   text: 'text-slate-600',   border: 'border-slate-200',   icon: Minus        },
  low:      { label: 'Soft',      bg: 'bg-blue-100',    text: 'text-blue-700',    border: 'border-blue-200',    icon: TrendingDown },
  discount: { label: 'Discount',  bg: 'bg-purple-100',  text: 'text-purple-700',  border: 'border-purple-200',  icon: TrendingDown },
};

const CATEGORY_META: Record<string, { icon: typeof Zap; color: string }> = {
  Revenue:          { icon: Banknote,    color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
  Operations:       { icon: Zap,         color: 'text-amber-600 bg-amber-50 border-amber-200'       },
  'Guest Experience': { icon: Sparkles,  color: 'text-purple-600 bg-purple-50 border-purple-200'   },
  'Action Today':   { icon: CheckCircle2, color: 'text-blue-600 bg-blue-50 border-blue-200'         },
};

const PRIORITY_DOT: Record<string, string> = {
  high: 'bg-red-500', medium: 'bg-amber-400', low: 'bg-slate-300',
};

function fmtDay(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

// ── Component ─────────────────────────────────────────────────────────────────

export function Intelligence() {
  const [forecast,    setForecast]    = useState<ForecastDay[]>([]);
  const [pricing,     setPricing]     = useState<PricingRec[]>([]);
  const [ai,          setAi]          = useState<AiResponse | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [loadingAi,   setLoadingAi]   = useState(false);
  const [aiError,     setAiError]     = useState('');

  async function loadData() {
    setLoadingData(true);
    try {
      const [fc, pr] = await Promise.all([
        api.get<ForecastDay[]>('/api/intelligence/forecast'),
        api.get<PricingRec[]>('/api/intelligence/pricing'),
      ]);
      setForecast(fc);
      setPricing(pr);
    } catch { /* non-fatal */ } finally { setLoadingData(false); }
  }

  async function fetchInsights() {
    setLoadingAi(true); setAiError('');
    try {
      const data = await api.post<AiResponse>('/api/intelligence/insights', {});
      setAi(data);
    } catch (e: any) {
      setAiError(e.message ?? 'Failed to generate Servv Insights. Check your SERVV_INSIGHTS_API_KEY.');
    } finally { setLoadingAi(false); }
  }

  useEffect(() => { loadData(); }, []);

  // summary stats from forecast
  const avgOccupancy = forecast.length
    ? Math.round(forecast.reduce((s, d) => s + d.occupancyRate, 0) / forecast.length) : 0;
  const peakDay      = forecast.reduce((a, b) => a.occupancyRate > b.occupancyRate ? a : b, forecast[0]);
  const weekendAvg   = forecast.filter((d) => d.isWeekend).length
    ? Math.round(forecast.filter((d) => d.isWeekend).reduce((s, d) => s + d.occupancyRate, 0) / forecast.filter((d) => d.isWeekend).length)
    : 0;
  const surgeRecs    = pricing.filter((p) => p.signal === 'surge' || p.signal === 'high').length;
  const pricingSource = pricing[0]?.source === 'ai' ? 'ai' : 'rules';

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      <PageHeader
        title="Intelligence"
        subtitle="AI-powered demand forecasting, smart pricing, and Servv Insights."
        actions={
          <button
            onClick={fetchInsights}
            disabled={loadingAi || loadingData}
            className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors text-sm font-medium shadow-sm disabled:opacity-50"
          >
            {loadingAi ? <Loader2 className="w-4 h-4 animate-spin" /> : <Brain className="w-4 h-4" />}
            {loadingAi ? 'Analysing…' : ai ? 'Refresh Servv Insights' : 'Generate Servv Insights'}
          </button>
        }
      />

      {/* ── KPI chips ──────────────────────────────────────────── */}
      <section className="hero-banner p-6 sm:p-7 mb-8 text-slate-100">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400 font-semibold mb-2">30-Day Intelligence View</p>
            <h2 className="text-2xl sm:text-3xl font-semibold tracking-[-0.02em] mb-2">Smart Hospitality Dashboard</h2>
            <p className="text-sm text-slate-300 max-w-2xl">
              {loadingData ? 'Loading forecast data…' : `${avgOccupancy}% avg projected occupancy · ${surgeRecs} room type${surgeRecs !== 1 ? 's' : ''} ready for rate increase`}
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2.5 sm:gap-3 min-w-[300px]">
            <div className="hero-chip rounded-xl px-3 py-2.5">
              <p className="text-[11px] uppercase tracking-[0.14em] text-slate-400">Avg Occ.</p>
              <p className="text-lg font-semibold">{loadingData ? '—' : `${avgOccupancy}%`}</p>
            </div>
            <div className="hero-chip rounded-xl px-3 py-2.5">
              <p className="text-[11px] uppercase tracking-[0.14em] text-slate-400">Wknd Avg</p>
              <p className="text-lg font-semibold">{loadingData ? '—' : `${weekendAvg}%`}</p>
            </div>
            <div className="hero-chip rounded-xl px-3 py-2.5">
              <p className="text-[11px] uppercase tracking-[0.14em] text-slate-400">Peak Day</p>
              <p className="text-lg font-semibold">{loadingData || !peakDay ? '—' : `${peakDay.occupancyRate}%`}</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── 30-day forecast chart ──────────────────────────────── */}
      <div className="luxury-panel luxury-panel-spotlight p-6 rounded-2xl mb-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">30-Day Occupancy Forecast</h3>
            <p className="text-sm text-slate-400 mt-0.5">Based on confirmed & pending bookings in your system</p>
          </div>
          <button onClick={loadData} disabled={loadingData} className="p-2 rounded-lg hover:bg-slate-100 transition-colors text-slate-500 disabled:opacity-40">
            <RefreshCw className={`w-4 h-4 ${loadingData ? 'animate-spin' : ''}`} />
          </button>
        </div>
        <div className="h-72">
          {loadingData ? (
            <div className="h-full flex items-center justify-center text-slate-400 text-sm">Loading forecast…</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={forecast} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="date" tickFormatter={fmtDay} axisLine={false} tickLine={false}
                  tick={{ fill: '#9ca3af', fontSize: 11 }} interval={4} dy={8} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 11 }}
                  tickFormatter={(v) => `${v}%`} domain={[0, 100]} />
                <Tooltip
                  contentStyle={{ borderRadius: '10px', border: 'none', boxShadow: '0 4px 12px rgb(0 0 0 / 0.1)' }}
                  formatter={(v: number) => [`${v}%`, 'Occupancy']}
                  labelFormatter={(l) => fmtDay(l as string)}
                />
                <ReferenceLine y={80} stroke="#ef4444" strokeDasharray="4 4" strokeWidth={1.5} label={{ value: '80% full', fill: '#ef4444', fontSize: 10, position: 'right' }} />
                <ReferenceLine y={50} stroke="#6b7280" strokeDasharray="4 4" strokeWidth={1} />
                <Area type="monotone" dataKey="occupancyRate" stroke="#d97706" strokeWidth={2}
                  fill="#fef3c7" fillOpacity={0.5} dot={false} activeDot={{ r: 4, fill: '#d97706', stroke: '#fff', strokeWidth: 2 }} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
        {!loadingData && peakDay && (
          <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap gap-4 text-xs text-slate-500">
            <span>Peak: <strong className="text-slate-800">{fmtDay(peakDay.date)} at {peakDay.occupancyRate}%</strong></span>
            <span>Weekend avg: <strong className="text-slate-800">{weekendAvg}%</strong></span>
            <span>Red line = 80% threshold (recommended rate increase trigger)</span>
          </div>
        )}
      </div>

      {/* ── Pricing + AI side by side ──────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Smart Pricing */}
        <div className="luxury-panel luxury-panel-spotlight rounded-2xl overflow-hidden">
          <div className="p-6 border-b border-slate-200/80 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center">
              <BarChart3 className="w-4 h-4 text-amber-600" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900">Smart Pricing Recommendations</h3>
              <p className="text-xs text-slate-400">
                {pricingSource === 'ai'
                  ? 'AI-driven ADR recommendations from demand signals and booking pace'
                  : 'Rule-based ADR recommendations from 7-day booking pace'}
              </p>
            </div>
          </div>
          <div className="divide-y divide-slate-100">
            {loadingData ? (
              <div className="p-8 text-center text-slate-400 text-sm">Loading…</div>
            ) : pricing.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-sm">No rooms configured yet.</div>
            ) : pricing.map((p) => {
              const meta = SIGNAL_META[p.signal];
              const Icon = meta.icon;
              return (
                <div key={p.type} className="p-4 hover:bg-slate-50/60 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-900 text-sm">{p.type}</span>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${meta.bg} ${meta.text} ${meta.border}`}>
                        <Icon className="w-3 h-3" /> {meta.label}
                      </span>
                      {p.source === 'ai' && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border bg-purple-50 text-purple-700 border-purple-200">
                          AI {typeof p.confidence === 'number' ? `${Math.round(p.confidence)}%` : ''}
                        </span>
                      )}
                    </div>
                    <div className="text-right">
                      <span className="text-base font-bold text-slate-900">{usd.format(p.recommended)}</span>
                      <span className={`ml-1.5 text-xs font-medium ${p.change > 0 ? 'text-emerald-600' : p.change < 0 ? 'text-red-500' : 'text-slate-400'}`}>
                        {p.change > 0 ? `+${p.change}%` : p.change < 0 ? `${p.change}%` : 'No change'}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs text-slate-400">Base: {usd.format(p.baseRate)} · 7-day occ: {p.occupancy7d}%</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5 mb-2">
                    <div className={`h-1.5 rounded-full transition-all ${
                      p.occupancy7d >= 80 ? 'bg-red-500' : p.occupancy7d >= 60 ? 'bg-amber-500' : p.occupancy7d >= 40 ? 'bg-blue-400' : 'bg-slate-300'
                    }`} style={{ width: `${Math.min(100, p.occupancy7d)}%` }} />
                  </div>
                  <p className="text-xs text-slate-500 italic">{p.rationale}</p>
                </div>
              );
            })}
          </div>
          <div className="p-4 bg-slate-50/60 border-t border-slate-100">
            <p className="text-xs text-slate-400">
              {pricingSource === 'ai'
                ? 'AI mode active. Rates are recommendations — review and apply in your room settings or channel manager.'
                : 'AI key not configured or unavailable. Using rule-based recommendations.'}
            </p>
          </div>
        </div>

        {/* AI Insights */}
        <div className="luxury-panel luxury-panel-spotlight rounded-2xl overflow-hidden flex flex-col">
          <div className="p-6 border-b border-slate-200/80 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-purple-50 border border-purple-200 flex items-center justify-center">
              <Brain className="w-4 h-4 text-purple-600" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900">Servv Insights</h3>
              <p className="text-xs text-slate-400">Personalized recommendations from your live hotel data</p>
            </div>
          </div>

          <div className="flex-1 p-6">
            {!ai && !loadingAi && !aiError && (
              <div className="h-full flex flex-col items-center justify-center text-center gap-4 py-8">
                <div className="w-16 h-16 rounded-2xl bg-purple-50 border border-purple-200 flex items-center justify-center">
                  <Lightbulb className="w-8 h-8 text-purple-400" />
                </div>
                <div>
                  <p className="font-semibold text-slate-800 mb-1">Ready to analyse your data</p>
                  <p className="text-sm text-slate-400 max-w-xs">Click "Generate Servv Insights" to get personalized recommendations based on your current bookings and revenue.</p>
                </div>
                <button
                  onClick={fetchInsights}
                  className="px-5 py-2.5 bg-purple-600 text-white rounded-xl text-sm font-medium hover:bg-purple-700 transition-colors flex items-center gap-2"
                >
                  <Brain className="w-4 h-4" /> Generate Servv Insights
                </button>
              </div>
            )}

            {loadingAi && (
              <div className="h-full flex flex-col items-center justify-center gap-3 text-slate-400 py-8">
                <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
                <p className="text-sm">Servv Insights is analysing your hotel data…</p>
              </div>
            )}

            {aiError && !loadingAi && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
                <p className="font-medium mb-1 flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> Failed to generate insights</p>
                <p className="text-xs text-red-600">{aiError}</p>
                <button onClick={fetchInsights} className="mt-3 text-xs font-medium text-red-700 underline">Try again</button>
              </div>
            )}

            {ai && !loadingAi && (
              <div className="space-y-4">
                {/* Overall summary */}
                <div className="bg-purple-50 border border-purple-200 rounded-xl px-4 py-3">
                  <p className="text-xs font-medium text-purple-600 uppercase tracking-wide mb-1">Overall Assessment</p>
                  <p className="text-sm text-purple-900 font-medium">{ai.summary}</p>
                </div>

                {/* Insight cards */}
                {(ai.insights ?? []).map((ins, i) => {
                  const meta  = CATEGORY_META[ins.category] ?? CATEGORY_META['Operations'];
                  const CIcon = meta.icon;
                  const [iconColor, bg, border] = meta.color.split(' ');
                  return (
                    <div key={i} className={`rounded-xl border p-4 ${bg} ${border}`}>
                      <div className="flex items-start gap-3">
                        <div className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 bg-white ${border}`}>
                          <CIcon className={`w-4 h-4 ${iconColor}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">{ins.category}</span>
                            <span className={`w-2 h-2 rounded-full shrink-0 ${PRIORITY_DOT[ins.priority] ?? 'bg-slate-300'}`} />
                          </div>
                          <p className="text-sm font-semibold text-slate-900 mb-1">{ins.title}</p>
                          <p className="text-xs text-slate-600 leading-relaxed">{ins.body}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}

                <p className="text-xs text-slate-400 text-right">
                  Generated {new Date(ai.generatedAt).toLocaleTimeString()} · Powered by Servv Insights
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
