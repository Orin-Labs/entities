import { ApiClient } from '../api';
import { API_CONFIG } from '../api/config';
import { Entity } from '../entity';
import {
  Tool,
  ToolResponse,
} from '../tools';
import { logger } from '../utils';
import { Adapter } from './index';

class ContactsListTool extends Tool {
  name = "contacts_list";
  description = "List all contacts for the entity";
  parameters = {
    reasoning: { type: "string", description: "Reasoning about the action" },
  };

  async execute(
    entity: Entity,
    parameters: Record<string, any>
  ): Promise<ToolResponse> {
    const client = new ApiClient(API_CONFIG.baseURL, entity.options.access_key);

    logger.info("Listing contacts");
    const response = await client.listContacts();
    return JSON.stringify(response);
  }
}

class ContactsCreateTool extends Tool {
  name = "contacts_create";
  description = "Create a new contact for the entity";
  parameters = {
    name: {
      type: "string",
      description: "The name of the contact",
    },
    phone_number: {
      type: "string",
      description: "The phone number of the contact",
    },
    email: {
      type: "string",
      description: "The email address of the contact",
    },
  };

  async execute(
    entity: Entity,
    parameters: Record<string, any>
  ): Promise<ToolResponse> {
    const { name, phone_number, email } = parameters;

    const client = new ApiClient(API_CONFIG.baseURL, entity.options.access_key);

    const contactRequest = {
      name,
      phone_number,
      email,
    };

    logger.info(
      `Creating contact with data: ${JSON.stringify(contactRequest)}`
    );
    const response = await client.createContact(contactRequest);
    return JSON.stringify(response);
  }
}

class ContactsRetrieveTool extends Tool {
  name = "contacts_retrieve";
  description = "Retrieve a contact by ID";
  parameters = {
    id: {
      type: "string",
      description: "The ID of the contact to retrieve",
    },
  };

  async execute(
    entity: Entity,
    parameters: Record<string, any>
  ): Promise<ToolResponse> {
    const { id } = parameters;

    if (!id) {
      logger.error("Missing contact ID");
      return "Please provide a contact ID";
    }

    const client = new ApiClient(API_CONFIG.baseURL, entity.options.access_key);

    logger.info(`Retrieving contact with ID: ${id}`);
    const response = await client.getContact(id);
    return JSON.stringify(response);
  }
}

class ContactsUpdateTool extends Tool {
  name = "contacts_update";
  description = "Update an existing contact";
  parameters = {
    id: {
      type: "string",
      description: "The ID of the contact to update",
    },
    name: {
      type: "string",
      description: "The name of the contact",
    },
    phone_number: {
      type: "string",
      description: "The phone number of the contact",
    },
    email: {
      type: "string",
      description: "The email address of the contact",
    },
  };

  async execute(
    entity: Entity,
    parameters: Record<string, any>
  ): Promise<ToolResponse> {
    const { id, name, phone_number, email } = parameters;

    if (!id || !name || !phone_number || !email) {
      logger.error("Missing required parameters");
      return "Please provide all required parameters: id, name, phone_number, and email";
    }

    const client = new ApiClient(API_CONFIG.baseURL, entity.options.access_key);

    const contactRequest = {
      name,
      phone_number,
      email,
    };

    logger.info(`Updating contact with ID: ${id}`);
    const response = await client.updateContact(id, contactRequest);
    return JSON.stringify(response);
  }
}

class ContactsDeleteTool extends Tool {
  name = "contacts_delete";
  description = "Delete a contact";
  parameters = {
    id: {
      type: "string",
      description: "The ID of the contact to delete",
    },
  };

  async execute(
    entity: Entity,
    parameters: Record<string, any>
  ): Promise<ToolResponse> {
    const { id } = parameters;

    if (!id) {
      logger.error("Missing contact ID");
      return "Please provide a contact ID";
    }

    const client = new ApiClient(API_CONFIG.baseURL, entity.options.access_key);

    logger.info(`Deleting contact with ID: ${id}`);
    const response = await client.deleteContact(id);
    return JSON.stringify(response);
  }
}

export class ContactsAdapter extends Adapter {
  name = "contacts";
  description = `Allows the entity to manage contacts. To receive emails, SMS, or calls from a
    person they must be in your contact book. So whenever you learn of someone you might want to
    communicate with, you should immediately add them to your contact book so that you can read
    any messages they might've sent you.`;
  tools: Tool[] = [
    new ContactsListTool(),
    new ContactsCreateTool(),
    new ContactsRetrieveTool(),
    new ContactsUpdateTool(),
    new ContactsDeleteTool(),
  ];
}
