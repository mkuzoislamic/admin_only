// script.js - shared client functions
// Requires window.SHEETS_ENDPOINT_URL to be set before use (set in HTML)

if (!window.SHEETS_ENDPOINT_URL) {
  console.warn('SHEETS_ENDPOINT_URL not set. Set it in the page before loading script.js');
}

/* ---------- Helper: POST submission to Apps Script ---------- */
async function postToSheets(payload) {
  try {
    const url = window.SHEETS_ENDPOINT_URL;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    // Try parse json/text
    let text = await res.text();
    try {
      return JSON.parse(text);
    } catch (e) {
      // If Apps Script returned HTML wrapper, attempt to find JSON inside
      const m = text.match(/\{[\s\S]*\}/);
      if (m) return JSON.parse(m[0]);
      return { success: false, raw: text };
    }
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/* ---------- index.html: handle form submit ---------- */
document.addEventListener('submit', async function (ev) {
  const form = ev.target;
  if (form.id !== 'admissionForm') return;
  ev.preventDefault();

  const fd = new FormData(form);
  const data = {
    id: 'AIHS-' + Date.now(),
    timestamp: new Date().toISOString(),
    student: {
      firstName: fd.get('student_firstName') || '',
      middleName: fd.get('middleName') || '',
      lastName: fd.get('lastName') || '',
      gender: fd.get('gender') || '',
      dob: fd.get('dob') || '',
      address: fd.get('studentAddress') || ''
    },
    parent: {
      name: fd.get('parentName') || '',
      phone: fd.get('parentPhone') || '',
      address: fd.get('parentAddress') || ''
    },
    academic: {
      classroom: fd.get('classroom') || '',
      academicYear: fd.get('academicYear') || '',
      previousSchool: fd.get('previousSchool') || '',
      notes: fd.get('notes') || ''
    }
  };

  // local backup
  const admissions = JSON.parse(localStorage.getItem('admissions') || '[]');
  admissions.push(data);
  localStorage.setItem('admissions', JSON.stringify(admissions));

  // send to Sheets
  const resp = await postToSheets(data);

  if (resp && resp.success) {
    document.getElementById('ref').textContent = data.id;
    document.getElementById('success').style.display = 'block';
    form.reset();
  } else {
    // show success but warn user that server save failed
    document.getElementById('ref').textContent = data.id + ' (local only)';
    document.getElementById('success').style.display = 'block';
    console.warn('Failed to save to sheets:', resp);
  }
});


/* ---------- Admin helpers: fetch list from sheets ---------- */
async function fetchAdmissionsFromSheets() {
  try {
    const url = window.SHEETS_ENDPOINT_URL + '?action=list';
    const res = await fetch(url);
    const text = await res.text();
    let parsed;
    try { parsed = JSON.parse(text); }
    catch {
      // try to extract JSON
      const m = text.match(/\{[\s\S]*\}/);
      if (m) parsed = JSON.parse(m[0]);
      else throw new Error('Invalid response');
    }
    if (parsed && parsed.success) return parsed.data || [];
    throw new Error(parsed.error || 'No data');
  } catch (err) {
    console.error('fetchAdmissionsFromSheets error', err);
    // fallback to localStorage
    const local = JSON.parse(localStorage.getItem('admissions') || '[]');
    return local;
  }
}

/* ---------- WhatsApp bulk messaging ---------- */
/**
 * sendWhatsAppToNumbers(numbers, message)
 * numbers: array of strings (local format like 0677xxxxxx)
 * message: text
 *
 * This function will open a new window/tab per number with the wa.me link.
 * Browsers may block many popups; you may need admin to allow popups or send in smaller batches.
 */
function formatToE164TZ(number) {
  // Convert local Tanzanian 0-prefixed number to +255 format if it looks like 0xxxxxxxxx
  const cleaned = number.replace(/\D/g, '');
  if (cleaned.length === 10 && cleaned.startsWith('0')) {
    return '+255' + cleaned.slice(1);
  }
  if (cleaned.startsWith('255') && cleaned.length >= 12) return '+' + cleaned;
  if (cleaned.startsWith('6') && cleaned.length === 9) return '+255' + cleaned; // fallback
  return number; // return as-is if unknown
}

function sendWhatsAppToNumbers(numbers, message, batchSize=6, delayMs=600) {
  // Send in small batches to avoid popup-blockers
  const e164 = numbers.map(n => formatToE164TZ(n));
  let i = 0;
  function sendBatch() {
    const slice = e164.slice(i, i + batchSize);
    slice.forEach(num => {
      const digits = (num.startsWith('+')) ? num.replace('+','') : num;
      const url = `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
      window.open(url, '_blank');
    });
    i += batchSize;
    if (i < e164.length) {
      setTimeout(sendBatch, delayMs);
    }
  }
  sendBatch();
}

/* ---------- SMS/MMS fallback: open sms: links (mobile only) ---------- */
function sendSmsToNumbers(numbers, message) {
  numbers.forEach(n => {
    const link = document.createElement('a');
    link.href = `sms:${n}?body=${encodeURIComponent(message)}`;
    link.click();
  });
}

/* ---------- Utility to split numbers typed/pasted by admin ---------- */
function parseNumbersText(text) {
  // accept comma, newline, semicolon, spaces
  return text.split(/[\n,;]+/).map(s => s.trim()).filter(Boolean);
}

/* Exports for admin_panel */
window._mkuzo = {
  fetchAdmissionsFromSheets,
  sendWhatsAppToNumbers,
  sendSmsToNumbers,
  parseNumbersText
};
