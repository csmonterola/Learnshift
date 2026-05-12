import React from 'react'
import { UserPlus, Download, CloudUpload, Sparkles, ChevronDown, Copy, Check } from 'lucide-react'

const generatedAccounts = [
  { id: 1, initials: 'JM', name: 'Juan Miguel dela Cruz', section: 'Gr. 7 – Sec. A', username: 'jm.delacruz_7a', enrollmentCode: 'ENR-7A-0001', avatarColor: 'bg-accent-500' },
  { id: 2, initials: 'ML', name: 'Maria Luisa Santos',    section: 'Gr. 7 – Sec. A', username: 'ml.santos_7a',   enrollmentCode: 'ENR-7A-0002', avatarColor: 'bg-emerald-500' },
]

export function AdminAccountGeneration() {
  return (
    <div className="space-y-8">
      {/* Header & Stepper */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500 flex items-center justify-center shadow-sm shadow-emerald-500/20">
            <UserPlus className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900 mb-1">Account Generation Center</h1>
            <p className="text-gray-500 text-sm">Upload a class roster to auto-generate student credentials in bulk.</p>
          </div>
        </div>

        {/* Stepper */}
        <div className="flex items-center bg-white rounded-full px-6 py-3 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500">1</div>
            <span className="text-sm font-medium text-gray-500">Upload Roster</span>
          </div>
          <div className="w-8 h-px bg-gray-200 mx-4" />
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center text-xs font-bold text-white">
              <Check className="w-3 h-3" />
            </div>
            <span className="text-sm font-bold text-gray-900">Generate</span>
          </div>
          <div className="w-8 h-px bg-gray-200 mx-4" />
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500">3</div>
            <span className="text-sm font-medium text-gray-500">Export</span>
          </div>
        </div>
      </div>

      {/* Upload Zone */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900">Step 1 — Upload Class Roster</h2>
          <button className="text-sm font-medium text-emerald-600 hover:text-emerald-700 flex items-center gap-2">
            <Download className="w-4 h-4" />Download Template
          </button>
        </div>

        <div className="bg-white rounded-2xl border-2 border-dashed border-gray-200 p-12 flex flex-col items-center justify-center text-center hover:border-emerald-400 hover:bg-emerald-50/30 transition-colors cursor-pointer group relative">
          <div className="absolute top-4 left-4 w-4 h-4 border-t-2 border-l-2 border-gray-300 rounded-tl-lg" />
          <div className="absolute top-4 right-4 w-4 h-4 border-t-2 border-r-2 border-gray-300 rounded-tr-lg" />
          <div className="absolute bottom-4 left-4 w-4 h-4 border-b-2 border-l-2 border-gray-300 rounded-bl-lg" />
          <div className="absolute bottom-4 right-4 w-4 h-4 border-b-2 border-r-2 border-gray-300 rounded-br-lg" />

          <div className="w-16 h-16 rounded-2xl bg-emerald-50 flex items-center justify-center mb-6 group-hover:bg-white group-hover:shadow-sm transition-all">
            <CloudUpload className="w-8 h-8 text-emerald-400 group-hover:text-emerald-500 transition-colors" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Drag & drop your class roster here</h3>
          <p className="text-gray-500 text-sm mb-8">Supports .CSV, .XLSX, and .XLS formats • Max 10 MB</p>
          <div className="flex items-center gap-4 w-full max-w-xs mb-8">
            <div className="h-px bg-gray-200 flex-1" />
            <span className="text-xs font-medium text-gray-400 uppercase">or</span>
            <div className="h-px bg-gray-200 flex-1" />
          </div>
          <button className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-3 rounded-xl font-medium flex items-center gap-2 transition-colors shadow-sm shadow-emerald-500/20">
            <CloudUpload className="w-5 h-5" />Browse Roster File (CSV / Excel)
          </button>
        </div>

        <div className="mt-4 flex items-start gap-2 text-sm text-gray-500">
          <div className="w-4 h-4 rounded-full border border-gray-400 flex items-center justify-center flex-shrink-0 mt-0.5">
            <span className="text-[10px] font-bold">i</span>
          </div>
          <p>
            Ensure your spreadsheet includes columns for:{' '}
            <span className="font-bold text-gray-700">Last Name, First Name, Grade Level</span>, and{' '}
            <span className="font-bold text-gray-700">Section</span>. Usernames and passwords will be auto-generated.
          </p>
        </div>
      </div>

      {/* Preview */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">Generated Accounts Preview</h3>
              <p className="text-sm text-gray-500">12 accounts ready • Batch: Grade 7 Enrollment 2025–2026</p>
            </div>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
            Filter by section <ChevronDown className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-gray-100">
                <th className="py-4 px-6 w-12"><div className="w-4 h-4 rounded bg-gray-800" /></th>
                <th className="py-4 px-6 text-xs font-bold text-gray-400 tracking-wider">STUDENT NAME</th>
                <th className="py-4 px-6 text-xs font-bold text-gray-400 tracking-wider">GENERATED USERNAME</th>
                <th className="py-4 px-6 text-xs font-bold text-gray-400 tracking-wider">DEFAULT PASSWORD</th>
                <th className="py-4 px-6 text-xs font-bold text-gray-400 tracking-wider">PARENT ENROLLMENT CODE</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {generatedAccounts.map((a) => (
                <tr key={a.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="py-4 px-6"><div className="w-4 h-4 rounded bg-gray-800" /></td>
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full ${a.avatarColor} text-white flex items-center justify-center text-xs font-bold flex-shrink-0`}>
                        {a.initials}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-900">{a.name}</p>
                        <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700">{a.section}</span>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-mono bg-gray-100 text-gray-600">{a.username}</span>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-3">
                      <span className="text-gray-900 tracking-[0.2em] text-lg leading-none mt-1">••••••••••</span>
                      <button className="text-xs font-medium text-gray-400 hover:text-gray-600 border border-gray-200 rounded px-2 py-1 bg-white">Show</button>
                      <button className="text-gray-400 hover:text-gray-600"><Copy className="w-4 h-4" /></button>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-3">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold bg-accent-50 text-accent-700">{a.enrollmentCode}</span>
                      <button className="text-gray-400 hover:text-gray-600"><Copy className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
