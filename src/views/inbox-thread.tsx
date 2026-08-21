'use client'

import { useEffect, useState, useRef } from 'react'
import { useStore } from '@/lib/store'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { ChevronLeft, Send, ShieldCheck, Loader2 } from 'lucide-react'
import { io, Socket } from 'socket.io-client'

export function InboxThreadPage({ conversationId }: { conversationId: string }) {
  const { user, setView } = useStore()
  const [messages, setMessages] = useState<any[]>([])
  const [conversation, setConversation] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const socketRef = useRef<Socket | null>(null)

  const reload = async (scroll = true) => {
    const { data } = await api<{ messages: any[]; conversation: any }>(`/api/messages/history?conversationId=${conversationId}`)
    if (data?.messages) setMessages(data.messages)
    if (data?.conversation) setConversation(data.conversation)
    setLoading(false)
    if (scroll) setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
  }

  useEffect(() => {
    if (!user) return
    reload()

    // See inbox.tsx for why this is optional — falls back to polling if no
    // chat socket service URL is configured.
    const socketUrl = process.env.NEXT_PUBLIC_CHAT_SOCKET_URL
    if (socketUrl) {
      const socket = io(socketUrl, { transports: ['websocket', 'polling'] })
      socketRef.current = socket
      socket.on('connect', () => {
        socket.emit('identify', { userId: user.id })
      })
      socket.on('new-message', (payload: any) => {
        if (payload.conversationId === conversationId) reload(false)
      })
      socket.on('admin-broadcast', () => reload(false))

      return () => {
        socket.disconnect()
        socketRef.current = null
      }
    }

    const pollId = setInterval(() => reload(false), 8000)
    return () => clearInterval(pollId)
  }, [conversationId, user])

  const send = async () => {
    if (!draft.trim() || !user) return
    setSending(true)
    const body = draft.trim()
    setDraft('')
    // Optimistic
    const optimistic = { id: 'tmp-' + Date.now(), body, senderId: user.id, sender: { id: user.id, fullName: user.fullName, profilePicture: user.profilePicture, isAdmin: user.isAdmin }, createdAt: new Date().toISOString() }
    setMessages((m) => [...m, optimistic])
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)

    const { data, error } = await api('/api/messages/send', { method: 'POST', body: { conversationId, body } })
    setSending(false)
    if (error) {
      setMessages((m) => m.filter((x) => x.id !== optimistic.id))
      setDraft(body)
      alert(error)
      return
    }
    // Emit to socket so the other party (if online) gets a push
    if (conversation) {
      const otherUserId = conversation.participantAId === user.id ? conversation.participantBId : conversation.participantAId
      socketRef.current?.emit('send-message', {
        toUserId: otherUserId,
        fromUserId: user.id,
        fromName: user.fullName,
        fromPicture: user.profilePicture,
        conversationId,
        body,
        createdAt: new Date().toISOString(),
      })
    }
    reload(false)
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-3">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (!conversation) {
    return <div className="max-w-3xl mx-auto px-4 py-16 text-center">Conversation not found.</div>
  }

  const otherParty = conversation.participantAId === user?.id ? conversation.participantB : conversation.participantA
  const isAdminConv = conversation.type === 'admin_direct'

  return (
    <div className="max-w-3xl mx-auto px-3 sm:px-4 py-4 flex flex-col h-[calc(100vh-8rem)]">
      {/* Header */}
      <div className="bg-card border rounded-t-lg p-3 flex items-center gap-3">
        <button onClick={() => setView({ name: 'inbox' })} className="p-1 hover:bg-muted rounded">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <Avatar className="w-10 h-10">
          <AvatarImage src={otherParty?.profilePicture || undefined} />
          <AvatarFallback>{isAdminConv ? <ShieldCheck className="w-5 h-5 text-primary" /> : otherParty?.fullName?.charAt(0)}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-bold text-sm truncate">
              {isAdminConv ? 'UNI MART Admin' : otherParty?.fullName}
            </p>
            {isAdminConv && <Badge variant="secondary" className="text-[10px]">Admin</Badge>}
          </div>
          <p className="text-xs text-muted-foreground truncate">
            {isAdminConv ? 'Official marketplace communications' : (otherParty?.department ? `${otherParty.department} · ${otherParty.level} Level` : '')}
          </p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto scrollbar-thin bg-muted/30 border-x p-3 space-y-2 min-h-0">
        {messages.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-8">No messages yet. Say hello!</p>
        )}
        {messages.map((m) => {
          const mine = m.senderId === user?.id
          return (
            <div key={m.id} className={`flex gap-2 ${mine ? 'flex-row-reverse' : ''}`}>
              {!mine && (
                <Avatar className="w-7 h-7 shrink-0">
                  <AvatarImage src={m.sender?.profilePicture || undefined} />
                  <AvatarFallback className="text-xs">
                    {m.sender?.isAdmin ? <ShieldCheck className="w-3.5 h-3.5 text-primary" /> : m.sender?.fullName?.charAt(0)}
                  </AvatarFallback>
                </Avatar>
              )}
              <div className={`max-w-[75%] ${mine ? 'items-end' : ''} flex flex-col`}>
                <div className={`rounded-lg px-3 py-2 text-sm whitespace-pre-line ${
                  mine
                    ? 'bg-primary text-primary-foreground'
                    : m.sender?.isAdmin
                    ? 'bg-teal-100 dark:bg-teal-950/40 text-foreground border border-teal-300/40'
                    : 'bg-card border'
                }`}>
                  {m.body}
                </div>
                <p className={`text-[10px] text-muted-foreground mt-0.5 ${mine ? 'text-right' : ''}`}>
                  {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Composer */}
      <div className="bg-card border rounded-b-lg p-2 flex gap-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
          placeholder="Type a message…"
          disabled={sending}
        />
        <Button onClick={send} disabled={sending || !draft.trim()}>
          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </Button>
      </div>
      <p className="text-[10px] text-muted-foreground text-center mt-1 flex items-center justify-center gap-1">
        <ShieldCheck className="w-3 h-3" /> Messages here are monitored by the admin for safety.
      </p>
    </div>
  )
}
