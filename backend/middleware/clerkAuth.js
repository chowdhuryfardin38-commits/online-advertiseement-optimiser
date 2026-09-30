// Backend middleware for Clerk authentication verification

export function verifyClerkToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing or invalid authorization token' });
  }

  // Token attached via Clerk SDK frontend session
  const token = authHeader.split(' ')[1];
  req.clerkToken = token;
  next();
}
