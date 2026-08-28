import { Resend } from 'resend'
import { logger } from '@/lib/logger'
import { getSettingValue } from '@/lib/queries/app-settings'

async function getFrom(): Promise<string> {
  if (process.env.MAIL_FROM) return process.env.MAIL_FROM
  const name = await getSettingValue('EMAIL_FROM_NAME')
  return `${name} <onboarding@resend.dev>`
}

let client: Resend | null = null
function getClient(): Resend | null {
  if (!process.env.RESEND_API_KEY) return null
  if (!client) client = new Resend(process.env.RESEND_API_KEY)
  return client
}

export async function sendEmail(opts: { to: string; subject: string; html: string }): Promise<boolean> {
  try {
    const c = getClient()
    if (!c) {
      logger.info('email suppressed (no RESEND_API_KEY)', { to: opts.to, subject: opts.subject })
      return true
    }
    await c.emails.send({ from: await getFrom(), to: opts.to, subject: opts.subject, html: opts.html })
    return true
  } catch (e) {
    logger.error('email send failed', { to: opts.to, subject: opts.subject, error: String(e) })
    return false
  }
}

export async function renderEmail(title: string, bodyLines: string[]): Promise<string> {
  const companyName = await getSettingValue('COMPANY_NAME')
  const body = bodyLines.map((l) => `<p style="margin:0 0 12px;color:#333;font-size:14px;">${escapeHtml(l)}</p>`).join('')
  return `<div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px;border:1px solid #eee;border-radius:8px;">
<h2 style="color:#111;font-size:18px;margin:0 0 16px;">${escapeHtml(title)}</h2>${body}
<p style="margin:24px 0 0;color:#999;font-size:12px;">${escapeHtml(companyName)}</p></div>`
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
