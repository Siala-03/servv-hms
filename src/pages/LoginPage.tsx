import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { ROLE_HOME } from '../lib/rbac';
import { BrandLogo } from '../components/BrandLogo';

export function LoginPage() {
  const { user, login } = useAuth();
  const navigate        = useNavigate();
  const location        = useLocation();
  const [params]        = useSearchParams();

  const [hotelId,   setHotelId]   = useState(params.get('hotel') ?? '');
  const [username,  setUsername]  = useState('');
  const [password,  setPassword]  = useState('');
  const [showPass,  setShowPass]  = useState(false);
  const [error,     setError]     = useState('');
  const [loading,   setLoading]   = useState(false);

  // If already logged in, redirect to home
  useEffect(() => {
    if (user) {
      const from = (location.state as any)?.from?.pathname;
      const safeFrom = from && from !== '/' ? from : null;
      navigate(safeFrom ?? ROLE_HOME[user.role], { replace: true });
    }
  }, [user]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(username.trim(), password, hotelId.trim() || undefined);
      // redirect handled by useEffect above
    } catch (err: any) {
      setError(err.message ?? 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  const inputCls = 'w-full px-4 py-3 rounded-xl bg-slate-800/80 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/60 focus:border-amber-500/60 transition';

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
      <div className="absolute inset-0 pointer-events-none bg-amber-500/10" />

      <div className="relative w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <BrandLogo variant="light" className="h-11 mb-3" />
          <p className="text-sm text-slate-400 mt-1">Sign in to your workspace</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-slate-900/80 border border-slate-800 rounded-2xl p-7 flex flex-col gap-4 shadow-xl backdrop-blur-sm">

          {/* Hotel ID */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-slate-400 uppercase tracking-wide">
              Hotel ID <span className="normal-case text-slate-500">(leave blank if superadmin)</span>
            </label>
            <input
              className={inputCls}
              type="text"
              value={hotelId}
              onChange={(e) => setHotelId(e.target.value)}
              placeholder="htl-xxxxxxxx"
              autoComplete="organization"
            />
          </div>

          {/* Username */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-slate-400 uppercase tracking-wide">Username</label>
            <input
              className={inputCls}
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. john.desk"
              autoComplete="username"
              required
            />
          </div>

          {/* Password */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-slate-400 uppercase tracking-wide">Password</label>
            <div className="relative">
              <input
                className={inputCls + ' pr-11'}
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
              >
                {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-400 bg-red-900/20 border border-red-800/40 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || !username || !password}
            className="mt-1 w-full py-3 rounded-xl bg-amber-600 text-white font-semibold text-sm hover:bg-amber-500 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Signing in…</> : 'Sign In'}
          </button>
        </form>

        <p className="text-center text-xs text-slate-600 mt-6">
          SERVV Hotel Management System
        </p>
      </div>
    </div>
  );
}
