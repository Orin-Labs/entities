import { SMSAdapter } from './sms';

export const ADAPTERS = [new SMSAdapter()] as const;
