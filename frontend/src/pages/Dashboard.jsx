import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  FileCode, Layers, Radio, RefreshCw, Terminal, Server,
  ArrowUpCircle, HardDrive, ShieldAlert, CheckCircle, AlertTriangle 
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area 
} from 'recharts';
import { xmlService, clientService, updateService, logService, API_BASE_URL } from '../services/api';
import { formatShortDate, formatLocalTime } from '../utils/date';

export default function Dashboard({ setToast }) {
  const [stats, setStats] = useState({
    xmlCount: 0,
    versionCount: 0,
    clientCount: 0,
    onlineClients: 0,
    updateCount: 0,
    logCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [recentLogs, setRecentLogs] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [clientStatusData, setClientStatusData] = useState([]);

  const loadData = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const [xmlFiles, clients, updates, logs] = await Promise.all([
        xmlService.list(),
        clientService.list(),
        updateService.list(),
        logService.list()
      ]);

      // Calculate versions count
      let totalVersionsCount = 0;
      xmlFiles.forEach(f => {
        totalVersionsCount += f.current_version;
      });

      const onlineCount = clients.filter(c => c.is_online).length;

      setStats({
        xmlCount: xmlFiles.length,
        versionCount: totalVersionsCount,
        clientCount: clients.length,
        onlineClients: onlineCount,
        updateCount: updates.length,
        logCount: logs.length
      });

      // Filter for recent 5 audit logs
      setRecentLogs(logs.slice(0, 5));

      // Build status distribution chart data
      const onlineClients = clients.filter(c => c.is_online).length;
      const offlineClients = clients.length - onlineClients;
      setClientStatusData([
        { name: 'Online', value: onlineClients, color: '#10b981' },
        { name: 'Offline', value: offlineClients, color: '#f43f5e' }
      ]);

      // Generate mock upload trend/activity data based on audit logs
      const actionGroups = {};
      logs.forEach(log => {
        const dateStr = formatShortDate(log.timestamp);
        if (!actionGroups[dateStr]) {
          actionGroups[dateStr] = { date: dateStr, Edits: 0, Uploads: 0 };
        }
        if (log.action === 'Edit') actionGroups[dateStr].Edits += 1;
        if (log.action === 'Upload') actionGroups[dateStr].Uploads += 1;
      });

      // Convert to array and take recent 7 days
      const trend = Object.values(actionGroups).reverse().slice(-7);
      
      // Fallback if no logs yet
      if (trend.length === 0) {
        setChartData([
          { date: 'Mon', Edits: 2, Uploads: 1 },
          { date: 'Tue', Edits: 3, Uploads: 2 },
          { date: 'Wed', Edits: 5, Uploads: 1 },
          { date: 'Thu', Edits: 4, Uploads: 3 },
          { date: 'Fri', Edits: 6, Uploads: 2 },
          { date: 'Sat', Edits: 1, Uploads: 1 },
          { date: 'Sun', Edits: 2, Uploads: 0 },
        ]);
      } else {
        setChartData(trend);
      }

    } catch (err) {
      console.error(err);
      setToast({ show: true, message: 'Failed to fetch dashboard intelligence data', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const timer = setInterval(() => {
      loadData(true);
    }, 15000); // Poll every 15s silently
    return () => clearInterval(timer);
  }, []);


  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <RefreshCw className="w-10 h-10 text-brand-accent animate-spin" />
        <p className="text-sm text-brand-muted">Loading telemetry dashboard...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Title Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-brand-border pb-5">
        <div>
          <h1 className="text-xl font-bold text-white">System Dashboard</h1>
          <p className="text-xs text-brand-muted mt-1">Overview of device configurations, software updates, active client nodes, and system activity.</p>
        </div>
        <button
          onClick={loadData}
          className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-brand-dark hover:bg-brand-darker border border-brand-border rounded text-xs transition-colors text-white font-medium cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </button>
      </div>

      {/* Stats Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        
        {/* Card 1 */}
        <div className="panel p-4 rounded border border-brand-border flex items-center justify-between hover-scale">
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-brand-muted uppercase tracking-wider">Active XML Files</p>
            <p className="text-2xl font-bold text-white">{stats.xmlCount}</p>
            <p className="text-[11px] text-brand-muted">Active configuration schemas</p>
          </div>
          <div className="p-2 bg-brand-darker border border-brand-border rounded text-blue-400">
            <FileCode className="w-5 h-5" />
          </div>
        </div>

        {/* Card 2 */}
        <div className="panel p-4 rounded border border-brand-border flex items-center justify-between hover-scale">
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-brand-muted uppercase tracking-wider">Config Versions</p>
            <p className="text-2xl font-bold text-white">{stats.versionCount}</p>
            <p className="text-[11px] text-brand-muted">Total revision history</p>
          </div>
          <div className="p-2 bg-brand-darker border border-brand-border rounded text-yellow-500">
            <Layers className="w-5 h-5" />
          </div>
        </div>

        {/* Card 3 */}
        <div className="panel p-4 rounded border border-brand-border flex items-center justify-between hover-scale">
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-brand-muted uppercase tracking-wider">Active Nodes</p>
            <p className="text-2xl font-bold text-white">
              {stats.onlineClients} <span className="text-sm font-normal text-brand-muted">/ {stats.clientCount}</span>
            </p>
            <p className="text-[11px] text-brand-muted">
              {stats.onlineClients === stats.clientCount ? 'All nodes reporting online' : `${stats.clientCount - stats.onlineClients} nodes disconnected`}
            </p>
          </div>
          <div className="p-2 bg-brand-darker border border-brand-border rounded text-emerald-400">
            <Radio className="w-5 h-5" />
          </div>
        </div>

        {/* Card 4 */}
        <div className="panel p-4 rounded border border-brand-border flex items-center justify-between hover-scale">
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-brand-muted uppercase tracking-wider">Software Patches</p>
            <p className="text-2xl font-bold text-white">{stats.updateCount}</p>
            <p className="text-[11px] text-brand-muted">Available release packages</p>
          </div>
          <div className="p-2 bg-brand-darker border border-brand-border rounded text-red-400">
            <ArrowUpCircle className="w-5 h-5" />
          </div>
        </div>

      </div>

      {/* Analytics Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        
        {/* Trend Area Chart */}
        <div className="panel p-4 rounded border border-brand-border lg:col-span-2 space-y-4">
          <h2 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <HardDrive className="w-4 h-4 text-blue-500" />
            System Activity Overview
          </h2>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorEdits" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorUploads" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.3} />
                <XAxis dataKey="date" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} allowDecimals={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0e1322', borderColor: '#1e293b', color: '#f1f5f9' }}
                  itemStyle={{ color: '#f1f5f9' }}
                />
                <Area type="monotone" dataKey="Edits" stroke="#3b82f6" fillOpacity={1} fill="url(#colorEdits)" strokeWidth={1.5} />
                <Area type="monotone" dataKey="Uploads" stroke="#f59e0b" fillOpacity={1} fill="url(#colorUploads)" strokeWidth={1.5} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Client Health distribution Pie Chart */}
        <div className="panel p-4 rounded border border-brand-border space-y-4 flex flex-col justify-between">
          <h2 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-blue-500" />
            Client Status Distribution
          </h2>
          {stats.clientCount === 0 ? (
            <div className="flex-1 flex items-center justify-center text-xs text-brand-muted italic">No client agents detected.</div>
          ) : (
            <>
              <div className="h-44 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={clientStatusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={65}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {clientStatusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} stroke="#0e1322" strokeWidth={2} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: '#0e1322', borderColor: '#1e293b', color: '#f1f5f9' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex justify-around text-xs border-t border-brand-border/60 pt-3">
                {clientStatusData.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-brand-muted">{item.name}:</span>
                    <span className="font-semibold text-white">{item.value}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

      </div>

      {/* Bottom Section: Audit Log and Quick Action panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        
        {/* Recent Audit Log Feed */}
        <div className="panel p-4 rounded border border-brand-border lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between border-b border-brand-border pb-3">
            <h2 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Terminal className="w-4 h-4 text-blue-500" />
              Recent Logs
            </h2>
            <Link to="/logs" className="text-xs text-brand-accent hover:underline font-semibold">
              View All Logs &rarr;
            </Link>
          </div>
          <div className="space-y-2.5">
            {recentLogs.length === 0 ? (
              <div className="p-4 text-center text-xs text-brand-muted italic">No audit logs recorded in system.</div>
            ) : (
              recentLogs.map((log) => {
                const getActionDot = (action) => {
                  switch (action) {
                    case 'Upload':
                    case 'Edit':
                      return <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0 mt-1.5" />;
                    case 'Rollback':
                    case 'Restore':
                      return <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0 mt-1.5" />;
                    case 'Delete':
                      return <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0 mt-1.5" />;
                    default:
                      return <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0 mt-1.5" />;
                  }
                };

                return (
                  <div key={log.id} className="flex items-start gap-3 p-2.5 bg-brand-darker border border-brand-border/40 rounded hover:bg-brand-dark transition-colors">
                    {getActionDot(log.action)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-gray-200">{log.action}</span>
                        <span className="text-[10px] text-brand-muted">
                          {formatLocalTime(log.timestamp)}
                        </span>
                      </div>
                      <p className="text-xs text-brand-muted mt-1 truncate">{log.detail}</p>
                      <p className="text-[10px] text-blue-400 mt-0.5">Operator: {log.username || 'System'}</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Quick Config Link / System Information Panel */}
        <div className="panel p-4 rounded border border-brand-border space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <h2 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Server className="w-4 h-4 text-blue-500" />
              System Information
            </h2>
            <p className="text-xs text-brand-muted leading-relaxed">
              Information and active endpoint configurations for the RCSUMS management console.
            </p>
            <div className="space-y-2 pt-1.5">
              <div className="p-2.5 bg-brand-darker rounded border border-brand-border/50 flex items-center justify-between text-xs">
                <span className="text-brand-muted">API Gateway:</span>
                <span className="font-mono text-emerald-400">{API_BASE_URL}</span>
              </div>
              <div className="p-2.5 bg-brand-darker rounded border border-brand-border/50 flex items-center justify-between text-xs">
                <span className="text-brand-muted">Database Engine:</span>
                <span className="font-semibold text-white">SQLite 3</span>
              </div>
              <div className="p-2.5 bg-brand-darker rounded border border-brand-border/50 flex items-center justify-between text-xs">
                <span className="text-brand-muted">Total Registered Edge Nodes:</span>
                <span className="font-semibold text-blue-400">{stats.clientCount}</span>
              </div>
            </div>
          </div>
          <div className="pt-3">
            <Link 
              to="/xml" 
              className="inline-block px-4 py-2 w-full text-center bg-blue-600 hover:bg-blue-500 text-white font-medium rounded text-xs transition-colors cursor-pointer"
            >
              Open Config Editor
            </Link>
          </div>
        </div>

      </div>

    </div>
  );
}
