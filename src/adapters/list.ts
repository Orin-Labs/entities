import { CalendarAdapter } from './calendar';
import { ContactsAdapter } from './contacts';
import { SMSAdapter } from './sms';

export const ADAPTERS = [
  new SMSAdapter(),
  new CalendarAdapter(),
  new ContactsAdapter(),
];
