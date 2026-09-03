import React, { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import api, { API_BASE_URL } from '../../services/api';
import type { DocumentItem, FolderItem } from '../../types';
import { Pagination } from '../../components/common/Pagination';
import { useAuth } from '../../context/AuthContext';
import {
  Folder,
  Upload,
  FolderPlus,
  Grid,
  List as ListIcon,
  Download,
  Trash2,
  Eye,
  Edit2,
  X,
  FileText,
  Plus,
  Table as TableIcon,
  AlertCircle,
  Pencil,
  Building2
} from 'lucide-react';

export const DocumentExplorer: React.FC = () => {
  const { user } = useAuth();
  const isSuperAdmin = user?.tenantCode === 'SUPERADMIN' || user?.roles?.includes('SUPERADMIN');
  const [tenants, setTenants] = useState<any[]>([]);
  const [targetTenantId, setTargetTenantId] = useState<number | ''>('');

  const { searchTerm: globalSearch } = useOutletContext<{ searchTerm: string }>();
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  const [pageIndex, setPageIndex] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isCreateFolderOpen, setIsCreateFolderOpen] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<DocumentItem | null>(null);

  // Edit Modal State
  const [editingDoc, setEditingDoc] = useState<DocumentItem | null>(null);
  const [editFileName, setEditFileName] = useState('');
  const [editModuleCode, setEditModuleCode] = useState('');
  const [editEntityType, setEditEntityType] = useState('');
  const [editEntityId, setEditEntityId] = useState('');
  const [editDescription, setEditDescription] = useState('');

  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [moduleCode, setModuleCode] = useState('GENERAL');
  const [entityType, setEntityType] = useState('');
  const [entityId, setEntityId] = useState('');
  const [description, setDescription] = useState('');
  const [uploading, setUploading] = useState(false);

  // Modules List for Dropdown
  const [modules, setModules] = useState<any[]>([]);

  // 📑 Multi-Row "Add Row" Table Upload State
  const [uploadMode, setUploadMode] = useState<'single' | 'table'>('table');
  const [docTypes, setDocTypes] = useState<any[]>([]);
  const [tableRows, setTableRows] = useState<Array<{ id: string; file: File | null; documentTypeCode: string; remarks: string }>>([
    { id: '1', file: null, documentTypeCode: 'GST', remarks: '' },
    { id: '2', file: null, documentTypeCode: 'PAN', remarks: '' }
  ]);
  const [batchError, setBatchError] = useState<string | null>(null);

  const fetchDocTypes = async () => {
    try {
      const res = await api.get('/document-types?pageSize=50');
      if (res.data?.success) {
        const list = res.data.data.items || res.data.data || [];
        setDocTypes(list);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchDocTypes();
    api.get('/tenant-modules?pageSize=100').then((res) => {
      if (res.data?.success) {
        const data = res.data.data;
        const list = Array.isArray(data) ? data : (data?.items || []);
        setModules(list);
      }
    }).catch(console.error);

    if (isSuperAdmin) {
      api.get('/tenants?pageSize=100').then((res) => {
        if (res.data?.success) {
          const data = res.data.data;
          const list = Array.isArray(data) ? data : (data?.items || []);
          setTenants(list);
        }
      }).catch(console.error);
    }
  }, [isSuperAdmin]);

  const handleAddRow = () => {
    setTableRows((prev) => [
      ...prev,
      { id: Date.now().toString(), file: null, documentTypeCode: docTypes[0]?.typeCode || 'GST', remarks: '' }
    ]);
  };

  const handleRemoveRow = (id: string) => {
    if (tableRows.length > 1) {
      setTableRows((prev) => prev.filter((r) => r.id !== id));
    }
  };

  const handleRowChange = (id: string, field: 'file' | 'documentTypeCode' | 'remarks', value: any) => {
    setTableRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: value } : r))
    );
  };

  const handleBatchUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBatchError(null);

    const validRows = tableRows.filter((r) => r.file !== null);
    if (validRows.length === 0) {
      setBatchError('Please select at least one file to upload.');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      if (targetTenantId) {
        formData.append('tenantId', targetTenantId.toString());
      }
      formData.append('moduleCode', moduleCode);
      formData.append('entityType', entityType);
      formData.append('entityId', entityId);

      validRows.forEach((r, idx) => {
        formData.append(`files[${idx}]`, r.file!);
        formData.append(`documentTypeCodes[${idx}]`, r.documentTypeCode);
        formData.append(`remarks[${idx}]`, r.remarks);
      });

      const res = await api.post('/documents/batch-upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (res.data?.success) {
        setIsUploadOpen(false);
        setTableRows([
          { id: '1', file: null, documentTypeCode: docTypes[0]?.typeCode || 'GST', remarks: '' }
        ]);
        fetchContent();
        localStorage.setItem('dms_upload_timestamp', Date.now().toString());
        window.dispatchEvent(new CustomEvent('dms:document-uploaded'));
      }
    } catch (err: any) {
      setBatchError(err.response?.data?.message || 'Failed to upload document batch.');
    } finally {
      setUploading(false);
    }
  };

  const fetchContent = async () => {
    setLoading(true);
    try {
      const docsRes = await api.get(
        `/documents?pageIndex=${pageIndex}&pageSize=${pageSize}&search=${encodeURIComponent(globalSearch)}`
      );
      if (docsRes.data?.success) {
        setDocuments(docsRes.data.data.items || []);
        setTotalCount(docsRes.data.data.totalCount || 0);
        setTotalPages(docsRes.data.data.totalPages || 1);
      }

      if (pageIndex === 1 && !globalSearch) {
        const foldersRes = await api.get('/folders?pageSize=20');
        if (foldersRes.data?.success) {
          setFolders(foldersRes.data.data.items || []);
        }
      } else {
        setFolders([]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContent();
  }, [pageIndex, pageSize, globalSearch]);

  const handleSingleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) return;

    setUploading(true);
    try {
      const formData = new FormData();
      if (targetTenantId) {
        formData.append('tenantId', targetTenantId.toString());
      }
      formData.append('file', uploadFile);
      formData.append('moduleCode', moduleCode);
      formData.append('entityType', entityType);
      formData.append('entityId', entityId);
      formData.append('description', description);

      const res = await api.post('/documents/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (res.data?.success) {
        setIsUploadOpen(false);
        setUploadFile(null);
        setDescription('');
        fetchContent();
        localStorage.setItem('dms_upload_timestamp', Date.now().toString());
        window.dispatchEvent(new CustomEvent('dms:document-uploaded'));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUploading(false);
    }
  };

  const handleOpenEdit = (doc: DocumentItem) => {
    setEditingDoc(doc);
    setEditFileName(doc.fileName);
    setEditModuleCode(doc.moduleCode || '');
    setEditEntityType(doc.entityType || '');
    setEditEntityId(doc.entityId || '');
    setEditDescription(doc.description || '');
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDoc) return;

    try {
      const res = await api.put(`/documents/${editingDoc.publicId}`, {
        fileName: editFileName,
        moduleCode: editModuleCode,
        entityType: editEntityType,
        entityId: editEntityId,
        description: editDescription
      });
      if (res.data.success) {
        setEditingDoc(null);
        fetchContent();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const [folderName, setFolderName] = useState('');
  const [editingFolder, setEditingFolder] = useState<FolderItem | null>(null);

  const handleOpenAddFolder = () => {
    setEditingFolder(null);
    setFolderName('');
    setIsCreateFolderOpen(true);
  };

  const handleOpenEditFolder = (f: FolderItem) => {
    setEditingFolder(f);
    setFolderName(f.name);
    if (f.moduleCode) setModuleCode(f.moduleCode);
    if (f.entityType) setEntityType(f.entityType);
    if (f.entityId) setEntityId(f.entityId);
    setIsCreateFolderOpen(true);
  };

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!folderName.trim()) return;

    try {
      const payload: any = {
        name: folderName.trim(),
        moduleCode,
        entityType,
        entityId
      };
      if (targetTenantId) {
        payload.tenantId = targetTenantId;
      }

      if (editingFolder) {
        await api.put(`/folders/${editingFolder.publicId}`, payload);
      } else {
        await api.post('/folders', payload);
      }
      setIsCreateFolderOpen(false);
      setFolderName('');
      setEditingFolder(null);
      fetchContent();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteFolder = async (publicId: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete folder '${name}'?`)) return;
    try {
      await api.delete(`/folders/${publicId}`);
      fetchContent();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDownload = async (doc: DocumentItem) => {
    try {
      const res = await api.get(`/documents/${doc.publicId}/download`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', doc.fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (publicId: string) => {
    if (!confirm('Are you sure you want to soft-delete this document?')) return;
    try {
      await api.delete(`/documents/${publicId}`);
      fetchContent();
    } catch (err) {
      console.error(err);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getPreviewUrl = (publicId: string) => {
    const token = localStorage.getItem('dms_token');
    return `${API_BASE_URL}/documents/${publicId}/preview?token=${token}`;
  };

  return (
    <div className="w-full space-y-3.5 text-xs font-sans">
      {/* Top Banner Control Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-black shadow-md shrink-0">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-extrabold text-slate-900 dark:text-white leading-tight">
              Document Explorer
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleOpenAddFolder}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl font-bold text-xs transition-all border border-slate-200 dark:border-slate-700 shadow-xs cursor-pointer"
          >
            <FolderPlus className="w-3.5 h-3.5 text-blue-500" />
            <span>New Folder</span>
          </button>

          <button
            onClick={() => setIsUploadOpen(true)}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-md transition-all shrink-0 cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload Document</span>
          </button>

          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${viewMode === 'list' ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-xs font-bold' : 'text-slate-400'}`}
              title="List View"
            >
              <ListIcon className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${viewMode === 'grid' ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-xs font-bold' : 'text-slate-400'}`}
              title="Grid View"
            >
              <Grid className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Folders Bar */}
      {folders.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2.5">
          {folders.map((f) => (
            <div key={f.publicId} className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-2.5 hover:border-blue-500 transition-colors shadow-xs group">
              <div className="flex items-center gap-2.5 min-w-0">
                <Folder className="w-4 h-4 text-amber-500 shrink-0" />
                <div className="min-w-0">
                  <div className="text-xs font-bold text-slate-900 dark:text-white truncate">{f.name}</div>
                  <div className="text-[9px] text-slate-400 font-mono mt-0.5">{f.documentCount} docs</div>
                </div>
              </div>

              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                <button
                  onClick={() => handleOpenEditFolder(f)}
                  className="p-1 text-slate-400 hover:text-amber-600 rounded cursor-pointer"
                  title="Edit Folder"
                >
                  <Pencil className="w-3 h-3" />
                </button>
                <button
                  onClick={() => handleDeleteFolder(f.publicId, f.name)}
                  className="p-1 text-slate-400 hover:text-rose-600 rounded cursor-pointer"
                  title="Delete Folder"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Main Document Table View */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-xs">
        {loading ? (
          <div className="p-12 text-center text-slate-400 font-medium">Loading document vault...</div>
        ) : documents.length === 0 ? (
          <div className="p-12 text-center text-slate-400 font-medium">No documents uploaded yet. Click "Upload Document" to upload a file.</div>
        ) : viewMode === 'grid' ? (
          <div className="p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {documents.map((doc) => (
              <div key={doc.publicId} className="p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700/80 space-y-2.5 hover:border-blue-500 transition-all shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="px-2 py-0.5 bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 rounded text-[9px] font-mono font-bold uppercase">
                      {doc.extension.replace('.', '') || 'DOC'}
                    </span>
                    <span className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-extrabold text-[9px] rounded-md border border-indigo-200 dark:border-indigo-800">
                      {doc.documentTypeName || doc.documentTypeCode || 'GENERAL'}
                    </span>
                    <span className="px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded text-[9px] font-bold">
                      {doc.providerCode}
                    </span>
                  </div>
                  <div
                    onClick={() => setPreviewDoc(doc)}
                    className="font-bold text-xs text-slate-900 dark:text-white hover:text-blue-600 cursor-pointer truncate mt-2"
                  >
                    {doc.fileName}
                  </div>
                  <p className="text-[10px] text-slate-400 truncate mt-0.5">{doc.description || 'No remarks'}</p>
                </div>

                <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between">
                  <span className="text-[10px] font-mono text-slate-400">{formatBytes(doc.fileSize)}</span>
                  {/* Action Buttons in single line */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => setPreviewDoc(doc)} className="p-1 text-slate-400 hover:text-blue-600 rounded" title="Preview">
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => handleOpenEdit(doc)} className="p-1 text-slate-400 hover:text-amber-600 rounded" title="Edit">
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => handleDownload(doc)} className="p-1 text-slate-400 hover:text-emerald-600 rounded" title="Download">
                      <Download className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => handleDelete(doc.publicId)} className="p-1 text-slate-400 hover:text-rose-600 rounded" title="Delete">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                <tr className="whitespace-nowrap">
                  <th className="px-3.5 py-3">Document Name</th>
                  <th className="px-3.5 py-3">Doc Type</th>
                  <th className="px-3.5 py-3">Exact Physical Path</th>
                  <th className="px-3.5 py-3">Module / Entity</th>
                  <th className="px-3.5 py-3">Provider</th>
                  <th className="px-3.5 py-3">Size</th>
                  <th className="px-3.5 py-3">Ver</th>
                  <th className="px-3.5 py-3">Uploaded</th>
                  <th className="px-3.5 py-3 text-right w-32 whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 font-medium">
                {documents.map((doc) => (
                  <tr key={doc.publicId} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-3.5 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-[9px] uppercase shrink-0 border border-blue-200 dark:border-blue-900">
                          {doc.extension.replace('.', '') || 'DOC'}
                        </div>
                        <div className="min-w-0">
                          <div
                            onClick={() => setPreviewDoc(doc)}
                            className="font-bold text-slate-900 dark:text-slate-100 hover:text-blue-600 cursor-pointer truncate max-w-xs text-xs"
                          >
                            {doc.fileName}
                          </div>
                          <div className="text-[10px] text-slate-400 truncate max-w-xs font-medium">{doc.description || 'No description'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3.5 py-2.5">
                      <span className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-extrabold text-[10px] rounded-md border border-indigo-200 dark:border-indigo-800 shadow-xs whitespace-nowrap">
                        {doc.documentTypeName || doc.documentTypeCode || 'GENERAL'}
                      </span>
                    </td>
                    <td className="px-3.5 py-2.5">
                      <div
                        className="font-mono text-[10px] text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800/80 px-2 py-0.5 rounded-lg border border-slate-200 dark:border-slate-700 max-w-xs truncate"
                        title={doc.fullPhysicalPath || doc.storageObjectKey}
                      >
                        💻 {doc.fullPhysicalPath || doc.storageObjectKey}
                      </div>
                    </td>
                    <td className="px-3.5 py-2.5">
                      <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-md text-[10px] font-mono font-bold">
                        {doc.moduleCode || '-'} / {doc.entityType || '-'} #{doc.entityId || '-'}
                      </span>
                    </td>
                    <td className="px-3.5 py-2.5">
                      <span className="px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-md text-[9px] font-bold border border-emerald-200 dark:border-emerald-800">
                        {doc.providerCode}
                      </span>
                    </td>
                    <td className="px-3.5 py-2.5 text-slate-600 dark:text-slate-400 font-mono text-[11px]">{formatBytes(doc.fileSize)}</td>
                    <td className="px-3.5 py-2.5">
                      <span className="px-2 py-0.5 bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 rounded-md text-[9px] font-bold border border-blue-200 dark:border-blue-900">
                        v{doc.currentVersion}
                      </span>
                    </td>
                    <td className="px-3.5 py-2.5 text-slate-400 text-[10px] font-mono">{new Date(doc.uploadedOn).toLocaleDateString()}</td>

                    {/* 🛡️ Actions Column: Explicit single line inline-flex with NO wrapping */}
                    <td className="px-3.5 py-2.5 text-right whitespace-nowrap">
                      <div className="inline-flex items-center justify-end gap-1">
                        <button
                          onClick={() => setPreviewDoc(doc)}
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/60 rounded-lg transition-colors cursor-pointer"
                          title="Preview Document"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleOpenEdit(doc)}
                          className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/60 rounded-lg transition-colors cursor-pointer"
                          title="Edit Document Metadata"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDownload(doc)}
                          className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 rounded-lg transition-colors cursor-pointer"
                          title="Download File"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(doc.publicId)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/60 rounded-lg transition-colors cursor-pointer"
                          title="Soft Delete Document"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <Pagination
          pageIndex={pageIndex}
          pageSize={pageSize}
          totalCount={totalCount}
          totalPages={totalPages}
          onPageChange={(p) => setPageIndex(p)}
          onPageSizeChange={(s) => {
            setPageSize(s);
            setPageIndex(1);
          }}
        />
      </div>

      {/* Modern MNC Upload Modal */}
      {isUploadOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="modal-animate bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden space-y-0 text-xs">
            <div className="p-4 bg-gradient-to-r from-blue-900/40 to-slate-900/40 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold shadow-md">
                  <Upload className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">Upload Document into Storage Vault</h3>
                  <p className="text-[10px] text-slate-400 font-medium">Single file upload or Multi-Row ("Add Row") batch upload mode.</p>
                </div>
              </div>
              <button onClick={() => setIsUploadOpen(false)} className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-600 flex items-center justify-center transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-3.5">
              {/* Toggle Mode */}
              <div className="flex items-center gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setUploadMode('table')}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    uploadMode === 'table' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <TableIcon className="w-3.5 h-3.5" />
                  <span>Multi-Row Table Upload ("Add Row")</span>
                </button>
                <button
                  type="button"
                  onClick={() => setUploadMode('single')}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    uploadMode === 'single' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Single Document Upload</span>
                </button>
              </div>

              {batchError && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 text-rose-700 dark:text-rose-300 rounded-xl text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                  <span>{batchError}</span>
                </div>
              )}

              {/* Shared Metadata Inputs */}
              {isSuperAdmin && (
                <div className="p-3 bg-amber-500/10 dark:bg-amber-500/5 rounded-xl border border-amber-500/30">
                  <label className="block text-[10px] font-black uppercase text-amber-600 dark:text-amber-400 mb-1 flex items-center gap-1">
                    <Building2 className="w-3 h-3 text-amber-500" />
                    <span>Target Tenant (SuperAdmin Override)</span>
                  </label>
                  <select
                    value={targetTenantId}
                    onChange={(e) => setTargetTenantId(e.target.value ? Number(e.target.value) : '')}
                    className="w-full p-2 bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700/80 rounded-xl text-xs font-bold text-amber-900 dark:text-amber-200 cursor-pointer shadow-xs"
                  >
                    <option value="">-- Upload to Default Active Tenant --</option>
                    {Array.isArray(tenants) && tenants.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.tenantCode} — {t.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Module Code *</label>
                  <select
                    value={moduleCode}
                    onChange={(e) => setModuleCode(e.target.value)}
                    className="w-full p-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono font-bold uppercase cursor-pointer"
                  >
                    <option value="GENERAL">GENERAL — General Default</option>
                    {Array.isArray(modules) && modules.map((m) => (
                      <option key={m.id} value={m.moduleCode}>
                        {m.moduleCode} — {m.moduleName}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Entity Type</label>
                  <input
                    type="text"
                    placeholder="e.g. DEALER or CUSTOMER"
                    value={entityType}
                    onChange={(e) => setEntityType(e.target.value)}
                    className="w-full p-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Entity ID</label>
                  <input
                    type="text"
                    placeholder="e.g. 1001"
                    value={entityId}
                    onChange={(e) => setEntityId(e.target.value)}
                    className="w-full p-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono font-semibold"
                  />
                </div>
              </div>

              {/* Mode 1: Table Batch Upload */}
              {uploadMode === 'table' ? (
                <form onSubmit={handleBatchUploadSubmit} className="space-y-3">
                  <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-500 uppercase">
                        <tr>
                          <th className="p-2">Document Type *</th>
                          <th className="p-2">File Stream *</th>
                          <th className="p-2">Remarks</th>
                          <th className="p-2 w-10 text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                        {tableRows.map((r) => (
                          <tr key={r.id}>
                            <td className="p-2">
                              <select
                                value={r.documentTypeCode}
                                onChange={(e) => handleRowChange(r.id, 'documentTypeCode', e.target.value)}
                                className="w-full p-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold"
                              >
                                {docTypes.length === 0 ? (
                                  <>
                                    <option value="GST">GST Certificate</option>
                                    <option value="PAN">PAN Card</option>
                                  </>
                                ) : (
                                  docTypes.map((dt) => (
                                    <option key={dt.id} value={dt.typeCode}>
                                      {dt.typeName} ({dt.typeCode})
                                    </option>
                                  ))
                                )}
                              </select>
                            </td>

                            <td className="p-2">
                              <input
                                type="file"
                                onChange={(e) => handleRowChange(r.id, 'file', e.target.files?.[0] || null)}
                                className="w-full text-xs text-slate-500 file:mr-2 file:py-1 file:px-2 file:rounded-lg file:border-0 file:text-[11px] file:font-bold file:bg-blue-50 file:text-blue-600 hover:file:bg-blue-100 cursor-pointer"
                              />
                            </td>

                            <td className="p-2">
                              <input
                                type="text"
                                placeholder="Remarks..."
                                value={r.remarks}
                                onChange={(e) => handleRowChange(r.id, 'remarks', e.target.value)}
                                className="w-full p-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                              />
                            </td>

                            <td className="p-2 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveRow(r.id)}
                                disabled={tableRows.length <= 1}
                                className="p-1 text-rose-500 hover:text-rose-700 disabled:opacity-30 rounded"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <button
                      type="button"
                      onClick={handleAddRow}
                      className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-xs flex items-center gap-1 border border-slate-200 dark:border-slate-700 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5 text-blue-500" />
                      <span>+ Add Row</span>
                    </button>

                    <div className="flex gap-2">
                      <button type="button" onClick={() => setIsUploadOpen(false)} className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-bold">Cancel</button>
                      <button type="submit" disabled={uploading} className="px-5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-xl shadow-md cursor-pointer">
                        {uploading ? 'Uploading Batch...' : 'Submit Batch Upload'}
                      </button>
                    </div>
                  </div>
                </form>
              ) : (
                /* Mode 2: Single Upload */
                <form onSubmit={handleSingleUploadSubmit} className="space-y-3">
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Select File *</label>
                    <input
                      type="file"
                      required
                      onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                      className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Description / Remarks</label>
                    <input
                      type="text"
                      placeholder="Remarks..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                    />
                  </div>

                  <div className="pt-2 flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                    <button type="button" onClick={() => setIsUploadOpen(false)} className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-bold">Cancel</button>
                    <button type="submit" disabled={uploading} className="px-5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-xl shadow-md cursor-pointer">
                      {uploading ? 'Uploading...' : 'Upload File'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create / Edit Folder Modal */}
      {isCreateFolderOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="modal-animate bg-white dark:bg-slate-900 rounded-2xl max-w-sm w-full border border-slate-200 dark:border-slate-800 shadow-2xl p-4 space-y-3 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <FolderPlus className="w-4 h-4 text-blue-500" />
                <span>{editingFolder ? `Edit Folder: ${editingFolder.name}` : 'Create New Folder'}</span>
              </h3>
              <button onClick={() => setIsCreateFolderOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateFolder} className="space-y-3">
              {isSuperAdmin && (
                <div>
                  <label className="block text-[10px] font-bold uppercase text-amber-600 dark:text-amber-400 mb-1 flex items-center gap-1">
                    <Building2 className="w-3 h-3 text-amber-500" />
                    <span>Target Tenant *</span>
                  </label>
                  <select
                    value={targetTenantId}
                    onChange={(e) => setTargetTenantId(e.target.value ? Number(e.target.value) : '')}
                    className="w-full p-2 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700/80 rounded-xl text-xs font-bold text-amber-900 dark:text-amber-200 cursor-pointer"
                  >
                    <option value="">-- Current Active Tenant --</option>
                    {Array.isArray(tenants) && tenants.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.tenantCode} — {t.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Folder Name *</label>
                <input
                  type="text"
                  required
                  placeholder="Enter Folder Name (e.g. KYC Documents)"
                  value={folderName}
                  onChange={(e) => setFolderName(e.target.value)}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Module Code *</label>
                <select
                  value={moduleCode}
                  onChange={(e) => setModuleCode(e.target.value)}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold uppercase cursor-pointer"
                >
                  <option value="GENERAL">GENERAL — General Default</option>
                  {Array.isArray(modules) && modules.map((m) => (
                    <option key={m.id} value={m.moduleCode}>
                      {m.moduleCode} — {m.moduleName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase mb-0.5">Entity Type</label>
                  <input
                    type="text"
                    placeholder="e.g. DEALER"
                    value={entityType}
                    onChange={(e) => setEntityType(e.target.value)}
                    className="w-full p-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase mb-0.5">Entity ID</label>
                  <input
                    type="text"
                    placeholder="e.g. 1001"
                    value={entityId}
                    onChange={(e) => setEntityId(e.target.value)}
                    className="w-full p-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                <button type="button" onClick={() => setIsCreateFolderOpen(false)} className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-xl font-semibold cursor-pointer">Cancel</button>
                <button type="submit" className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-xs cursor-pointer">
                  {editingFolder ? 'Update Folder' : 'Create Folder'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Metadata Modal */}
      {editingDoc && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="modal-animate bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl p-4 space-y-3 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Edit2 className="w-4 h-4 text-amber-500" />
                <span>Edit Document Metadata</span>
              </h3>
              <button onClick={() => setEditingDoc(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">File Display Name</label>
                <input
                  type="text"
                  required
                  value={editFileName}
                  onChange={(e) => setEditFileName(e.target.value)}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase mb-0.5">Module *</label>
                  <select
                    value={editModuleCode}
                    onChange={(e) => setEditModuleCode(e.target.value)}
                    className="w-full p-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono font-bold uppercase cursor-pointer"
                  >
                    <option value="GENERAL">GENERAL</option>
                    {Array.isArray(modules) && modules.map((m) => (
                      <option key={m.id} value={m.moduleCode}>
                        {m.moduleCode}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase mb-0.5">Entity</label>
                  <input
                    type="text"
                    placeholder="e.g. DEALER"
                    value={editEntityType}
                    onChange={(e) => setEditEntityType(e.target.value)}
                    className="w-full p-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase mb-0.5">ID</label>
                  <input
                    type="text"
                    value={editEntityId}
                    onChange={(e) => setEditEntityId(e.target.value)}
                    className="w-full p-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Description</label>
                <input
                  type="text"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                <button type="button" onClick={() => setEditingDoc(null)} className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-xl font-semibold">Cancel</button>
                <button type="submit" className="px-4 py-1.5 bg-amber-600 text-white font-bold rounded-xl shadow-xs">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* In-Browser Document Preview Modal */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="modal-animate bg-white dark:bg-slate-900 rounded-2xl max-w-4xl w-full h-[85vh] border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col overflow-hidden">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <FileText className="w-5 h-5 text-blue-400" />
                <div>
                  <h3 className="text-xs font-bold truncate max-w-md">{previewDoc.fileName}</h3>
                  <div className="text-[10px] text-slate-400 font-mono">
                    Provider: {previewDoc.providerCode} • Size: {formatBytes(previewDoc.fileSize)}
                  </div>
                </div>
              </div>
              <button onClick={() => setPreviewDoc(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 bg-slate-950 relative">
              <iframe
                src={getPreviewUrl(previewDoc.publicId)}
                className="w-full h-full border-none"
                title={previewDoc.fileName}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
