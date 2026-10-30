import React, { useState } from 'react';
import { Lock, ShieldCheck, AlertCircle, ArrowLeft, KeyRound, Database } from 'lucide-react';
import { safeFetchJson } from '../utils/api.ts';

interface AdminLoginPageProps {
  onLoginSuccess: (token: string, admin: any) => void;
  onBackToTube: () => void;
}

export const AdminLoginPage: React.FC<AdminLoginPageProps> = ({
  onLoginSuccess,
  onBackToTube,
}) => {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('ubcexx2026!');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const data = await safeFetchJson<{
        success: boolean;
        token: string;
        admin: any;
        error?: string;
      }>('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      if (!data.success) {
        throw new Error(data.error || 'Invalid credentials');
      }

      localStorage.setItem('ubcexx_admin_token', data.token);
      localStorage.setItem('ubcexx_admin_user', JSON.stringify(data.admin));
      onLoginSuccess(data.token, data.admin);
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#080C14] flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden">
      {/* Background ambient amber glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#F59E0B]/10 rounded-full blur-3xl pointer-events-none" />

      {/* Return to tube link */}
      <div className="w-full max-w-md mb-6 flex justify-between items-center">
        <button
          onClick={onBackToTube}
          className="inline-flex items-center gap-1.5 text-xs text-[#94A3B8] hover:text-[#F8FAFC] transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Public Tube</span>
        </button>
        <span className="text-[11px] font-mono text-[#94A3B8] flex items-center gap-1.5">
          <Database className="w-3 h-3 text-[#F59E0B]" />
          Cloudflare D1 Binding
        </span>
      </div>

      {/* Login Box */}
      <div className="w-full max-w-md bg-[#0F172A] border border-[#1E293B] rounded-2xl p-8 shadow-2xl relative z-10">
        
        {/* Brand Lockup */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#F59E0B] text-black shadow-xl shadow-[#F59E0B]/30 mb-4">
            <Lock className="w-7 h-7 text-black stroke-[2.5]" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-[#F8FAFC] font-display">
            UBCEXX <span className="text-[#F59E0B]">Admin Portal</span>
          </h1>
          <p className="text-xs text-[#94A3B8] mt-1.5">
            Cloudflare D1 Database Authentication · Restricted Access
          </p>
        </div>

        {/* Error notification */}
        {error && (
          <div className="mb-6 p-3.5 rounded-xl bg-[#3B0713] border border-[#4C0D1A] text-[#FB7185] text-xs flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 text-[#FB7185] shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#94A3B8] uppercase tracking-wider mb-2">
              Admin Username
            </label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="admin"
              className="w-full bg-[#131C2E] text-sm text-[#F8FAFC] px-4 py-3 rounded-xl border border-[#253349] focus:outline-none focus:border-[#F59E0B] focus:ring-1 focus:ring-[#F59E0B] transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#94A3B8] uppercase tracking-wider mb-2">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full bg-[#131C2E] text-sm text-[#F8FAFC] px-4 py-3 rounded-xl border border-[#253349] focus:outline-none focus:border-[#F59E0B] focus:ring-1 focus:ring-[#F59E0B] transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3.5 px-4 rounded-xl bg-[#F59E0B] hover:bg-[#d97706] disabled:bg-[#1E293B] text-black font-bold text-sm shadow-lg shadow-[#F59E0B]/30 hover:shadow-[#F59E0B]/50 transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
            ) : (
              <>
                <KeyRound className="w-4 h-4" />
                <span>Authenticate into UBCEXX Admin</span>
              </>
            )}
          </button>
        </form>

        {/* Demo credentials helper card */}
        <div className="mt-8 pt-6 border-t border-[#1E293B]">
          <div className="bg-[#131C2E] rounded-xl p-3.5 border border-[#1E293B] text-xs">
            <div className="flex items-center gap-2 text-[#F8FAFC] font-semibold mb-1">
              <ShieldCheck className="w-4 h-4 text-[#10B981]" />
              <span>D1 Database Default Credentials</span>
            </div>
            <div className="flex justify-between items-center text-[#94A3B8] font-mono text-[11px] mt-1.5">
              <span>User: <strong className="text-[#F8FAFC]">admin</strong></span>
              <span>Pass: <strong className="text-[#F8FAFC]">ubcexx2026!</strong></span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
