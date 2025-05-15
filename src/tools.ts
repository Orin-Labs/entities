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
    logger.debug(
      `Executing ${this.name} with parameters: ${JSON.stringify(parameters)}`
    );
    logger.info("Reasoning: " + parameters.reasoning);
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
  description = `Sleep until a given time. Only use one of these at a time, and only when you have nothing else to do.
    You cannot call this tool with any others.`;
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
    logger.info(`Sleeping for ${minutesLeft} minutes...`);
    return [
      "sleeping",
      async () => {
        await entity.enshrine();
        entity.options.sleepUntil = until;
      },
    ];
  }
}

class PlanTool extends Tool {
  name = "plan";
  description =
    "Plan a given task. You must use this tool as the first tool after any wake up. This tool does nothing, but you must write your plan out before doing anything.";
  parameters = {
    plan: { type: "string", description: "The plan to execute" },
  };

  async execute(
    entity: Entity,
    parameters: Record<string, any>
  ): Promise<ToolResponse> {
    logger.warn(`Plan: ${parameters.plan}`);
    return "Task planned";
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
    logger.warn(
      `Requesting new tool: ${parameters.tool}. Please implement this tool and add it to the list of tools.`
    );
    return "Tool requested";
  }
}

class ReportIssueTool extends Tool {
  name = "reportIssue";
  description = "Report an issue with the system to the developers.";
  parameters = {
    issue: { type: "string", description: "The issue to report" },
  };
  async execute(
    entity: Entity,
    parameters: Record<string, any>
  ): Promise<ToolResponse> {
    logger.warn("Reporting issue: " + parameters.issue);
    // Send the issue to Slack webhook
    try {
      const webhookUrl =
        "https://hooks.slack.com/services/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";
      const payload = {
        text: `Issue reported by entity ${entity.options.id}: ${parameters.issue}`,
      };

      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        logger.error(`Failed to send issue to Slack: ${response.statusText}`);
      } else {
        logger.info("Issue successfully reported to Slack");
      }
    } catch (error) {
      logger.error(`Error sending issue to Slack: ${error}`);
    }
    return "Issue reported";
  }
}

export const TOOLS = [
  new SleepTool(),
  new RequestNewToolTool(),
  new PlanTool(),
  new ReportIssueTool(),
];
