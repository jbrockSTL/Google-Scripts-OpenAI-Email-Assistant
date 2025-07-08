# Email Newsletter Digest (Gmail + GPT-4o)

This script automatically summarizes your email newsletters from specific senders using OpenAI’s GPT-4o and sends you a clean HTML digest once per day. Built entirely in Google Apps Script.

---

## What It Does

- Filters unread Gmail threads from specific senders in the last 48 hours  
- Uses GPT-4o-mini to summarize email content into bullet points  
- Formats each summary as clean, readable HTML  
- Sends a single email digest to your inbox  
- Marks messages as read after processing  

---

## What You’ll Need

- A Gmail account  
- An [OpenAI API key](https://platform.openai.com/account/api-keys)  
- A few minutes in the [Google Apps Script](https://script.google.com) editor

---

## Setup Instructions

### 1. Open Google Apps Script

1. Go to [https://script.google.com](https://script.google.com)
2. Click `+ New Project`
3. Name your project something like `Email Newsletter Digest`

---

### 2. Replace Default Code

1. Delete any starter code (like `function myFunction()`)
2. Copy and paste the entire contents of `Code.gs` into the editor:
   - This includes the `summarizeUnreadEmailsFromSendersLast24Hours` function and helpers
3. (Optional but recommended) Create a second file named `appsscript.json` with:

```json
{
  "timeZone": "America/Chicago",
  "exceptionLogging": "STACKDRIVER"
}
