import React, { useState, useEffect } from 'react';
import { Lock, ShieldCheck, AlertCircle, ArrowLeft, KeyRound, Shield, ShieldAlert, Clock } from 'lucide-react';
import { safeFetchJson } from '../utils/api.ts';

interface AdminLoginPageProps {
  onLoginSuccess: (token: string, admin: any) => void;
  onBackToTube: () => void;
}

function formatRemainingLockout(totalSeconds: number): string {
  if (totalSeconds <= 0) return '0s';
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
}

export const AdminLoginPage: React.FC<AdminLoginPageProps> = ({
  onLoginSuccess,
  onBackToTube,
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inactivityAlert, setInactivityAlert] = useState<string | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [lockoutUntil, setLockoutUntil] = useState<number>(0);
  const [lockoutRemaining, setLockoutRemaining] = useState<number>(0);

  useEffect(() => {
    try {
      const reason = sessionStorage.getItem('ubcexx_admin_logout_reason');
      if (reason) {
        setInactivityAlert(reason);
        sessionStorage.removeItem('ubcexx_admin_logout_reason');
      }

      const storedUntil = Number(localStorage.getItem('ubcexx_admin_lockout_until') || 0);
      const now = Date.now();
      if (storedUntil > now) {
        setIsLocked(true);
        setLockoutUntil(storedUntil);
        setLockoutRemaining(Math.ceil((storedUntil - now) / 1000));
      }
    } catch {
    }

    safeFetchJson<{
      success: boolean;
      locked?: boolean;
      lockoutUntil?: number;
      remainingSeconds?: number;
    }>('/api/admin/login').then((data) => {
      if (data?.locked && data.lockoutUntil && data.lockoutUntil > Date.now()) {
        setIsLocked(true);
        setLockoutUntil(data.lockoutUntil);
        setLockoutRemaining(Math.ceil((data.lockoutUntil - Date.now()) / 1000));
        try {
          localStorage.setItem('ubcexx_admin_lockout_until', String(data.lockoutUntil));
          localStorage.setItem('ubcexx_admin_failed_attempts', '2');
        } catch {
        }
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!isLocked || !lockoutUntil) return;

    const interval = window.setInterval(() => {
      const now = Date.now();
      const rem = Math.max(0, Math.ceil((lockoutUntil - now) / 1000));
      setLockoutRemaining(rem);

      if (rem <= 0) {
        setIsLocked(false);
        setLockoutUntil(0);
        setError(null);
        try {
          localStorage.removeItem('ubcexx_admin_lockout_until');
          localStorage.removeItem('ubcexx_admin_failed_attempts');
        } catch {
        }
      }
    }, 1000);

    return () => window.clearInterval(interval);
  }, [isLocked, lockoutUntil]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLocked) {
      setError('Security Lockout: 2 failed attempts exceeded. Admin access locked for 2 hours.');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), username: email.trim(), password }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.success) {
        let attempts = 0;
        try {
          attempts = Number(localStorage.getItem('ubcexx_admin_failed_attempts') || 0);
        } catch {
        }
        attempts += 1;

        if (attempts >= 2 || data.locked) {
          const until = data.lockoutUntil || (Date.now() + (2 * 60 * 60 * 1000));
          try {
            localStorage.setItem('ubcexx_admin_failed_attempts', '2');
            localStorage.setItem('ubcexx_admin_lockout_until', String(until));
          } catch {
          }
          setIsLocked(true);
          setLockoutUntil(until);
          setLockoutRemaining(Math.ceil((until - Date.now()) / 1000));
          throw new Error('Security Lockout: 2 failed attempts exceeded. Admin access locked for 2 hours.');
        } else {
          try {
            localStorage.setItem('ubcexx_admin_failed_attempts', String(attempts));
          } catch {
          }
          throw new Error(data.error || 'Invalid admin credentials. 1 attempt remaining before 2-hour lockout.');
        }
      }

      try {
        localStorage.removeItem('ubcexx_admin_failed_attempts');
        localStorage.removeItem('ubcexx_admin_lockout_until');
      } catch {
      }

      onLoginSuccess(data.token, data.admin);
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#080C14] flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#F59E0B]/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md mb-6 flex justify-between items-center">
        <button
          onClick={onBackToTube}
          className="inline-flex items-center gap-1.5 text-xs text-[#94A3B8] hover:text-[#F8FAFC] transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Public Tube</span>
        </button>
        <span className="text-[11px] font-mono text-[#94A3B8] flex items-center gap-1.5">
          <Shield className="w-3 h-3 text-[#10B981]" />
          Strict Security Gateway
        </span>
      </div>

      <div className="w-full max-w-md bg-[#0F172A] border border-[#1E293B] rounded-2xl p-8 shadow-2xl relative z-10">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#F59E0B] text-black shadow-xl shadow-[#F59E0B]/30 mb-4">
            <Lock className="w-7 h-7 text-black stroke-[2.5]" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-[#F8FAFC] font-display">
            UBCEXX <span className="text-[#F59E0B]">Admin Portal</span>
          </h1>
          <p className="text-xs text-[#94A3B8] mt-1.5">
            Strict Multi-Tier Verification · Session Timeout Protection
          </p>
        </div>

        {inactivityAlert && (
          <div className="mb-6 p-3.5 rounded-xl bg-[#2A1D0B] border border-[#F59E0B]/60 text-[#F59E0B] text-xs flex items-center gap-2.5 shadow-lg">
            <AlertCircle className="w-4 h-4 text-[#F59E0B] shrink-0" />
            <span className="font-semibold">{inactivityAlert}</span>
          </div>
        )}

        {isLocked && (
          <div className="mb-6 p-4 rounded-xl bg-[#2A0E13] border border-[#EF4444] text-[#F8FAFC] shadow-2xl">
            <div className="flex items-start gap-3">
              <ShieldAlert className="w-5 h-5 text-[#EF4444] shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-[#EF4444] uppercase tracking-wider">
                  Security Lockout Active
                </h4>
                <p className="text-xs text-[#CBD5E1] mt-1 font-medium leading-relaxed">
                  Security Lockout: 2 failed attempts exceeded. Admin access locked for 2 hours.
                </p>
                <div className="mt-2.5 inline-flex items-center gap-2 text-xs font-mono text-[#F59E0B] font-bold bg-[#131C2E] px-3 py-1.5 rounded-lg border border-[#253349]">
                  <Clock className="w-3.5 h-3.5 text-[#F59E0B]" />
                  <span>Remaining: {formatRemainingLockout(lockoutRemaining)}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {error && !isLocked && (
          <div className="mb-6 p-3.5 rounded-xl bg-[#3B0713] border border-[#4C0D1A] text-[#FB7185] text-xs flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 text-[#FB7185] shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#94A3B8] uppercase tracking-wider mb-2">
              Admin Email / Username
            </label>
            <input
              type="text"
              required
              disabled={isLocked || loading}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter admin email"
              className="w-full bg-[#131C2E] text-sm text-[#F8FAFC] px-4 py-3 rounded-xl border border-[#253349] focus:outline-none focus:border-[#F59E0B] focus:ring-1 focus:ring-[#F59E0B] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#94A3B8] uppercase tracking-wider mb-2 flex justify-between">
              <span>Password (Required)</span>
              <span className="text-[10px] text-[#F59E0B] font-mono lowercase">single-visit auth</span>
            </label>
            <input
              type="password"
              required
              disabled={isLocked || loading}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter admin password"
              className="w-full bg-[#131C2E] text-sm text-[#F8FAFC] px-4 py-3 rounded-xl border border-[#253349] focus:outline-none focus:border-[#F59E0B] focus:ring-1 focus:ring-[#F59E0B] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={loading || isLocked}
            className="w-full mt-2 py-3.5 px-4 rounded-xl bg-[#F59E0B] hover:bg-[#d97706] disabled:bg-[#1E293B] disabled:text-[#64748B] disabled:cursor-not-allowed text-black font-bold text-sm shadow-lg shadow-[#F59E0B]/30 hover:shadow-[#F59E0B]/50 transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
            ) : isLocked ? (
              <>
                <ShieldAlert className="w-4 h-4 text-[#EF4444]" />
                <span>Locked for 2 Hours</span>
              </>
            ) : (
              <>
                <KeyRound className="w-4 h-4" />
                <span>Authenticate into UBCEXX Admin</span>
              </>
            )}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-[#1E293B]">
          <div className="bg-[#131C2E] rounded-xl p-3.5 border border-[#1E293B] text-xs">
            <div className="flex items-center gap-2 text-[#F8FAFC] font-semibold mb-1">
              <ShieldCheck className="w-4 h-4 text-[#10B981]" />
              <span>Cloudflare D1 Dynamic Authentication</span>
            </div>
            <div className="flex justify-between items-center text-[#94A3B8] font-mono text-[11px] mt-1.5">
              <span>Security: <strong className="text-[#10B981]">Encrypted D1 Store</strong></span>
              <span>Shield: <strong className="text-[#F59E0B]">2-Attempt Lockout</strong></span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminLoginPage;
