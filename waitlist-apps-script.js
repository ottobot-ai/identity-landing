// OttoChain Waitlist - Apps Script
// 1. Create Google Sheet with headers: Timestamp | Email
// 2. Extensions → Apps Script → paste this
// 3. Deploy → Web app → Execute as: Me → Access: Anyone

// Simple in-memory rate limiting (resets on script restart, but good enough)
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 5;
const requestLog = {};

function doPost(e) {
  try {
    // Honeypot check - bots fill hidden fields, humans don't
    if (e.parameter.website || e.parameter.url) {
      // Pretend success but don't store
      return jsonResponse({ success: true });
    }
    
    // Basic rate limiting by IP (best effort)
    const ip = e.parameter._ip || 'unknown';
    const now = Date.now();
    if (!requestLog[ip]) requestLog[ip] = [];
    requestLog[ip] = requestLog[ip].filter(t => now - t < RATE_LIMIT_WINDOW);
    
    if (requestLog[ip].length >= MAX_REQUESTS_PER_WINDOW) {
      return jsonResponse({ error: 'rate_limited' }, 429);
    }
    requestLog[ip].push(now);
    
    // Validate email
    const email = (e.parameter.email || '').trim().toLowerCase();
    if (!email || !email.includes('@') || !email.includes('.')) {
      return jsonResponse({ error: 'invalid_email' }, 400);
    }
    
    // Check for duplicates
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    const data = sheet.getDataRange().getValues();
    const emails = data.map(row => (row[1] || '').toLowerCase());
    
    if (emails.includes(email)) {
      return jsonResponse({ success: true, message: 'already_subscribed' });
    }
    
    // Store the email
    sheet.appendRow([
      new Date().toISOString(),
      email
    ]);
    
    return jsonResponse({ success: true });
    
  } catch (error) {
    return jsonResponse({ error: 'server_error' }, 500);
  }
}

function jsonResponse(data, code) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// Test endpoint
function doGet(e) {
  return ContentService.createTextOutput('OttoChain Waitlist API is live.');
}
