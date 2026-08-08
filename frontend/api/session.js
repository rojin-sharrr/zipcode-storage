import { getSession } from './_lib/auth.js';

export default async function handler(req, res) {
  const session = getSession(req);
  return res.status(200).json({ authenticated: !!session, name: session?.name || null });
}
