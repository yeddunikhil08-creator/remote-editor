import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { 
  Server, LayoutDashboard, FileCode, ArrowUpCircle, Radio, Terminal, 
  LogOut, Bell, User as UserIcon, RefreshCw, X, ShieldAlert, CheckCircle2, AlertTriangle
} from 'lucide-react';

// API Services
import { authService, logService } from './services/api';

// Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import XMLWorkspace from './pages/XMLWorkspace';
import SoftwareUpdates from './pages/SoftwareUpdates';
import ClientMonitoring from './pages/ClientMonitoring';
import AuditLogs from './pages/AuditLogs';
import { formatLocalTime } from './utils/date';

// Helper component for page rendering and sidebar layout wrapper
function Layout({ children, user, handleLogout, logsCount }) {
  const location = useLocation();
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);

  const loadNotifications = async () => {
    try {
      const data = await logService.list();
      // Take top 5 logs for notification panel
      setNotifications(data.slice(0, 5));
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 20000);
    return () => clearInterval(interval);
  }, []);

  const getPageTitle = (pathname) => {
    switch (pathname) {
      case '/': return 'System Telemetry & Gateway Supervision';
      case '/xml': return 'Device Configuration Workspace';
      case '/updates': return 'Firmware & Software Distribution Center';
      case '/clients': return 'Node Telemetry Registry';
      case '/logs': return 'Secure Operations Audit Ledger';
      default: return 'RCSUMS Security Console';
    }
  };

  const menuItems = [
    { name: 'Dashboard', path: '/', icon: <LayoutDashboard className="w-4 h-4" />, color: 'blue' },
    { name: 'XML Editor', path: '/xml', icon: <FileCode className="w-4 h-4" />, color: 'yellow' },
    { name: 'Software Updates', path: '/updates', icon: <ArrowUpCircle className="w-4 h-4" />, color: 'red' },
    { name: 'Client Monitoring', path: '/clients', icon: <Radio className="w-4 h-4" />, color: 'green' },
    { name: 'Audit Logs', path: '/logs', icon: <Terminal className="w-4 h-4" />, color: 'purple' },
  ];

  return (
    <div className="flex h-screen bg-brand-darker text-gray-200 overflow-hidden dot-grid-bg">
      
      {/* Sidebar navigation */}
      <aside className="w-64 bg-[#080b12] border-r border-brand-border/60 flex flex-col shrink-0 no-print z-10 relative">
        {/* Sidebar Header Logo */}
        <div className="p-5 border-b border-brand-border flex items-center gap-3">
          <div className="p-2 bg-brand-dark border border-brand-border rounded-lg shadow-md relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-tr from-blue-500 to-indigo-500 opacity-20 blur-[1px] group-hover:opacity-40 transition-opacity" />
            <Server className="w-5 h-5 animate-pulse text-blue-400 relative z-10" />
          </div>
          <div>
            <span className="font-extrabold text-white text-base tracking-wider block">RCSUMS</span>
            <span className="text-[10px] text-brand-muted/70 tracking-widest uppercase font-bold">RCSUMS GATEWAY</span>
          </div>
        </div>

        {/* Navigation items list */}
        <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.name}
                to={item.path}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-semibold transition-all border relative ${
                  isActive
                    ? 'bg-blue-950/40 border border-blue-500/30 text-blue-400 font-bold shadow-md shadow-blue-950/20'
                    : 'text-brand-muted border-transparent hover:bg-brand-border hover:text-white'
                }`}
              >
                {isActive && <div className="active-indicator" />}
                <span className={isActive ? '' : 'text-brand-muted'}>
                  {item.icon}
                </span>
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* Sidebar Footer User Details */}
        <div className="p-4 border-t border-brand-border bg-brand-darker/40 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-brand-border border border-brand-accent/30 flex items-center justify-center text-brand-accent font-bold">
              <UserIcon className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-xs font-bold text-gray-200 block truncate">{user?.username}</span>
              <span className={`inline-block px-1.5 py-0.5 rounded text-[8px] font-extrabold tracking-wider uppercase ${
                user?.role === 'Admin' ? 'bg-red-950/50 border border-brand-danger/30 text-brand-danger' :
                user?.role === 'Operator' ? 'bg-amber-950/50 border border-brand-warning/30 text-brand-warning' :
                'bg-blue-950/50 border border-brand-accent/30 text-brand-accent'
              }`}>
                {user?.role}
              </span>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-2 bg-brand-dark hover:bg-brand-border border border-brand-border rounded-lg text-xs font-bold transition-colors text-brand-danger"
          >
            <LogOut className="w-3.5 h-3.5" />
            Terminal Logout
          </button>
        </div>
      </aside>

      {/* Main Panel Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        
        {/* Top Navbar */}
        <header className="h-16 border-b border-brand-border flex items-center justify-between px-6 shrink-0 bg-brand-dark/20 no-print">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider">
            {getPageTitle(location.pathname)}
          </h2>

          <div className="flex items-center gap-4 relative">
            
            {/* Notification trigger button */}
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="p-2 bg-brand-dark border border-brand-border rounded-lg hover:border-brand-accent/50 text-brand-muted hover:text-white transition-all relative"
            >
              <Bell className="w-4 h-4" />
              {notifications.length > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-brand-danger rounded-full" />
              )}
            </button>

            {/* Notifications Dropdown Panel */}
            {showNotifications && (
              <div className="absolute right-0 top-12 w-80 bg-brand-dark border border-brand-border rounded-xl shadow-2xl p-3 z-[100] space-y-3 animate-fade-in">
                <div className="flex items-center justify-between border-b border-brand-border pb-2">
                  <span className="text-xs font-bold text-white uppercase tracking-wider">System Event Feed</span>
                  <button 
                    onClick={() => setShowNotifications(false)}
                    className="p-0.5 hover:bg-brand-darker rounded text-brand-muted hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="space-y-2 max-h-60 overflow-y-auto pr-0.5">
                  {notifications.length === 0 ? (
                    <p className="text-center py-4 text-xs text-brand-muted italic">No notifications logged.</p>
                  ) : (
                    notifications.map((notif) => (
                      <div key={notif.id} className="p-2 bg-brand-darker border border-brand-border/40 rounded-lg text-[10px] space-y-1">
                        <div className="flex items-center justify-between font-bold">
                          <span className="text-brand-accent">{notif.action}</span>
                          <span className="text-brand-muted font-normal text-[9px]">
                            {formatLocalTime(notif.timestamp)}
                          </span>
                        </div>
                        <p className="text-brand-muted leading-normal truncate">{notif.detail}</p>
                      </div>
                    ))
                  )}
                </div>
                <div className="text-center pt-1.5 border-t border-brand-border/40">
                  <Link 
                    to="/logs" 
                    onClick={() => setShowNotifications(false)}
                    className="text-[10px] text-brand-accent hover:underline font-semibold"
                  >
                    Inspect Audit Logs &rarr;
                  </Link>
                </div>
              </div>
            )}

          </div>
        </header>

        {/* Scrollable Container Page Render */}
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>

    </div>
  );
}

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user') || 'null'));
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  // Monitor token changes in storage
  useEffect(() => {
    const checkAuth = async () => {
      const storedToken = localStorage.getItem('token');
      const storedUser = localStorage.getItem('user');
      
      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      } else {
        setToken(null);
        setUser(null);
      }
    };
    
    // Check auth on mounting App
    checkAuth();
    
    // Set a window listener for custom auth updates if needed
    window.addEventListener('storage', checkAuth);
    return () => window.removeEventListener('storage', checkAuth);
  }, []);

  // Self-dismiss toast alert after 4 seconds
  useEffect(() => {
    if (toast.show) {
      const timer = setTimeout(() => {
        setToast({ show: false, message: '', type: 'success' });
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [toast.show]);

  const handleLogout = () => {
    authService.logout();
    setToken(null);
    setUser(null);
    setToast({ show: true, message: 'Logged out successfully', type: 'success' });
  };

  const getToastIcon = (type) => {
    switch (type) {
      case 'success':
        return <CheckCircle2 className="w-4 h-4 text-brand-success" />;
      case 'error':
        return <ShieldAlert className="w-4 h-4 text-brand-danger" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-brand-warning" />;
      default:
        return <CheckCircle2 className="w-4 h-4 text-brand-accent" />;
    }
  };

  const getToastBg = (type) => {
    switch (type) {
      case 'success':
        return 'bg-emerald-950/90 border-brand-success/50';
      case 'error':
        return 'bg-red-950/90 border-brand-danger/50';
      case 'warning':
        return 'bg-amber-950/90 border-brand-warning/50';
      default:
        return 'bg-gray-900/90 border-brand-accent/50';
    }
  };

  return (
    <Router>
      
      {/* Toast Alert Dialog Banner */}
      {toast.show && (
        <div className={`${getToastBg(toast.type)} fixed top-4 right-4 z-[9999] flex items-center gap-2.5 px-4 py-3 border rounded-xl shadow-2xl backdrop-blur-md transition-all animate-slide-in text-xs font-semibold text-white min-w-[280px]`}>
          {getToastIcon(toast.type)}
          <span className="flex-1">{toast.message}</span>
          <button 
            onClick={() => setToast({ show: false, message: '', type: 'success' })}
            className="text-brand-muted hover:text-white"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Routes configuration */}
      <Routes>
        
        {/* Unauthenticated Endpoint */}
        <Route 
          path="/login" 
          element={
            token ? <Navigate to="/" replace /> : <Login setToast={setToast} setToken={setToken} setUser={setUser} />
          } 
        />

        {/* Authenticated Dashboard Panel */}
        <Route 
          path="/" 
          element={
            token ? (
              <Layout user={user} handleLogout={handleLogout}>
                <Dashboard setToast={setToast} />
              </Layout>
            ) : (
              <Navigate to="/login" replace />
            )
          } 
        />

        {/* Authenticated XML Workspace */}
        <Route 
          path="/xml" 
          element={
            token ? (
              <Layout user={user} handleLogout={handleLogout}>
                <XMLWorkspace setToast={setToast} />
              </Layout>
            ) : (
              <Navigate to="/login" replace />
            )
          } 
        />

        {/* Authenticated Software Updates */}
        <Route 
          path="/updates" 
          element={
            token ? (
              <Layout user={user} handleLogout={handleLogout}>
                <SoftwareUpdates setToast={setToast} />
              </Layout>
            ) : (
              <Navigate to="/login" replace />
            )
          } 
        />

        {/* Authenticated Client Monitoring */}
        <Route 
          path="/clients" 
          element={
            token ? (
              <Layout user={user} handleLogout={handleLogout}>
                <ClientMonitoring setToast={setToast} />
              </Layout>
            ) : (
              <Navigate to="/login" replace />
            )
          } 
        />

        {/* Authenticated Audit logs */}
        <Route 
          path="/logs" 
          element={
            token ? (
              <Layout user={user} handleLogout={handleLogout}>
                <AuditLogs setToast={setToast} />
              </Layout>
            ) : (
              <Navigate to="/login" replace />
            )
          } 
        />

        {/* Wildcard Guard Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />

      </Routes>
    </Router>
  );
}
