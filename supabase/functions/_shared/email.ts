export async function sendEmail({ to, subject, text }: { to: string, subject: string, text: string }) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${Deno.env.get('RESEND_API_KEY')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: `Skills Matrix <noreply@${Deno.env.get('EMAIL_FROM_DOMAIN') ?? 'skillsmatrix.app'}>`,
      to,
      subject,
      text,
    }),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Email failed: ${err}`)
  }
}
