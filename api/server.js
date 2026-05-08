// ============================================================
// JonArt Galleries — Express Backend
// Stack: Node.js + Express + Supabase + Resend (email)
// Deploy free on: Railway / Render / Fly.io
// ============================================================

import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// ── CLIENTS ──
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY   // service role key (server-side only, never expose!)
);

const resend = new Resend(process.env.RESEND_API_KEY);

// ── MIDDLEWARE ──
app.use(cors({ origin: process.env.FRONTEND_URL || '*' }));
app.use(express.json());

// Multer: handle reference photo uploads (memory storage → Supabase)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB per file
  fileFilter: (_, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    cb(null, allowed.includes(file.mimetype));
  }
});

// ── HELPERS ──
async function uploadPhotos(files) {
  if (!files || files.length === 0) return [];
  const urls = [];
  for (const file of files) {
    const filename = `${Date.now()}-${file.originalname.replace(/\s+/g, '-')}`;
    const { error } = await supabase.storage
      .from('reference-photos')
      .upload(filename, file.buffer, { contentType: file.mimetype });
    if (!error) {
      const { data } = supabase.storage.from('reference-photos').getPublicUrl(filename);
      urls.push(data.publicUrl);
    }
  }
  return urls;
}

async function sendEmail({ to, subject, html }) {
  await resend.emails.send({
    from: 'JonArt Galleries <hello@jonartgalleries.com>',
    to,
    subject,
    html
  });
}

// ============================================================
// ROUTES
// ============================================================

// ── Health check ──
app.get('/', (_, res) => res.json({ status: 'JonArt API running ✦' }));


// ── 1. COMMISSION REQUEST ──
app.post('/api/commission', upload.array('photos', 5), async (req, res) => {
  try {
    const {
      name, email, phone, location,
      artwork_type, medium, canvas_size,
      budget_range, deadline, description
    } = req.body;

    if (!name || !email || !artwork_type) {
      return res.status(400).json({ error: 'Name, email and artwork type are required.' });
    }

    // Upload reference photos to Supabase Storage
    const reference_photos = await uploadPhotos(req.files);

    // Insert into DB
    const { data, error } = await supabase
      .from('commissions')
      .insert([{
        name, email, phone, location,
        artwork_type, medium, canvas_size,
        budget_range, deadline, description,
        reference_photos
      }])
      .select()
      .single();

    if (error) throw error;

    // Email to admin (Jon)
    await sendEmail({
      to: process.env.ADMIN_EMAIL,
      subject: `New Commission Request from ${name}`,
      html: `
        <h2>New Commission Request — JonArt Galleries</h2>
        <p><strong>From:</strong> ${name} (${email})</p>
        <p><strong>Type:</strong> ${artwork_type}</p>
        <p><strong>Medium:</strong> ${medium || 'Not specified'}</p>
        <p><strong>Size:</strong> ${canvas_size || 'Not specified'}</p>
        <p><strong>Budget:</strong> ${budget_range || 'Not specified'}</p>
        <p><strong>Deadline:</strong> ${deadline || 'None'}</p>
        <p><strong>Vision:</strong><br>${description || '—'}</p>
        ${reference_photos.length > 0 ? `<p><strong>Photos:</strong> ${reference_photos.map(u => `<a href="${u}">View</a>`).join(' · ')}</p>` : ''}
        <hr>
        <a href="${process.env.ADMIN_DASHBOARD_URL}">Open Admin Dashboard</a>
      `
    });

    // Confirmation email to client
    await sendEmail({
      to: email,
      subject: 'Commission Request Received — JonArt Galleries',
      html: `
        <h2>Thank you, ${name}!</h2>
        <p>Your commission request has been received. Jon will personally be in touch within 48 hours.</p>
        <p><strong>What you requested:</strong><br>
        ${artwork_type} · ${medium || ''} · ${canvas_size || ''}</p>
        <p>In the meantime, feel free to browse the gallery at <a href="${process.env.FRONTEND_URL}">jonartgalleries.com</a>.</p>
        <p>— JonArt Galleries</p>
      `
    });

    res.status(201).json({ success: true, id: data.id });

  } catch (err) {
    console.error('Commission error:', err);
    res.status(500).json({ error: 'Failed to submit commission request.' });
  }
});


// ── 2. CONTACT MESSAGE ──
app.post('/api/contact', async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;
    if (!name || !email || !message) {
      return res.status(400).json({ error: 'Name, email and message are required.' });
    }

    const { error } = await supabase.from('contacts').insert([{ name, email, subject, message }]);
    if (error) throw error;

    await sendEmail({
      to: process.env.ADMIN_EMAIL,
      subject: `New Message: ${subject || 'General Enquiry'} — from ${name}`,
      html: `
        <h2>New Contact Message</h2>
        <p><strong>From:</strong> ${name} (${email})</p>
        <p><strong>Subject:</strong> ${subject || '—'}</p>
        <p><strong>Message:</strong><br>${message}</p>
      `
    });

    res.status(201).json({ success: true });
  } catch (err) {
    console.error('Contact error:', err);
    res.status(500).json({ error: 'Failed to send message.' });
  }
});


// ── 3. NEWSLETTER SUBSCRIBE ──
app.post('/api/newsletter', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required.' });

    const { error } = await supabase
      .from('subscribers')
      .upsert([{ email, active: true }], { onConflict: 'email' });

    if (error) throw error;

    await sendEmail({
      to: email,
      subject: 'Welcome to the JonArt Collector\'s Circle',
      html: `
        <h2>Welcome to the Circle ✦</h2>
        <p>Thank you for subscribing to JonArt Galleries. You'll be among the first to hear about new works, exhibition openings, and limited print releases.</p>
        <p><a href="${process.env.FRONTEND_URL}">Visit the Gallery →</a></p>
        <p style="font-size:12px;color:#888;">To unsubscribe, reply with "unsubscribe".</p>
      `
    });

    res.status(201).json({ success: true });
  } catch (err) {
    console.error('Newsletter error:', err);
    res.status(500).json({ error: 'Failed to subscribe.' });
  }
});


// ── 4. STUDIO VISIT BOOKING ──
app.post('/api/studio-visit', async (req, res) => {
  try {
    const { name, email, visit_date, visit_time, purpose, notes } = req.body;
    if (!name || !email || !visit_date || !visit_time) {
      return res.status(400).json({ error: 'Name, email, date and time are required.' });
    }

    const { error } = await supabase
      .from('studio_visits')
      .insert([{ name, email, visit_date, visit_time, purpose, notes }]);

    if (error) throw error;

    await sendEmail({
      to: process.env.ADMIN_EMAIL,
      subject: `Studio Visit Request — ${name} on ${visit_date}`,
      html: `
        <h2>Studio Visit Request</h2>
        <p><strong>Name:</strong> ${name} (${email})</p>
        <p><strong>Date:</strong> ${visit_date} at ${visit_time}</p>
        <p><strong>Purpose:</strong> ${purpose || '—'}</p>
        <p><strong>Notes:</strong> ${notes || '—'}</p>
      `
    });

    await sendEmail({
      to: email,
      subject: 'Studio Visit Request Received — JonArt Galleries',
      html: `
        <h2>Visit Request Received</h2>
        <p>Hi ${name}, your studio visit request for <strong>${visit_date} at ${visit_time}</strong> has been received.</p>
        <p>Jon's team will confirm your slot within 24 hours.</p>
        <p><strong>Studio Address:</strong> Plot 14, Kololo Hill Drive, Kampala</p>
      `
    });

    res.status(201).json({ success: true });
  } catch (err) {
    console.error('Studio visit error:', err);
    res.status(500).json({ error: 'Failed to book studio visit.' });
  }
});


// ── 5. PRINT ORDER ──
app.post('/api/print-order', async (req, res) => {
  try {
    const { print_name, size, customer_name, customer_email, shipping_address, amount_ugx } = req.body;
    if (!print_name || !customer_email) {
      return res.status(400).json({ error: 'Print name and email are required.' });
    }

    const { error } = await supabase
      .from('print_orders')
      .insert([{ print_name, size, customer_name, customer_email, shipping_address, amount_ugx }]);

    if (error) throw error;

    await sendEmail({
      to: process.env.ADMIN_EMAIL,
      subject: `New Print Order: ${print_name}`,
      html: `
        <h2>New Print Order</h2>
        <p><strong>Print:</strong> ${print_name}</p>
        <p><strong>Customer:</strong> ${customer_name} (${customer_email})</p>
        <p><strong>Amount:</strong> UGX ${Number(amount_ugx).toLocaleString()}</p>
        <p><strong>Shipping to:</strong> ${shipping_address || 'Not provided'}</p>
      `
    });

    res.status(201).json({ success: true });
  } catch (err) {
    console.error('Print order error:', err);
    res.status(500).json({ error: 'Failed to place print order.' });
  }
});


// ── 6. GIFT CARD PURCHASE ──
app.post('/api/gift-card', async (req, res) => {
  try {
    const { amount, currency = 'UGX', recipient_name, recipient_email, sender_name, personal_message } = req.body;
    if (!amount || !recipient_name || !recipient_email) {
      return res.status(400).json({ error: 'Amount, recipient name and email are required.' });
    }

    const numericAmount = Number(amount);
    if (Number.isNaN(numericAmount) || numericAmount <= 0) {
      return res.status(400).json({ error: 'Invalid amount.' });
    }

    const USD_TO_UGX = 3800;
    const amount_ugx = currency === 'USD'
      ? Math.round(numericAmount * USD_TO_UGX)
      : numericAmount;

    const displayAmount = currency === 'USD'
      ? `USD ${numericAmount.toLocaleString()}`
      : `UGX ${numericAmount.toLocaleString()}`;

    const { data, error } = await supabase
      .from('gift_cards')
      .insert([{ amount_ugx, recipient_name, recipient_email, sender_name, personal_message }])
      .select()
      .single();

    if (error) throw error;

    await sendEmail({
      to: recipient_email,
      subject: `You've received a JonArt Galleries Gift Card${sender_name ? ` from ${sender_name}` : ''}!`,
      html: `
        <h2>You've received an Art Gift Card ✦</h2>
        ${personal_message ? `<blockquote style="border-left:3px solid #C9A84C;padding-left:1rem;color:#666;">${personal_message}</blockquote>` : ''}
        <p>Your gift card is worth <strong>${displayAmount}</strong> — redeemable against any commission or print at JonArt Galleries.</p>
        <p><strong>Your code:</strong> <code style="font-size:1.4rem;letter-spacing:0.2em;color:#C9A84C;">${data.code}</code></p>
        <p>Equivalent to <strong>UGX ${amount_ugx.toLocaleString()}</strong>.</p>
        <p>Valid until: ${new Date(Date.now() + 1000*60*60*24*365*2).toLocaleDateString()}</p>
        <p><a href="${process.env.FRONTEND_URL}#commission">Redeem your gift card →</a></p>
      `
    });

    res.status(201).json({ success: true, code: data.code });
  } catch (err) {
    console.error('Gift card error:', err);
    res.status(500).json({ error: 'Failed to create gift card.' });
  }
});


// ── 7. GET ARTWORKS (public gallery API) ──
app.get('/api/artworks', async (req, res) => {
  try {
    const { category } = req.query;
    let query = supabase
      .from('artworks')
      .select('*')
      .eq('available', true)
      .order('sort_order', { ascending: true });

    if (category && category !== 'all') {
      query = query.eq('category', category);
    }

    const { data, error } = await query;
    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error('Artworks error:', err);
    res.status(500).json({ error: 'Failed to fetch artworks.' });
  }
});


// ── START ──
app.listen(PORT, () => console.log(`✦ JonArt API running on port ${PORT}`));
