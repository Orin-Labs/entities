import OpenAI from 'openai';
import { sleep } from 'openai/core';
import { ChatCompletionMessageParam } from 'openai/resources/chat';

import { logger } from './utils';

type MemoryType = ChatCompletionMessageParam | string;

export class Memory<T extends MemoryType> {
  openai: OpenAI = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  constructor(
    public messages: Record<string, T>,
    public model: string,
    public timeOffset: number = 0
  ) {}

  getCurrentTime() {
    return new Date(Date.now() + this.timeOffset * 60 * 1000);
  }

  async add(message: T) {
    this.messages[this.getCurrentTime().toISOString()] = message;
    await sleep(10);
  }

  asChatCompletionMessageParams(): ChatCompletionMessageParam[] {
    if (Object.keys(this.messages).length === 0) {
      return [];
    }
    if (typeof Object.values(this.messages)[0] === "string") {
      return Object.values(this.messages).map((message) => ({
        role: "user",
        content: message as string,
      }));
    }
    return Object.values(this.messages) as ChatCompletionMessageParam[];
  }

  async enshrine(parent?: Memory<MemoryType>): Promise<string> {
    if (Object.keys(this.messages).length === 0) {
      logger.info("No short term memory to enshrine");
      return "";
    }

    const messages = this.asChatCompletionMessageParams();
    const prompt = `
      [Current date and time: ${this.getCurrentTime().toISOString()}]
      Conversation complete. Summarize the conversation for storage in long term memory. What happened?
      What is worth remembering? Your response will be filed away in long term memory.

      Don't worry about the date information. You can remark on the communication channel and identity if
      you think it's relevant. Treat this like a journal entry.
    `;

    const response = await this.openai.chat.completions.create({
      model: this.model,
      messages: [...messages, { role: "system", content: prompt }],
    });
    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("No summary from OpenAI");
    }
    this.messages = {};
    return content;
  }

  clear() {
    this.messages = {};
  }

  toString() {
    return JSON.stringify(this.messages);
  }

  shiftTime(minutes: number) {
    this.timeOffset += minutes;
  }
}
