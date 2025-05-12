import { Entity } from '../entity';
import { Tool } from '../tools';
import { Adapter } from './';

class CalendarReadTool extends Tool {
  name = "calendar_read";
  description = "Read the calendar";
  parameters = {};
  async execute(entity: Entity) {
    return "Calendar read";
  }
}

export class CalendarAdapter extends Adapter {
  name = "calendar";
  description = "Allows the entity to read from the calendar.";
  tools: Tool[] = [new CalendarReadTool()];
}
