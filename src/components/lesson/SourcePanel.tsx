import React, { useCallback, useEffect, useRef, useState } from 'react'
import { AlertTriangle, Loader2, Paperclip } from 'lucide-react'
import { studentApi } from '../../lib/api'

// ── Types ──────────────────────────────────────────────────────────
export interface Material {
  id: number
  title: string
  file_name: string
  file_type: string
  file_size?: number
  file_url?: string
  file_path: string
  ingestion_status?: 'none' | 'pending' | 'processing' | 'indexed' | 'failed'
  ai_sync?: boolean
}

export interface SourcePanelProps {
  lessonId: number
  classId: number
  topicId: number
  selectedMaterialIds: Set<number>
  onSelectionChange: (ids: Set<number>) => void
  onMaterialsLoaded?: (materials: Material[]) => void
}

// ── Helpers ────────────────────────────────────────────────────────
function StatusIndicator({ status }: { status?: Material['ingestion_status'] }) {
  if (status === 'indexed') {
    return (
      <span
        className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0"
        aria-label="Indexed"
        title="Indexed — ready for AI"
      />
    )
  }
  if (status === 'pending' || status === 'processing') {
    return (
      <span
        className="w-2.5 h-2.5 rounded-full bg-gray-400 animate-pulse shrink-0"
        aria-label={status === 'pending' ? 'Pending ingestion' : 'Processing'}
        title={status === 'pending' ? 'Pending ingestion…' : 'Processing…'}
      />
    )
  }
  // 'failed' | 'none' | undefined
  return (
    <span
      className="w-3.5 h-3.5 text-yellow-500 shrink-0 flex items-center justify-center"
      aria-label="Not available"
      title="Not indexed — not available for AI"
    >
      <AlertTriangle className="w-3.5 h-3.5" />
    </span>
  )
}

// ── Component ──────────────────────────────────────────────────────
export function SourcePanel({
  lessonId,
  classId,
  topicId,
  selectedMaterialIds,
  onSelectionChange,
  onMaterialsLoaded,
}: SourcePanelProps) {
  const [materials, setMaterials] = useState<Material[]>([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState<string | null>(null)

  // Keep a ref to latest selectedMaterialIds for use inside the polling callback
  // without adding it as a dependency of the effect.
  const selectedRef = useRef(selectedMaterialIds)
  useEffect(() => {
    selectedRef.current = selectedMaterialIds
  })

  // Keep a ref to the latest onSelectionChange too
  const onSelectionChangeRef = useRef(onSelectionChange)
  useEffect(() => {
    onSelectionChangeRef.current = onSelectionChange
  })

  // Keep a ref to the latest onMaterialsLoaded
  const onMaterialsLoadedRef = useRef(onMaterialsLoaded)
  useEffect(() => {
    onMaterialsLoadedRef.current = onMaterialsLoaded
  })

  const fetchMaterials = useCallback(async () => {
    try {
      const res = await studentApi.lesson(classId, topicId, lessonId)

      // The lesson endpoint returns { materials: [...], links: [...], ...lessonFields }
      const fetched: Material[] = (res.data?.materials ?? []).filter(
        (m: Material) => m.file_type !== 'LINK',
      )

      setMaterials(fetched)
      setError(null)
      onMaterialsLoadedRef.current?.(fetched)

      // Auto-deselect materials that are no longer 'indexed'
      const currentSelected = selectedRef.current
      if (currentSelected.size > 0) {
        const stillIndexed = new Set(
          fetched
            .filter((m) => m.ingestion_status === 'indexed')
            .map((m) => m.id),
        )
        const pruned = new Set<number>()
        currentSelected.forEach((id) => {
          if (stillIndexed.has(id)) pruned.add(id)
        })
        if (pruned.size !== currentSelected.size) {
          onSelectionChangeRef.current(pruned)
        }
      }
    } catch {
      setError('Failed to load materials.')
    } finally {
      setLoading(false)
    }
  }, [classId, topicId, lessonId])

  // Mount: fetch immediately, then poll every 30 s
  useEffect(() => {
    fetchMaterials()
    const intervalId = setInterval(fetchMaterials, 30_000)
    return () => clearInterval(intervalId)
  }, [fetchMaterials])

  // ── Derived state ──────────────────────────────────────────────
  const indexedMaterials   = materials.filter((m) => m.ingestion_status === 'indexed')
  const totalIndexed       = indexedMaterials.length
  const selectedCount      = [...selectedMaterialIds].filter((id) =>
    indexedMaterials.some((m) => m.id === id),
  ).length

  // ── Handlers ───────────────────────────────────────────────────
  function toggleMaterial(id: number) {
    const next = new Set(selectedMaterialIds)
    if (next.has(id)) {
      next.delete(id)
    } else {
      next.add(id)
    }
    onSelectionChange(next)
  }

  // ── Render ─────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between shrink-0">
        <h2 className="text-sm font-bold text-gray-700">Sources</h2>
        <Paperclip className="w-4 h-4 text-gray-400" />
      </div>

      {/* Count badge */}
      <div className="px-4 py-2 border-b border-gray-100 shrink-0">
        {selectedCount === 0 ? (
          <span className="text-xs text-gray-400 font-medium">Using all sources</span>
        ) : (
          <span className="text-xs text-emerald-600 font-semibold">
            {selectedCount} of {totalIndexed} selected
          </span>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {loading && (
          <div className="flex items-center justify-center py-8 gap-2 text-gray-400">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-xs">Loading materials…</span>
          </div>
        )}

        {!loading && error && (
          <p className="text-xs text-red-500 text-center py-4">{error}</p>
        )}

        {!loading && !error && materials.length === 0 && (
          <div className="text-center py-8">
            <Paperclip className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-xs text-gray-400">No materials uploaded yet.</p>
          </div>
        )}

        {!loading &&
          !error &&
          materials.map((m) => {
            const isIndexed  = m.ingestion_status === 'indexed'
            const isChecked  = selectedMaterialIds.has(m.id)
            const isDisabled = !isIndexed

            return (
              <label
                key={m.id}
                className={[
                  'flex items-start gap-2.5 bg-white rounded-xl p-3 border transition-all',
                  isDisabled
                    ? 'border-gray-100 opacity-60 cursor-not-allowed'
                    : 'border-gray-200 hover:border-emerald-300 hover:shadow-sm cursor-pointer',
                  isChecked && !isDisabled
                    ? 'border-emerald-400 bg-emerald-50/40'
                    : '',
                ].join(' ')}
              >
                {/* Checkbox */}
                <input
                  type="checkbox"
                  checked={isChecked}
                  disabled={isDisabled}
                  onChange={() => !isDisabled && toggleMaterial(m.id)}
                  className={[
                    'mt-0.5 rounded accent-emerald-500 shrink-0',
                    isDisabled ? 'cursor-not-allowed' : 'cursor-pointer',
                  ].join(' ')}
                  aria-label={`Select ${m.title || m.file_name}`}
                />

                {/* Text info */}
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-gray-800 truncate leading-tight">
                    {m.title || m.file_name}
                  </p>
                  <p className="text-xs text-gray-400 uppercase mt-0.5">
                    {m.file_type}
                    {m.file_size ? ` · ${formatBytes(m.file_size)}` : ''}
                  </p>
                </div>

                {/* Status indicator */}
                <div className="mt-0.5">
                  <StatusIndicator status={m.ingestion_status} />
                </div>
              </label>
            )
          })}
      </div>
    </div>
  )
}

// ── Utility ────────────────────────────────────────────────────────
function formatBytes(bytes?: number): string {
  if (!bytes) return ''
  if (bytes < 1_048_576) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1_048_576).toFixed(1)} MB`
}

export default SourcePanel
