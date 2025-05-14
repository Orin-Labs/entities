import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import express, {
  Request,
  Response,
} from 'express';
import fs from 'fs';
import { google } from 'googleapis';
import path from 'path';

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(bodyParser.json());

// Type definitions
interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: {
    dateTime: string;
    timeZone: string;
  };
  end: {
    dateTime: string;
    timeZone: string;
  };
  attendees?: Array<{
    email: string;
    responseStatus?: string;
  }>;
}

interface Calendar {
  id: string;
  events: CalendarEvent[];
}

// Helper function to read/write calendars
const calendarsFile = path.join(__dirname, "../data/calendars.json");

const readCalendars = (): Record<string, Calendar> => {
  try {
    if (!fs.existsSync(calendarsFile)) {
      fs.mkdirSync(path.dirname(calendarsFile), { recursive: true });
      fs.writeFileSync(calendarsFile, "{}");
    }
    return JSON.parse(fs.readFileSync(calendarsFile, "utf-8"));
  } catch (error) {
    console.error("Error reading calendars:", error);
    return {};
  }
};

const writeCalendars = (calendars: Record<string, Calendar>) => {
  try {
    fs.writeFileSync(calendarsFile, JSON.stringify(calendars, null, 2));
  } catch (error) {
    console.error("Error writing calendars:", error);
  }
};

// Get calendar events endpoint
app.get("/calendars/:calendarId/events", (req: Request, res: Response) => {
  const { calendarId } = req.params;
  const { startTime, endTime } = req.query;

  if (!calendarId) {
    return res.status(400).json({ error: "Missing calendar ID" });
  }

  const calendars = readCalendars();

  if (!calendars[calendarId]) {
    return res.status(404).json({ error: "Calendar not found" });
  }

  let events = calendars[calendarId].events;

  // Filter events by time range if provided
  if (startTime && endTime) {
    const start = new Date(startTime as string);
    const end = new Date(endTime as string);

    events = events.filter((event) => {
      const eventStart = new Date(event.start.dateTime);
      const eventEnd = new Date(event.end.dateTime);
      return eventStart >= start && eventEnd <= end;
    });
  }

  res.json({ events });
});

// Create calendar event endpoint
app.post(
  "/calendars/:calendarId/events",
  async (req: Request, res: Response) => {
    const { calendarId } = req.params;
    const event: CalendarEvent = req.body;

    if (!calendarId) {
      return res.status(400).json({ error: "Missing calendar ID" });
    }

    if (!event.summary || !event.start || !event.end) {
      return res.status(400).json({ error: "Missing required event fields" });
    }

    const calendars = readCalendars();

    if (!calendars[calendarId]) {
      calendars[calendarId] = {
        id: calendarId,
        events: [],
      };
    }

    // Generate a unique ID for the event
    event.id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    calendars[calendarId].events.push(event);
    writeCalendars(calendars);

    // If Google Calendar integration is configured, sync the event
    if (process.env.GOOGLE_CALENDAR_ID) {
      try {
        const auth = new google.auth.GoogleAuth({
          credentials: JSON.parse(process.env.GOOGLE_CREDENTIALS || "{}"),
          scopes: ["https://www.googleapis.com/auth/calendar"],
        });

        const calendar = google.calendar({ version: "v3", auth });

        await calendar.events.insert({
          calendarId: process.env.GOOGLE_CALENDAR_ID,
          requestBody: {
            summary: event.summary,
            description: event.description,
            start: event.start,
            end: event.end,
            attendees: event.attendees,
          },
        });
      } catch (error) {
        console.error("Error syncing with Google Calendar:", error);
        // Continue even if Google Calendar sync fails
      }
    }

    res.json({ event });
  }
);

// Delete calendar event endpoint
app.delete(
  "/calendars/:calendarId/events/:eventId",
  (req: Request, res: Response) => {
    const { calendarId, eventId } = req.params;

    if (!calendarId || !eventId) {
      return res.status(400).json({ error: "Missing calendar ID or event ID" });
    }

    const calendars = readCalendars();

    if (!calendars[calendarId]) {
      return res.status(404).json({ error: "Calendar not found" });
    }

    const eventIndex = calendars[calendarId].events.findIndex(
      (e) => e.id === eventId
    );

    if (eventIndex === -1) {
      return res.status(404).json({ error: "Event not found" });
    }

    calendars[calendarId].events.splice(eventIndex, 1);
    writeCalendars(calendars);

    res.json({ success: true });
  }
);

app.listen(port, () => {
  console.log(`Calendar server running on port ${port}`);
});
