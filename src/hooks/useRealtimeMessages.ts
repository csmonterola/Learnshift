import { useEffect, useRef, useCallback } from 'react'
import Pusher from 'pusher-js'
import { useAuth } from '../components/auth/AuthContext'

const PUSHER_KEY = (import.meta as any).env?.VITE_PUSHER_APP_KEY || 'local'
const PUSHER_CLUSTER = (import.meta as any).env?.VITE_PUSHER_APP_CLUSTER || 'mt1'

let pusherInstance: Pusher | null = null

function getPusher(): Pusher {
  if (!pusherInstance) {
    pusherInstance = new Pusher(PUSHER_KEY, {
      cluster: PUSHER_CLUSTER,
      authEndpoint: '/broadcasting/auth',
      forceTLS: false,
      wsHost: window.location.hostname || 'localhost',
      wsPort: 6001,
      wssPort: 6001,
      enabledTransports: ['ws', 'wss'],
    })
  }
  return pusherInstance
}

export function useRealtimeMessages(
  otherUserId: number | null,
  onMessageReceived: (message: any) => void
) {
  const { user } = useAuth()
  const channelRef = useRef<any>(null)

  const subscribe = useCallback(() => {
    if (!user || !otherUserId) return
    const pusher = getPusher()
    const sortedIds = [Number(user.id), Number(otherUserId)].sort((a, b) => a - b)
    const channelName = `messages.${sortedIds[0]}.${sortedIds[1]}`
    const channel = pusher.subscribe(channelName)
    channel.bind('message.sent', (data: any) => {
      onMessageReceived(data)
    })
    channelRef.current = channel
  }, [user, otherUserId, onMessageReceived])

  useEffect(() => {
    if (!user || !otherUserId) return
    subscribe()
    return () => {
      if (channelRef.current) {
        channelRef.current.unbind('message.sent')
        channelRef.current.unsubscribe()
        channelRef.current = null
      }
    }
  }, [user, otherUserId, subscribe])
}