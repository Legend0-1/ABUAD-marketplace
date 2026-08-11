import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/session'

// Upload media (image/video/audio) as a base64 data URL.
// Frontend sends { type, dataUrl } and we just validate & echo back.
// We persist data URLs directly in the DB (small enough for a campus demo).
export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { type, dataUrl } = body
  if (!type || !dataUrl) return NextResponse.json({ error: 'Missing type or dataUrl' }, { status: 400 })
  if (!['image', 'video', 'audio'].includes(type)) {
    return NextResponse.json({ error: 'Invalid media type' }, { status: 400 })
  }

  // Validate data URL format
  if (!dataUrl.startsWith('data:')) {
    return NextResponse.json({ error: 'Invalid data URL' }, { status: 400 })
  }

  // Size cap: 8MB for images, 25MB for video/audio (data URL overhead included)
  const sizeBytes = Math.ceil((dataUrl.length - dataUrl.indexOf(',') - 1) * 0.75)
  const cap = type === 'image' ? 8 * 1024 * 1024 : 25 * 1024 * 1024
  if (sizeBytes > cap) {
    return NextResponse.json({ error: `File too large (max ${cap / 1024 / 1024}MB)` }, { status: 413 })
  }

  return NextResponse.json({ url: dataUrl, type, sizeBytes })
}
