// server.js
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { google } = require('googleapis');
const serviceAccount = require('./service-account.json');

const app = express();
app.use(bodyParser.json());
app.use(cors()); // Allow cross-origin requests

// Replace with your calendar ID
const CALENDAR_ID = 'd3284274ed68a03eb5bdf2d01a0dd96ad1b9959a276e03b666ed1641e8a7ec9d@group.calendar.google.com';

// JWT client for service account
const jwtClient = new google.auth.JWT(
  serviceAccount.client_email,
  null,
  serviceAccount.private_key,
  ['https://www.googleapis.com/auth/calendar']
);

const calendar = google.calendar({ version: 'v3', auth: jwtClient });

// --- Endpoint to fetch booked dates ---
app.get('/bookedDates', async (req, res) => {
  try {
    await jwtClient.authorize();
    const today = new Date();
    const maxDate = new Date();
    maxDate.setMonth(maxDate.getMonth() + 12);

    const response = await calendar.events.list({
      calendarId: CALENDAR_ID,
      timeMin: today.toISOString(),
      timeMax: maxDate.toISOString(),
      singleEvents: true,
      orderBy: 'startTime'
    });

    // Count bookings per day
    const bookedMap = {};
    response.data.items.forEach(event => {
      const date = event.start.date || event.start.dateTime.split('T')[0];
      bookedMap[date] = (bookedMap[date] || 0) + 1;
    });

    res.json(bookedMap);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// --- Endpoint to add a new booking ---
app.post('/addBooking', async (req, res) => {
  try {
    const { name, email, adults, checkin, checkout, dinner } = req.body;
    await jwtClient.authorize();

    const event = {
      summary: `Booking: ${name}${dinner ? ' + Dinner' : ''}`,
      description: `Booking from ${checkin} to ${checkout}. Total adults: ${adults}${dinner ? ' (Dinner included)' : ''}`,
      start: { date: checkin },
      end: { date: checkout }
    };

    await calendar.events.insert({ calendarId: CALENDAR_ID, resource: event });
    res.json({ status: 'ok' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: 'error', error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
