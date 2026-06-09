import nodemailer from 'nodemailer';

function createTransport() {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT ?? '587', 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    // Fallback: log to console in dev/preview environments
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
}

export async function sendInvitationEmail({
  to,
  inviteUrl,
  invitedBy,
  workspaceName,
}: {
  to: string;
  inviteUrl: string;
  invitedBy: string;
  workspaceName?: string;
}) {
  const from = process.env.SMTP_FROM ?? process.env.SMTP_USER ?? 'noreply@example.com';
  const appName = 'Simulateur SEO';

  const workspaceLine = workspaceName
    ? `<p style="color:#555;">Vous aurez accès à l'espace : <strong>${workspaceName}</strong></p>`
    : '';

  const html = `
    <div style="font-family:Inter,sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;background:#f9f7f4;border-radius:12px;">
      <div style="text-align:center;margin-bottom:28px;">
        <span style="font-size:22px;font-weight:800;color:#1a2e25;">${appName}</span>
      </div>
      <h2 style="font-size:18px;color:#1a2e25;margin-bottom:12px;">Vous avez été invité(e)</h2>
      <p style="color:#555;line-height:1.6;"><strong>${invitedBy}</strong> vous invite à rejoindre ${appName}.</p>
      ${workspaceLine}
      <p style="color:#555;line-height:1.6;">Cliquez sur le bouton ci-dessous pour choisir votre mot de passe et activer votre compte. Ce lien est valable <strong>7 jours</strong>.</p>
      <div style="text-align:center;margin:28px 0;">
        <a href="${inviteUrl}" style="background:#e8571a;color:#fff;padding:14px 28px;border-radius:8px;font-weight:700;font-size:15px;text-decoration:none;display:inline-block;">
          Activer mon compte →
        </a>
      </div>
      <p style="color:#aaa;font-size:12px;text-align:center;">Si vous n'attendiez pas cette invitation, vous pouvez ignorer cet email.</p>
    </div>
  `;

  const text = `Vous avez été invité(e) à rejoindre ${appName} par ${invitedBy}.\n\nActivez votre compte ici : ${inviteUrl}\n\nCe lien expire dans 7 jours.`;

  const transport = createTransport();
  if (!transport) {
    // Dev mode: print to console
    console.log('\n=== INVITATION EMAIL (dev/no SMTP) ===');
    console.log(`To: ${to}`);
    console.log(`Invite URL: ${inviteUrl}`);
    console.log('======================================\n');
    return;
  }

  await transport.sendMail({
    from,
    to,
    subject: `Votre invitation à ${appName}`,
    html,
    text,
  });
}
