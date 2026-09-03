import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import type { DashboardStats, DocumentItem } from '../../types';
import {
  FileText,
  HardDrive,
  AppWindow,
  Upload,
  ArrowUpRight,
  Activity
} from 'lucide-react';

export const DashboardView: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentDocs, setRecentDocs] = useState<DocumentItem[]>([]);

  const fetchData = async () => {
    try {
      const statsRes = await api.get('/dashboard/stats');
      if (statsRes.data.success) {
        setStats(statsRes.data.data);
      }

      const docsRes = await api.get('/documents/search?pageSize=5');
      if (docsRes.data.success) {
        setRecentDocs(docsRes.data.data.items || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-4 max-w-[1600px] mx-auto text-xs">

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800/80 shadow-xs border-t-2 border-t-blue-500 flex items-center justify-between">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Documents</div>
            <div className="text-xl font-extrabold text-slate-900 dark:text-white mt-0.5">
              {stats?.totalDocuments ?? 0}
            </div>
            <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium mt-1 flex items-center gap-1">
              <ArrowUpRight className="w-3 h-3" /> +12% this week
            </div>
          </div>
          <div className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
            <FileText className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800/80 shadow-xs border-t-2 border-t-indigo-500 flex items-center justify-between">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Storage Consumption</div>
            <div className="text-xl font-extrabold text-slate-900 dark:text-white mt-0.5">
              {formatBytes(stats?.totalStorageBytes ?? 0)}
            </div>
            <div className="text-[11px] text-slate-400 font-medium mt-1 font-mono">Across routed profiles</div>
          </div>
          <div className="w-9 h-9 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
            <HardDrive className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800/80 shadow-xs border-t-2 border-t-purple-500 flex items-center justify-between">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Active Applications</div>
            <div className="text-xl font-extrabold text-slate-900 dark:text-white mt-0.5">
              {stats?.totalApplications ?? 0}
            </div>
            <div className="text-[11px] text-purple-600 dark:text-purple-400 font-medium mt-1">ERP, HRMS, CRM</div>
          </div>
          <div className="w-9 h-9 rounded-lg bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
            <AppWindow className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800/80 shadow-xs border-t-2 border-t-emerald-500 flex items-center justify-between">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Uploads Today</div>
            <div className="text-xl font-extrabold text-slate-900 dark:text-white mt-0.5">
              {stats?.uploadsToday ?? 0}
            </div>
            <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium mt-1 flex items-center gap-1">
              <Activity className="w-3 h-3" /> High Throughput
            </div>
          </div>
          <div className="w-9 h-9 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
            <Upload className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Main Grid Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800/80 shadow-xs col-span-1">
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100 dark:border-slate-800">
            <h3 className="font-extrabold text-slate-900 dark:text-white text-xs uppercase tracking-wider">Storage Health</h3>
            <span className="px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded text-[10px] font-bold border border-emerald-200">
              ● Healthy
            </span>
          </div>

          <div className="space-y-3">
            <div className="p-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200/80 dark:border-slate-800">
              <div className="flex justify-between text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                <span>Primary Local Disk</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">Active (Default)</span>
              </div>
              <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full mt-2 overflow-hidden">
                <div className="bg-blue-600 h-full rounded-full" style={{ width: '42%' }}></div>
              </div>
            </div>

            <div className="p-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200/80 dark:border-slate-800">
              <div className="flex justify-between text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                <span>AWS S3 Cloud Archive</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">Connected</span>
              </div>
              <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full mt-2 overflow-hidden">
                <div className="bg-indigo-500 h-full rounded-full" style={{ width: '68%' }}></div>
              </div>
            </div>

            <div className="p-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200/80 dark:border-slate-800">
              <div className="flex justify-between text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                <span>Local NAS Agent (SMB)</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">Connected (HTTPS)</span>
              </div>
              <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full mt-2 overflow-hidden">
                <div className="bg-emerald-500 h-full rounded-full" style={{ width: '25%' }}></div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800/80 shadow-xs col-span-2">
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100 dark:border-slate-800">
            <h3 className="font-extrabold text-slate-900 dark:text-white text-xs uppercase tracking-wider">Recent Document Uploads</h3>
            <a href="/documents" className="text-[11px] text-blue-600 dark:text-blue-400 font-bold hover:underline">
              View All Documents →
            </a>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {recentDocs.length === 0 ? (
              <div className="py-6 text-center text-slate-400 text-xs">No documents uploaded yet.</div>
            ) : (
              recentDocs.map((doc) => (
                <div key={doc.publicId} className="py-2 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/40 px-2 rounded-lg transition-colors">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-[10px] uppercase shrink-0">
                      {doc.extension.replace('.', '') || 'DOC'}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">{doc.fileName}</div>
                      <div className="text-[10px] text-slate-400 truncate">
                        {doc.moduleCode || 'General'} • {doc.entityType || 'N/A'} #{doc.entityId || '-'} • {formatBytes(doc.fileSize)}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded text-[10px] font-mono">
                      {doc.providerCode}
                    </span>
                    <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-1.5 py-0.5 rounded">
                      v{doc.currentVersion}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
