# Dually Onboarding — Submit Setup

The form posts every submission to **two** destinations in parallel:

1. **GHL webhook** — creates/updates a Contact and kicks off your build workflow.
2. **Google Apps Script** — mirrors the full payload to a Sheet (one row per submission) and a Doc (one tab per submission, human-readable).

Both are configured at the top of `app.jsx` in the `SUBMIT_CONFIG` block. If you leave either blank, the form just skips it (handy for staging).

---

## 1 · GHL Inbound Webhook

1. In GHL: **Automation → Workflows → New Workflow → Start from Scratch**.
2. Add trigger: **Inbound Webhook**.
3. Click the trigger — GHL gives you a **Webhook URL**. Copy it.
4. Paste it into `SUBMIT_CONFIG.GHL_WEBHOOK_URL` in `app.jsx`.
5. Send one test submission (from the form). The trigger panel will show the captured payload — click **"Update"** so GHL learns the field shape.
6. Add workflow actions below the trigger. Useful ones:
   - **Create/Update Contact** — map `{{inboundWebhookData.proEmail}}`, `{{inboundWebhookData.cell}}`, `{{inboundWebhookData.legalName}}`, etc.
   - **Add Tag** — `onboarding-submitted`, plus `tier-{{...tier}}` and `agent-{{...agentType}}` for routing.
   - **Send Internal Notification** — email/Slack to your ops inbox.
   - **Custom Webhook** — fire the full JSON off to your AI build orchestrator (Make, Zapier, Vercel function, n8n, whatever).

### Payload shape (top level)
```
submissionId       "DUA-LW8K2F-A9XZ"         (use this as external ID)
submittedAt        "2025-06-14T18:42:07.123Z"
source             "onboard.duallymkt.com"
version            "v1"
agentType          "FEX" | "IUL" | "Annuity"
tier               "exclusive" | "standard" | ...
legalName, displayName, proEmail, cell, npn, primaryProduct, heroCity
answers            { ...every field the agent filled in... }
```

The `answers` object contains everything. Use it in a **Custom Webhook** step to hand the full record to your AI build agent.

---

## 2 · Google Apps Script (Sheet + Doc mirror)

This gives you a live spreadsheet of submissions AND a human-readable Google Doc your AI agent can read from.

### Setup

1. Create a new **Google Sheet**. Copy its ID from the URL.
2. Create a new **Google Doc**. Copy its ID from the URL.
3. Open **script.google.com → New Project**. Paste this:

```js
const SHEET_ID = 'PASTE_YOUR_SHEET_ID';
const DOC_ID   = 'PASTE_YOUR_DOC_ID';

function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);

    // --- Write a row to the sheet ---
    const sheet = SpreadsheetApp.openById(SHEET_ID).getSheets()[0];
    if (sheet.getLastRow() === 0) {
      sheet.appendRow([
        'submissionId','submittedAt','agentType','tier','legalName','displayName',
        'proEmail','cell','npn','primaryProduct','heroCity','fullJSON'
      ]);
    }
    sheet.appendRow([
      payload.submissionId, payload.submittedAt, payload.agentType, payload.tier,
      payload.legalName, payload.displayName, payload.proEmail, payload.cell,
      payload.npn, payload.primaryProduct, payload.heroCity,
      JSON.stringify(payload.answers)
    ]);

    // --- Append a section to the doc ---
    const doc = DocumentApp.openById(DOC_ID);
    const body = doc.getBody();
    body.appendPageBreak();
    body.appendParagraph(`${payload.displayName || payload.legalName} — ${payload.submissionId}`)
        .setHeading(DocumentApp.ParagraphHeading.HEADING1);
    body.appendParagraph(`Submitted ${payload.submittedAt} · ${payload.agentType} · ${payload.tier}`);
    Object.entries(payload.answers || {}).forEach(([k, v]) => {
      body.appendParagraph(k).setHeading(DocumentApp.ParagraphHeading.HEADING3);
      body.appendParagraph(typeof v === 'object' ? JSON.stringify(v, null, 2) : String(v));
    });
    doc.saveAndClose();

    return ContentService.createTextOutput(JSON.stringify({ ok: true, id: payload.submissionId }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ ok: false, error: String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
```

4. **Deploy → New deployment → Type: Web app**
   - Execute as: **Me**
   - Who has access: **Anyone**
5. Copy the **Web app URL** and paste into `SUBMIT_CONFIG.APPS_SCRIPT_URL` in `app.jsx`.

---

## 3 · (Optional) Live agent status polling

The completion screen can show real status for each AI agent (Provisioner / Brand / Copy / Alex / Compliance / Ads) instead of fake "Queued" labels.

Your orchestrator (GHL workflow, Make, Vercel function, etc.) needs to expose a URL that returns JSON like:

```json
{ "agents": { "PRV": "done", "BRA": "running", "COP": "queued", "ALX": "queued", "A2P": "queued", "ADS": "skipped" } }
```

…keyed by submissionId passed as a query param. Example endpoint:
`https://your-api.com/status?submissionId=DUA-LW8K2F-A9XZ`

Set `SUBMIT_CONFIG.STATUS_POLL_URL = 'https://your-api.com/status?submissionId='` (note the trailing `=`). The page polls every 15s and updates the dots live.

Skip this for v1 — the default static labels are fine until your orchestration layer is built.

---

## 4 · Airtable (later migration)

When you're ready to move off Sheets, point `APPS_SCRIPT_URL` at an Airtable-writing Apps Script (change the sheet call to an `UrlFetchApp.fetch()` against Airtable's REST API), or POST directly from the form. The payload format stays the same — nothing in the form needs to change.

---

## Testing

1. Fill the form end-to-end once in the deployed version.
2. Click submit. Open the devtools Network tab — you should see two POSTs (to GHL + Apps Script), both returning 200 / opaque.
3. Check your GHL workflow's execution log for the payload.
4. Check the Sheet (new row) and the Doc (new page).
5. If either fails, the completion screen shows "Submission failed — saved locally" with a retry button. The payload is also stashed in `localStorage.dually-submissions`.
