import React, { useEffect, useState, useRef } from 'react';
import MonacoEditor, { DiffEditor } from '@monaco-editor/react';
import { 
  FileCode, Upload, Save, GitBranch, GitCompare, History, 
  Trash2, X, Play, RefreshCw, FileText, CheckCircle 
} from 'lucide-react';
import { xmlService } from '../services/api';
import { formatLocalDate, formatLocalTime } from '../utils/date';

export default function XMLWorkspace({ setToast }) {
  const [files, setFiles] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [editorContent, setEditorContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [sidebarLoading, setSidebarLoading] = useState(false);
  
  // Versions and Rollback state
  const [versions, setVersions] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [changeNotes, setChangeNotes] = useState('');
  
  // Compare state
  const [compareMode, setCompareMode] = useState(false);
  const [compareV1, setCompareV1] = useState('');
  const [compareV2, setCompareV2] = useState('');
  const [compareData, setCompareData] = useState({ v1Content: '', v2Content: '' });
  const [compareLoading, setCompareLoading] = useState(false);

  const fileInputRef = useRef(null);
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const userRole = user.role || 'Viewer';
  const isReadOnly = userRole === 'Viewer';

  const loadFiles = async (selectFilename = null) => {
    try {
      setSidebarLoading(true);
      const data = await xmlService.list();
      setFiles(data);
      
      if (selectFilename) {
        const found = data.find(f => f.filename === selectFilename);
        if (found) {
          handleSelectFile(found);
        }
      }
    } catch (err) {
      console.error(err);
      setToast({ show: true, message: 'Failed to retrieve XML index', type: 'error' });
    } finally {
      setSidebarLoading(false);
    }
  };

  useEffect(() => {
    loadFiles();
  }, []);

  const handleSelectFile = async (fileObj) => {
    setSelectedFile(fileObj);
    setCompareMode(false);
    setVersions([]);
    setShowHistory(false);
    
    try {
      setLoading(true);
      const content = await xmlService.read(fileObj.filename);
      setEditorContent(content);
      
      // Load history
      const history = await xmlService.getVersionHistory(fileObj.filename);
      setVersions(history);
    } catch (err) {
      console.error(err);
      setToast({ show: true, message: 'Failed to retrieve XML payload', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleUploadClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.name.endsWith('.xml')) {
      setToast({ show: true, message: 'Only XML files are allowed', type: 'error' });
      return;
    }

    try {
      setLoading(true);
      const res = await xmlService.upload(file);
      setToast({ show: true, message: `${file.name} uploaded and validated.`, type: 'success' });
      await loadFiles(file.name);
    } catch (err) {
      console.error(err);
      setToast({ show: true, message: err.response?.data?.detail || 'XML validation failed', type: 'error' });
    } finally {
      setLoading(false);
      e.target.value = '';
    }
  };

  const handleSaveEdits = async () => {
    if (!selectedFile) return;
    try {
      setLoading(true);
      await xmlService.edit(selectedFile.filename, editorContent, changeNotes);
      setToast({ show: true, message: 'Configuration saved and version compiled.', type: 'success' });
      setShowSaveModal(false);
      setChangeNotes('');
      // Reload file metadata and history
      await loadFiles(selectedFile.filename);
    } catch (err) {
      console.error(err);
      setToast({ show: true, message: err.response?.data?.detail || 'Failed to compile edits', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteFile = async (filename) => {
    if (!window.confirm(`Are you sure you want to delete ${filename}? This deletes all revision history.`)) {
      return;
    }

    try {
      setLoading(true);
      await xmlService.delete(filename);
      setToast({ show: true, message: `${filename} deleted.`, type: 'success' });
      setSelectedFile(null);
      setEditorContent('');
      setVersions([]);
      setCompareMode(false);
      await loadFiles();
    } catch (err) {
      console.error(err);
      setToast({ show: true, message: 'Failed to delete file', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleRollback = async (versionNumber) => {
    if (!selectedFile) return;
    const notes = prompt(`Please specify reason for rolling back ${selectedFile.filename} to Version ${versionNumber}:`);
    if (notes === null) return; // Cancel

    try {
      setLoading(true);
      const res = await xmlService.rollback(selectedFile.filename, versionNumber, notes || 'Rollback triggered');
      setToast({ show: true, message: `Successfully rolled back to v${versionNumber}`, type: 'success' });
      await loadFiles(selectedFile.filename);
    } catch (err) {
      console.error(err);
      setToast({ show: true, message: 'Rollback failed', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const triggerCompare = async () => {
    if (!compareV1 || !compareV2) {
      setToast({ show: true, message: 'Please select two versions to compare', type: 'warning' });
      return;
    }

    try {
      setCompareLoading(true);
      const res = await xmlService.compare(selectedFile.filename, compareV1, compareV2);
      setCompareData({
        v1Content: res.v1_content,
        v2Content: res.v2_content
      });
      setCompareMode(true);
    } catch (err) {
      console.error(err);
      setToast({ show: true, message: 'Failed to retrieve compare payloads', type: 'error' });
    } finally {
      setCompareLoading(false);
    }
  };

  return (
    <div className="h-[calc(100vh-140px)] flex gap-4 overflow-hidden">
      
      {/* File Sidebar */}
      <div className="w-64 flex flex-col panel rounded border border-brand-border p-4 shrink-0 animate-fade-up delay-75">
        <div className="flex items-center justify-between border-b border-brand-border pb-3 mb-3">
          <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
            <FileCode className="w-4 h-4 text-blue-500" />
            Configurations
          </span>
          <button 
            onClick={() => loadFiles()}
            className="p-1 hover:bg-brand-darker rounded text-brand-muted hover:text-white cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Upload Button */}
        {!isReadOnly && (
          <div className="mb-4">
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileUpload} 
              accept=".xml" 
              className="hidden" 
            />
            <button
              onClick={handleUploadClick}
              className="w-full flex items-center justify-center gap-2 py-2 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded text-xs uppercase transition-colors cursor-pointer"
            >
              <Upload className="w-4 h-4" />
              Upload XML File
            </button>
          </div>
        )}

        {/* List of Files */}
        <div className="flex-1 overflow-y-auto space-y-2">
          {sidebarLoading ? (
            <div className="text-center py-6 text-xs text-brand-muted animate-pulse">Syncing nodes...</div>
          ) : files.length === 0 ? (
            <div className="text-center py-6 text-xs text-brand-muted italic">No files on server.</div>
          ) : (
            files.map((file) => (
              <div
                key={file.id}
                onClick={() => handleSelectFile(file)}
                className={`p-2.5 rounded border text-left cursor-pointer transition-all flex flex-col gap-1 ${
                  selectedFile?.filename === file.filename
                    ? 'bg-blue-600/10 border-blue-500/30 text-blue-400 font-semibold'
                    : 'bg-brand-darker/60 border-brand-border text-brand-muted hover:bg-brand-dark hover:text-white'
                }`}
              >
                <div className="flex items-center justify-between gap-2 min-w-0">
                  <span className="text-xs font-semibold truncate flex-1">{file.filename}</span>
                  <span className="text-[9px] bg-brand-dark px-1.5 py-0.5 rounded border border-brand-border text-blue-400 font-semibold shrink-0">
                    v{file.current_version}
                  </span>
                </div>
                <span className="text-[10px] text-brand-muted/70">
                  Edited: {formatLocalDate(file.updated_at)}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Main Workspace Panel */}
      <div className="flex-1 flex flex-col panel rounded border border-brand-border overflow-hidden relative animate-fade-up delay-150">
        
        {loading && (
          <div className="absolute inset-0 bg-brand-darker/60 backdrop-blur-sm z-50 flex flex-col items-center justify-center gap-3">
            <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
            <span className="text-xs text-brand-muted">Loading file workspace...</span>
          </div>
        )}

        {selectedFile ? (
          <>
            {/* Active File Header */}
            <div className="p-4 border-b border-brand-border flex items-center justify-between bg-brand-dark/20 shrink-0">
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-blue-500" />
                <div>
                  <h2 className="text-sm font-bold text-white">{selectedFile.filename}</h2>
                  <p className="text-[10px] text-brand-muted">
                    Revision: v{selectedFile.current_version} | Modifier: {selectedFile.last_editor || 'System'}
                  </p>
                </div>
              </div>

              {/* Header controls */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowHistory(!showHistory)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded border text-xs font-medium transition-colors cursor-pointer ${
                    showHistory
                      ? 'bg-blue-600/10 border-blue-500/30 text-blue-400 font-semibold'
                      : 'bg-brand-darker border-brand-border text-brand-muted hover:text-white'
                  }`}
                >
                  <History className="w-3.5 h-3.5" />
                  Revision Logs
                </button>
                <button
                  onClick={() => {
                    setCompareMode(!compareMode);
                    if(!compareMode && versions.length >= 2) {
                      setCompareV1(versions[0].version_number);
                      setCompareV2(versions[1].version_number);
                    }
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded border text-xs font-medium transition-colors cursor-pointer ${
                    compareMode
                      ? 'bg-blue-600/10 border-blue-500/30 text-blue-400 font-semibold'
                      : 'bg-brand-darker border-brand-border text-brand-muted hover:text-white'
                  }`}
                >
                  <GitCompare className="w-3.5 h-3.5" />
                  Diff Compare
                </button>
                {!isReadOnly && !compareMode && (
                   <button
                     onClick={() => setShowSaveModal(true)}
                     className="flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded text-xs uppercase transition-colors cursor-pointer"
                   >
                    <Save className="w-3.5 h-3.5" />
                    Commit Edits
                  </button>
                )}
                {userRole === 'Admin' && (
                  <button
                    onClick={() => handleDeleteFile(selectedFile.filename)}
                    className="p-1.5 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 rounded text-brand-muted hover:text-red-400 transition-all cursor-pointer"
                    title="Delete File"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Compare Bar if enabled */}
            {compareMode && (
              <div className="p-3 bg-brand-dark border-b border-brand-border flex items-center justify-between gap-4 shrink-0">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-semibold text-gray-300">Compare Revisions:</span>
                  <select
                    value={compareV1}
                    onChange={(e) => setCompareV1(e.target.value)}
                    className="bg-brand-darker border border-brand-border text-gray-200 text-xs rounded px-2.5 py-1 focus:outline-none"
                  >
                    <option value="">Select version</option>
                    {versions.map(v => (
                      <option key={v.version_number} value={v.version_number}>v{v.version_number}</option>
                    ))}
                  </select>
                  <span className="text-xs text-brand-muted">with</span>
                  <select
                    value={compareV2}
                    onChange={(e) => setCompareV2(e.target.value)}
                    className="bg-brand-darker border border-brand-border text-gray-200 text-xs rounded px-2.5 py-1 focus:outline-none"
                  >
                    <option value="">Select version</option>
                    {versions.map(v => (
                      <option key={v.version_number} value={v.version_number}>v{v.version_number}</option>
                    ))}
                  </select>
                  <button
                    onClick={triggerCompare}
                    disabled={compareLoading}
                    className="px-3 py-1 bg-brand-darker hover:bg-brand border border-brand-border rounded text-xs text-blue-400 transition-colors font-medium cursor-pointer"
                  >
                    {compareLoading ? 'Loading diff...' : 'Calculate Diff'}
                  </button>
                </div>
                <button
                  onClick={() => setCompareMode(false)}
                  className="p-1 hover:bg-brand-darker rounded text-brand-muted hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Workspace Editing Area */}
            <div className="flex-1 flex overflow-hidden">
              
              {/* Monaco Editor / Diff Editor Container */}
              <div className="flex-1 h-full min-w-0 bg-brand-darker">
                {compareMode ? (
                  compareData.v1Content || compareData.v2Content ? (
                    <DiffEditor
                      original={compareData.v2Content}
                      modified={compareData.v1Content}
                      language="xml"
                      theme="vs-dark"
                      options={{
                        readOnly: true,
                        renderSideBySide: true,
                        minimap: { enabled: false },
                        fontSize: 12
                      }}
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-brand-muted text-xs p-6 gap-2">
                      <GitCompare className="w-8 h-8 text-blue-500/50" />
                      Select two historical revisions and trigger "Calculate Diff" to evaluate modification deltas.
                    </div>
                  )
                ) : (
                  <MonacoEditor
                    height="100%"
                    language="xml"
                    theme="vs-dark"
                    value={editorContent}
                    onChange={(val) => setEditorContent(val)}
                    options={{
                      readOnly: isReadOnly,
                      fontSize: 13,
                      minimap: { enabled: false },
                      automaticLayout: true,
                      scrollbar: {
                        verticalScrollbarSize: 6,
                        horizontalScrollbarSize: 6
                      }
                    }}
                  />
                )}
              </div>

              {/* Revision History Sidebar Drawer */}
              {showHistory && (
                <div className="w-80 border-l border-brand-border bg-brand-dark/20 flex flex-col shrink-0">
                  <div className="p-3 border-b border-brand-border flex items-center justify-between bg-brand-dark/40">
                    <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                      <History className="w-4 h-4 text-blue-500" />
                      Revision Timeline
                    </span>
                    <button 
                      onClick={() => setShowHistory(false)}
                      className="p-1 hover:bg-brand-darker rounded text-brand-muted hover:text-white cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto p-3 space-y-4">
                    {versions.map((ver, idx) => (
                      <div key={idx} className="relative pl-5 pb-2 border-l border-brand-border last:border-0 last:pb-0">
                        {/* Bullet Icon */}
                        <div className="absolute left-[-4.5px] top-2 w-2 h-2 rounded-full bg-blue-500 border border-brand-darker" />
                        
                        <div className="p-3 bg-brand-darker border border-brand-border/60 rounded space-y-1.5">
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-xs font-bold text-white">Version {ver.version_number}</span>
                            <span className="text-[9px] text-brand-muted shrink-0">
                              {formatLocalTime(ver.timestamp)}
                            </span>
                          </div>
                          <p className="text-[10px] text-brand-muted italic leading-relaxed">
                            "{ver.change_notes || 'No change notes.'}"
                          </p>
                          <div className="flex items-center justify-between pt-1 border-t border-brand-border/20 text-[9px]">
                            <span className="text-blue-400 font-medium">By: {ver.editor || 'system'}</span>
                            {!isReadOnly && ver.version_number !== selectedFile.current_version && (
                              <button
                                onClick={() => handleRollback(ver.version_number)}
                                className="px-2 py-0.5 bg-blue-600/15 hover:bg-blue-600 text-blue-400 hover:text-white border border-blue-500/20 rounded font-medium transition-colors cursor-pointer"
                              >
                                Rollback
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-brand-muted text-xs p-6 gap-3">
            <FileCode className="w-12 h-12 text-blue-500/20" />
            <p>Select a configuration schema from the sidebar catalog to edit contents.</p>
          </div>
        )}

      </div>

      {/* Commit Notes Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 bg-brand-darker/70 backdrop-blur-sm z-[999] flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-brand-dark border border-brand-border rounded p-5 shadow-xl space-y-4">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <CheckCircle className="w-4 h-4 text-emerald-500" />
              Commit Configuration Changes
            </h3>
            <p className="text-xs text-brand-muted leading-relaxed">
              Specify changes applied. This compiles a new immutable revision tag.
            </p>
            <div>
              <textarea
                value={changeNotes}
                onChange={(e) => setChangeNotes(e.target.value)}
                placeholder="Describe what configurations were modified..."
                rows={3}
                className="w-full p-2.5 bg-brand-darker border border-brand-border rounded text-gray-100 text-xs placeholder-gray-500 focus:outline-none focus:border-brand-accent"
              />
            </div>
            <div className="flex justify-end gap-2 text-xs">
              <button
                onClick={() => {
                  setShowSaveModal(false);
                  setChangeNotes('');
                }}
                className="px-3.5 py-2 hover:bg-brand-darker border border-brand-border text-brand-muted hover:text-white rounded transition-colors font-medium cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdits}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded transition-colors cursor-pointer"
              >
                Save & Deploy
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
