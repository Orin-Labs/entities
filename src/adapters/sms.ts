import { rl } from '../';
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
  parameters = {};

  async execute(entity: Entity): Promise<ToolResponse> {
    logger.info("Reading SMS");

    return new Promise((resolve) => {
      rl.question("Enter SMS message content: ", resolve);
    });
  }
}

class SMSSendTool extends Tool {
  name = "sms_send";
  description = "Send a message to SMS";
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
    logger.info("Sending SMS", parameters);
    return "SMS sent";
  }
}

export class SMSAdapter extends Adapter {
  name = "sms";
  description = "Allows the entity to read and send messages to SMS.";
  tools: Tool[] = [new SMSReadTool(), new SMSSendTool()];
}
