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
    try {
      // Create a client with the entity's access key
      const client = new ApiClient(
        API_CONFIG.baseURL,
        entity.options.access_key
      );

      const contacts = await client.listContacts();

      logger.info(`Retrieved ${contacts.length} contacts`);
      return JSON.stringify(contacts);
    } catch (error) {
      logger.error("Error listing contacts:", error);
      return "Failed to list contacts";
    }
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

    if (!name || !phone_number || !email) {
      logger.error("Missing required parameters");
      return "Please provide all required parameters: name, phone_number, and email";
    }

    try {
      // Create a client with the entity's access key
      const client = new ApiClient(
        API_CONFIG.baseURL,
        entity.options.access_key
      );

      const contactRequest = {
        name,
        phone_number,
        email,
      };

      const contact = await client.createContact(contactRequest);

      logger.info(`Created contact: ${name}`);
      return JSON.stringify(contact);
    } catch (error) {
      logger.error("Error creating contact:", error);
      return "Failed to create contact";
    }
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

    try {
      // Create a client with the entity's access key
      const client = new ApiClient(
        API_CONFIG.baseURL,
        entity.options.access_key
      );

      const contact = await client.getContact(id);

      logger.info(`Retrieved contact: ${contact.name}`);
      return JSON.stringify(contact);
    } catch (error) {
      logger.error("Error retrieving contact:", error);
      return "Failed to retrieve contact";
    }
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

    try {
      // Create a client with the entity's access key
      const client = new ApiClient(
        API_CONFIG.baseURL,
        entity.options.access_key
      );

      const contactRequest = {
        name,
        phone_number,
        email,
      };

      const contact = await client.updateContact(id, contactRequest);

      logger.info(`Updated contact: ${name}`);
      return JSON.stringify(contact);
    } catch (error) {
      logger.error("Error updating contact:", error);
      return "Failed to update contact";
    }
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

    try {
      // Create a client with the entity's access key
      const client = new ApiClient(
        API_CONFIG.baseURL,
        entity.options.access_key
      );

      await client.deleteContact(id);

      logger.info(`Deleted contact with ID: ${id}`);
      return "Contact deleted successfully";
    } catch (error) {
      logger.error("Error deleting contact:", error);
      return "Failed to delete contact";
    }
  }
}

export class ContactsAdapter extends Adapter {
  name = "contacts";
  description = "Allows the entity to manage contacts";
  tools: Tool[] = [
    new ContactsListTool(),
    new ContactsCreateTool(),
    new ContactsRetrieveTool(),
    new ContactsUpdateTool(),
    new ContactsDeleteTool(),
  ];
}
