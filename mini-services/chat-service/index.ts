import { createServer } from 'http'
import { Server } from 'socket.io'

const httpServer = createServer()
const io = new Server(httpServer, {
  path: '/',
  cors: { origin: '*', methods: ['GET', 'POST'] },
  pingTimeout: 60000,
  pingInterval: 25000,
})

// Map socket.id -> userId
const socketsByUser = new Map<string, Set<string>>() // userId -> set of socket ids
const userBySocket = new Map<string, string>() // socket.id -> userId

function joinUser(userId: string, socketId: string) {
  if (!socketsByUser.has(userId)) socketsByUser.set(userId, new Set())
  socketsByUser.get(userId)!.add(socketId)
  userBySocket.set(socketId, userId)
}

function leaveSocket(socketId: string) {
  const userId = userBySocket.get(socketId)
  if (userId) {
    const set = socketsByUser.get(userId)
    if (set) {
      set.delete(socketId)
      if (set.size === 0) socketsByUser.delete(userId)
    }
  }
  userBySocket.delete(socketId)
}

function emitToUser(userId: string, event: string, payload: any) {
  const set = socketsByUser.get(userId)
  if (!set) return
  for (const sid of set) {
    io.to(sid).emit(event, payload)
  }
}

io.on('connection', (socket) => {
  console.log(`[chat] connected: ${socket.id}`)

  socket.on('identify', ({ userId }: { userId: string }) => {
    if (!userId) return
    joinUser(userId, socket.id)
    console.log(`[chat] identified ${socket.id} -> ${userId}`)
  })

  socket.on('send-message', (payload: { toUserId: string; fromUserId: string; conversationId: string; body: string; fromName?: string; fromPicture?: string | null; createdAt?: string }) => {
    // Deliver to recipient (if online)
    emitToUser(payload.toUserId, 'new-message', {
      conversationId: payload.conversationId,
      fromUserId: payload.fromUserId,
      fromName: payload.fromName,
      fromPicture: payload.fromPicture,
      body: payload.body,
      createdAt: payload.createdAt || new Date().toISOString(),
    })
  })

  socket.on('admin-broadcast', (payload: { toUserIds: string[]; fromAdminName: string; subject?: string; body: string }) => {
    for (const uid of payload.toUserIds) {
      emitToUser(uid, 'admin-broadcast', {
        fromAdminName: payload.fromAdminName,
        subject: payload.subject,
        body: payload.body,
        createdAt: new Date().toISOString(),
      })
    }
  })

  socket.on('order-update', (payload: { toUserId: string; orderId: string; status: string; reference: string }) => {
    emitToUser(payload.toUserId, 'order-update', payload)
  })

  socket.on('disconnect', () => {
    leaveSocket(socket.id)
    console.log(`[chat] disconnected: ${socket.id}`)
  })

  socket.on('error', (err) => {
    console.error(`[chat] socket error ${socket.id}:`, err)
  })
})

const PORT = Number(process.env.PORT) || 3003
httpServer.listen(PORT, () => {
  console.log(`UNI MART chat WebSocket server running on port ${PORT}`)
})

process.on('SIGTERM', () => {
  httpServer.close(() => process.exit(0))
})
process.on('SIGINT', () => {
  httpServer.close(() => process.exit(0))
})
