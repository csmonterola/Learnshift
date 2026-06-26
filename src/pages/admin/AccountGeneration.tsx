import React, { useState, useRef, useCallback } from 'react'
import { adminApi } from '../../lib/api'
import {
  UserPlus,
  Download,
  CloudUpload,
  Sparkles,
  Check,
  X,
  Copy,
  Loader2,
  AlertTriangle,
  FileSpreadsheet,
} from 'lucide-react'

interface CreatedAccount {
  id: number
  name: string
  email: string
  role: string
  plain_password: string
  enrollment_code?: string
}

interface ParsedRow {
  name: string
  email: string
  role: string
}

export function AdminAccountGeneration() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([])
  const [createdAccounts, setCreatedAccounts] = useState<CreatedAccount[]>([])
  const [errors, setErrors] = useState<string[]>([])
  const [dragOver, setDragOver] = useState(false)
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)
  const [step, setStep] = useState<'upload' | 'preview' | 'results'>('upload')

  const [showCreateModal, setShowCreateModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [singleError, setSingleError] = useState('')
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'student' as string,
  })
  const [singleResult, setSingleResult] = useState<CreatedAccount | null>(null)

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }, [])

  const handleDragLeave = useCallback(() => {
    setDragOver(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const files = e.dataTransfer.files
    if (files.length > 0) processFile(files[0])
  }, [])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) processFile(files[0])
  }

  const processFile = (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase()
    if (!['csv', 'xlsx', 'xls', 'txt'].includes(ext || '')) {
      alert('Please upload a CSV or Excel (.xlsx, .xls) file.')
      return
    }
    parseFileClientSide(file)
  }

  const parseFileClientSide = (file: File) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      const lines = text.split('\n').filter(line => line.trim())
      if (lines.length < 2) {
        alert('File must have a header row and at least one data row.')
        return
      }

      const headerLine = lines[0].toLowerCase()
      const separators = [',', '\t', ';']
      let separator = ','
      for (const sep of separators) {
        if (headerLine.includes(sep)) {
          separator = sep
          break
        }
      }

      const headers = lines[0].split(separator).map(h => h.trim().toLowerCase())
      const nameIdx = headers.findIndex(h => h === 'name')
      const emailIdx = headers.findIndex(h => h === 'email')
      const roleIdx = headers.findIndex(h => h === 'role')

      if (nameIdx === -1 || emailIdx === -1) {
        alert('File must contain "Name" and "Email" columns.')
        return
      }

      const rows: ParsedRow[] = []
      const parseErrors: string[] = []

      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(separator).map(c => c.trim())
        const name = cols[nameIdx] || ''
        const email = cols[emailIdx] || ''
        const role = (cols[roleIdx] || 'student').toLowerCase()

        if (!name && !email) continue

        if (!name || !email) {
          parseErrors.push(`Row ${i + 1}: Missing required fields (name, email).`)
          continue
        }

        if (!['student', 'teacher', 'parent', 'admin'].includes(role)) {
          parseErrors.push(`Row ${i + 1}: Invalid role "${role}". Defaulting to student.`)
        }

        rows.push({
          name,
          email,
          role: ['student', 'teacher', 'parent', 'admin'].includes(role) ? role : 'student',
        })
      }

      setParsedRows(rows)
      setErrors(parseErrors)
      setCreatedAccounts([])
      setStep(rows.length > 0 ? 'preview' : 'upload')

      if (rows.length === 0) alert('No valid rows found in the file.')
    }
    reader.readAsText(file)
  }

  const handleUploadAndGenerate = async () => {
    if (parsedRows.length === 0) return
    setUploading(true)
    try {
      const res = await adminApi.bulkCreate(
        parsedRows.map(row => ({
          name: row.name,
          email: row.email,
          role: row.role,
        }))
      )
      setCreatedAccounts(res.data.created || [])
      setErrors(prev => [...prev, ...(res.data.errors || [])])
      setStep('results')
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Bulk creation failed.'
      setErrors(prev => [...prev, msg])
    } finally {
      setUploading(false)
    }
  }

  const downloadResults = () => {
    if (createdAccounts.length === 0) return
    const csvRows = [
      ['Name', 'Email', 'Role', 'Password', 'Enrollment Code'],
      ...createdAccounts.map(a => [
        a.name,
        a.email,
        a.role,
        a.plain_password,
        a.enrollment_code || '',
      ]),
    ]
    const csvContent = csvRows.map(row => row.join(',')).join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'generated_accounts.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const copyToClipboard = async (text: string, index: number) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedIndex(index)
      setTimeout(() => setCopiedIndex(null), 2000)
    } catch {
      const ta = document.createElement('textarea')
      ta.value = text
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
      setCopiedIndex(index)
      setTimeout(() => setCopiedIndex(null), 2000)
    }
  }

  const downloadTemplate = () => {
    const templateRows = [
      ['Name', 'Email', 'Role'],
      ['Juan dela Cruz', 'juan@example.com', 'student'],
      ['Maria Santos', 'maria@example.com', 'student'],
    ]
    const csvContent = templateRows.map(row => row.join(',')).join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'account_generation_template.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const resetAll = () => {
    setParsedRows([])
    setCreatedAccounts([])
    setErrors([])
    setStep('upload')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const openCreateModal = () => {
    setFormData({ name: '', email: '', password: '', role: 'student' })
    setShowCreateModal(true)
    setSingleError('')
    setSingleResult(null)
  }

  const handleCreateSingle = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setSingleError('')
    setSingleResult(null)
    try {
      if (!formData.password || formData.password.length < 8) {
        setSingleError('Password must be at least 8 characters.')
        setSaving(false)
        return
      }
      const res = await adminApi.createUser({
        name: formData.name,
        email: formData.email,
        password: formData.password,
        role: formData.role,
      })
      setSingleResult(res.data)
    } catch (err: any) {
      setSingleError(err?.response?.data?.message ?? err?.response?.data?.error ?? 'Creation failed.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500 flex items-center justify-center shadow-sm shadow-emerald-500/20">
            <UserPlus className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900 mb-1">Account Generation Center</h1>
            <p className="text-gray-500 text-sm">Create accounts one by one or bulk generate via CSV/Excel.</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-xl text-sm font-medium hover:bg-emerald-600 transition-colors shadow-sm"
          >
            <UserPlus className="w-4 h-4" />
            Create Single Account
          </button>
        </div>
      </div>

      {/* Stepper */}
      <div className="flex items-center bg-white rounded-full px-6 py-3 shadow-sm border border-gray-100 mx-auto w-fit">
        <div className={`flex items-center gap-2 ${step === 'upload' || step === 'preview' || step === 'results' ? 'text-emerald-600' : 'text-gray-500'}`}>
          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
            step !== 'upload' ? 'bg-emerald-500 text-white' : 'bg-emerald-100 text-emerald-600'
          }`}>
            {step !== 'upload' ? <Check className="w-3 h-3" /> : '1'}
          </div>
          <span className="text-sm font-medium">Upload Roster</span>
        </div>
        <div className="w-8 h-px bg-gray-200 mx-4" />
        <div className={`flex items-center gap-2 ${step === 'preview' || step === 'results' ? 'text-emerald-600' : 'text-gray-500'}`}>
          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
            step === 'results' ? 'bg-emerald-500 text-white' :
            step === 'preview' ? 'bg-emerald-100 text-emerald-600' :
            'bg-gray-100 text-gray-500'
          }`}>
            {step === 'results' ? <Check className="w-3 h-3" /> : '2'}
          </div>
          <span className="text-sm font-medium">Review & Generate</span>
        </div>
        <div className="w-8 h-px bg-gray-200 mx-4" />
        <div className={`flex items-center gap-2 ${step === 'results' ? 'text-emerald-600' : 'text-gray-500'}`}>
          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
            step === 'results' ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-500'
          }`}>
            3
          </div>
          <span className="text-sm font-medium">Export Results</span>
        </div>
      </div>

      {/* Step 1: Upload */}
      {step === 'upload' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900">Upload Class Roster</h2>
            <button onClick={downloadTemplate} className="text-sm font-medium text-emerald-600 hover:text-emerald-700 flex items-center gap-2">
              <Download className="w-4 h-4" />Download Template
            </button>
          </div>

          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`bg-white rounded-2xl border-2 border-dashed p-12 flex flex-col items-center justify-center text-center transition-colors cursor-pointer relative ${
              dragOver ? 'border-emerald-500 bg-emerald-50/50' : 'border-gray-200 hover:border-emerald-400 hover:bg-emerald-50/30'
            }`}
          >
            <div className="w-16 h-16 rounded-2xl bg-emerald-50 flex items-center justify-center mb-6">
              <CloudUpload className="w-8 h-8 text-emerald-400" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Drag & drop your roster here</h3>
            <p className="text-gray-500 text-sm mb-8">Supports .CSV, .XLSX, and .XLS formats</p>
            <div className="flex items-center gap-4 w-full max-w-xs mb-8">
              <div className="h-px bg-gray-200 flex-1" />
              <span className="text-xs font-medium text-gray-400 uppercase">or</span>
              <div className="h-px bg-gray-200 flex-1" />
            </div>
            <button className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-3 rounded-xl font-medium flex items-center gap-2 transition-colors shadow-sm shadow-emerald-500/20">
              <CloudUpload className="w-5 h-5" />Browse Roster File (CSV / Excel)
            </button>
            <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls,.txt" onChange={handleFileSelect} className="hidden" />
          </div>

          <div className="mt-4 flex items-start gap-2 text-sm text-gray-500">
            <div className="w-4 h-4 rounded-full border border-gray-400 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-[10px] font-bold">i</span>
            </div>
            <p>
              Ensure your spreadsheet includes columns for: <span className="font-bold text-gray-700">Name, Email</span>, and <span className="font-bold text-gray-700">Role</span>.
              Passwords will be auto-generated.
            </p>
          </div>
        </div>
      )}

      {/* Step 2: Preview */}
      {step === 'preview' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Review Parsed Data</h3>
                <p className="text-sm text-gray-500">{parsedRows.length} accounts ready to generate</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={resetAll} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                <X className="w-4 h-4" />Cancel
              </button>
              <button onClick={handleUploadAndGenerate} disabled={uploading} className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg text-sm font-medium hover:bg-emerald-600 transition-colors disabled:opacity-50">
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                {uploading ? 'Generating...' : `Generate ${parsedRows.length} Accounts`}
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-gray-100">
                  <th className="py-4 px-6 text-xs font-bold text-gray-400 tracking-wider">#</th>
                  <th className="py-4 px-6 text-xs font-bold text-gray-400 tracking-wider">FULL NAME</th>
                  <th className="py-4 px-6 text-xs font-bold text-gray-400 tracking-wider">EMAIL</th>
                  <th className="py-4 px-6 text-xs font-bold text-gray-400 tracking-wider">ROLE</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {parsedRows.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-4 px-6 text-sm text-gray-500">{idx + 1}</td>
                    <td className="py-4 px-6 text-sm font-medium text-gray-900">{row.name}</td>
                    <td className="py-4 px-6 text-sm text-gray-500">{row.email}</td>
                    <td className="py-4 px-6">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium border ${
                        row.role === 'student' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                        row.role === 'teacher' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                        row.role === 'parent' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                        'bg-amber-50 text-amber-700 border-amber-200'
                      }`}>{row.role}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {errors.length > 0 && (
            <div className="p-4 border-t border-gray-100 bg-amber-50/50">
              <div className="flex items-center gap-2 text-amber-700 font-medium mb-2">
                <AlertTriangle className="w-4 h-4" /><span className="text-sm">Warnings</span>
              </div>
              <ul className="text-sm text-amber-600 space-y-1">
                {errors.map((err, idx) => <li key={idx}>{err}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Step 3: Results */}
      {step === 'results' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${createdAccounts.length > 0 ? 'bg-emerald-50' : 'bg-amber-50'}`}>
                {createdAccounts.length > 0 ? <Check className="w-5 h-5 text-emerald-600" /> : <AlertTriangle className="w-5 h-5 text-amber-600" />}
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  {createdAccounts.length > 0 ? `${createdAccounts.length} Accounts Created Successfully` : 'No Accounts Created'}
                </h3>
                <p className="text-sm text-gray-500">{errors.length > 0 ? `${errors.length} warnings` : 'All accounts generated successfully'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={downloadResults} disabled={createdAccounts.length === 0} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50">
                <Download className="w-4 h-4" />Download CSV
              </button>
              <button onClick={resetAll} className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg text-sm font-medium hover:bg-emerald-600 transition-colors">
                <UserPlus className="w-4 h-4" />Generate More
              </button>
            </div>
          </div>

          {createdAccounts.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-gray-100">
                    <th className="py-4 px-6 text-xs font-bold text-gray-400 tracking-wider">NAME</th>
                    <th className="py-4 px-6 text-xs font-bold text-gray-400 tracking-wider">EMAIL</th>
                    <th className="py-4 px-6 text-xs font-bold text-gray-400 tracking-wider">ROLE</th>
                    <th className="py-4 px-6 text-xs font-bold text-gray-400 tracking-wider">PASSWORD</th>
                    <th className="py-4 px-6 text-xs font-bold text-gray-400 tracking-wider">ENROLLMENT CODE</th>
                    <th className="py-4 px-6 text-xs font-bold text-gray-400 tracking-wider">COPY</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {createdAccounts.map((a, idx) => (
                    <tr key={a.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-4 px-6"><p className="text-sm font-bold text-gray-900">{a.name}</p></td>
                      <td className="py-4 px-6"><span className="text-sm text-gray-500">{a.email}</span></td>
                      <td className="py-4 px-6">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium border ${
                          a.role === 'student' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                          a.role === 'teacher' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                          a.role === 'parent' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                          'bg-amber-50 text-amber-700 border-amber-200'
                        }`}>{a.role}</span>
                      </td>
                      <td className="py-4 px-6">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-mono bg-gray-100 text-gray-700">{a.plain_password}</span>
                      </td>
                      <td className="py-4 px-6">
                        {a.enrollment_code ? (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold bg-accent-50 text-accent-700">{a.enrollment_code}</span>
                        ) : <span className="text-xs text-gray-400">—</span>}
                      </td>
                      <td className="py-4 px-6">
                        <button onClick={() => {
                          const text = `Name: ${a.name}\nEmail: ${a.email}\nPassword: ${a.plain_password}${a.enrollment_code ? `\nEnrollment Code: ${a.enrollment_code}` : ''}`
                          copyToClipboard(text, idx)
                        }} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors">
                          {copiedIndex === idx ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {errors.length > 0 && (
            <div className="p-4 border-t border-gray-100 bg-amber-50/50">
              <div className="flex items-center gap-2 text-amber-700 font-medium mb-2">
                <AlertTriangle className="w-4 h-4" /><span className="text-sm">Notices ({errors.length})</span>
              </div>
              <ul className="text-sm text-amber-600 space-y-1">
                {errors.map((err, idx) => <li key={idx}>{err}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Single Account Creation Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Create Single Account</h2>
              <button onClick={() => { setShowCreateModal(false); setSingleResult(null) }} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {singleResult ? (
              <div className="space-y-4">
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-center">
                  <Check className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                  <p className="text-emerald-700 font-bold">Account Created!</p>
                  <p className="text-emerald-600 text-sm mt-1">{singleResult.name}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-gray-500">Email:</span><span className="font-medium">{singleResult.email}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Password:</span><span className="font-mono font-medium">{formData.password}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Role:</span><span className="font-medium capitalize">{singleResult.role}</span></div>
                  {singleResult.enrollment_code && (
                    <div className="flex justify-between"><span className="text-gray-500">Enrollment Code:</span><span className="font-bold text-accent-600">{singleResult.enrollment_code}</span></div>
                  )}
                </div>
                <button onClick={() => { setShowCreateModal(false); setSingleResult(null) }} className="w-full px-4 py-2.5 bg-emerald-500 text-white rounded-xl text-sm font-medium hover:bg-emerald-600 transition-colors">
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleCreateSingle} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                  <input type="text" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full px-4 py-2 border border-gray-200 rounded-xl text-sm focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 outline-none" placeholder="Juan dela Cruz" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input type="email" required value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="w-full px-4 py-2 border border-gray-200 rounded-xl text-sm focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 outline-none" placeholder="juan@example.com" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                  <input type="password" required minLength={8} value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} className="w-full px-4 py-2 border border-gray-200 rounded-xl text-sm focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 outline-none" placeholder="Min. 8 characters" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                  <select value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value })} className="w-full px-4 py-2 border border-gray-200 rounded-xl text-sm focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 outline-none">
                    <option value="student">Student</option>
                    <option value="teacher">Teacher</option>
                    <option value="parent">Parent</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>

                {singleError && <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-sm text-rose-600">{singleError}</div>}

                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={() => { setShowCreateModal(false); setSingleResult(null) }} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">Cancel</button>
                  <button type="submit" disabled={saving} className="flex-1 px-4 py-2.5 bg-emerald-500 text-white rounded-xl text-sm font-medium hover:bg-emerald-600 transition-colors disabled:opacity-50">
                    {saving ? 'Creating...' : 'Create Account'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  )
}