import { findUser, getUsers, setSessionCookie } from './_lib/auth.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!process.env.AUTH_SECRET || getUsers().length === 0) {
    return res.status(500).json({ error: 'Auth is not configured on the server.' });
  }

  const { email, password } = req.body || {};
  const user = findUser(email, password);

  if (!user) {
    return res.status(401).json({ error: 'Invalid email or password.' });
  }

  setSessionCookie(req, res, user);
  return res.status(200).json({ ok: true, name: user.name || null });
}
