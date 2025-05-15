import { ApiClient } from '../api';
import { API_CONFIG } from '../api/config';
import { Entity } from '../entity';
import {
  Tool,
  ToolResponse,
} from '../tools';
import { logger } from '../utils';
import { Adapter } from './index';

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
    const client = new ApiClient(API_CONFIG.baseURL, entity.options.access_key);

    logger.info("Listing events");
    const response = await client.listEvents();
    return JSON.stringify(response);
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

    const client = new ApiClient(API_CONFIG.baseURL, entity.options.access_key);

    logger.info(`Getting event ${eventId}`);
    const response = await client.getEvent(eventId);
    return JSON.stringify(response);
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

    const client = new ApiClient(API_CONFIG.baseURL, entity.options.access_key);

    const eventRequest = {
      calendar: 1, // Since we don't specify a calendar ID anymore, default to primary (ID 1)
      title,
      description,
      start_time: startTime,
      end_time: endTime,
      all_day: allDay || false,
    };

    logger.info(`Creating event with data: ${JSON.stringify(eventRequest)}`);
    const response = await client.createEvent(eventRequest);
    return JSON.stringify(response);
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

    const client = new ApiClient(API_CONFIG.baseURL, entity.options.access_key);

    const updateData: any = {
      calendar: 1, // Since we don't specify a calendar ID anymore, default to primary (ID 1)
    };

    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (startTime !== undefined) updateData.start_time = startTime;
    if (endTime !== undefined) updateData.end_time = endTime;
    if (allDay !== undefined) updateData.all_day = allDay;

    logger.info(
      `Updating event ${eventId} with data: ${JSON.stringify(updateData)}`
    );
    const response = await client.patchEvent(eventId, updateData);
    return JSON.stringify(response);
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

    logger.info(`Deleting event ${eventId}`);
    const client = new ApiClient(API_CONFIG.baseURL, entity.options.access_key);

    const response = await client.deleteEvent(eventId);
    return JSON.stringify(response);
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
