import React from 'react'
import { Grid, Plus, LayoutGrid, Users, UserCheck, Search, GraduationCap, BookOpen, MapPin, Calendar, ChevronDown, Edit2 } from 'lucide-react'

const classes = [
  { id: 1,  grade: 'GRADE 7',  subject: 'Mathematics', name: 'Rizal',     students: 38, maxStudents: 40, percentage: '95%', room: 'Room 101',  schedule: 'MWF • 7:30 AM',  teacherInitials: 'RT', teacherName: 'Roberto Luis Tan',     teacherColor: 'bg-purple-500',  gradient: 'bg-gradient-to-br from-indigo-500 to-blue-500',   progressColor: 'bg-yellow-400' },
  { id: 2,  grade: 'GRADE 7',  subject: 'Science',     name: 'Mabini',    students: 35, maxStudents: 40, percentage: '88%', room: 'Room 204',  schedule: 'TTh • 7:30 AM',  teacherInitials: 'AR', teacherName: 'Ana Cristina Reyes',   teacherColor: 'bg-blue-500',    gradient: 'bg-gradient-to-br from-indigo-500 to-blue-500',   progressColor: 'bg-yellow-400' },
  { id: 3,  grade: 'GRADE 7',  subject: 'English',     name: 'Bonifacio', students: 40, maxStudents: 40, percentage: '100%',room: 'Room 303',  schedule: 'MWF • 9:00 AM',  teacherInitials: 'JR', teacherName: 'James Antonio Rivera', teacherColor: 'bg-emerald-500', gradient: 'bg-gradient-to-br from-indigo-500 to-blue-500',   progressColor: 'bg-red-500' },
  { id: 4,  grade: 'GRADE 7',  subject: 'Filipino',    name: 'Luna',      students: 33, maxStudents: 40, percentage: '83%', room: 'Room 106',  schedule: 'TTh • 9:00 AM',  teacherInitials: 'CC', teacherName: 'Corazon Bien Cruz',    teacherColor: 'bg-orange-500',  gradient: 'bg-gradient-to-br from-indigo-500 to-blue-500',   progressColor: 'bg-emerald-400' },
  { id: 5,  grade: 'GRADE 8',  subject: 'Science',     name: 'Del Pilar', students: 39, maxStudents: 40, percentage: '98%', room: 'Room 205',  schedule: 'MWF • 10:30 AM', teacherInitials: 'ML', teacherName: 'Maria Luisa Santos',   teacherColor: 'bg-pink-500',    gradient: 'bg-gradient-to-br from-purple-500 to-indigo-500', progressColor: 'bg-yellow-400' },
  { id: 6,  grade: 'GRADE 8',  subject: 'History',     name: 'Jacinto',   students: 31, maxStudents: 40, percentage: '78%', room: 'Room 208',  schedule: 'TTh • 10:30 AM', teacherInitials: 'JD', teacherName: 'Juan dela Cruz',       teacherColor: 'bg-indigo-500',  gradient: 'bg-gradient-to-br from-purple-500 to-indigo-500', progressColor: 'bg-emerald-400' },
  { id: 7,  grade: 'GRADE 9',  subject: 'English',     name: 'Silang',    students: 36, maxStudents: 40, percentage: '90%', room: 'Room 301',  schedule: 'MWF • 1:00 PM',  teacherInitials: 'AF', teacherName: 'Ana Patricia Flores',  teacherColor: 'bg-orange-500',  gradient: 'bg-gradient-to-br from-blue-400 to-cyan-500',     progressColor: 'bg-yellow-400' },
  { id: 8,  grade: 'GRADE 9',  subject: 'Mathematics', name: 'Aguinaldo', students: 34, maxStudents: 40, percentage: '85%', room: 'Room 102',  schedule: 'TTh • 1:00 PM',  teacherInitials: 'RT', teacherName: 'Rafael Torres',        teacherColor: 'bg-blue-600',    gradient: 'bg-gradient-to-br from-blue-400 to-cyan-500',     progressColor: 'bg-emerald-400' },
  { id: 9,  grade: 'GRADE 10', subject: 'Filipino',    name: 'Lapu-Lapu', students: 37, maxStudents: 40, percentage: '93%', room: 'Room 401',  schedule: 'MWF • 2:30 PM',  teacherInitials: 'CC', teacherName: 'Corazon Bien Cruz',    teacherColor: 'bg-orange-500',  gradient: 'bg-gradient-to-br from-emerald-400 to-teal-500',  progressColor: 'bg-yellow-400' },
  { id: 10, grade: 'GRADE 10', subject: 'PE & Health', name: 'Bathala',   students: 42, maxStudents: 45, percentage: '93%', room: 'Gymnasium', schedule: 'Fri • 7:30 AM',  teacherInitials: 'PR', teacherName: 'Patricia Lyn Ramos',   teacherColor: 'bg-teal-600',    gradient: 'bg-gradient-to-br from-emerald-400 to-teal-500',  progressColor: 'bg-yellow-400' },
]

export function AdminClassManagement() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500 flex items-center justify-center shadow-sm shadow-emerald-500/20">
            <Grid className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900 mb-1">Class & Section Management</h1>
            <p className="text-gray-500 text-sm">Manage all class sections, assign teachers, and track enrollment.</p>
          </div>
        </div>
        <button className="flex items-center gap-2 px-6 py-3 bg-gradient-to-br from-emerald-400 to-teal-500 text-white rounded-xl font-bold shadow-sm transition-all hover:opacity-90 hover:shadow-md">
          <Plus className="w-5 h-5" />Create New Section
          <ChevronDown className="w-4 h-4 ml-1 opacity-70" />
        </button>
      </div>

      {/* Stats Pills */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-full shadow-sm">
          <LayoutGrid className="w-4 h-4 text-emerald-500" />
          <span className="font-bold text-gray-900">10</span>
          <span className="text-sm text-gray-500">Total Sections</span>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-full shadow-sm">
          <Users className="w-4 h-4 text-accent-500" />
          <span className="font-bold text-gray-900">365</span>
          <span className="text-sm text-gray-500">Total Students</span>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-full shadow-sm">
          <UserCheck className="w-4 h-4 text-emerald-500" />
          <span className="font-bold text-gray-900">7</span>
          <span className="text-sm text-gray-500">Active Teachers</span>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <button className="px-4 py-2 bg-emerald-500 text-white rounded-full text-sm font-bold shadow-sm flex items-center gap-2">
            All Grades <span className="bg-white/20 px-1.5 py-0.5 rounded-full text-xs">10</span>
          </button>
          {['Grade 7', 'Grade 8', 'Grade 9', 'Grade 10'].map((grade, idx) => (
            <button key={grade} className="px-4 py-2 bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 rounded-full text-sm font-medium shadow-sm flex items-center gap-2 transition-colors">
              {grade}
              <span className="bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full text-xs border border-gray-200">{idx === 0 ? '4' : '2'}</span>
            </button>
          ))}
        </div>
        <div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search sections..."
            className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all shadow-sm"
          />
        </div>
      </div>

      {/* Class Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {classes.map((cls) => (
          <div key={cls.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col hover:shadow-md transition-shadow">
            <div className="bg-gradient-to-br from-emerald-400 to-teal-500 p-5 text-white">
              <div className="flex items-center justify-between mb-4">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/20 text-xs font-bold backdrop-blur-sm">
                  <GraduationCap className="w-3.5 h-3.5" />{cls.grade}
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-white/30 text-xs font-medium backdrop-blur-sm">
                  <BookOpen className="w-3.5 h-3.5" />{cls.subject}
                </span>
              </div>
              <h3 className="text-2xl font-black text-white mb-4">{cls.name}</h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm font-medium">
                  <div className="flex items-center gap-1.5">
                    <Users className="w-4 h-4 opacity-80" />
                    <span>{cls.students} / {cls.maxStudents} students</span>
                  </div>
                  <span>{cls.percentage}</span>
                </div>
                <div className="h-1.5 w-full bg-black/20 rounded-full overflow-hidden">
                  <div className={`h-full ${cls.progressColor} rounded-full`} style={{ width: cls.percentage }} />
                </div>
              </div>
            </div>

            <div className="p-5 flex-1 flex flex-col">
              <div className="flex items-center gap-4 text-sm text-gray-500 mb-6">
                <div className="flex items-center gap-1.5"><MapPin className="w-4 h-4" />{cls.room}</div>
                <div className="flex items-center gap-1.5"><Calendar className="w-4 h-4" />{cls.schedule}</div>
              </div>
              <div className="mt-auto space-y-4">
                <div>
                  <p className="text-[10px] font-bold text-gray-400 tracking-wider mb-2 uppercase">Assigned Teacher</p>
                  <button className="w-full flex items-center justify-between px-3 py-2 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-2">
                      <div className={`w-6 h-6 rounded-full ${cls.teacherColor} text-white flex items-center justify-center text-[10px] font-bold`}>
                        {cls.teacherInitials}
                      </div>
                      <span className="text-sm font-bold text-gray-700">{cls.teacherName}</span>
                    </div>
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  </button>
                </div>
                <button className="w-full flex items-center justify-center gap-2 py-2.5 border border-indigo-100 text-indigo-600 rounded-xl text-sm font-bold hover:bg-indigo-50 transition-colors">
                  <Edit2 className="w-4 h-4" />Edit Class
                </button>
              </div>
            </div>
          </div>
        ))}

        {/* Add New */}
        <button className="bg-gray-50/50 rounded-2xl border-2 border-dashed border-gray-200 p-6 flex flex-col items-center justify-center text-center hover:border-emerald-400 hover:bg-emerald-50/30 transition-colors group min-h-[380px]">
          <div className="w-12 h-12 rounded-full bg-white border border-gray-200 flex items-center justify-center mb-4 group-hover:border-emerald-300 group-hover:shadow-sm transition-all">
            <Plus className="w-6 h-6 text-gray-400 group-hover:text-emerald-500" />
          </div>
          <h3 className="text-lg font-bold text-gray-600 group-hover:text-emerald-600 transition-colors">Add New Section</h3>
          <p className="text-sm text-gray-400 mt-1">Click to create</p>
        </button>
      </div>
    </div>
  )
}
