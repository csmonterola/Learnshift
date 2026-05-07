import React, { useState } from 'react'
import { UploadCloud, File, Search, Filter, Trash2, RefreshCw, CheckCircle2 } from 'lucide-react'
import { MOCK_FILES } from '../../lib/mockData'

export function TeacherContent() {
  const [files, setFiles] = useState(MOCK_FILES)
  const [isDragging, setIsDragging] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true) }
  const handleDragLeave = () => setIsDragging(false)
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    setFiles([{ id: `f${Date.now()}`, name: 'New_Uploaded_Material.pdf', type: 'PDF', size: '1.5 MB', date: 'Just now', sync: true }, ...files])
  }
  const toggleSync = (id: string) => setFiles(files.map((f) => f.id === id ? { ...f, sync: !f.sync } : f))
  const deleteFile = (id: string) => setFiles(files.filter((f) => f.id !== id))
  const filteredFiles = files.filter((f) => f.name.toLowerCase().includes(searchTerm.toLowerCase()))

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header>
        <h1 className="text-3xl font-bold text-slate-900">Content Management</h1>
        <p className="text-slate-600 mt-1">Upload materials and manage what the AI Tutor can access.</p>
      </header>

      {/* Upload Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-2xl p-12 text-center transition-colors ${isDragging ? 'border-accent-500 bg-accent-50' : 'border-slate-300 bg-white hover:bg-slate-50'}`}
      >
        <div className="w-16 h-16 bg-accent-100 text-accent-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <UploadCloud className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-bold text-slate-900 mb-2">Drag & drop files here</h3>
        <p className="text-slate-500 mb-6">Support for PDF, DOCX, PPTX, and TXT up to 50MB</p>
        <button className="px-6 py-2.5 bg-accent-500 text-white rounded-xl hover:bg-accent-600 transition-colors font-medium shadow-sm shadow-accent-500/20">
          Browse Files
        </button>
      </div>

      {/* Files List */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <h2 className="font-bold text-slate-900">Uploaded Materials</h2>
            <span className="px-2.5 py-0.5 bg-slate-200 text-slate-700 rounded-full text-xs font-medium">{files.length} files</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search files..."
                value={searchTerm}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                className="pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent-500/20 focus:border-accent-500 w-full sm:w-64"
              />
            </div>
            <button className="p-2 text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
              <Filter className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500 font-semibold">
                <th className="p-4 pl-6">File Name</th>
                <th className="p-4">Size</th>
                <th className="p-4">Uploaded</th>
                <th className="p-4 text-center">Sync to AI</th>
                <th className="p-4 pr-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredFiles.map((file) => (
                <tr key={file.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="p-4 pl-6">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${file.type === 'PDF' ? 'bg-rose-100 text-rose-600' : file.type === 'DOCX' ? 'bg-blue-100 text-blue-600' : 'bg-amber-100 text-amber-600'}`}>
                        <File className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">{file.name}</p>
                        <p className="text-xs text-slate-500">{file.type}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-sm text-slate-600">{file.size}</td>
                  <td className="p-4 text-sm text-slate-600">{file.date}</td>
                  <td className="p-4 text-center">
                    <button
                      onClick={() => toggleSync(file.id)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-accent-500 focus:ring-offset-2 ${file.sync ? 'bg-accent-500' : 'bg-slate-200'}`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${file.sync ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                    {file.sync && (
                      <div className="flex items-center justify-center gap-1 text-xs text-emerald-600 font-medium mt-1">
                        <CheckCircle2 className="w-3 h-3" /> Synced
                      </div>
                    )}
                  </td>
                  <td className="p-4 pr-6 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="p-2 text-slate-400 hover:text-accent-600 hover:bg-accent-50 rounded-lg transition-colors" title="Re-sync">
                        <RefreshCw className="w-4 h-4" />
                      </button>
                      <button onClick={() => deleteFile(file.id)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors" title="Delete">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredFiles.length === 0 && (
                <tr><td colSpan={5} className="p-8 text-center text-slate-500">No files found. Upload some materials above.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
