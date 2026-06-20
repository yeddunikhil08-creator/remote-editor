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
    <div className="min-h-screen flex items-center justify-center bg-brand-darker px-4">
      <div className="w-full max-w-sm panel animate-scale-in p-6 rounded-lg shadow-sm border border-brand-border">
        
        {/* Header Logo & Titles */}
        <div className="text-center mb-6">
          <div className="inline-flex p-2.5 bg-brand-dark border border-brand-border rounded-lg mb-3">
            <Server className="w-5 h-5 text-blue-500" />
          </div>
          <h1 className="text-lg font-bold text-white">Sign in to RCSUMS</h1>
          <p className="text-xs text-brand-muted mt-1">
            Remote Configuration & Software Update Management System
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          {error && (
            <div className="p-2 bg-brand-danger/10 border border-brand-danger/20 text-brand-danger text-xs rounded text-center font-medium animate-slide-in">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1.5">Username</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-brand-muted">
                <User className="w-4 h-4" />
              </span>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
                className="w-full !pl-10 pr-3 py-2 bg-brand-darker border border-brand-border rounded text-gray-100 placeholder-gray-500 focus:outline-none focus:border-brand-accent transition-all text-xs"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1.5">Password</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-brand-muted">
                <Lock className="w-4 h-4" />
              </span>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="w-full !pl-10 !pr-10 py-2 bg-brand-darker border border-brand-border rounded text-gray-100 placeholder-gray-500 focus:outline-none focus:border-brand-accent transition-all text-xs"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-brand-muted hover:text-gray-300 cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded text-xs transition-colors cursor-pointer disabled:opacity-50 disabled:pointer-events-none mt-2"
          >
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>

        {/* Quick Demo Login Badges */}
        <div className="mt-6 pt-6 border-t border-brand-border">
          <p className="text-center text-[11px] font-medium text-gray-400 mb-3 flex items-center justify-center gap-1.5">
            <Terminal className="w-3.5 h-3.5 text-brand-muted" />
            Select a demo profile to sign in
          </p>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => handleQuickLogin('admin', 'admin123')}
              className="px-2 py-1.5 bg-brand-dark hover:bg-brand-darker border border-brand-border rounded text-left transition-all cursor-pointer"
            >
              <span className="font-semibold text-xs text-gray-200 block">Admin</span>
              <span className="text-[9px] text-brand-muted block mt-0.5">Full Access</span>
            </button>
            <button
              onClick={() => handleQuickLogin('operator', 'operator123')}
              className="px-2 py-1.5 bg-brand-dark hover:bg-brand-darker border border-brand-border rounded text-left transition-all cursor-pointer"
            >
              <span className="font-semibold text-xs text-gray-200 block">Operator</span>
              <span className="text-[9px] text-brand-muted block mt-0.5">XML Editor</span>
            </button>
            <button
              onClick={() => handleQuickLogin('viewer', 'viewer123')}
              className="px-2 py-1.5 bg-brand-dark hover:bg-brand-darker border border-brand-border rounded text-left transition-all cursor-pointer"
            >
              <span className="font-semibold text-xs text-gray-200 block">Viewer</span>
              <span className="text-[9px] text-brand-muted block mt-0.5">Read Only</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
