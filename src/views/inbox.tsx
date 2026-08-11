'use client'

import { useEffect, useState, useRef } from 'react'
import { useStore } from '@/lib/store'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { MessageSquare, Search, ShieldCheck, Send, Inbox as InboxIcon, ChevronRight, X } from 'lucide-react'
import { io, Socket } from 'socket.io-client'

export function InboxPage() {
  const { user, setView, setAuthModalOpen } = useStore()
  const [conversations, setConversations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [newChatUserId, setNewChatUserId] = useState('')
  const socketRef = useRef<Socket | null>(null)

  const reload = async () => {
    setLoading(true)
    const { data } = await api<{ conversations: any[] }>('/api/messages/conversations')
    if (data?.conversations) setConversations(data.conversations)
    setLoading(false)
  }

  useEffect(() => {
    if (!user) { setAuthModalOpen(true); return }
    reload()

    // Realtime updates: only connect if a chat socket service URL is configured
    // (see mini-services/chat-service — it needs to run as its own always-on
    // server, e.g. on Railway/Render, since Vercel functions can't hold a
    // persistent websocket connection). Without it, we fall back to polling.
    const socketUrl = process.env.NEXT_PUBLIC_CHAT_SOCKET_URL
    if (socketUrl) {
      const socket = io(socketUrl, { transports: ['websocket', 'polling'] })
      socketRef.current = socket
      socket.on('connect', () => {
        socket.emit('identify', { userId: user.id })
      })
      socket.on('new-message', () => reload())
      socket.on('admin-broadcast', () => reload())
      socket.on('order-update', () => reload())

      return () => {
        socket.disconnect()
        socketRef.current = null
      }
    }

    const pollId = setInterval(reload, 15000)
    return () => clearInterval(pollId)
  }, [user, setAuthModalOpen])

  // Mark inbox seen when opened
  useEffect(() => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('abuad_inbox_seen', String(Date.now()))
    }
  }, [])

  const filtered = conversations.filter((c) => {
    if (!search) return true
    const name = c.otherParty?.fullName || 'Admin'
    return name.toLowerCase().includes(search.toLowerCase()) || (c.subject || '').toLowerCase().includes(search.toLowerCase())
  })

  const startChat = async () => {
    if (!newChatUserId.trim()) return
    const { data, error } = await api('/api/messages/conversations', {
      method: 'POST',
      body: { otherUserId: newChatUserId.trim(), body: 'Hi! I wanted to reach out.' },
    })
    if (error) { alert(error); return }
    setNewChatUserId('')
    setView({ name: 'inboxThread', conversationId: data.conversationId })
  }

  if (!user) {
    return <div className="max-w-3xl mx-auto px-4 py-16 text-center text-muted-foreground">Please sign in.</div>
  }

  return (
    <div className="max-w-3xl mx-auto px-3 sm:px-4 py-6">
      <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
        <button onClick={() => setView({ name: 'home' })} className="hover:text-primary">Home</button>
        <ChevronRight className="w-3 h-3" />
        <span className="text-foreground font-medium">Inbox</span>
      </div>

      <div className="flex items-center justify-between mb-3">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <InboxIcon className="w-6 h-6 text-primary" /> Inbox
        </h1>
        <Badge variant="outline" className="text-xs">
          <ShieldCheck className="w-3 h-3 mr-1" /> Admin oversight active
        </Badge>
      </div>

      <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-500/30 rounded-lg p-2 mb-3 text-xs text-amber-700 dark:text-amber-400 flex gap-2">
        <ShieldCheck className="w-3.5 h-3.5 shrink-0 mt-0.5" />
        <span>Your conversations are monitored by the admin to keep the platform safe. This is part of the seller agreement you signed.</span>
      </div>

      <div className="flex gap-2 mb-3">
        <Input placeholder="Search conversations…" value={search} onChange={(e) => setSearch(e.target.value)} className="flex-1" />
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 bg-card border rounded-lg">
          <MessageSquare className="w-12 h-12 mx-auto mb-2 text-muted-foreground/40" />
          <p className="font-bold">No conversations yet</p>
          <p className="text-sm text-muted-foreground mb-3">Start chatting when you place an order or message a seller.</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {filtered.map((c) => (
            <button
              key={c.id}
              onClick={() => setView({ name: 'inboxThread', conversationId: c.id })}
              className="w-full bg-card border rounded-lg p-3 flex items-center gap-3 hover:border-primary/40 text-left"
            >
              <Avatar className="w-11 h-11 shrink-0">
                <AvatarImage src={c.otherParty?.profilePicture || undefined} />
                <AvatarFallback>
                  {c.type === 'admin_direct' || c.type === 'broadcast' ? <ShieldCheck className="w-5 h-5 text-primary" /> : (c.otherParty?.fullName?.charAt(0) || '?')}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-bold text-sm truncate">
                    {c.type === 'admin_direct' ? 'ABUAD Admin' : c.otherParty?.fullName || 'Unknown'}
                  </p>
                  {c.type === 'admin_direct' && <Badge variant="secondary" className="text-[10px]">Admin</Badge>}
                  {c.messageCount > 0 && <span className="ml-auto text-xs text-muted-foreground">{c.messageCount} msgs</span>}
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  {c.lastMessage?.body || c.subject || 'No messages yet'}
                </p>
              </div>
              <ChevronRight className="w-4 h-4 shrink-0 text-muted-foreground" />
            </button>
          ))}
        </div>
      )}

      <div className="mt-4 bg-card border rounded-lg p-3">
        <p className="text-xs text-muted-foreground mb-2">Start a new conversation by entering a user ID:</p>
        <div className="flex gap-2">
          <Input placeholder="User ID (cuid)" value={newChatUserId} onChange={(e) => setNewChatUserId(e.target.value)} />
          <Button onClick={startChat}><Send className="w-4 h-4 mr-1" /> Start</Button>
        </div>
      </div>
    </div>
  )
}
