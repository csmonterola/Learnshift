import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { TeacherTopBar } from '../../components/layout/TeacherTopBar'
import {
  FileText,
  UploadCloud,
  Eye,
  Download,
  Trash2,
  CheckCircle2,
  Database,
} from 'lucide-react'

const initialFiles = [
  { id: 1, name: 'Fractions_Module.pdf',           subject: 'Mathematics', size: '2.4 MB', pages: 18, date: 'Apr 15, 2026', synced: true },
  { id: 2, name: 'Cell_Structure_Lesson.pdf',       subject: 'Science',     size: '5.1 MB', pages: 32, date: 'Apr 12, 2026', synced: false },
  { id: 3, name: 'LinearEquations_Worksheet.pdf',   subject: 'Mathematics', size: '1.8 MB', pages: 12, date: 'Apr 10, 2026', synced: true },
]

export function TeacherContentManager() {
  const [files, setFiles] = useState(initialFiles)

  const toggleSync = (id: number) => {
    setFiles(files.map((f) => f.id === id ? { ...f, synced: !f.synced } : f))
  }

  const syncedCount = files.filter((f) => f.synced).length

  return (
    <div className="min-h-screen flex flex-col">
      <TeacherTopBar
        leftContent={
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center">
              <UploadCloud size={18} />
            </div>
            <div>
              <div className="font-semibold text-slate-800 leading-tight">Content Manager</div>
              <div className="text-xs text-slate-500">Upload & sync learning materials</div>
            </div>
          </div>
        }
      />

      <main className="flex-1 p-8 max-w-5xl mx-auto w-full">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900 mb-1">Content Manager</h1>
          <p className="text-slate-500 text-sm">
            Upload and manage your learning materials. Sync them to the AI Chatbot Knowledge Base for instant student support.
          </p>
        </div>

        {/* Stats */}
        <div className="flex gap-4 mb-8">
          {[
            { label: 'Total Files',  value: files.length,              color: 'bg-blue-50 text-blue-500',    textColor: 'text-blue-600',    icon: FileText },
            { label: 'Synced to AI', value: syncedCount,               color: 'bg-emerald-50 text-emerald-500', textColor: 'text-emerald-600', icon: Database },
            { label: 'Not Synced',   value: files.length - syncedCount, color: 'bg-slate-100 text-slate-500',  textColor: 'text-slate-600',   icon: Database },
          ].map((stat) => (
            <div key={stat.label} className="bg-white rounded-xl border border-slate-200 px-4 py-3 flex items-center gap-3 shadow-sm">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${stat.color}`}>
                <stat.icon size={16} />
              </div>
              <div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{stat.label}</div>
                <div className={`text-lg font-bold leading-none ${stat.textColor}`}>{stat.value}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Upload Zone */}
        <div className="border-2 border-dashed border-slate-300 rounded-3xl bg-white p-12 flex flex-col items-center justify-center text-center mb-12 hover:border-emerald-400 hover:bg-emerald-50/30 transition-colors cursor-pointer">
          <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-500 mb-4">
            <UploadCloud size={32} />
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-2">Drag & Drop your files here</h3>
          <p className="text-sm text-slate-500 mb-6 max-w-sm">
            Upload PDF modules, lesson guides, worksheets, or supplementary materials.
            Supported: <strong className="text-slate-700">.pdf, .docx, .pptx</strong>
          </p>
          <button className="bg-emerald-400 hover:bg-emerald-500 text-white px-6 py-2.5 rounded-xl font-medium flex items-center gap-2 transition-colors shadow-sm shadow-emerald-200">
            <UploadCloud size={18} /> Browse Files
          </button>
          <p className="text-xs text-slate-400 mt-4">Max file size: 50 MB per file · Files are encrypted and stored securely</p>
        </div>

        {/* File List */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <h2 className="font-bold text-slate-900">Uploaded Learning Materials</h2>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-600 text-xs font-medium border border-emerald-100">
                {files.length} files
              </span>
            </div>
            <div className="px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-medium border border-emerald-100 flex items-center gap-1.5">
              <Database size={14} /> {syncedCount} of {files.length} files synced to AI Chatbot
            </div>
          </div>

          <div className="flex flex-col gap-3">
            {files.map((file) => (
              <div key={file.id} className="card p-4 flex items-center justify-between group hover:border-emerald-200 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-12 bg-red-50 rounded flex flex-col items-center justify-center text-red-500 border border-red-100 relative">
                    <FileText size={20} />
                    <span className="text-[8px] font-bold mt-0.5 bg-red-500 text-white px-1 rounded-sm absolute -bottom-1.5">PDF</span>
                  </div>
                  <div>
                    <div className="font-semibold text-slate-900 mb-1">{file.name}</div>
                    <div className="flex items-center gap-3 text-xs text-slate-500">
                      <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-600 font-medium">{file.subject}</span>
                      <span>{file.size}</span>
                      <span>·</span>
                      <span>{file.pages} pages</span>
                      <span>·</span>
                      <span>Uploaded {file.date}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-8">
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg"><Eye size={16} /></button>
                    <button className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg"><Download size={16} /></button>
                    <button className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={16} /></button>
                  </div>

                  <div className="flex items-center gap-4 border-l border-slate-100 pl-8">
                    {file.synced ? (
                      <div className="status-pill proficient bg-emerald-50/50 border-emerald-100/50">
                        <CheckCircle2 size={14} /> Synced
                      </div>
                    ) : (
                      <div className="status-pill bg-slate-100 text-slate-500 border-slate-200">Not synced</div>
                    )}
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="text-xs font-semibold text-slate-700">Sync to AI Chatbot</div>
                        <div className="text-[10px] text-slate-400">Knowledge Base</div>
                      </div>
                      <button
                        onClick={() => toggleSync(file.id)}
                        className={`w-12 h-6 rounded-full relative transition-colors flex items-center px-1 ${file.synced ? 'bg-emerald-400' : 'bg-slate-200'}`}
                      >
                        <motion.div
                          layout
                          className="w-4 h-4 bg-white rounded-full shadow-sm flex items-center justify-center"
                          animate={{ x: file.synced ? 24 : 0 }}
                          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                        >
                          {file.synced && <Database size={10} className="text-emerald-500" />}
                        </motion.div>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
