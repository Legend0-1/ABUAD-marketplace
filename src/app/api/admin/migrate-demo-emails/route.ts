import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/session'
import { logAudit } from '@/lib/audit'

// Known demo/seed accounts created under the old ABUAD-branded email scheme,
// before the university-name removal. This is a one-time, hand-written
// mapping -- not a general "rename anyone's email" tool -- specifically to
// bring already-seeded databases in line with the new seed code.
const EMAIL_MIGRATIONS: { oldEmail: string; newEmail: string }[] = [
  { oldEmail: 'admin@abuad.marketplace', newEmail: 'admin@unimart.ng' },
  { oldEmail: 'chioma.okafor@abuad.edu.ng', newEmail: 'chioma.okafor@student.unimart.ng' },
  { oldEmail: 'tunde.bello@abuad.edu.ng', newEmail: 'tunde.bello@student.unimart.ng' },
  { oldEmail: 'amina.yusuf@abuad.edu.ng', newEmail: 'amina.yusuf@student.unimart.ng' },
  { oldEmail: 'david.adebayo@abuad.edu.ng', newEmail: 'david.adebayo@student.unimart.ng' },
]

export async function POST() {
  let admin
  try {
    admin = await requireAdmin()
  } catch {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 })
  }

  const results: { oldEmail: string; newEmail: string; status: string }[] = []

  for (const { oldEmail, newEmail } of EMAIL_MIGRATIONS) {
    const existingOld = await db.user.findUnique({ where: { email: oldEmail } })
    if (!existingOld) {
      results.push({ oldEmail, newEmail, status: 'skipped — old email not found (already migrated, or never existed here)' })
      continue
    }
    const existingNew = await db.user.findUnique({ where: { email: newEmail } })
    if (existingNew) {
      results.push({ oldEmail, newEmail, status: 'skipped — an account with the new email already exists (would collide)' })
      continue
    }

    await db.user.update({ where: { id: existingOld.id }, data: { email: newEmail } })
    results.push({ oldEmail, newEmail, status: 'updated' })
  }

  const updatedCount = results.filter((r) => r.status === 'updated').length
  await logAudit({
    actor: admin,
    action: 'admin.migrate_demo_emails',
    detail: `${updatedCount} of ${EMAIL_MIGRATIONS.length} demo account emails updated`,
  })

  return NextResponse.json({ results })
}
