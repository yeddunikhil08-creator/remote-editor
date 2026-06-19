import React, { useEffect, useState } from 'react';
import { 
  Radio, Shield, HardDrive, RefreshCw, Terminal, CheckCircle2, 
  XCircle, Clock, Search, ServerOff 
} from 'lucide-react';
import { clientService } from '../services/api';
import { formatLocalDate } from '../utils/date';

export default function ClientMonitoring({ setToast }) {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');

  const loadClients = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      else setRefreshing(true);
      
      const data = await clientService.list();
      setClients(data);
    } catch (err) {
      console.error(err);
      setToast({ show: true, message: 'Heartbeat index telemetry sync failed', type: 'error' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadClients();
    // Auto-refresh client telemetry data every 5 seconds
    const interval = setInterval(() => {
      loadClients(true);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const totalClients = clients.length;
  const onlineClients = clients.filter(c => c.is_online).length;
  const offlineClients = totalClients - onlineClients;

  const filteredClients = clients.filter(client => {
    const matchesSearch = 
      client.client_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (client.hostname && client.hostname.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (client.ip && client.ip.includes(searchTerm));
      
    if (filterStatus === 'ALL') return matchesSearch;
    if (filterStatus === 'ONLINE') return matchesSearch && client.is_online;
    if (filterStatus === 'OFFLINE') return matchesSearch && !client.is_online;
    return matchesSearch;
  });

  return (
    <div className="space-y-6">
      
      {/* Title Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-brand-border/60 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Client Node Fleet</h1>
          <p className="text-sm text-brand-muted mt-1">Real-time status monitoring, software deployment states, and operational integrity audits.</p>
        </div>
        <div className="flex items-center gap-2">
          {refreshing && (
            <span className="text-[10px] text-blue-400 animate-pulse font-semibold">Updating heartbeats...</span>
          )}
          <button
            onClick={() => loadClients()}
            className="flex items-center justify-center gap-1.5 px-4 py-2 bg-brand-dark hover:bg-brand-border border border-brand-border rounded-lg text-sm transition-colors text-white"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh Telemetry
          </button>
        </div>
      </div>

      {/* Analytics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        
        {/* Total nodes registered */}
        <div className="panel animate-fade-up delay-75 p-5 rounded-xl border border-brand-border/40 flex items-center justify-between hover-scale">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-brand-muted uppercase tracking-wider">Total Node Fleet</p>
            <p className="text-3xl font-extrabold text-white">{totalClients}</p>
            <p className="text-[10px] text-brand-muted">Registered agent identifiers</p>
          </div>
          <div className="p-3 bg-blue-950/40 border border-blue-500/20 rounded-xl text-blue-400">
            <HardDrive className="w-6 h-6" />
          </div>
        </div>

        {/* Active Nodes */}
        <div className="panel animate-fade-up delay-150 p-5 rounded-xl border border-brand-border/40 flex items-center justify-between hover-scale">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-brand-muted uppercase tracking-wider">Online Nodes</p>
            <p className="text-3xl font-extrabold text-brand-success">{onlineClients}</p>
            <p className="text-[10px] text-brand-success font-medium">Reporting healthy heartbeats</p>
          </div>
          <div className="p-3 bg-emerald-950/40 border border-emerald-800/30 rounded-xl text-brand-success">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        {/* Inactive Nodes */}
        <div className="panel animate-fade-up delay-225 p-5 rounded-xl border border-brand-border/40 flex items-center justify-between hover-scale">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-brand-muted uppercase tracking-wider">Offline Nodes</p>
            <p className="text-3xl font-extrabold text-brand-danger">{offlineClients}</p>
            <p className="text-[10px] text-brand-danger font-medium">No telemetry payload &gt; 60s</p>
          </div>
          <div className="p-3 bg-red-950/40 border border-red-800/30 rounded-xl text-brand-danger">
            <ServerOff className="w-6 h-6" />
          </div>
        </div>

      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row gap-3 items-center justify-between panel animate-fade-up delay-150 p-4 rounded-xl border border-brand-border/40">
        <div className="relative w-full md:w-80">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-brand-muted">
            <Search className="w-4 h-4" />
          </span>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by ID, hostname, IP..."
            className="w-full pl-10 pr-4 py-2 bg-brand-darker border border-brand-border rounded-lg text-gray-100 text-xs placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={() => setFilterStatus('ALL')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md border transition-colors ${
              filterStatus === 'ALL'
                ? 'bg-blue-600 border-blue-500 text-white font-bold shadow-md shadow-blue-950/10'
                : 'bg-brand-dark border-brand-border text-brand-muted hover:text-white'
            }`}
          >
            All Fleet
          </button>
          <button
            onClick={() => setFilterStatus('ONLINE')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md border transition-colors ${
              filterStatus === 'ONLINE'
                ? 'bg-blue-950/40 border border-blue-500/30 text-blue-400 font-bold shadow-md shadow-blue-950/10'
                : 'bg-brand-dark border-brand-border text-brand-muted hover:text-white'
            }`}
          >
            Online Only
          </button>
          <button
            onClick={() => setFilterStatus('OFFLINE')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md border transition-colors ${
              filterStatus === 'OFFLINE'
                ? 'bg-blue-950/40 border border-blue-500/30 text-blue-400 font-bold shadow-md shadow-blue-950/10'
                : 'bg-brand-dark border-brand-border text-brand-muted hover:text-white'
            }`}
          >
            Offline Only
          </button>
        </div>
      </div>

      {/* Client List Fleet Table */}
      <div className="panel animate-fade-up delay-300 rounded-xl border border-brand-border/40 overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center p-12 gap-3">
            <RefreshCw className="w-6 h-6 text-brand-accent animate-spin" />
            <span className="text-xs text-brand-muted">Retrieving node registry...</span>
          </div>
        ) : filteredClients.length === 0 ? (
          <div className="p-12 text-center text-xs text-brand-muted italic">
            No devices matches current criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-brand-dark/45 border-b border-brand-border/60 text-brand-muted uppercase font-bold tracking-wider">
                  <th className="p-4">Station ID</th>
                  <th className="p-4">Machine Name</th>
                  <th className="p-4">Network Address</th>
                  <th className="p-4">Firmware Version</th>
                  <th className="p-4">Last Check-in</th>
                  <th className="p-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border/30">
                {filteredClients.map((client) => (
                  <tr key={client.id} className="hover:bg-brand-dark/20 transition-colors">
                    <td className="p-4 font-bold text-gray-200">{client.client_id}</td>
                    <td className="p-4 text-brand-muted">{client.hostname || 'Unknown Host'}</td>
                    <td className="p-4 text-brand-muted font-mono">{client.ip || '127.0.0.1'}</td>
                    <td className="p-4">
                      <span className="px-2 py-0.5 bg-brand-dark border border-brand-border rounded text-[10px] text-blue-400 font-bold">
                        v{client.version}
                      </span>
                    </td>
                    <td className="p-4 text-brand-muted flex items-center gap-1.5 mt-0.5">
                      <Clock className="w-3.5 h-3.5" />
                      {formatLocalDate(client.last_seen)}
                    </td>
                    <td className="p-4 text-center">
                      <span className={client.is_online ? 'status-pill-online' : 'status-pill-offline'}>
                        <span className="status-dot-blinking" />
                        {client.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
