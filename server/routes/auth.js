const router = require('express').Router();
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User } = require('../models');
const { ah, requireAuth } = require('../middleware/auth');
const { sendMail } = require('../services/mailService');

const sign = (u) => jwt.sign({ id: u._id, role: u.role }, process.env.JWT_SECRET, { expiresIn: u.role === 'admin' ? '8h' : '7d' });

const USN_RE = /^4NI[A-Z0-9]{5,9}$/;                    // starts with 4NI, e.g. 4NI21CS001
const EMAIL_RE = /^[^\s@]+@([a-z0-9-]+\.)*nie\.ac\.in$/i; // must end with nie.ac.in

// Emails a fresh verification link (valid for 24 hours). Only the owner of the inbox can open it.
async function sendVerification(user) {
  const token = crypto.randomBytes(32).toString('hex');
  user.verifyTokenHash = crypto.createHash('sha256').update(token).digest('hex');
  user.verifyExpires = new Date(Date.now() + 24 * 3600 * 1000);
  await user.save();
  const base = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
  await sendMail(
    user.email,
    'Verify your Smart Canteen account',
    `Hi ${user.name},\n\nOpen this link to activate your account (valid for 24 hours):\n${base}/api/auth/verify-email?token=${token}\n\nIf you did not sign up for Smart Canteen, you can ignore this email.`
  );
}

const loginAs = (role) => ah(async (req, res) => {
  const id = String(req.body.identifier || '').trim().toLowerCase();
  const user = await User.findOne({ role, $or: [{ email: id }, { usn: id.toUpperCase() }] });
  if (!user || !(await bcrypt.compare(String(req.body.password || ''), user.passwordHash)))
    return res.status(401).json({ message: 'Invalid email/USN or password.' });

  if (role === 'student' && user.emailVerified === false) {
    await sendVerification(user); // correct password but not verified yet: send a new link
    return res.status(403).json({ message: 'Please verify your email first. We just sent a new link to your college email.' });
  }
  res.json({ token: sign(user), user: { name: user.name, role: user.role } });
});

router.post('/register', ah(async (req, res) => {
  const name = String(req.body.name || '').trim();
  const email = String(req.body.email || '').trim().toLowerCase();
  const usn = String(req.body.usn || '').trim().toUpperCase();
  const password = String(req.body.password || '');

  if (!name || !email || !usn || password.length < 6)
    return res.status(400).json({ message: 'Fill in all fields. Password needs at least 6 characters.' });
  if (!USN_RE.test(usn)) return res.status(400).json({ message: 'Enter a valid USN. It must start with 4NI, for example 4NI21CS001.' });
  if (!EMAIL_RE.test(email)) return res.status(400).json({ message: 'Use your college email, which must end with nie.ac.in.' });

  // An unverified sign-up cannot block the real owner of this email or USN: it is replaced
  await User.deleteMany({ role: 'student', emailVerified: false, $or: [{ email }, { usn }] });

  try {
    const user = await User.create({ name, email, usn, passwordHash: await bcrypt.hash(password, 10), role: 'student', emailVerified: false });
    await sendVerification(user);
    res.status(201).json({ message: `We sent a verification link to ${email}. Open it to activate your account, then log in.` });
  } catch (e) {
    if (e.code === 11000) return res.status(409).json({ message: 'That email or USN is already registered.' });
    throw e;
  }
}));

router.get('/verify-email', ah(async (req, res) => {
  const hash = crypto.createHash('sha256').update(String(req.query.token || '')).digest('hex');
  const user = await User.findOne({ verifyTokenHash: hash, verifyExpires: { $gt: new Date() } });
  if (!user) return res.redirect('/login.html?verifyfailed=1');
  user.emailVerified = true;
  user.verifyTokenHash = undefined;
  user.verifyExpires = undefined;
  await user.save();
  res.redirect('/login.html?verified=1');
}));

// Details for the account menu and profile page
router.get('/me', requireAuth('student'), ah(async (req, res) => {
  const u = await User.findById(req.user.id).select('name email usn');
  if (!u) return res.status(404).json({ message: 'Account not found.' });
  res.json({ name: u.name, email: u.email, usn: u.usn || '' });
}));

router.post('/student/login', loginAs('student'));
router.post('/admin/login', loginAs('admin'));
module.exports = router;
