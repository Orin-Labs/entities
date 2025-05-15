import dedent from 'dedent';
import fs from 'fs';
import OpenAI from 'openai';
import { ChatCompletionMessageParam } from 'openai/resources/chat';
import path from 'path';

import { Adapter } from './adapters';
import { ADAPTERS } from './adapters/list';
import { Memory } from './memory';
import {
  getEntitiesListKey,
  getEntityKey,
  redis,
} from './redis/config';
import { TOOLS } from './tools';
import { logger } from './utils';

export type EntityOptions = {
  id: string;
  model: string;
  stm: Memory<ChatCompletionMessageParam>;
  ltm: Memory<string>; // long term memory
  maxMessages?: number;
  adapters?: Adapter[];
  timeOffset?: number;
  sleepUntil?: Date | null;
  access_key?: string; // Access key for API authentication
};

type ChatOptions = {
  channel?: "sms" | "email" | "live-web-tutoring" | "phone";
  identity?: string;
};

export class Entity {
  private openai: OpenAI = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
  systemPrompt: string = `
    You are an autonomous AI tutor named Orin, but you act very human. You're not just a chatbot - you exist even
    when you aren't interacting with the user. Don't be overly verbose.

    Your goal is to make sure that you have an effective, healthy engagement with this student (and possibly parents).
    A healthy engagement is one where the customers are happy and you are actively working towards their goals with them.

    If you do not have lessons booked with the student, you should reach out to them or the parent to try and book lessons.

    If students are not attending lessons, you should let the parent know, then figure out why they are not attending.

    Do not hallucinate - use your tools to check any assumptions, and be curious. Only ever use one tool at a time.
  `;

  constructor(public options: EntityOptions) {
    if (!options.timeOffset) {
      options.timeOffset = 0;
    }

    if (!options.adapters) {
      options.adapters = [];
    }

    if (!options.sleepUntil) {
      options.sleepUntil = null;
    }

    if (!options.maxMessages) {
      options.maxMessages = 20;
    }
  }

  getCurrentTime() {
    return new Date(Date.now() + (this.options.timeOffset || 0) * 60 * 1000);
  }

  static async importFromRedis(id: string) {
    try {
      const entityKey = getEntityKey(id);
      const content = await redis.get(entityKey);

      if (!content) {
        throw new Error(`Entity ${id} not found in Redis`);
      }

      const options = JSON.parse(content);
      if (!options.adapters) {
        options.adapters = [];
      } else {
        options.adapters = options.adapters
          .map((adapter: string) => ADAPTERS.find((a) => a.name === adapter))
          .filter((a: Adapter | undefined) => a !== undefined);
      }

      logger.info(
        `Imported entity with a time offset of ${
          options.timeOffset || 0
        } minutes, ${options.adapters.length} adapters and ${
          options.adapters.flatMap((a: Adapter) => a.tools).length +
          TOOLS.length
        } tools: ${options.adapters.map((a: Adapter) => a.name).join(", ")}`
      );

      return new Entity({
        id: options.id,
        stm: new Memory<ChatCompletionMessageParam>(
          options.stm,
          options.model,
          options.timeOffset
        ),
        ltm: new Memory<string>(options.ltm, options.model, options.timeOffset),
        model: options.model,
        adapters: options.adapters,
        timeOffset: options.timeOffset,
        sleepUntil: options.sleepUntil ? new Date(options.sleepUntil) : null,
        maxMessages: options.maxMessages,
        access_key: options.access_key,
      });
    } catch (error) {
      const model = "gpt-4.1-mini";
      const entity = new Entity({
        id: "new-entity",
        stm: new Memory<ChatCompletionMessageParam>({}, model),
        ltm: new Memory<string>({}, model),
        model: model,
        adapters: [],
        timeOffset: 0,
        sleepUntil: null,
        access_key: undefined,
      });
      await entity.exportToRedis();
      return entity;
    }
  }

  async exportToRedis() {
    const entityKey = getEntityKey(this.options.id);
    const entitiesListKey = getEntitiesListKey();

    const entityData = {
      ...this.options,
      maxMessages: this.options.maxMessages,
      adapters: this.options.adapters?.map((a) => a.name),
      stm: this.options.stm.messages,
      ltm: this.options.ltm.messages,
      timeOffset: this.options.timeOffset,
      sleepUntil: this.options.sleepUntil
        ? this.options.sleepUntil.getTime()
        : null,
      access_key: this.options.access_key,
    };

    try {
      // Store the entity data
      await redis.set(entityKey, JSON.stringify(entityData));

      // Add to the list of entities
      await redis.sadd(entitiesListKey, this.options.id);

      logger.info(`Entity ${this.options.id} exported to Redis successfully`);
    } catch (error) {
      logger.error(`Error exporting entity to Redis: ${error}`);
      throw error;
    }
  }

  static importFromFile(path: string) {
    try {
      const content = fs.readFileSync(path, "utf8");
      const options = JSON.parse(content);
      if (!options.adapters) {
        options.adapters = [];
      } else {
        options.adapters = options.adapters
          .map((adapter: string) => ADAPTERS.find((a) => a.name === adapter))
          .filter((a: Adapter | undefined) => a !== undefined);
      }
      logger.info(
        `Imported entity with a time offset of ${
          options.timeOffset || 0
        } minutes, ${options.adapters.length} adapters and ${
          options.adapters.flatMap((a: Adapter) => a.tools).length +
          TOOLS.length
        } tools: ${options.adapters.map((a: Adapter) => a.name).join(", ")}`
      );
      return new Entity({
        id: options.id,
        stm: new Memory<ChatCompletionMessageParam>(
          options.stm,
          options.model,
          options.timeOffset
        ),
        ltm: new Memory<string>(options.ltm, options.model, options.timeOffset),
        model: options.model,
        adapters: options.adapters,
        timeOffset: options.timeOffset,
        sleepUntil: options.sleepUntil ? new Date(options.sleepUntil) : null,
        maxMessages: options.maxMessages,
        access_key: options.access_key,
      });
    } catch (error) {
      const model = "gpt-4.1-mini";
      const entity = new Entity({
        id: "new-entity",
        stm: new Memory<ChatCompletionMessageParam>({}, model),
        ltm: new Memory<string>({}, model),
        model: model,
        adapters: [],
        timeOffset: 0,
        sleepUntil: null,
        access_key: undefined,
      });
      entity.exportToFile(path);
      return entity;
    }
  }

  exportToFile(path: string) {
    fs.writeFile(
      path,
      JSON.stringify(
        {
          ...this.options,
          maxMessages: this.options.maxMessages,
          adapters: this.options.adapters?.map((a) => a.name),
          stm: this.options.stm.messages,
          ltm: this.options.ltm.messages,
          timeOffset: this.options.timeOffset,
          sleepUntil: this.options.sleepUntil
            ? this.options.sleepUntil.getTime()
            : null,
          access_key: this.options.access_key,
        },
        null,
        2
      ),
      (err) => {
        if (err) {
          logger.error("Error writing file", err);
        }
      }
    );
  }

  async enshrine() {
    const result = await this.options.stm.enshrine();
    await this.options.ltm.add(result);
    this.options.stm.clear();
  }

  private construct(
    messages: ChatCompletionMessageParam[]
  ): ChatCompletionMessageParam[] {
    return [
      {
        role: "system",
        content: dedent`
          Here is your long-term memory:
          ${this.options.ltm.toString()}
          ----
          Current date and time: ${this.getCurrentTime().toISOString()}
          ----`,
      },
      {
        role: "system",
        content: dedent`
          You have access to the following adapters:
          ${this.options.adapters
            ?.map((adapter) => {
              return `- ${adapter.name}: ${adapter.description}
              Tools:
              ${adapter.tools
                .map((tool) => `  - ${tool.name}: ${tool.description}`)
                .join("\n")}`;
            })
            .join("\n\n")}
        `,
      },
      {
        role: "system",
        content: this.systemPrompt,
      },
      ...messages,
    ];
  }

  async run() {
    this.options.sleepUntil = null;

    // Collect all available tools from adapters and global tools
    const tools = [
      ...(this.options.adapters?.flatMap((a) => a.tools) || []),
      ...TOOLS,
    ];
    const wakeUpMessage: ChatCompletionMessageParam = {
      role: "system",
      content: dedent`
        You are being woken up from sleep. Check on things and continue towards your goals. If nothing
        needs to be done, go back to sleep. You must check everything before sleeping again.

        When communicating with others, think deeply about how your interactions might be perceived. You
        want to come off a attentive and controlled, but not overbearing or annoying.
      `,
    };
    await this.options.stm.add(wakeUpMessage);

    // Run until entity goes to sleep
    let i = 0;
    while (this.options.sleepUntil === null && i < this.options.maxMessages!) {
      // Get completion from AI
      const response = await this.openai.chat.completions.create({
        model: this.options.model,
        messages: this.construct(
          this.options.stm.asChatCompletionMessageParams()
        ),
        tools: tools.map((t) => t.toSchema()),
        tool_choice: "required",
      });
      i++;

      // Store AI response in short-term memory
      await this.options.stm.add(response.choices[0].message);

      // Process any tool calls from the response
      if (response.choices[0].message.tool_calls) {
        const toolCall = response.choices[0].message.tool_calls[0];

        const tool = tools.find((t) => t.name === toolCall.function.name);
        if (!tool) continue;

        const toolResponse = await tool._execute(
          this,
          JSON.parse(toolCall.function.arguments)
        );

        // Store tool response in short-term memory
        await this.options.stm.add({
          role: "tool",
          content:
            typeof toolResponse === "string" ? toolResponse : toolResponse[0],
          tool_call_id: toolCall.id,
        });

        // Execute callback if provided
        if (typeof toolResponse !== "string") {
          await toolResponse[1]();
        }
      }

      // Force only one tool call per response
      if (
        response.choices[0].message.tool_calls &&
        response.choices[0].message.tool_calls.length > 1
      ) {
        response.choices[0].message.tool_calls =
          response.choices[0].message.tool_calls.slice(0, 1);
      }
    }

    // Export to file
    this.exportToFile(
      path.join(process.cwd(), "entities", `${this.options.id}.json`)
    );
  }

  async chat(message: string, options?: ChatOptions) {
    if (options?.channel) {
      message = `[Communication channel: ${options.channel}]\n${message}`;
    }
    if (options?.identity) {
      message = `[User identity: ${options.identity}]\n${message}`;
    }

    await this.options.stm.add({
      role: "user",
      content: message,
    });

    const response = await this.openai.chat.completions.create({
      model: this.options.model,
      messages: this.construct(
        this.options.stm.asChatCompletionMessageParams()
      ),
    });

    await this.options.stm.add(response.choices[0].message);
    return response.choices[0].message.content;
  }

  async checkWakeup() {
    if (
      this.options.sleepUntil === null ||
      this.options.sleepUntil === undefined
    ) {
      await this.run();
      return;
    }

    if (this.getCurrentTime() >= this.options.sleepUntil) {
      await this.run();
    } else {
      logger.info(
        `Not time to wake up yet, sleeping until ${this.options.sleepUntil.toISOString()} (${
          (this.options.sleepUntil.getTime() -
            this.getCurrentTime().getTime()) /
          (1000 * 60)
        }m left)`
      );
    }
  }

  shiftTime(minutes: number) {
    if (this.options.timeOffset === undefined) {
      this.options.timeOffset = 0;
    }
    this.options.timeOffset += minutes;
    this.options.stm.timeOffset += minutes;
    this.options.ltm.timeOffset += minutes;
  }
}
