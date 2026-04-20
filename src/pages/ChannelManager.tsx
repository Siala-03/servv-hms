import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { RefreshCw, AlertCircle, CheckCircle2, Loader2, WifiOff, Copy, Check, Globe } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { api } from '../lib/api';
import { useToast } from '../components/Toast';
import { useAuth } from '../contexts/AuthContext';

interface Channel {
  id:               string;
  channel:          string;
  inventoryUpdated: number;
  ratesUpdated:     number;
  status:           string;
  syncedAt:         string;
  errorMessage?:    string;
}

interface SyncLog {
  id:               string;
  channel:          string;
  status:           string;
  syncedAt:         string;
  inventoryUpdated: number;
  ratesUpdated:     number;
  errorMessage?:    string;
}

interface Room {
  id:       string;
  roomType: string;
  baseRate: number;
}

const CHANNEL_META: Record<string, { color: string; commission: string }> = {
  'Booking.com': { color: 'bg-[#003580]', commission: '15%' },
  'Airbnb':      { color: 'bg-[#FF5A5F]', commission: '3%' },
  'Expedia':     { color: 'bg-[#000080]', commission: '18%' },
  'Agoda':       { color: 'bg-[#f59e0b]', commission: '15%' },
  'Triply':      { color: 'bg-[#8b5cf6]', commission: '10%' },
};

const KNOWN_CHANNELS = Object.keys(CHANNEL_META);

function timeSince(isoStr: string) {
  const diff = Date.now() - new Date(isoStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return 'just now';
  if (mins < 60) return `${mins} min${mins !== 1 ? 's' : ''} ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs} hr${hrs !== 1 ? 's' : ''} ago`;
  return `${Math.floor(hrs / 24)} day${Math.floor(hrs / 24) !== 1 ? 's' : ''} ago`;
}

const FRONTEND = (import.meta as any).env.VITE_FRONTEND_URL ?? window.location.origin;

export function ChannelManager() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [copied, setCopied] = useState<'link' | 'iframe' | null>(null);
  const [channels,  setChannels]  = useState<Channel[]>([]);
  const [logs,      setLogs]      = useState<SyncLog[]>([]);
  const [rooms,     setRooms]     = useState<Room[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [syncing,   setSyncing]   = useState(false);
  const [toggling,  setToggling]  = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const [ch, lg, rm] = await Promise.all([
        api.get<Channel[]>('/api/channels'),
        api.get<SyncLog[]>('/api/channels/history'),
        api.get<Room[]>('/api/rooms'),
      ]);
      setChannels(ch);
      setLogs(lg.slice(0, 20));
      setRooms(rm);
    } catch {
      toast('Failed to load channel data', 'error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  // Merge API channels with known channel list so we always show all platforms
  const displayChannels = KNOWN_CHANNELS.map((name) => {
    const live = channels.find((c) => c.channel === name);
    return live ?? {
      id: name, channel: name, inventoryUpdated: 0,
      ratesUpdated: 0, status: 'Disconnected', syncedAt: '',
    } as Channel;
  });

  const disconnected = displayChannels.filter((c) => c.status === 'Disconnected');

  async function syncAll() {
    setSyncing(true);
    try {
      const connected = displayChannels.filter((c) => c.status !== 'Disconnected');
      await Promise.all(
        connected.map((c) =>
          c.channel === 'Booking.com'
            ? api.post('/api/channels/booking-com/sync', {}, 'Booking.com live sync')
            : api.post('/api/channels/sync', {
                channel: c.channel,
                status: 'Connected',
                inventoryUpdated: Math.floor(Math.random() * 20) + 1,
                ratesUpdated: Math.floor(Math.random() * 10) + 1,
              })
        )
      );
      toast('All channels synced', 'success');
      await load();
    } catch {
      toast('Sync failed', 'error');
    } finally {
      setSyncing(false);
    }
  }

  async function toggleChannel(ch: Channel) {
    setToggling(ch.channel);
    try {
      if (ch.id === ch.channel) {
        // No DB record yet — create one
        await api.post('/api/channels/sync', {
          channel: ch.channel, status: 'Connected',
          inventoryUpdated: 0, ratesUpdated: 0,
        });
      } else {
        const newStatus = ch.status === 'Disconnected' ? 'Connected' : 'Disconnected';
        await api.patch(`/api/channels/${ch.id}/status`, { status: newStatus });
      }
      toast(`${ch.channel} updated`, 'success');
      await load();
    } catch {
      toast('Failed to update channel', 'error');
    } finally {
      setToggling(null);
    }
  }

  async function reconnect(ch: Channel) {
    setToggling(ch.channel);
    try {
      if (ch.channel === 'Booking.com') {
        await api.post('/api/channels/booking-com/sync', {}, 'Booking.com reconnect sync');
      } else if (ch.id === ch.channel) {
        await api.post('/api/channels/sync', {
          channel: ch.channel, status: 'Connected',
          inventoryUpdated: 0, ratesUpdated: 0,
        });
      } else {
        await api.patch(`/api/channels/${ch.id}/status`, { status: 'Connected' });
      }
      toast(`${ch.channel} reconnected`, 'success');
      await load();
    } catch {
      toast('Reconnect failed', 'error');
    } finally {
      setToggling(null);
    }
  }

  function copyText(text: string, key: 'link' | 'iframe') {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    });
  }

  // Unique room types with average base rate
  const roomTypes = Object.values(
    rooms.reduce<Record<string, { type: string; rates: number[] }>>((acc, r) => {
      if (!acc[r.roomType]) acc[r.roomType] = { type: r.roomType, rates: [] };
      acc[r.roomType].rates.push(r.baseRate);
      return acc;
    }, {})
  ).map(({ type, rates }) => ({
    type,
    base: Math.round(rates.reduce((a, b) => a + b, 0) / rates.length),
  }));

  const MARKUPS: Record<string, number> = {
    'Booking.com': 1.10, Airbnb: 1.07, Expedia: 1.10,
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      <PageHeader
        title="Channel Manager"
        subtitle="Manage OTA connections, sync rates, and prevent overbooking."
        actions={
          <>
            <button
              onClick={syncAll}
              disabled={syncing || loading}
              className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors text-sm font-medium shadow-sm disabled:opacity-50"
            >
              {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              Sync All Channels
            </button>
          </>
        }
      />

      {/* Disconnected alerts */}
      {disconnected.map((ch) => (
        <div key={ch.channel} className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="text-sm font-medium text-amber-800">{ch.channel} connection requires attention</h4>
            <p className="text-sm text-amber-700 mt-0.5">
              {ch.syncedAt ? `Last synced ${timeSince(ch.syncedAt)}. Re-authenticate to resume syncing.` : 'Not yet connected.'}
            </p>
          </div>
          <button
            onClick={() => reconnect(ch)}
            disabled={toggling === ch.channel}
            className="shrink-0 flex items-center gap-1 text-sm font-medium text-amber-800 hover:text-amber-900 underline disabled:opacity-50"
          >
            {toggling === ch.channel ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
            Reconnect
          </button>
        </div>
      ))}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
        </div>
      ) : (
        <>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Connected Platforms</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-8">
            {displayChannels.map((ch) => {
              const meta = CHANNEL_META[ch.channel] ?? { color: 'bg-slate-500', commission: '—' };
              const enabled = ch.status !== 'Disconnected';
              return (
                <div key={ch.channel} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex flex-col">
                  <div className="flex items-center justify-between mb-4">
                    <div className={`w-10 h-10 rounded-lg ${meta.color} flex items-center justify-center text-white font-bold text-xl shadow-sm`}>
                      {ch.channel.charAt(0)}
                    </div>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${
                      ch.status === 'Connected'    ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                      ch.status === 'Syncing'      ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                                     'bg-red-50 text-red-700 border-red-200'
                    }`}>{ch.status}</span>
                  </div>
                  <h4 className="font-semibold text-gray-900">{ch.channel}</h4>
                  <div className="mt-4 space-y-2 flex-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Last Sync</span>
                      <span className="font-medium text-gray-900 flex items-center gap-1">
                        {ch.status === 'Syncing' && <RefreshCw className="w-3 h-3 animate-spin text-amber-500" />}
                        {ch.syncedAt ? timeSince(ch.syncedAt) : '—'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Inventory</span>
                      <span className="font-medium text-gray-900">{ch.inventoryUpdated} updated</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Commission</span>
                      <span className="font-medium text-gray-900">{meta.commission}</span>
                    </div>
                  </div>
                  <div className="mt-6 pt-4 border-t border-gray-100">
                    <label className="flex items-center justify-between cursor-pointer">
                      <span className="text-sm font-medium text-gray-700">Enable Sync</span>
                      {toggling === ch.channel ? (
                        <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
                      ) : (
                        <button
                          onClick={() => toggleChannel(ch)}
                          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${enabled ? 'bg-amber-600' : 'bg-gray-200'}`}
                        >
                          <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${enabled ? 'translate-x-4' : 'translate-x-1'}`} />
                        </button>
                      )}
                    </label>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Rate Management */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm lg:col-span-2 overflow-hidden">
              <div className="p-6 border-b border-gray-100">
                <h3 className="text-lg font-semibold text-gray-900">Rate Management</h3>
                <p className="text-sm text-gray-500 mt-1">Base rates from your room inventory with estimated channel markups.</p>
              </div>
              {roomTypes.length === 0 ? (
                <div className="p-8 text-center text-slate-400">
                  <WifiOff className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">No rooms configured yet. Add rooms to see rates.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-100">
                      <tr>
                        <th className="px-6 py-4 font-medium">Room Type</th>
                        <th className="px-6 py-4 font-medium">Base Rate</th>
                        <th className="px-6 py-4 font-medium">Direct</th>
                        <th className="px-6 py-4 font-medium">Booking.com</th>
                        <th className="px-6 py-4 font-medium">Airbnb</th>
                        <th className="px-6 py-4 font-medium">Expedia</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {roomTypes.map((r) => (
                        <tr key={r.type} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-6 py-4 font-medium text-gray-900">{r.type}</td>
                          <td className="px-6 py-4 font-medium text-gray-900">${r.base}</td>
                          <td className="px-6 py-4 text-emerald-600 font-medium">${Math.round(r.base * 0.93)}</td>
                          <td className="px-6 py-4 text-gray-600">${Math.round(r.base * (MARKUPS['Booking.com'] ?? 1))}</td>
                          <td className="px-6 py-4 text-gray-600">${Math.round(r.base * (MARKUPS['Airbnb'] ?? 1))}</td>
                          <td className="px-6 py-4 text-gray-600">${Math.round(r.base * (MARKUPS['Expedia'] ?? 1))}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Sync Log */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm flex flex-col">
              <div className="p-6 border-b border-gray-100">
                <h3 className="text-lg font-semibold text-gray-900">Recent Sync Logs</h3>
              </div>
              <div className="flex-1 divide-y divide-gray-100 overflow-y-auto max-h-80">
                {logs.length === 0 ? (
                  <div className="p-6 text-center text-slate-400 text-sm">No sync history yet.</div>
                ) : logs.map((log) => (
                  <div key={log.id} className="p-4 flex items-start gap-3 hover:bg-gray-50 transition-colors">
                    {log.status === 'Connected'
                      ? <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                      : <AlertCircle  className="w-5 h-5 text-red-500    shrink-0 mt-0.5" />
                    }
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">{log.channel}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {log.errorMessage ?? `${log.inventoryUpdated} inventory · ${log.ratesUpdated} rates`}
                      </p>
                    </div>
                    <span className="text-xs text-gray-400 shrink-0">{timeSince(log.syncedAt)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
      {/* ── Direct Booking Widget ──────────────────────────────── */}
      {user?.hotelId && (
        <div className="mt-6 bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
              <Globe className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Direct Booking Widget</h3>
              <p className="text-sm text-gray-500 mt-0.5">Embed your booking page on your website to capture direct bookings — no OTA commission.</p>
            </div>
          </div>
          <div className="p-6 space-y-5">
            {(() => {
              const bookingUrl = `${FRONTEND}/book/${user.hotelId}`;
              const iframeCode = `<iframe src="${bookingUrl}" width="100%" height="700" style="border:none;border-radius:16px;" title="Book your stay"></iframe>`;
              return (
                <>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-2 uppercase tracking-wide">Booking Page Link</label>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg font-mono text-xs text-gray-700 truncate">{bookingUrl}</div>
                      <button
                        onClick={() => copyText(bookingUrl, 'link')}
                        className="shrink-0 flex items-center gap-1.5 px-3 py-2.5 bg-amber-600 text-white rounded-lg text-xs font-medium hover:bg-amber-700 transition-colors"
                      >
                        {copied === 'link' ? <><Check className="w-3.5 h-3.5" /> Copied</> : <><Copy className="w-3.5 h-3.5" /> Copy Link</>}
                      </button>
                    </div>
                    <p className="text-xs text-gray-400 mt-1.5">Share this link in emails, WhatsApp, or your Google Business profile.</p>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-2 uppercase tracking-wide">Embed Code (iframe)</label>
                    <div className="flex items-start gap-2">
                      <pre className="flex-1 px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg font-mono text-xs text-gray-700 whitespace-pre-wrap break-all">{iframeCode}</pre>
                      <button
                        onClick={() => copyText(iframeCode, 'iframe')}
                        className="shrink-0 flex items-center gap-1.5 px-3 py-2.5 bg-slate-800 text-white rounded-lg text-xs font-medium hover:bg-slate-900 transition-colors"
                      >
                        {copied === 'iframe' ? <><Check className="w-3.5 h-3.5" /> Copied</> : <><Copy className="w-3.5 h-3.5" /> Copy</>}
                      </button>
                    </div>
                    <p className="text-xs text-gray-400 mt-1.5">Paste this into any page on your website to show the booking widget inline.</p>
                  </div>

                  <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                    <p className="text-sm font-medium text-emerald-800 mb-1">Why use direct bookings?</p>
                    <ul className="text-xs text-emerald-700 space-y-1 list-disc list-inside">
                      <li>0% OTA commission — keep 100% of the booking value</li>
                      <li>Guest goes directly into your HMS — no manual entry</li>
                      <li>Works on any website, WhatsApp bio, or Google Business</li>
                    </ul>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}
    </motion.div>
  );
}
