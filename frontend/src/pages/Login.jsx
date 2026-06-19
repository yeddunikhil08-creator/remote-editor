import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, User, Terminal, Server, Eye, EyeOff } from 'lucide-react';
import { authService } from '../services/api';

export default function Login({ setToast, setToken, setUser }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const data = await authService.login(username, password);
      if (data.access_token && setToken && setUser) {
        setToken(data.access_token);
        setUser(data.user);
      }
      setToast({ show: true, message: `Successfully logged in as ${username}`, type: 'success' });
      navigate('/');
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || 'Failed to authenticate. Please check your credentials.');
      setToast({ show: true, message: 'Authentication failed', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (user, pass) => {
    setUsername(user);
    setPassword(pass);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-brand-darker relative overflow-hidden px-4 dot-grid-bg">
      <div className="w-full max-w-md panel animate-scale-in p-8 rounded-3xl border border-brand-border/50 shadow-2xl relative z-10 transition-all hover:border-blue-500/20">
        
        {/* Header Logo & Titles */}
        <div className="text-center mb-8">
          <div className="inline-flex p-3 bg-brand-dark border border-brand-border rounded-2xl mb-3 shadow-md relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-tr from-blue-500 to-indigo-500 opacity-20 blur-[1px] group-hover:opacity-40 transition-opacity" />
            <Server className="w-8 h-8 animate-pulse text-blue-400 relative z-10" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-wider gradient-text">RCSUMS</h1>
          <p className="text-[10px] text-brand-muted mt-1.5 uppercase tracking-widest font-bold">
            Secure Gateway Access Portal
          </p>
          <p className="text-[11px] text-brand-muted/70 italic mt-1.5 font-medium">
            "Remote Configuration & Software Update Management System"
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-5">
          {error && (
            <div className="p-3 bg-brand-danger/10 border border-brand-danger/30 text-brand-danger text-xs rounded-xl text-center font-bold animate-slide-in">
              {error}
            </div>
          )}

          <div>
            <label className="block text-[10px] font-bold text-gray-300 uppercase tracking-widest mb-2">Username</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-brand-muted">
                <User className="w-4 h-4" />
              </span>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
                className="w-full pl-10 pr-4 py-3 bg-brand-darker/60 border border-brand-border/60 rounded-xl text-gray-100 placeholder-gray-600 focus:outline-none focus:border-brand-primary transition-all text-xs"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-gray-300 uppercase tracking-widest mb-2">Password</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-brand-muted">
                <Lock className="w-4 h-4" />
              </span>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="w-full pl-10 pr-10 py-3 bg-brand-darker/60 border border-brand-border/60 rounded-xl text-gray-100 placeholder-gray-600 focus:outline-none focus:border-brand-primary transition-all text-xs"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-brand-muted hover:text-gray-300"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 gradient-btn rounded-xl transition-all focus:outline-none text-xs disabled:opacity-50 disabled:pointer-events-none hover-scale cursor-pointer"
          >
            {loading ? 'Authenticating System...' : 'Access Console'}
          </button>
        </form>

        {/* Quick Demo Login Badges */}
        <div className="mt-8 pt-6 border-t border-brand-border/40">
          <p className="text-center text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center justify-center gap-1.5">
            <Terminal className="w-3.5 h-3.5 text-brand-primary" />
            Quick Access Demo Profiles
          </p>
          <div className="grid grid-cols-3 gap-2.5">
            <button
              onClick={() => handleQuickLogin('admin', 'admin123')}
              className="px-2 py-2 bg-brand-dark/30 hover:bg-brand-dark/80 hover:border-blue-500/40 border border-brand-border/40 rounded-xl text-[11px] font-bold text-gray-200 transition-all hover-scale cursor-pointer"
            >
              Admin
              <span className="block text-[8px] text-gray-400 font-extrabold mt-0.5">Read/Write</span>
            </button>
            <button
              onClick={() => handleQuickLogin('operator', 'operator123')}
              className="px-2 py-2 bg-brand-dark/30 hover:bg-brand-dark/80 hover:border-blue-500/40 border border-brand-border/40 rounded-xl text-[11px] font-bold text-gray-200 transition-all hover-scale cursor-pointer"
            >
              Operator
              <span className="block text-[8px] text-gray-400 font-extrabold mt-0.5">XML Edit</span>
            </button>
            <button
              onClick={() => handleQuickLogin('viewer', 'viewer123')}
              className="px-2 py-2 bg-brand-dark/30 hover:bg-brand-dark/80 hover:border-blue-500/40 border border-brand-border/40 rounded-xl text-[11px] font-bold text-gray-200 transition-all hover-scale cursor-pointer"
            >
              Viewer
              <span className="block text-[8px] text-gray-400 font-extrabold mt-0.5">Read Only</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
