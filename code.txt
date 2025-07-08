help me set this code up in github.com. including a solid readme, too.

const OPENAI_API_KEY = 'ENTER YOUR API KEY HERE';  // keep this secure

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function bulletsToList(text) {
  const lines = text
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 0);

  const items = lines.map(l => {
    const cleaned = l.replace(/^[-•*]\s*/, '');
    return `<li>${escapeHtml(cleaned)}</li>`;
  });

  return `<ul>${items.join('')}</ul>`;
}

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

function summarizeUnreadEmailsFromSendersLast24Hours() {
  const allowedSenders = [
    'mail1@tocheckfor.com',
    'mail2@tocheckfor.com'',
  ];

  const threads = GmailApp.search('is:unread newer_than:2d');
  const blocks = [];

  threads.forEach(thread => {
    const threadUrl = `https://mail.google.com/mail/u/0/#inbox/${thread.getId()}`;
    thread.getMessages().forEach(msg => {
      const sender = msg.getFrom();
      if (allowedSenders.some(e => sender.includes(e))) {
        let bodyText = '';
        try { bodyText = msg.getPlainBody().slice(0, 4000); } catch (_) { return; }

        try {
          const summary = getAISummary(bodyText);
          blocks.push(formatSummaryHtml(msg.getSubject(), sender, summary, threadUrl));
          msg.markRead();
        } catch (err) {
          Logger.log(`Summary failed for ${sender}: ${err.message}`);
        }
      }
    });
  });

  if (blocks.length === 0) return;  // nothing to send

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
        Summarised on ${timestamp} with gpt-4o-mini<br>
        Filtered senders: ${allowedSenders.join(', ')}<br>
        Time window: last 24 hours
      </p>
    </body></html>`;

  GmailApp.sendEmail(
    Session.getActiveUser().getEmail(),
    'Email Newsletter Digest',
    '',                 // plain-text body
    { htmlBody }
  );
}

function getAISummary(text) {
  const prompt = `You are my executive assistant. Summarize the email below in concise bullet points without using asterisks:\n\n${text}`;

  const payload = {
    model      : 'gpt-4o-mini',
    messages   : [{ role: 'user', content: prompt }],
    temperature: 0.3
  };

  const options = {
    method      : 'post',
    contentType : 'application/json',
    headers     : { Authorization: 'Bearer ' + OPENAI_API_KEY },
    payload     : JSON.stringify(payload),
    muteHttpExceptions: true
  };

  const res  = UrlFetchApp.fetch('https://api.openai.com/v1/chat/completions', options);
  const json = JSON.parse(res.getContentText());
  if (json.error) throw new Error(json.error.message);
  return json.choices[0].message.content.trim();
}
