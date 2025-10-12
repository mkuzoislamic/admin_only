/**

deploymentid:  AKfycbycoeNmt_bM-HcswJ5Hq9xvOdTe7sd-vX4G7_8HL7Xl3WvlIItH4BRMRaXKOHi7DKC3

sheet link :  https://script.google.com/macros/s/AKfycbycoeNmt_bM-HcswJ5Hq9xvOdTe7sd-vX4G7_8HL7Xl3WvlIItH4BRMRaXKOHi7DKC3/exec
 * sheets_api.gs
 *
 * - POST (JSON body) -> append new admission to the "Admissions" sheet.
 * - GET?action=list -> returns all rows as JSON list
 *
 * After creating this script, Deploy -> New deployment -> Web app
 * - Execute as: Me
 * - Who has access: Anyone (even anonymous)  <-- choose accordingly
 * Copy the Web App URL and paste in client files as SHEETS_ENDPOINT_URL.
 */

/* Configuration */
const SHEET_NAME = 'Admissions'; // sheet tab name

function _getSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    const headers = [
      'id', 'timestamp',
      'student_firstName', 'student_middleName', 'student_lastName', 'student_gender', 'student_dob', 'student_address',
      'parent_name', 'parent_phone', 'parent_address',
      'academic_classroom', 'academic_year', 'previousSchool', 'notes'
    ];
    sheet.appendRow(headers);
  }
  return sheet;
}

function doPost(e) {
  // Accept JSON body
  try {
    const raw = e.postData && e.postData.contents ? e.postData.contents : null;
    if (!raw) {
      return _jsonResponse({ success: false, error: 'No body' }, 400);
    }
    const obj = JSON.parse(raw);

    const sheet = _getSheet();
    const row = [
      obj.id || Date.now(),
      obj.timestamp || new Date().toISOString(),
      obj.student?.firstName || '',
      obj.student?.middleName || '',
      obj.student?.lastName || '',
      obj.student?.gender || '',
      obj.student?.dob || '',
      obj.student?.address || '',
      obj.parent?.name || '',
      obj.parent?.phone || '',
      obj.parent?.address || '',
      obj.academic?.classroom || '',
      obj.academic?.academicYear || '',
      obj.academic?.previousSchool || '',
      obj.academic?.notes || ''
    ];
    sheet.appendRow(row);

    return _jsonResponse({ success: true, inserted: row[0] });
  } catch (err) {
    return _jsonResponse({ success: false, error: err.message }, 500);
  }
}

function doGet(e) {
  // usage: GET ?action=list
  const action = (e.parameter && e.parameter.action) ? e.parameter.action : '';
  if (action === 'list') {
    try {
      const sheet = _getSheet();
      const values = sheet.getDataRange().getValues();
      if (!values || values.length <= 1) {
        return _jsonResponse({ success: true, data: [] });
      }
      const headers = values[0];
      const rows = values.slice(1).map(r => {
        const out = {};
        headers.forEach((h, i) => out[h] = r[i]);
        return out;
      });
      return _jsonResponse({ success: true, data: rows });
    } catch (err) {
      return _jsonResponse({ success: false, error: err.message }, 500);
    }
  }

  // Default: brief UI w/ instructions (useful if you open URL in browser)
  const html = HtmlService.createHtmlOutput(
    `<p>Google Apps Script Web App for Mkuzo Admissions. Use GET?action=list or POST JSON.</p>`
  );
  html.setTitle('Sheets API (Admissions)');
  return html;
}

function _jsonResponse(obj, status) {
  const res = ContentService.createTextOutput(JSON.stringify(obj));
  res.setMimeType(ContentService.MimeType.JSON);
  // Allow CORS (so client can call)
  return HtmlService.createHtmlOutput().append(`<script>window.parent.postMessage(${JSON.stringify(obj)}, '*')</script>`);
  // Note: Apps Script doesn't let us set custom headers easily via ContentService response for CORS; 
  // the recommended pattern is to return JSON and set access in deployment. Simpler approach: wrap JSON in HTML.
  // Alternatively, use the following ContentService return for non-CORS scenarios:
  // return res;
}
