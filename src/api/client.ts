import axios, {
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
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

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    details?: any;
  };
}

export class ApiClient {
  private client: AxiosInstance;

  constructor(baseURL: string = API_CONFIG.baseURL, entityAccessKey?: string) {
    const config: AxiosRequestConfig = {
      baseURL,
      headers: {
        "Content-Type": "application/json",
      },
      validateStatus: () => true, // Don't throw on any status code
    };

    if (entityAccessKey) {
      config.headers = {
        ...config.headers,
        "X-Entity-Access-Key": entityAccessKey,
      };
    }

    this.client = axios.create(config);
  }

  // Helper method to process responses
  private async processResponse<T>(
    promise: Promise<AxiosResponse>
  ): Promise<ApiResponse<T>> {
    try {
      const response = await promise;

      if (response.status >= 200 && response.status < 300) {
        return {
          success: true,
          data: response.data,
        };
      } else {
        return {
          success: false,
          error: {
            message:
              response.data?.error ||
              `Request failed with status ${response.status}`,
            details: response.data,
          },
        };
      }
    } catch (err) {
      const error = err as Error;
      return {
        success: false,
        error: {
          message: error.message || "Unknown error occurred",
          details: error,
        },
      };
    }
  }

  // Calendar endpoints
  async listCalendars(): Promise<ApiResponse<Calendar[]>> {
    return this.processResponse<Calendar[]>(
      this.client.get("/api/calendars/calendars/")
    );
  }

  async createCalendar(
    calendar: CalendarRequest
  ): Promise<ApiResponse<Calendar>> {
    return this.processResponse<Calendar>(
      this.client.post("/api/calendars/calendars/", calendar)
    );
  }

  async getCalendar(id: string): Promise<ApiResponse<Calendar>> {
    return this.processResponse<Calendar>(
      this.client.get(`/api/calendars/calendars/${id}/`)
    );
  }

  async updateCalendar(
    id: string,
    calendar: CalendarRequest
  ): Promise<ApiResponse<Calendar>> {
    return this.processResponse<Calendar>(
      this.client.put(`/api/calendars/calendars/${id}/`, calendar)
    );
  }

  async patchCalendar(
    id: string,
    calendar: Partial<CalendarRequest>
  ): Promise<ApiResponse<Calendar>> {
    return this.processResponse<Calendar>(
      this.client.patch(`/api/calendars/calendars/${id}/`, calendar)
    );
  }

  async deleteCalendar(id: string): Promise<ApiResponse<void>> {
    return this.processResponse<void>(
      this.client.delete(`/api/calendars/calendars/${id}/`)
    );
  }

  // Calendar events endpoints
  async listEvents(): Promise<ApiResponse<CalendarEvent[]>> {
    return this.processResponse<CalendarEvent[]>(
      this.client.get("/api/calendars/events/")
    );
  }

  async createEvent(
    event: CalendarEventRequest
  ): Promise<ApiResponse<CalendarEvent>> {
    return this.processResponse<CalendarEvent>(
      this.client.post("/api/calendars/events/", event)
    );
  }

  async getEvent(id: string): Promise<ApiResponse<CalendarEvent>> {
    return this.processResponse<CalendarEvent>(
      this.client.get(`/api/calendars/events/${id}/`)
    );
  }

  async updateEvent(
    id: string,
    event: CalendarEventRequest
  ): Promise<ApiResponse<CalendarEvent>> {
    return this.processResponse<CalendarEvent>(
      this.client.put(`/api/calendars/events/${id}/`, event)
    );
  }

  async patchEvent(
    id: string,
    event: Partial<CalendarEventRequest>
  ): Promise<ApiResponse<CalendarEvent>> {
    return this.processResponse<CalendarEvent>(
      this.client.patch(`/api/calendars/events/${id}/`, event)
    );
  }

  async deleteEvent(id: string): Promise<ApiResponse<void>> {
    return this.processResponse<void>(
      this.client.delete(`/api/calendars/events/${id}/`)
    );
  }

  // Contacts endpoints
  async listContacts(): Promise<ApiResponse<Contact[]>> {
    return this.processResponse<Contact[]>(
      this.client.get("/api/entities/contacts/")
    );
  }

  async createContact(contact: ContactRequest): Promise<ApiResponse<Contact>> {
    return this.processResponse<Contact>(
      this.client.post("/api/entities/contacts/", contact)
    );
  }

  async getContact(id: string): Promise<ApiResponse<Contact>> {
    return this.processResponse<Contact>(
      this.client.get(`/api/entities/contacts/${id}/`)
    );
  }

  async updateContact(
    id: string,
    contact: ContactRequest
  ): Promise<ApiResponse<Contact>> {
    return this.processResponse<Contact>(
      this.client.put(`/api/entities/contacts/${id}/`, contact)
    );
  }

  async patchContact(
    id: string,
    contact: Partial<ContactRequest>
  ): Promise<ApiResponse<Contact>> {
    return this.processResponse<Contact>(
      this.client.patch(`/api/entities/contacts/${id}/`, contact)
    );
  }

  async deleteContact(id: string): Promise<ApiResponse<void>> {
    return this.processResponse<void>(
      this.client.delete(`/api/entities/contacts/${id}/`)
    );
  }

  // SMS endpoints
  async getEntityMessages(): Promise<ApiResponse<any>> {
    return this.processResponse<any>(
      this.client.get("/api/sms/entity-messages/")
    );
  }

  async sendEntityMessage(data: any): Promise<ApiResponse<any>> {
    return this.processResponse<any>(
      this.client.post("/api/sms/entity-messages/", data)
    );
  }
}

export default ApiClient;
