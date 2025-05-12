import dedent from 'dedent';
import fs from 'fs';
import OpenAI from 'openai';
import { ChatCompletionMessageParam } from 'openai/resources/chat';

import { Adapter } from './adapters';
import { ADAPTERS } from './adapters/list';
import { Memory } from './memory';
import { TOOLS } from './tools';
import { logger } from './utils';

export type EntityOptions = {
  id: string;
  model: string;
  stm: Memory<ChatCompletionMessageParam>;
  ltm: Memory<string>; // long term memory
  adapters?: Adapter[];
  timeOffset?: number;
  sleepUntil?: Date | null;
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
  }

  getCurrentTime() {
    return new Date(Date.now() + (this.options.timeOffset || 0) * 60 * 1000);
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
        id: "new-entity",
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
          adapters: this.options.adapters?.map((a) => a.name),
          stm: this.options.stm.messages,
          ltm: this.options.ltm.messages,
          timeOffset: this.options.timeOffset,
          sleepUntil: this.options.sleepUntil
            ? this.options.sleepUntil.getTime()
            : null,
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

    // Run until entity goes to sleep
    while (this.options.sleepUntil === null) {
      // Get completion from AI
      const response = await this.openai.chat.completions.create({
        model: this.options.model,
        messages: this.construct(
          this.options.stm.asChatCompletionMessageParams()
        ),
        tools: tools.map((t) => t.toSchema()),
        tool_choice: "required",
      });

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
      logger.info("No sleep time set, skipping wakeup check");
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
