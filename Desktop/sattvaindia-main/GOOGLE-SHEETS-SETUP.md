# 📊 Google Sheets Enquiry Logging — Setup Guide

Every time someone submits the order/enquiry form (via WhatsApp, Email, or Copy), their
details are automatically sent to a Google Sheet you control. This takes about 10 minutes
to set up and requires **no coding** beyond copy-pasting the script below.

You do this **once**. After that, every enquiry logs itself automatically forever.

---

## Step 1 — Create the Google Sheet

1. Go to [sheets.google.com](https://sheets.google.com) and create a new blank sheet.
2. Rename it something like **"Sattva India — Enquiries"**.
3. In **Row 1**, add these column headers exactly (one per cell, A1 to K1):

   ```
   Timestamp | Business Name | Contact Person | Phone | Email | Sector | Location | Delivery Date | Items | Special Instructions | Submitted Via
   ```

---

## Step 2 — Add the Apps Script

1. In your new Sheet, click **Extensions → Apps Script**.
2. Delete anything in the editor and paste this in:

```javascript
function doPost(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var data = JSON.parse(e.postData.contents);

  sheet.appendRow([
    data.timestamp || new Date().toISOString(),
    data.businessName || '',
    data.contactPerson || '',
    data.phone || '',
    data.email || '',
    data.sector || '',
    data.location || '',
    data.deliveryDate || '',
    data.items || '',
    data.specialInstructions || '',
    data.submittedVia || ''
  ]);

  return ContentService
    .createTextOutput(JSON.stringify({ status: 'success' }))
    .setMimeType(ContentService.MimeType.JSON);
}
```

3. Click the **Save** icon (disk icon), name the project e.g. "Sattva Enquiry Logger".

---

## Step 3 — Deploy as a Web App

1. Click **Deploy → New deployment**.
2. Click the gear icon next to "Select type" → choose **Web app**.
3. Fill in:
   - **Description:** Enquiry Logger v1
   - **Execute as:** Me (your Google account)
   - **Who has access:** **Anyone** (this is required — it lets your website submit data without the visitor needing a Google login. It does NOT give anyone access to view your Sheet.)
4. Click **Deploy**.
5. Google will ask you to **Authorize access** the first time — click through and allow it (it's your own script, this is expected).
6. Copy the **Web app URL** it gives you — looks like:
   ```
   https://script.google.com/macros/s/AKfycb.../exec
   ```

---

## Step 4 — Connect it to the website

1. Open `order-enhancements.js` in this project.
2. Find this line near the top:
   ```javascript
   const GOOGLE_SHEET_WEBHOOK_URL = "PASTE_YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE";
   ```
3. Replace the placeholder text with the Web App URL you copied in Step 3:
   ```javascript
   const GOOGLE_SHEET_WEBHOOK_URL = "https://script.google.com/macros/s/AKfycb.../exec";
   ```
4. Save the file and push it to GitHub — that's it, live immediately.

---

## Step 5 — Test it

1. Open the live site, fill in the order form with test details, and submit (choose WhatsApp or Email or Copy — all three log to the sheet).
2. Check your Google Sheet — a new row should appear within a few seconds.
3. If nothing appears:
   - Double-check the Web App URL was pasted correctly (no extra spaces).
   - Make sure "Who has access" was set to **Anyone** during deployment.
   - Open the browser console (F12) on the live site and look for any warning starting with "Could not log enquiry".

---

## Step 6 — Share access with the team

- Click **Share** on the Google Sheet itself (top-right, like sharing any Google Doc).
- Add the email addresses of the founder(s)/team who should see incoming enquiries.
- They can now open [sheets.google.com](https://sheets.google.com) anytime and see the full, live list — no login to any separate system needed.

---

## Optional — Get an instant email alert per enquiry

If you also want an email the moment a new row is added (so you don't have to keep checking
the sheet):

1. In the Sheet, go to **Tools → Notification rules** (or **Tools → Notification settings** depending on your Sheets version).
2. Set: "Notify me when... A user submits a form" is not applicable here since this isn't a native Google Form — instead use this small addition to the Apps Script:

```javascript
function doPost(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var data = JSON.parse(e.postData.contents);

  sheet.appendRow([
    data.timestamp || new Date().toISOString(),
    data.businessName || '',
    data.contactPerson || '',
    data.phone || '',
    data.email || '',
    data.sector || '',
    data.location || '',
    data.deliveryDate || '',
    data.items || '',
    data.specialInstructions || '',
    data.submittedVia || ''
  ]);

  // Send instant email alert
  MailApp.sendEmail({
    to: "YOUR_EMAIL@example.com",
    subject: "New Enquiry — " + data.businessName,
    body:
      "New enquiry received:\n\n" +
      "Business: " + data.businessName + "\n" +
      "Contact: " + data.contactPerson + "\n" +
      "Phone: " + data.phone + "\n" +
      "Sector: " + data.sector + "\n" +
      "Location: " + data.location + "\n" +
      "Items: " + data.items + "\n" +
      "Submitted via: " + data.submittedVia
  });

  return ContentService
    .createTextOutput(JSON.stringify({ status: 'success' }))
    .setMimeType(ContentService.MimeType.JSON);
}
```

Replace `YOUR_EMAIL@example.com` with the inbox that should get instant alerts, then
**Deploy → Manage deployments → Edit (pencil icon) → New version → Deploy** to push the update.

---

## Notes

- This is completely free — Google Apps Script + Sheets has no cost for this volume of use.
- No backend server, no database, no maintenance required.
- Works perfectly with the current static GitHub Pages hosting.
- When ready for Phase 2 (admin dashboard, order tracking), this same Sheet can be the data
  source — nothing here needs to be redone.
