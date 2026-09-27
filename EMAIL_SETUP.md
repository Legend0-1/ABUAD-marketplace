# Email Setup Guide (UNI MART)

If you registered with a temp-mail address and no verification email arrived, this is why — and here's how to turn real email on.

## Why no email arrives right now

Email in this app is **optional infrastructure**. If the `RESEND_API_KEY` environment variable isn't set, every email send is **silently skipped** (it's only logged to the server console). Nothing breaks — orders, registration, and password changes all still work — but no message actually leaves the server.

There are three possible states, and the **admin dashboard → Overview tab** now shows you which one you're in:

| State | What it means |
|-------|---------------|
| **OFF** (red) | `RESEND_API_KEY` is not set. No emails are sent at all. |
| **ON — sandbox** (green) | Key is set, but you're using Resend's shared sender `onboarding@resend.dev`. This **only delivers to your own verified Resend address** — real users (and temp-mail) get nothing. |
| **ON** (green) | Key is set *and* you've set `EMAIL_FROM` to an address on a domain you verified in Resend. Real delivery to anyone. |

Two extra gotchas worth knowing:

- **Temp-mail services** (temp-mail.org, 10minutemail, etc.) frequently **drop transactional email** or block unknown senders. Even with everything configured correctly, a disposable inbox may show nothing. Test with a real Gmail/Outlook address.
- New accounts are **held for admin approval** anyway (`isApproved = false`). Verification email or not, a user can't log in until an admin approves them under **Admin → Approvals**.

## Turn real email on (Resend)

Resend is the provider already wired into the code. Free tier covers a small marketplace.

1. **Create an account** at https://resend.com and confirm your own email.
2. **Add an API key**: Resend dashboard → *API Keys* → *Create API Key* (read/send is enough). Copy it — you only see it once.
3. **Verify a sending domain**: Resend dashboard → *Domains* → *Add Domain*. Enter a domain you control (e.g. `unimart.com.ng`). Resend gives you DNS records (SPF/`TXT` and DKIM/`CNAME`) — add them at your domain registrar. Verification usually completes in a few minutes to a few hours.
   - No domain yet? You can skip this to test, but you'll be in **sandbox mode** and only your own verified Resend address will receive mail.
4. **Set the environment variables** (see below).
5. **Redeploy / restart** so the new env vars load, then check **Admin → Overview** — the email banner should turn green and say real delivery is on.

## Environment variables

Add these to your host's environment (Vercel → *Project → Settings → Environment Variables*, or your `.env` locally). They're already documented in `.env.example`.

```bash
# Required for any real email to send:
RESEND_API_KEY="re_xxxxxxxxxxxxxxxxxxxxxxxx"

# The "from" address. MUST be on a domain you verified in Resend.
# Until you set this to a verified domain, you're in sandbox mode.
EMAIL_FROM="UNI MART <no-reply@yourdomain.com>"

# Used to build links inside emails (verify, reset, order, etc.).
# Set this to your real deployed URL or links in emails will be broken.
NEXT_PUBLIC_APP_URL="https://your-app.vercel.app"
```

That's it. Once `RESEND_API_KEY` is set with a verified `EMAIL_FROM`, all of these start sending automatically:

- Email verification on registration
- "Registration received / pending approval"
- Account approved / rejected (from Admin → Approvals)
- New-order alerts to sellers
- Password reset links
- Admin → Users → **Send email** (now delivers a real email *and* drops a copy in the user's in-app inbox)

## Quick troubleshooting

- **Banner still red after setting the key?** The app reads env vars at startup — redeploy or restart the server.
- **Green "sandbox" banner, users get nothing?** Set `EMAIL_FROM` to a verified-domain address; the sandbox sender only reaches your own Resend address.
- **Real address still gets nothing?** Check the Resend dashboard → *Emails* log for the delivery status, and check spam. Confirm your domain shows "Verified" under *Domains*.
- **Links in emails 404 or point at localhost?** Set `NEXT_PUBLIC_APP_URL` to the deployed URL.
