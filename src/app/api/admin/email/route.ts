import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/session'
import { db } from '@/lib/db'
import { sendEmail, isEmailConfigured } from '@/lib/email'

// Admin sends an email to a user.
//  1. Always records the message as an admin_direct inbox conversation, so the
//     user sees it in-app even when outbound email isn't configured.
//  2. If a real email provider is configured (RESEND_API_KEY set), it ALSO
//     sends the message to the user's real email address. When it isn't, we say
//     so plainly in the response instead of pretending it was sent.
export async function POST(req: NextRequest) {
  let admin
  try {
    admin = await requireAdmin()
  } catch {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 })
  }

  const { userId, subject, body } = await req.json()
  if (!userId || !subject || !body) {
    return NextResponse.json({ error: 'User, subject and body required' }, { status: 400 })
  }

  const target = await db.user.findUnique({
    where: { id: userId },
    select: { email: true, fullName: true },
  })
  if (!target) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  // Always deliver in-app: find or create the admin_direct conversation.
  let conv = await db.conversation.findFirst({
    where: { type: 'admin_direct', participantAId: admin.id, participantBId: userId },
  })
  if (!conv) {
    conv = await db.conversation.create({
      data: { type: 'admin_direct', participantAId: admin.id, participantBId: userId, subject },
    })
  }
  await db.message.create({
    data: {
      conversationId: conv.id,
      senderId: admin.id,
      body: `EMAIL: ${subject}\n\n${body}`,
    },
  })

  // Also send a real email when configured. Plain paragraphs -> HTML.
  const { enabled, usingSandboxSender } = isEmailConfigured()
  let emailNote = 'Outbound email is not configured, so this was delivered to the user\'s in-app inbox only.'
  if (enabled) {
    const html = body
      .split('\n')
      .map((line: string) => (line.trim() ? `<p>${escapeHtml(line)}</p>` : '<br/>'))
      .join('')
    const result: any = await sendEmail({ to: target.email, subject, html })
    if (result?.error) {
      emailNote = 'Saved to the user\'s inbox, but the email provider returned an error — check server logs.'
    } else if (result?.skipped) {
      emailNote = 'Outbound email is not configured, so this was delivered to the user\'s in-app inbox only.'
    } else {
      emailNote = usingSandboxSender
        ? 'Email sent via the Resend sandbox sender (note: the sandbox only delivers to your own verified Resend address — set EMAIL_FROM with a verified domain to reach any user).'
        : `Email sent to ${target.email} and saved to their in-app inbox.`
    }
  }

  return NextResponse.json({ ok: true, message: emailNote })
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
