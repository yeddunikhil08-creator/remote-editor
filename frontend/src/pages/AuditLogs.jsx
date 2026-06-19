import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Search, Filter, RefreshCw, Download, Printer } from 'lucide-react';
import { logService, API_BASE_URL } from '../services/api';
import { formatDateString } from '../utils/date';

export default function AuditLogs({ setToast }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exportLoading, setExportLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [actionFilter, setActionFilter] = useState('');

  const loadLogs = async () => {
    try {
      setLoading(true);
      const data = await logService.list(query, actionFilter);
      setLogs(data);
    } catch (err) {
      console.error(err);
      setToast({ show: true, message: 'Failed to retrieve audit log feeds', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, [actionFilter]); // Reload automatically when action filter changes

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadLogs();
  };

  const handleExportCSV = async () => {
    try {
      setExportLoading(true);
      const token = localStorage.getItem('token');
      
      const response = await axios.get(`${API_BASE_URL}/logs/export`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob',
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `rcsums_audit_logs_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      
      setToast({ show: true, message: 'CSV log file downloaded successfully', type: 'success' });
    } catch (err) {
      console.error(err);
      setToast({ show: true, message: 'Failed to export CSV logs', type: 'error' });
    } finally {
      setExportLoading(false);
    }
  };

  const handlePrintPDF = () => {
    window.print();
  };

  const getActionBadge = (action) => {
    switch (action) {
      case 'Upload':
        return 'bg-emerald-950/45 border-emerald-500/40 text-brand-success';
      case 'Edit':
        return 'bg-emerald-950/45 border-emerald-500/40 text-brand-success';
      case 'Rollback':
      case 'Restore':
        return 'bg-amber-950/45 border-amber-500/40 text-brand-warning';
      case 'Delete':
        return 'bg-red-950/45 border-red-500/40 text-brand-danger';
      case 'Login':
      case 'Register User':
        return 'bg-purple-950/45 border-purple-500/40 text-purple-400';
      default:
        return 'bg-brand-dark border-brand-border text-brand-muted';
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Title Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-brand-border/60 pb-5 no-print">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">System Audit Trail Ledger</h1>
          <p className="text-sm text-brand-muted mt-1">
            Immutable tracking logs monitoring admin commands, update installations, security authentications, and synchronizations.
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            disabled={exportLoading}
            className="flex items-center justify-center gap-1.5 px-4 py-2 bg-brand-dark hover:bg-brand-border border border-brand-border rounded-lg text-xs font-bold transition-colors text-blue-400 disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
          <button
            onClick={handlePrintPDF}
            className="flex items-center justify-center gap-1.5 px-4 py-2 bg-brand-dark hover:bg-brand-border border border-brand-border rounded-lg text-xs font-bold transition-colors text-brand-warning"
          >
            <Printer className="w-4 h-4" />
            Print / PDF
          </button>
        </div>
      </div>

      {/* Printable CSS style injection */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; color: black !important; }
          .print-container { background: white !important; border: 0 !important; color: black !important; padding: 0 !important; }
          .print-title { display: block !important; margin-bottom: 20px; }
          table { width: 100% !important; border-collapse: collapse !important; color: black !important; }
          th, td { border: 1px solid #ddd !important; padding: 8px !important; color: black !important; }
          th { background-color: #f2f2f2 !important; }
        }
        .print-title { display: none; }
      `}</style>

      {/* Hidden header for PDF Print rendering */}
      <div className="print-title text-center space-y-2">
        <h1 className="text-xl font-bold text-black">RCSUMS Audit Log Report</h1>
        <p className="text-xs text-gray-500">Report Generated: {new Date().toLocaleString()}</p>
        <hr className="border-gray-300" />
      </div>

      {/* Search and Filter Panel */}
      <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row gap-3 items-center justify-between panel animate-fade-up delay-75 p-4 rounded-xl border border-brand-border/40 no-print">
        
        {/* Search Input */}
        <div className="relative w-full md:flex-1">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-brand-muted">
            <Search className="w-4 h-4" />
          </span>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search logs by keyword, username, or action..."
            className="w-full pl-10 pr-4 py-2 bg-brand-darker border border-brand-border rounded-lg text-gray-100 text-xs placeholder-gray-500 focus:outline-none focus:border-blue-600 transition-colors"
          />
        </div>

        {/* Filter Dropdown */}
        <div className="flex gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:flex-initial">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-brand-muted">
              <Filter className="w-4 h-4" />
            </span>
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="w-full pl-9 pr-6 py-2 bg-brand-darker border border-brand-border rounded-lg text-gray-300 text-xs focus:outline-none focus:border-blue-500 appearance-none cursor-pointer"
            >
              <option value="">Filter Action</option>
              <option value="Upload">Upload XML</option>
              <option value="Edit">Edit XML</option>
              <option value="Rollback">Rollback</option>
              <option value="Restore">Restore Backup</option>
              <option value="Delete">Delete File</option>
              <option value="Login">User Login</option>
              <option value="Register User">Register User</option>
              <option value="Upload Update">Software Upload</option>
              <option value="Update Download">Software Download</option>
              <option value="Client Connected">Client Discovery</option>
            </select>
          </div>

          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg text-xs uppercase tracking-wider transition-colors shrink-0 shadow-md shadow-blue-950/20"
          >
            Query
          </button>
        </div>

      </form>

      {/* Logs Table Layout */}
      <div className="panel animate-fade-up delay-150 rounded-xl border border-brand-border/40 overflow-hidden print-container">
        {loading ? (
          <div className="flex flex-col items-center justify-center p-12 gap-3 no-print">
            <RefreshCw className="w-6 h-6 text-brand-accent animate-spin" />
            <span className="text-xs text-brand-muted">Fetching audit traces...</span>
          </div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center text-xs text-brand-muted italic">
            No system log matches current trace constraints.
          </div>
        ) : (
          <div className="overflow-x-auto" id="printable-table">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-brand-dark/45 border-b border-brand-border/60 text-brand-muted uppercase font-bold tracking-wider">
                  <th className="p-4 w-48">Timestamp (IST)</th>
                  <th className="p-4 w-36 text-center">Action</th>
                  <th className="p-4 w-32">User</th>
                  <th className="p-4">Log Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border/30">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-brand-dark/10 transition-colors">
                    <td className="p-4 font-mono text-brand-muted shrink-0">
                      {formatDateString(log.timestamp)}
                    </td>
                    <td className="p-4 text-center shrink-0">
                      <span className={`inline-block px-2.5 py-0.5 rounded border text-[10px] font-bold ${getActionBadge(log.action)}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="p-4 font-bold text-gray-200 shrink-0">
                      {log.username || 'System'}
                    </td>
                    <td className="p-4 text-brand-muted font-mono whitespace-normal leading-relaxed">
                      {log.detail}
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
