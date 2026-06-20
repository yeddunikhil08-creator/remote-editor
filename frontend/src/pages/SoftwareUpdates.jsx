import React, { useEffect, useState, useRef } from 'react';
import { 
  ArrowUpCircle, Upload, CheckCircle, RefreshCw, FileArchive, 
  Calendar, Info, Download, AlertTriangle 
} from 'lucide-react';
import { updateService } from '../services/api';
import { formatLocalDate } from '../utils/date';

export default function SoftwareUpdates({ setToast }) {
  const [updates, setUpdates] = useState([]);
  const [version, setVersion] = useState('');
  const [releaseNotes, setReleaseNotes] = useState('');
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const userRole = user.role || 'Viewer';
  const isReadOnly = userRole === 'Viewer';

  const loadUpdates = async () => {
    try {
      setLoading(true);
      const data = await updateService.list();
      setUpdates(data);
    } catch (err) {
      console.error(err);
      setToast({ show: true, message: 'Failed to retrieve update logs', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUpdates();
  }, []);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;
    
    if (!selectedFile.name.endsWith('.zip')) {
      setToast({ show: true, message: 'Only ZIP archives are allowed (.zip)', type: 'error' });
      setFile(null);
      e.target.value = '';
      return;
    }
    setFile(selectedFile);
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!version || !file) {
      setToast({ show: true, message: 'Version and ZIP file are required', type: 'warning' });
      return;
    }

    try {
      setUploading(true);
      await updateService.upload(version, releaseNotes, file);
      setToast({ show: true, message: `Update package version ${version} registered successfully`, type: 'success' });
      
      // Reset form
      setVersion('');
      setReleaseNotes('');
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      
      await loadUpdates();
    } catch (err) {
      console.error(err);
      setToast({ show: true, message: err.response?.data?.detail || 'Update upload failed', type: 'error' });
    } finally {
      setUploading(false);
    }
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6">
      
      {/* Title Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-brand-border pb-5">
        <div>
          <h1 className="text-xl font-bold text-white">Software Updates</h1>
          <p className="text-xs text-brand-muted mt-1">Upload, distribute, and manage software packages and update bundles.</p>
        </div>
        <button
          onClick={loadUpdates}
          className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-brand-dark hover:bg-brand-darker border border-brand-border rounded text-xs transition-colors text-white font-medium cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Upload Panel (Admin/Operator) */}
        <div className="panel p-5 rounded border border-brand-border h-fit space-y-4">
          <h2 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <ArrowUpCircle className="w-4.5 h-4.5 text-blue-500" />
            Publish Software Release
          </h2>
          
          {isReadOnly ? (
            <div className="p-3 bg-brand-dark border border-brand-border text-brand-muted text-xs rounded flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-brand-warning shrink-0" />
              Viewer profile permissions are read-only.
            </div>
          ) : (
            <form onSubmit={handleUploadSubmit} className="space-y-4 text-xs font-medium">
              <div className="space-y-1.5">
                <label className="block text-gray-300">Version Tag</label>
                <input
                  type="text"
                  value={version}
                  onChange={(e) => setVersion(e.target.value)}
                  placeholder="e.g. 2.0"
                  className="w-full p-2 bg-brand-darker border border-brand-border rounded text-gray-100 placeholder-gray-500 focus:outline-none focus:border-brand-accent"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-gray-300">Software Package (.zip)</label>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".zip"
                  className="w-full text-brand-muted text-xs file:mr-3 file:py-1.5 file:px-3 file:rounded file:border file:border-brand-border file:text-xs file:font-medium file:bg-brand-darker file:text-blue-400 hover:file:bg-brand hover:file:text-white file:cursor-pointer"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-gray-300">Changelog & Release Notes</label>
                <textarea
                  value={releaseNotes}
                  onChange={(e) => setReleaseNotes(e.target.value)}
                  placeholder="Summarize updates and bug fixes..."
                  rows={4}
                  className="w-full p-2 bg-brand-darker border border-brand-border rounded text-gray-100 placeholder-gray-500 focus:outline-none focus:border-brand-accent font-normal text-xs"
                />
              </div>

              <button
                type="submit"
                disabled={uploading}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm"
              >
                {uploading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Deploying Firmware Bundle...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    Upload & Publish
                  </>
                )}
              </button>
            </form>
          )}
        </div>

        {/* Update Logs History List (All) */}
        <div className="panel p-5 rounded border border-brand-border lg:col-span-2 space-y-4">
          <h2 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <FileArchive className="w-4.5 h-4.5 text-blue-500" />
            Release History
          </h2>

          {loading ? (
            <div className="flex justify-center py-10">
              <RefreshCw className="w-5 h-5 text-blue-500 animate-spin" />
            </div>
          ) : updates.length === 0 ? (
            <div className="p-8 text-center text-xs text-brand-muted italic border border-dashed border-brand-border rounded">
              No software updates published.
            </div>
          ) : (
            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
              {updates.map((update) => (
                <div 
                  key={update.id} 
                  className="p-3.5 bg-brand-dark border border-brand-border rounded hover:bg-brand-darker transition-colors flex flex-col md:flex-row justify-between gap-4"
                >
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-3">
                      <span className="px-2 py-0.5 bg-blue-600/10 border border-blue-500/20 text-blue-400 font-semibold text-xs rounded">
                        Version {update.version}
                      </span>
                      <span className="text-[10px] text-brand-muted flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {formatLocalDate(update.upload_date)}
                      </span>
                      <span className="text-[10px] text-brand-muted flex items-center gap-1">
                        <Info className="w-3.5 h-3.5" />
                        Size: {formatBytes(update.package_size)}
                      </span>
                    </div>
                    
                    {update.release_notes ? (
                      <p className="text-xs text-brand-muted bg-brand-darker p-2.5 rounded border border-brand-border/60">
                        {update.release_notes}
                      </p>
                    ) : (
                      <p className="text-xs text-brand-muted italic">No changelog notes compiled.</p>
                    )}
                  </div>

                  <div className="flex items-center shrink-0">
                    <a
                      href={updateService.getDownloadUrl(update.version)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-darker hover:bg-brand border border-brand-border text-blue-400 rounded text-xs font-medium transition-colors cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Download ZIP
                    </a>
                  </div>

                </div>
              ))}
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
