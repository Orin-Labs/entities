import { ChatCompletionTool } from 'openai/resources/chat';

import { Entity } from './entity';
import { logger } from './utils';

export type ToolResponse = string | [string, () => void | Promise<void>];

export abstract class Tool {
  abstract name: string;
  abstract description: string;
  abstract parameters: Record<string, any>;
  abstract execute(
    entity: Entity,
    parameters: Record<string, any>
  ): Promise<ToolResponse>;

  async _execute(
    entity: Entity,
    parameters: Record<string, any>
  ): Promise<ToolResponse> {
    logger.info(
      `Executing ${this.name} with parameters: ${JSON.stringify(parameters)}`
    );
    return this.execute(entity, parameters);
  }

  toSchema(): ChatCompletionTool {
    return {
      type: "function",
      function: {
        name: this.name,
        description: this.description,
        parameters: {
          type: "object",
          properties: {
            ...this.parameters,
            reasoning: {
              type: "string",
              description: "Reasoning about the action",
            },
          },
        },
      },
    };
  }
}

class SleepTool extends Tool {
  name = "sleep";
  description =
    "Sleep until a given time. Only use one of these at a time, and only when you have nothing else to do. You cannot call this tool with any others.";
  parameters = {
    until: { type: "string", description: "The time to sleep until" },
  };
  async execute(
    entity: Entity,
    parameters: Record<string, any>
  ): Promise<ToolResponse> {
    const until = new Date(parameters.until);
    const minutesLeft = Math.round(
      (until.getTime() - entity.getCurrentTime().getTime()) / 60000
    );
    console.log(`Sleeping for ${minutesLeft} minutes...`);
    return [
      "sleeping",
      async () => {
        await entity.enshrine();
        entity.options.sleepUntil = until;
      },
    ];
  }
}

class RequestNewToolTool extends Tool {
  name = "requestNewTool";
  description = "Request a new tool to be added to the system.";
  parameters = {
    tool: { type: "string", description: "The name of the tool to be added" },
  };
  async execute(
    entity: Entity,
    parameters: Record<string, any>
  ): Promise<ToolResponse> {
    logger.alert(
      `Requesting new tool: ${parameters.tool}. Please implement this tool and add it to the list of tools.`
    );
    return "Tool requested";
  }
}

export const TOOLS = [new SleepTool(), new RequestNewToolTool()];
