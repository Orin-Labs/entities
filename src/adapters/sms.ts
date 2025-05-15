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

    const parsedPhoneNumber = parsePhoneNumber(phoneNumber, "US");
    if (!parsedPhoneNumber.isValid()) {
      logger.error("Invalid phone number format", phoneNumber);
      return "Invalid phone number format. Please use the format +1XXXXXXXXXX";
    }

    const client = new ApiClient(API_CONFIG.baseURL, entity.options.access_key);

    logger.info(`Getting messages for phone number: ${phoneNumber}`);
    const response = await client.getEntityMessages();
    return JSON.stringify(response);
  }
}

class SMSSendTool extends Tool {
  name = "sms_send";
  description = `Send a message via SMS. Always read your messages before deciding what to do.
  Never text twice in a row. Keep texts short and concise, match the tone of the person you're texting.`;
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

    const parsedPhoneNumber = parsePhoneNumber(phoneNumber, "US");
    if (!parsedPhoneNumber.isValid()) {
      logger.error("Invalid phone number format", phoneNumber);
      return "Invalid phone number format. Please use the format +1XXXXXXXXXX";
    }

    const client = new ApiClient(API_CONFIG.baseURL, entity.options.access_key);

    const messageData = {
      to: phoneNumber,
      body: message,
    };

    logger.info(`Sending message with data: ${JSON.stringify(messageData)}`);
    const response = await client.sendEntityMessage(messageData);
    return JSON.stringify(response);
  }
}

export class SMSAdapter extends Adapter {
  name = "sms";
  description = "Allows the entity to read and send messages to SMS.";
  tools: Tool[] = [new SMSReadTool(), new SMSSendTool()];
}
