import { ApiClient } from '../api';
import { API_CONFIG } from '../api/config';
import { Entity } from '../entity';
import {
  Tool,
  ToolResponse,
} from '../tools';
import { logger } from '../utils';
import { Adapter } from './index';

// Initialize a base API client
const apiClient = new ApiClient(API_CONFIG.baseURL);

class CalendarReadTool extends Tool {
  name = "calendar_read";
  description =
    "Read events from a calendar. If you find any duplicate events, please merge them into a single event.";
  parameters = {
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
    try {
      // Create a client with the entity's access key
      const client = new ApiClient(
        API_CONFIG.baseURL,
        entity.options.access_key
      );

      // Get all events from the new endpoint
      const events = await client.listEvents();

      if (!events || !events.length) {
        logger.info("No events found");
        return "No events found";
      }

      logger.info(`Found ${events.length} events`);
      return JSON.stringify(events);
    } catch (error) {
      logger.error("Error reading calendar events:", error);
      return "Failed to read calendar events";
    }
  }
}

class CalendarGetEventTool extends Tool {
  name = "calendar_get_event";
  description = "Get details for a specific calendar event";
  parameters = {
    eventId: {
      type: "string",
      description: "The ID of the event to retrieve",
    },
  };

  async execute(
    entity: Entity,
    parameters: Record<string, any>
  ): Promise<ToolResponse> {
    const { eventId } = parameters;

    if (!eventId) {
      logger.error("No event ID provided");
      return "Please provide an event ID to get details";
    }

    try {
      // Create a client with the entity's access key
      const client = new ApiClient(
        API_CONFIG.baseURL,
        entity.options.access_key
      );

      const event = await client.getEvent(eventId);

      logger.info(`Retrieved event details for ${eventId}`);
      return JSON.stringify(event);
    } catch (error) {
      logger.error("Error getting event details:", error);
      return "Failed to get event details";
    }
  }
}

class CalendarCreateTool extends Tool {
  name = "calendar_create";
  description = "Create a new calendar event";
  parameters = {
    title: {
      type: "string",
      description: "The title of the event",
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
    allDay: {
      type: "boolean",
      description: "Whether this is an all-day event",
    },
  };

  async execute(
    entity: Entity,
    parameters: Record<string, any>
  ): Promise<ToolResponse> {
    const { title, description, startTime, endTime, allDay } = parameters;

    if (!title || !startTime || !endTime) {
      logger.error("Missing required parameters");
      return "Please provide all required parameters: title, startTime, and endTime";
    }

    try {
      // Create a client with the entity's access key
      const client = new ApiClient(
        API_CONFIG.baseURL,
        entity.options.access_key
      );

      const eventRequest = {
        calendar: 1, // Since we don't specify a calendar ID anymore, default to primary (ID 1)
        title,
        description,
        start_time: startTime,
        end_time: endTime,
        all_day: allDay || false,
      };

      const response = await client.createEvent(eventRequest);

      logger.info(`Created event: ${title}`);
      return JSON.stringify(response);
    } catch (error) {
      logger.error("Error creating calendar event:", error);
      return "Failed to create calendar event";
    }
  }
}

class CalendarUpdateTool extends Tool {
  name = "calendar_update";
  description = "Update an existing calendar event";
  parameters = {
    eventId: {
      type: "string",
      description: "The ID of the event to update",
    },
    title: {
      type: "string",
      description: "The updated title of the event",
    },
    description: {
      type: "string",
      description: "Optional updated description of the event",
    },
    startTime: {
      type: "string",
      description: "Updated start time of the event (ISO format)",
    },
    endTime: {
      type: "string",
      description: "Updated end time of the event (ISO format)",
    },
    allDay: {
      type: "boolean",
      description: "Whether this is an all-day event",
    },
  };

  async execute(
    entity: Entity,
    parameters: Record<string, any>
  ): Promise<ToolResponse> {
    const { eventId, title, description, startTime, endTime, allDay } =
      parameters;

    if (
      !eventId ||
      (!title && !description && !startTime && !endTime && allDay === undefined)
    ) {
      logger.error("Missing required parameters");
      return "Please provide an event ID and at least one field to update";
    }

    try {
      // Create a client with the entity's access key
      const client = new ApiClient(
        API_CONFIG.baseURL,
        entity.options.access_key
      );

      const updateData: any = {
        calendar: 1, // Since we don't specify a calendar ID anymore, default to primary (ID 1)
      };

      if (title !== undefined) updateData.title = title;
      if (description !== undefined) updateData.description = description;
      if (startTime !== undefined) updateData.start_time = startTime;
      if (endTime !== undefined) updateData.end_time = endTime;
      if (allDay !== undefined) updateData.all_day = allDay;

      const response = await client.patchEvent(eventId, updateData);

      logger.info(`Updated event ${eventId}`);
      return JSON.stringify(response);
    } catch (error) {
      logger.error("Error updating calendar event:", error);
      return "Failed to update calendar event";
    }
  }
}

class CalendarDeleteTool extends Tool {
  name = "calendar_delete";
  description = "Delete a calendar event";
  parameters = {
    eventId: {
      type: "string",
      description: "The ID of the event to delete",
    },
  };

  async execute(
    entity: Entity,
    parameters: Record<string, any>
  ): Promise<ToolResponse> {
    const { eventId } = parameters;

    if (!eventId) {
      logger.error("Missing event ID");
      return "Please provide an event ID";
    }

    try {
      // Create a client with the entity's access key
      const client = new ApiClient(
        API_CONFIG.baseURL,
        entity.options.access_key
      );

      await client.deleteEvent(eventId);

      logger.info(`Deleted event ${eventId}`);
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
    "Allows the entity to read, create, update, and delete calendar events.";
  tools: Tool[] = [
    new CalendarReadTool(),
    new CalendarGetEventTool(),
    new CalendarCreateTool(),
    new CalendarUpdateTool(),
    new CalendarDeleteTool(),
  ];
}
