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
import { xmlService, clientService, updateService, logService } from '../services/api';
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-brand-border/60 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">System Telemetry & Gateway Supervision</h1>
          <p className="text-sm text-brand-muted mt-1">Real-time monitoring and software configuration sync audits for active operational nodes.</p>
        </div>
        <button
          onClick={loadData}
          className="flex items-center justify-center gap-1.5 px-4 py-2 bg-brand-dark hover:bg-brand-border border border-brand-border rounded-lg text-sm transition-colors text-white"
        >
          <RefreshCw className="w-4 h-4" />
          Sync Gateway
        </button>
      </div>

      {/* Stats Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        
        {/* Card 1 */}
        <div className="panel animate-fade-up delay-75 p-5 rounded-xl border border-brand-border/40 flex items-center justify-between hover-scale">
          <div className="space-y-2">
            <p className="text-xs font-semibold text-brand-muted uppercase tracking-wider">Active XML Files</p>
            <p className="text-3xl font-extrabold text-white">{stats.xmlCount}</p>
            <p className="text-[10px] text-blue-400 font-medium">Synchronized Device Schemas</p>
          </div>
          <div className="p-3 bg-blue-950/40 border border-blue-500/20 rounded-xl text-blue-400">
            <FileCode className="w-6 h-6" />
          </div>
        </div>

        {/* Card 2 */}
        <div className="panel animate-fade-up delay-75 p-5 rounded-xl border border-brand-border/40 flex items-center justify-between hover-scale">
          <div className="space-y-2">
            <p className="text-xs font-semibold text-brand-muted uppercase tracking-wider">Config Versions</p>
            <p className="text-3xl font-extrabold text-white">{stats.versionCount}</p>
            <p className="text-[10px] text-yellow-400 font-medium">Immutable Schema Revisions</p>
          </div>
          <div className="p-3 bg-yellow-950/40 border border-yellow-500/20 rounded-xl text-yellow-400">
            <Layers className="w-6 h-6" />
          </div>
        </div>

        {/* Card 3 */}
        <div className="panel animate-fade-up delay-75 p-5 rounded-xl border border-brand-border/40 flex items-center justify-between hover-scale">
          <div className="space-y-2">
            <p className="text-xs font-semibold text-brand-muted uppercase tracking-wider">Active Telemetry Nodes</p>
            <p className="text-3xl font-extrabold text-white">
              {stats.onlineClients} <span className="text-lg font-normal text-brand-muted">/ {stats.clientCount}</span>
            </p>
            <p className="text-[10px] text-emerald-400 font-medium">
              {stats.onlineClients === stats.clientCount ? 'All nodes communicating' : `${stats.clientCount - stats.onlineClients} Nodes disconnected`}
            </p>
          </div>
          <div className="p-3 bg-emerald-950/40 border border-emerald-500/20 rounded-xl text-emerald-400">
            <Radio className="w-6 h-6" />
          </div>
        </div>

        {/* Card 4 */}
        <div className="panel animate-fade-up delay-75 p-5 rounded-xl border border-brand-border/40 flex items-center justify-between hover-scale">
          <div className="space-y-2">
            <p className="text-xs font-semibold text-brand-muted uppercase tracking-wider">Distributed Patches</p>
            <p className="text-3xl font-extrabold text-white">{stats.updateCount}</p>
            <p className="text-[10px] text-red-400 font-medium">Distributed Package Archives</p>
          </div>
          <div className="p-3 bg-red-950/40 border border-red-500/20 rounded-xl text-red-400">
            <ArrowUpCircle className="w-6 h-6" />
          </div>
        </div>

      </div>

      {/* Analytics Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        
        {/* Trend Area Chart */}
        <div className="panel animate-fade-up delay-150 p-5 rounded-xl border border-brand-border/40 lg:col-span-2 space-y-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <HardDrive className="w-4 h-4 text-brand-accent" />
            Gateway Configuration Activity Audit
          </h2>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorEdits" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorUploads" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" opacity={0.5} />
                <XAxis dataKey="date" stroke="#9ca3af" fontSize={11} />
                <YAxis stroke="#9ca3af" fontSize={11} allowDecimals={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#111827', borderColor: '#1f2937', color: '#f3f4f6' }}
                  itemStyle={{ color: '#f3f4f6' }}
                />
                <Area type="monotone" dataKey="Edits" stroke="#3b82f6" fillOpacity={1} fill="url(#colorEdits)" strokeWidth={2} />
                <Area type="monotone" dataKey="Uploads" stroke="#f59e0b" fillOpacity={1} fill="url(#colorUploads)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Client Health distribution Pie Chart */}
        <div className="panel animate-fade-up delay-150 p-5 rounded-xl border border-brand-border/40 space-y-4 flex flex-col justify-between">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-brand-accent" />
            Node Connection Integrity
          </h2>
          {stats.clientCount === 0 ? (
            <div className="flex-1 flex items-center justify-center text-xs text-brand-muted">No client agents detected.</div>
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
                      outerRadius={70}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {clientStatusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: '#111827', borderColor: '#1f2937', color: '#f3f4f6' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex justify-around text-xs border-t border-brand-border/40 pt-4">
                {clientStatusData.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-brand-muted">{item.name}:</span>
                    <span className="font-bold text-white">{item.value}</span>
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
        <div className="panel animate-fade-up delay-225 p-5 rounded-xl border border-brand-border/40 lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between border-b border-brand-border/40 pb-3">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Terminal className="w-4 h-4 text-brand-accent" />
              Secure Operations Ledger (Recent Logs)
            </h2>
            <Link to="/logs" className="text-xs text-brand-accent hover:underline font-semibold">
              Audit Trail &rarr;
            </Link>
          </div>
          <div className="space-y-3">
            {recentLogs.length === 0 ? (
              <div className="p-4 text-center text-sm text-brand-muted">No audit trails logged in system.</div>
            ) : (
              recentLogs.map((log) => {
                const getActionIcon = (action) => {
                  switch (action) {
                    case 'Upload':
                      return <CheckCircle className="w-4 h-4 text-brand-success" />;
                    case 'Edit':
                      return <CheckCircle className="w-4 h-4 text-brand-accent" />;
                    case 'Rollback':
                      return <AlertTriangle className="w-4 h-4 text-brand-warning" />;
                    case 'Delete':
                      return <ShieldAlert className="w-4 h-4 text-brand-danger" />;
                    default:
                      return <CheckCircle className="w-4 h-4 text-brand-muted" />;
                  }
                };

                return (
                  <div key={log.id} className="flex items-start gap-3 p-3 bg-brand-dark/40 border border-brand-border/30 rounded-lg hover:bg-brand-dark/80 transition-colors">
                    <div className="mt-0.5">{getActionIcon(log.action)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-gray-200">{log.action}</span>
                        <span className="text-[10px] text-brand-muted">
                          {formatLocalTime(log.timestamp)}
                        </span>
                      </div>
                      <p className="text-xs text-brand-muted mt-1 truncate">{log.detail}</p>
                      <p className="text-[10px] text-brand-accent mt-0.5">Operator: {log.username || 'System'}</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Quick Config Link / System Information Panel */}
        <div className="panel animate-fade-up delay-225 p-5 rounded-xl border border-brand-border/40 space-y-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Server className="w-4 h-4 text-brand-accent" />
            Operations Security Gateway
          </h2>
          <p className="text-xs text-brand-muted">
            RCSUMS orchestrates encrypted configuration transfers and cryptographic software distributions to remote industrial assets.
          </p>
          <div className="space-y-2.5 pt-2">
            <div className="p-3 bg-brand-dark/60 rounded-lg border border-brand-border/40 flex items-center justify-between text-xs">
              <span className="text-brand-muted">API Gateway:</span>
              <span className="font-semibold text-brand-success">http://127.0.0.1:8000</span>
            </div>
            <div className="p-3 bg-brand-dark/60 rounded-lg border border-brand-border/40 flex items-center justify-between text-xs">
              <span className="text-brand-muted">Database Engine:</span>
              <span className="font-semibold text-white">SQLite 3 / SQLiteDB</span>
            </div>
            <div className="p-3 bg-brand-dark/60 rounded-lg border border-brand-border/40 flex items-center justify-between text-xs">
              <span className="text-brand-muted">Active Network Edge Nodes:</span>
              <span className="font-semibold text-brand-accent">{stats.clientCount}</span>
            </div>
          </div>
          <div className="pt-2 text-center">
            <Link 
              to="/xml" 
              className="inline-block px-4 py-2 w-full text-center bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg text-xs tracking-wider uppercase transition-colors shadow-md shadow-blue-950/20"
            >
              Open Editor Workspace
            </Link>
          </div>
        </div>

      </div>

    </div>
  );
}
