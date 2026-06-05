import { corsHeaders } from '../_shared/cors.ts'
import { getUser } from '../_shared/auth.ts'
import { sendEmail } from '../_shared/email.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const user = await getUser(req)

    const { user_email, user_name, org_name } = await req.json()

    await sendEmail({
      to: user_email,
      subject: `Welcome to Skills Matrix App, ${user_name}!`,
      text: `Hi ${user_name},

Welcome to Skills Matrix App!

Your organisation "${org_name}" is all set up and ready to go.

Here's what you can do next:
- Add your employees to the skills matrix
- Create skill categories and define the skills your team needs
- Set up teams and assign required skills
- Start assessing your team's proficiency levels

Get started: ${req.headers.get('origin') || 'https://skillsmatrixapp.com'}

If you have any questions, reply to this email — we're here to help.

Best,
The Skills Matrix App Team`,
    })

    return new Response(JSON.stringify({ sent: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
