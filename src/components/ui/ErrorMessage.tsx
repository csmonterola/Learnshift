export function ErrorMessage({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="rounded-md bg-red-50 border border-red-200 p-4 text-sm text-red-700">
      <p>{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="mt-2 underline text-red-600 hover:text-red-800">
          Try again
        </button>
      )}
    </div>
  )
}
