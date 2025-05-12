import { Tool } from '../tools';

export abstract class Adapter {
  abstract name: string;
  abstract description: string;
  abstract tools: Tool[];
}
