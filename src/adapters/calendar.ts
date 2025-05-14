import axios from 'axios';

import { Entity } from '../entity';
import {
  Tool,
  ToolResponse,
} from '../tools';
import { logger } from '../utils';
import { Adapter } from './index';

const CALENDAR_SERVER_URL =
  process.env.CALENDAR_SERVER_URL || "http://localhost:3001";

class CalendarReadTool extends Tool {
  name = "calendar_read";
  description =
    "Read events from a calendar. If you find any duplicate events, please merge them into a single event.";
  parameters = {
    calendarId: {
      type: "string",
      description: "The ID of the calendar to read events from",
    },
    startTime: {
      type: "string",
      description: "Optional start time to filter events (ISO format)",
    },
    endTime: {
      type: "string",
      description: "Optional end time to filter events (ISO format)",
    },
  };

  async execute(
    entity: Entity,
    parameters: Record<string, any>
  ): Promise<ToolResponse> {
    const { calendarId, startTime, endTime } = parameters;

    if (!calendarId) {
      logger.error("No calendar ID provided");
      return "Please provide a calendar ID to read events from";
    }

    try {
      const response = await axios.get(
        `${CALENDAR_SERVER_URL}/calendars/${calendarId}/events`,
        {
          params: { startTime, endTime },
        }
      );

      const { events } = response.data;

      if (!events.length) {
        logger.info("No events found for this calendar");
        return "No events found for this calendar";
      }

      logger.info(`Found ${events.length} events for calendar ${calendarId}`);
      return JSON.stringify(events);
    } catch (error) {
      logger.error("Error reading calendar events:", error);
      return "Failed to read calendar events";
    }
  }
}

class CalendarCreateTool extends Tool {
  name = "calendar_create";
  description = "Create a new calendar event";
  parameters = {
    calendarId: {
      type: "string",
      description: "The ID of the calendar to create the event in",
    },
    summary: {
      type: "string",
      description: "The title/summary of the event",
    },
    description: {
      type: "string",
      description: "Optional description of the event",
    },
    startTime: {
      type: "string",
      description: "Start time of the event (ISO format)",
    },
    endTime: {
      type: "string",
      description: "End time of the event (ISO format)",
    },
    timeZone: {
      type: "string",
      description: "Time zone for the event (e.g., 'America/New_York')",
    },
    attendees: {
      type: "array",
      description: "Optional array of attendee email addresses",
      items: {
        type: "string",
      },
    },
  };

  async execute(
    entity: Entity,
    parameters: Record<string, any>
  ): Promise<ToolResponse> {
    const {
      calendarId,
      summary,
      description,
      startTime,
      endTime,
      timeZone,
      attendees,
    } = parameters;

    if (!calendarId || !summary || !startTime || !endTime || !timeZone) {
      logger.error("Missing required parameters");
      return "Please provide all required parameters: calendarId, summary, startTime, endTime, and timeZone";
    }

    try {
      const event = {
        summary,
        description,
        start: {
          dateTime: startTime,
          timeZone,
        },
        end: {
          dateTime: endTime,
          timeZone,
        },
        attendees: attendees?.map((email: string) => ({ email })),
      };

      const response = await axios.post(
        `${CALENDAR_SERVER_URL}/calendars/${calendarId}/events`,
        event
      );

      logger.info(`Created event in calendar ${calendarId}`);
      return JSON.stringify(response.data.event);
    } catch (error) {
      logger.error("Error creating calendar event:", error);
      return "Failed to create calendar event";
    }
  }
}

class CalendarDeleteTool extends Tool {
  name = "calendar_delete";
  description = "Delete a calendar event";
  parameters = {
    calendarId: {
      type: "string",
      description: "The ID of the calendar containing the event",
    },
    eventId: {
      type: "string",
      description: "The ID of the event to delete",
    },
  };

  async execute(
    entity: Entity,
    parameters: Record<string, any>
  ): Promise<ToolResponse> {
    const { calendarId, eventId } = parameters;

    if (!calendarId || !eventId) {
      logger.error("Missing calendar ID or event ID");
      return "Please provide both calendar ID and event ID";
    }

    try {
      await axios.delete(
        `${CALENDAR_SERVER_URL}/calendars/${calendarId}/events/${eventId}`
      );

      logger.info(`Deleted event ${eventId} from calendar ${calendarId}`);
      return "Event deleted successfully";
    } catch (error) {
      logger.error("Error deleting calendar event:", error);
      return "Failed to delete calendar event";
    }
  }
}

export class CalendarAdapter extends Adapter {
  name = "calendar";
  description =
    "Allows the entity to read, create, and delete calendar events.";
  tools: Tool[] = [
    new CalendarReadTool(),
    new CalendarCreateTool(),
    new CalendarDeleteTool(),
  ];
}
