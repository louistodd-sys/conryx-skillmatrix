import { useState, useEffect, useRef } from 'react';
import { Upload, Trash2, Download, File, Lock, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useFileUpload } from '@/hooks/useFileUpload';
import { Button } from '@/components/ui/button';

function formatBytes(bytes) {
  if (!bytes) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(isoString) {
  if (!isoString) return '';
  return new Date(isoString).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

export default function EvidenceSection({ entityType, entityId, orgId, canUpload }) {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const [description, setDescription] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const fileInputRef = useRef(null);
  const { uploadFile, uploading } = useFileUpload();

  const loadFiles = async () => {
    if (!entityId || !orgId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('evidence_files')
        .select('*')
        .eq('organisation_id', orgId)
        .eq('linked_entity_type', entityType)
        .eq('linked_entity_id', entityId)
        .eq('is_redacted', false)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setFiles(data || []);
    } catch (_) {
      // silently fail — files list is best-effort
    }
    setLoading(false);
  };

  useEffect(() => {
    loadFiles();
  }, [entityId, orgId, entityType]);

  const handleUpload = async (file) => {
    if (!file) return;
    setUploadError(null);
    try {
      await uploadFile({
        file,
        organisationId: orgId,
        linkedEntityType: entityType,
        linkedEntityId: entityId,
      });
      setDescription('');
      await loadFiles();
    } catch (err) {
      setUploadError(err?.message || 'Upload failed. Please try again.');
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
    e.target.value = '';
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleUpload(file);
  };

  const handleDelete = async (fileId) => {
    setDeletingId(fileId);
    try {
      const { error } = await supabase.functions.invoke('delete-evidence', {
        body: { evidence_file_id: fileId, reason: 'Removed by user' },
      });
      if (error) throw error;
      setFiles(prev => prev.filter(f => f.id !== fileId));
    } catch (err) {
      alert(err?.message || 'Could not delete file.');
    }
    setDeletingId(null);
  };

  const getDownloadUrl = (filePath) => {
    const { data } = supabase.storage.from('evidence').getPublicUrl(filePath);
    return data?.publicUrl || filePath;
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Evidence Files</h3>
        {!canUpload && (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Lock className="w-3 h-3" />
            Essential / Professional only
          </span>
        )}
      </div>

      {/* File list */}
      {loading ? (
        <p className="text-xs text-muted-foreground">Loading files…</p>
      ) : files.length === 0 ? (
        <p className="text-xs text-muted-foreground italic">No evidence files attached yet.</p>
      ) : (
        <ul className="space-y-2">
          {files.map(file => (
            <li
              key={file.id}
              className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 px-3 py-2"
            >
              <File className="w-4 h-4 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{file.file_name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatBytes(file.size_bytes)} &middot; {formatDate(file.created_at)}
                  {file.uploaded_by_name && <> &middot; {file.uploaded_by_name}</>}
                </p>
                {file.description && (
                  <p className="text-xs text-muted-foreground mt-0.5 italic">{file.description}</p>
                )}
              </div>
              <a
                href={getDownloadUrl(file.file_url)}
                target="_blank"
                rel="noopener noreferrer"
                title="Download"
                className="p-1.5 rounded-md hover:bg-muted transition-colors"
              >
                <Download className="w-4 h-4 text-muted-foreground" />
              </a>
              {canUpload && (
                <button
                  onClick={() => handleDelete(file.id)}
                  disabled={deletingId === file.id}
                  title="Remove"
                  className="p-1.5 rounded-md hover:bg-destructive/10 transition-colors disabled:opacity-50"
                >
                  <Trash2 className="w-4 h-4 text-destructive" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {/* Upload zone */}
      {canUpload ? (
        <div className="space-y-2">
          {uploadError && (
            <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
              <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              {uploadError}
            </div>
          )}
          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            className={`rounded-lg border-2 border-dashed px-4 py-5 text-center transition-colors cursor-pointer
              ${dragOver ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-muted/30'}
              ${uploading ? 'opacity-60 pointer-events-none' : ''}
            `}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="w-5 h-5 mx-auto mb-1.5 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">
              {uploading ? 'Uploading…' : 'Drop a file here or click to browse'}
            </p>
            <p className="text-[11px] text-muted-foreground/70 mt-0.5">
              PDF, PNG, JPG, DOCX, XLSX, CSV, TXT &mdash; max 25 MB
            </p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.png,.jpg,.jpeg,.webp,.docx,.xlsx,.csv,.txt"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-muted/20 px-4 py-4 text-center">
          <Lock className="w-5 h-5 mx-auto mb-1.5 text-muted-foreground" />
          <p className="text-xs text-muted-foreground">
            Upgrade to <span className="font-semibold">Essential</span> or <span className="font-semibold">Professional</span> to upload evidence files.
          </p>
        </div>
      )}
    </div>
  );
}
