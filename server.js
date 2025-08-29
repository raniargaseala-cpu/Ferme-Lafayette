const express = require('express');
const bodyParser = require('body-parser');
const { google } = require('googleapis');

// Load Google service account from Render environment variable
const serviceAccount = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT);

const app = express();
app.use(bodyParser.json());

// Replace with your Google Calendar ID
const CALENDAR_ID = 'd3284274ed68a03eb5bdf2d01a0dd96ad1b9959a276e03b666ed1641e8a7ec9d@group.calendar.google.com';

// Setup Google Auth
const jwtClient = new google.auth.JWT(
  serviceAccount.client_email,
  null,
  serviceAccount.private_key,
  ['https://www.googleapis.com/auth/calendar']
);

const calendar = google.calendar({ version: 'v3', auth: jwtClient });

// API route to create booking in Google Calendar
app.post('/addBooking', async (req, res) => {
  try {
    const { name, email, adults, checkin, checkout, dinner } = req.body;

    await jwtClient.authorize();

    const event = {
      summary: `Booking: ${name}${dinner ? ' + Dinner' : ''}`,
      description: `Booking from ${checkin} to ${checkout}.
      Guest: ${name} (${email})
      Adults: ${adults}
      Dinner: ${dinner ? 'Yes' : 'No'}`,
      start: { date: checkin },
      end: { date: checkout }
    };

    await calendar.events.insert({
      calendarId: CALENDAR_ID,
      resource: event
    });

    res.json({ status: 'ok', message: 'Booking added to Google Calendar' });
  } catch (err) {
    console.error('Error adding booking:', err);
    res.status(500).json({ status: 'error', error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
