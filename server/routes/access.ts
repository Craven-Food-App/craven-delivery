import { Router } from 'express';
import { z } from 'zod';
import { sendDocEmail } from '../mailer.js';

const r = Router();

const Schema = z.object({
  employee_email: z.string().email(),
  employee_name: z.string(),
  pin: z.string().optional(),
  portals: z.array(z.string()).default([]),
  hub_url: z.string().url(),
  auth_url: z.string().url(),
});

r.post('/portal-email', async (req, res) => {
  try {
    const { employee_email, employee_name, pin, portals, hub_url, auth_url } = Schema.parse(req.body);

    const html = `
      <div style="font-family:Arial,sans-serif;color:#111">
        <h2 style="color:#ff7a45;margin:0 0 8px">Crave'n Portal Access</h2>
        <p>Hi ${employee_name},</p>
        <p>Your company portal access details are below:</p>
        <ul>
          <li><strong>Business Login:</strong> <a href="${auth_url}">${auth_url}</a></li>
          <li><strong>Main Hub:</strong> <a href="${hub_url}">${hub_url}</a></li>
          <li><strong>PIN:</strong> ${pin || 'Please request your PIN from HR'}</li>
          <li><strong>Portals:</strong> ${portals.length ? portals.join(', ') : 'None assigned yet'}</li>
        </ul>
        <p>Please sign in with your company email and your password, then enter your PIN at the Hub.</p>
        <p>— Crave'n IT</p>
      </div>
    `;

    await sendDocEmail(employee_email, "Crave'n Portal Access", html);

    res.json({ ok: true });
  } catch (e: any) {
    res.status(400).json({ ok: false, error: e.message });
  }
});

export default r;




