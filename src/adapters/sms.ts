import axios from 'axios';
import { parsePhoneNumber } from 'libphonenumber-js';

import { Entity } from '../entity';
import {
  Tool,
  ToolResponse,
} from '../tools';
import { logger } from '../utils';
import { Adapter } from './index';

const SMS_SERVER_URL = process.env.SMS_SERVER_URL || "http://localhost:3000";

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
      const response = await axios.get(
        `${SMS_SERVER_URL}/conversations/${parsedPhoneNumber.number}`
      );
      const conversation = response.data;

      if (!conversation.messages.length) {
        logger.error("No messages found for this number");
        return "No messages found for this number";
      }

      // Get the most recent 100 messages
      const last100Messages = conversation.messages.slice(-100);
      logger.info(
        `Found ${last100Messages.length} messages for ${phoneNumber}`
      );
      return JSON.stringify(last100Messages);
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
      await axios.post(`${SMS_SERVER_URL}/send_message`, {
        message,
        phoneNumber,
      });

      logger.info("SMS sent successfully");
      return "SMS sent successfully";
    } catch (error) {
      logger.error("Error sending SMS:", error);
      return "Failed to send SMS";
    }
  }
}

export class SMSAdapter extends Adapter {
  name = "sms";
  description = "Allows the entity to read and send messages to SMS.";
  tools: Tool[] = [new SMSReadTool(), new SMSSendTool()];
}
