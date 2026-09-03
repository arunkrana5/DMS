import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Layers, ShieldCheck, Lock, User as UserIcon } from 'lucide-react';

export const LoginView: React.FC = () => {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState('superadmin');
  const [password, setPassword] = useState('SuperAdmin123!');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // If already authenticated, redirect to dashboard
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Pass empty string for tenantCode; backend auto-discovers tenant from Username/Email!
      const success = await login('', username.trim(), password);
      if (success) {
        window.location.href = '/';
      } else {
        setError('Invalid username/email or password.');
      }
    } catch (err: any) {
      console.error('Login Error:', err);
      const serverMessage =
        err.response?.data?.message ||
        (Array.isArray(err.response?.data?.errors) ? err.response?.data?.errors.join(', ') : null) ||
        err.message;
      setError(serverMessage || 'Invalid username/email or password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 font-sans text-xs">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-black shadow-lg">
            <Layers className="w-6 h-6" />
          </div>
          <h1 className="text-lg font-extrabold text-white tracking-tight">Antigravity DMS</h1>
        </div>

        {error && (
          <div className="p-3 bg-rose-950/60 border border-rose-800 text-rose-300 rounded-xl text-xs font-semibold">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
              Username or Email
            </label>
            <div className="relative">
              <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                placeholder="Enter Username or Email"
                className="w-full pl-9 pr-4 py-2 bg-slate-800 border border-slate-700 text-white rounded-lg text-xs font-medium focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="Enter Password"
                className="w-full pl-9 pr-4 py-2 bg-slate-800 border border-slate-700 text-white rounded-lg text-xs font-medium focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-lg text-xs shadow-lg shadow-blue-600/30 transition-all cursor-pointer disabled:opacity-50"
          >
            {loading ? 'Authenticating...' : 'Sign In to DMS'}
          </button>
        </form>

        <div className="pt-3 border-t border-slate-800 text-center text-[11px] text-slate-500 flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          <span>Tenant Isolated & JWT Security Token</span>
        </div>
      </div>
    </div>
  );
};
