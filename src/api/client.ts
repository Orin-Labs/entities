import axios, {
  AxiosInstance,
  AxiosRequestConfig,
} from 'axios';

import { API_CONFIG } from './config';

// Type definitions based on the OpenAPI spec
export interface Calendar {
  id: number;
  name: string;
  description?: string;
  color: string;
  is_primary: boolean;
  created_at: string;
  updated_at: string;
}

export interface CalendarRequest {
  name: string;
  description?: string;
  color: string;
  is_primary: boolean;
}

export interface CalendarEvent {
  id: number;
  calendar: number;
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  all_day: boolean;
  location?: string;
  contacts: Contact[];
  created_at: string;
  updated_at: string;
}

export interface CalendarEventRequest {
  calendar: number;
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  all_day: boolean;
  location?: string;
  contact_ids?: number[];
}

export interface Contact {
  id: number;
  name: string;
  phone_number: string;
  email: string;
  created_at: string;
  updated_at: string;
}

export interface ContactRequest {
  name: string;
  phone_number: string;
  email: string;
}

export class ApiClient {
  private client: AxiosInstance;

  constructor(baseURL: string = API_CONFIG.baseURL, entityAccessKey?: string) {
    const config: AxiosRequestConfig = {
      baseURL,
      headers: {
        "Content-Type": "application/json",
      },
    };

    if (entityAccessKey) {
      config.headers = {
        ...config.headers,
        "X-Entity-Access-Key": entityAccessKey,
      };
    }

    this.client = axios.create(config);
  }

  // Calendar endpoints
  async listCalendars(): Promise<Calendar[]> {
    const response = await this.client.get("/api/calendars/calendars/");
    return response.data;
  }

  async createCalendar(calendar: CalendarRequest): Promise<Calendar> {
    const response = await this.client.post(
      "/api/calendars/calendars/",
      calendar
    );
    return response.data;
  }

  async getCalendar(id: string): Promise<Calendar> {
    const response = await this.client.get(`/api/calendars/calendars/${id}/`);
    return response.data;
  }

  async updateCalendar(
    id: string,
    calendar: CalendarRequest
  ): Promise<Calendar> {
    const response = await this.client.put(
      `/api/calendars/calendars/${id}/`,
      calendar
    );
    return response.data;
  }

  async patchCalendar(
    id: string,
    calendar: Partial<CalendarRequest>
  ): Promise<Calendar> {
    const response = await this.client.patch(
      `/api/calendars/calendars/${id}/`,
      calendar
    );
    return response.data;
  }

  async deleteCalendar(id: string): Promise<void> {
    await this.client.delete(`/api/calendars/calendars/${id}/`);
  }

  // Calendar events endpoints
  async listEvents(): Promise<CalendarEvent[]> {
    const response = await this.client.get("/api/calendars/events/");
    return response.data;
  }

  async createEvent(event: CalendarEventRequest): Promise<CalendarEvent> {
    const response = await this.client.post("/api/calendars/events/", event);
    return response.data;
  }

  async getEvent(id: string): Promise<CalendarEvent> {
    const response = await this.client.get(`/api/calendars/events/${id}/`);
    return response.data;
  }

  async updateEvent(
    id: string,
    event: CalendarEventRequest
  ): Promise<CalendarEvent> {
    const response = await this.client.put(
      `/api/calendars/events/${id}/`,
      event
    );
    return response.data;
  }

  async patchEvent(
    id: string,
    event: Partial<CalendarEventRequest>
  ): Promise<CalendarEvent> {
    const response = await this.client.patch(
      `/api/calendars/events/${id}/`,
      event
    );
    return response.data;
  }

  async deleteEvent(id: string): Promise<void> {
    await this.client.delete(`/api/calendars/events/${id}/`);
  }

  // Contacts endpoints
  async listContacts(): Promise<Contact[]> {
    const response = await this.client.get("/api/entities/contacts/");
    return response.data;
  }

  async createContact(contact: ContactRequest): Promise<Contact> {
    const response = await this.client.post("/api/entities/contacts/", contact);
    return response.data;
  }

  async getContact(id: string): Promise<Contact> {
    const response = await this.client.get(`/api/entities/contacts/${id}/`);
    return response.data;
  }

  async updateContact(id: string, contact: ContactRequest): Promise<Contact> {
    const response = await this.client.put(
      `/api/entities/contacts/${id}/`,
      contact
    );
    return response.data;
  }

  async patchContact(
    id: string,
    contact: Partial<ContactRequest>
  ): Promise<Contact> {
    const response = await this.client.patch(
      `/api/entities/contacts/${id}/`,
      contact
    );
    return response.data;
  }

  async deleteContact(id: string): Promise<void> {
    await this.client.delete(`/api/entities/contacts/${id}/`);
  }

  // SMS endpoints
  async getEntityMessages(): Promise<any> {
    const response = await this.client.get("/api/sms/entity-messages/");
    return response.data;
  }

  async sendEntityMessage(to: string, body: string): Promise<any> {
    console.log("Sending entity message to", to, body);
    const response = await this.client.post("/api/sms/entity-messages/", {
      to,
      body,
    });
    return response.data;
  }
}

export default ApiClient;
