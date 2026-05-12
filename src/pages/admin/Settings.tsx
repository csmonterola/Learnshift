import React from 'react'
import { Settings as SettingsIcon } from 'lucide-react'

export function AdminSettings() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center py-20">
      <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mb-4">
        <SettingsIcon className="w-8 h-8 text-emerald-500" />
      </div>
      <h1 className="text-2xl font-extrabold text-gray-900 mb-2">Settings</h1>
      <p className="text-gray-500 max-w-md">
        System configuration and preferences will be available here.
      </p>
    </div>
  )
}
