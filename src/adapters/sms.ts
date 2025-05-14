import { parsePhoneNumber } from 'libphonenumber-js';

import { ApiClient } from '../api';
import { API_CONFIG } from '../api/config';
import { Entity } from '../entity';
import {
  Tool,
  ToolResponse,
} from '../tools';
import { logger } from '../utils';
import { Adapter } from './index';

class SMSReadTool extends Tool {
  name = "sms_read";
  description = "Read a message from SMS";
  parameters = {
    phoneNumber: {
      type: "string",
      description: "The phone number to read messages from",
    },
  };

  async execute(
    entity: Entity,
    parameters: Record<string, any>
  ): Promise<ToolResponse> {
    const { phoneNumber } = parameters;

    if (!phoneNumber) {
      logger.error("No phone number provided");
      return "Please provide a phone number to read messages from";
    }

    try {
      const parsedPhoneNumber = parsePhoneNumber(phoneNumber, "US");
      if (!parsedPhoneNumber.isValid()) {
        logger.error("Invalid phone number format", phoneNumber);
        return "Invalid phone number format. Please use the format +1XXXXXXXXXX";
      }

      // Create a client with the entity's access key
      const client = new ApiClient(
        API_CONFIG.baseURL,
        entity.options.access_key
      );

      // Get messages using the API endpoint
      const messages = await client.getEntityMessages();

      // Filter messages for the specific phone number if needed
      // This depends on how the API actually returns the messages

      if (!messages || (Array.isArray(messages) && !messages.length)) {
        logger.error("No messages found for this number");
        return "No messages found for this number";
      }

      logger.info(`Retrieved messages for ${phoneNumber}`);
      return JSON.stringify(messages);
    } catch (error) {
      logger.error("Error reading SMS:", error);
      return "Failed to read messages";
    }
  }
}

class SMSSendTool extends Tool {
  name = "sms_send";
  description =
    "Send a message via SMS. Always read your messages before deciding what to do. Never text twice in a row. Keep texts short and concise.";
  parameters = {
    message: { type: "string", description: "The message to send" },
    phoneNumber: {
      type: "string",
      description: "The phone number to send the message to",
    },
  };

  async execute(
    entity: Entity,
    parameters: Record<string, any>
  ): Promise<ToolResponse> {
    const { message, phoneNumber } = parameters;

    if (!message || !phoneNumber) {
      logger.error("No message or phone number provided");
      return "Please provide both a message and a phone number";
    }

    try {
      const parsedPhoneNumber = parsePhoneNumber(phoneNumber, "US");
      if (!parsedPhoneNumber.isValid()) {
        logger.error("Invalid phone number format", phoneNumber);
        return "Invalid phone number format. Please use the format +1XXXXXXXXXX";
      }

      // Create a client with the entity's access key
      const client = new ApiClient(
        API_CONFIG.baseURL,
        entity.options.access_key
      );

      // Send message using the API endpoint
      await client.sendEntityMessage(phoneNumber, message);

      logger.info("SMS sent successfully");
      return "SMS sent successfully";
    } catch (error: any) {
      logger.error("Error sending SMS to " + phoneNumber + ":", error.response);
      return "Failed to send SMS to " + phoneNumber + ". " + error.response;
    }
  }
}

export class SMSAdapter extends Adapter {
  name = "sms";
  description = "Allows the entity to read and send messages to SMS.";
  tools: Tool[] = [new SMSReadTool(), new SMSSendTool()];
}
