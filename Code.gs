/**
 * Google Apps Script: AI-powered newsletter digest
 * ------------------------------------------------
 * Scans unread emails from specific senders in the last 24 hours,
 * summarizes each message with OpenAI GPT-4o-mini, and emails you a
 * neatly formatted HTML digest. 
 *
 * IMPORTANT: Replace OPENAI_API_KEY with a secure value in
 *            Apps Script → Project Settings → Script Properties.
 */

const OPENAI_API_KEY = 'ENTER YOUR API KEY HERE';  // ❗ Store securely—never commit to GitHub.

/**
 * HTML-escapes a string so user-supplied text is safe to inject into
 * the email body.
 */
function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Converts plain-text bullet lines into an HTML <ul>.
 * Accepts lines that start with -, •, or *.
 */
function bulletsToList(text) {
  const lines = text
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 0);         // remove empty lines

  const items = lines.map(l => {
    const cleaned = l.replace(/^[-•*]\s*/, '');  // strip bullet symbol
    return `<li>${escapeHtml(cleaned)}</li>`;
  });

  return `<ul>${items.join('')}</ul>`;
}

/**
 * Builds the HTML block for one email summary.
 */
function formatSummaryHtml(subject, sender, summaryText, url) {
  return `
    <div class="summary">
      <p><strong>Subject:</strong> ${escapeHtml(subject)}</p>
      <p><strong>From:</strong> ${escapeHtml(sender)}</p>
      <p><strong>Summary:</strong></p>
      ${bulletsToList(summaryText)}
      <p><strong>Link:</strong> <a href="${url}">${url}</a></p>
    </div>`;
}

/**
 * MAIN ENTRY POINT
 * ----------------
 * Finds unread messages from allowed senders (last 24 h), summarises
 * each, marks them read, and emails you the compiled digest.
 *
 * Set this as a time-driven trigger (e.g. every 12 h) in Apps Script:
 *   Triggers → + Add Trigger → Choose function → Time-driven.
 */
function summarizeUnreadEmailsFromSendersLast24Hours() {
  const allowedSenders = [
    'mail1@tocheckfor.com',
    'mail2@tocheckfor.com'
  ];

  // Search unread threads newer than 2 days to allow for time zones.
  const threads = GmailApp.search('is:unread newer_than:2d');
  const blocks  = [];

  threads.forEach(thread => {
    const threadUrl = `https://mail.google.com/mail/u/0/#inbox/${thread.getId()}`;

    thread.getMessages().forEach(msg => {
      const sender = msg.getFrom();

      // Skip if sender isn’t on the whitelist.
      if (!allowedSenders.some(e => sender.includes(e))) return;

      // Grab up to 4 000 chars of plain text (API limit safety).
      let bodyText = '';
      try { bodyText = msg.getPlainBody().slice(0, 4000); }
      catch { return; }  // skip if body can’t be read

      try {
        // Call OpenAI to get a bullet-point summary.
        const summary = getAISummary(bodyText);

        // Build an HTML block for this message.
        blocks.push(formatSummaryHtml(msg.getSubject(), sender, summary, threadUrl));

        // Mark message read so it isn’t processed again.
        msg.markRead();
      } catch (err) {
        Logger.log(`AI summary failed for ${sender}: ${err.message}`);
      }
    });
  });

  // No unread newsletters → nothing to send.
  if (blocks.length === 0) return;

  // Assemble the full digest email.
  const timestamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm');
  const htmlBody =
    `<!DOCTYPE html><html><head><meta charset="UTF-8">
      <style>
        body{font-family:Arial,Helvetica,sans-serif;color:#333;line-height:1.4}
        h1{margin-bottom:6px}
        .summary{margin:20px 0;padding-bottom:16px;border-bottom:1px solid #ddd}
        ul{margin:4px 0 12px 18px}
      </style></head><body>
      <h1>Email Newsletter Digest</h1>
      ${blocks.join('')}
      <hr>
      <p style="font-size:12px;color:#777">
        Summarized on ${timestamp} with GPT-4o-mini<br>
        Filtered senders: ${allowedSenders.join(', ')}<br>
        Time window: last 24 hours
      </p>
    </body></html>`;

  // Send the digest to yourself.
  GmailApp.sendEmail(
    Session.getActiveUser().getEmail(),
    'Email Newsletter Digest',
    '',                 // plain-text body left blank
    { htmlBody }
  );
}

/**
 * Calls OpenAI’s Chat Completion API with a bullet-point summary prompt.
 * Returns the model’s response as a trimmed string.
 */
function getAISummary(text) {
  const prompt =
    `You are my executive assistant. Summarize the email below in concise bullet points without using asterisks:\n\n${text}`;

  const payload = {
    model      : 'gpt-4o-mini',
    messages   : [{ role: 'user', content: prompt }],
    temperature: 0.3
  };

  const options = {
    method            : 'post',
    contentType       : 'application/json',
    headers           : { Authorization: 'Bearer ' + OPENAI_API_KEY },
    payload           : JSON.stringify(payload),
    muteHttpExceptions: true
  };

  const res  = UrlFetchApp.fetch('https://api.openai.com/v1/chat/completions', options);
  const json = JSON.parse(res.getContentText());

  if (json.error) throw new Error(json.error.message);
  return json.choices[0].message.content.trim();
}
