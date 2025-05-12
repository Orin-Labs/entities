import { CalendarAdapter } from './calendar';
import { SMSAdapter } from './sms';

export const ADAPTERS = [new SMSAdapter(), new CalendarAdapter()] as const;
