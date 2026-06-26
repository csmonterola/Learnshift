import { useState, useCallback } from 'react'
import { AxiosError } from 'axios'

interface UseApiRequestState<T> {
  data: T | null
  loading: boolean
  error: string | null
}

interface UseApiRequestReturn<T> extends UseApiRequestState<T> {
  execute: (fn: () => Promise<{ data: T }>) => Promise<T>
}

/**
 * Shared hook for managing async API request state (data, loading, error).
 *
 * Usage:
 *   const { data, loading, error, execute } = useApiRequest<MyType>()
 *
 *   useEffect(() => {
 *     execute(() => someApi.getData())
 *   }, [execute])
 *
 *   if (loading) return <LoadingSpinner />
 *   if (error)   return <ErrorMessage message={error} onRetry={() => execute(() => someApi.getData())} />
 */
export function useApiRequest<T>(): UseApiRequestReturn<T> {
  const [state, setState] = useState<UseApiRequestState<T>>({
    data: null,
    loading: false,
    error: null,
  })

  const execute = useCallback(async (fn: () => Promise<{ data: T }>): Promise<T> => {
    setState({ data: null, loading: true, error: null })

    try {
      const res = await fn()
      setState({ data: res.data, loading: false, error: null })
      return res.data
    } catch (err) {
      const msg =
        err instanceof AxiosError
          ? (err.response?.data?.message ?? err.message)
          : 'An unexpected error occurred.'
      setState({ data: null, loading: false, error: msg })
      throw err
    }
  }, [])

  return { ...state, execute }
}
