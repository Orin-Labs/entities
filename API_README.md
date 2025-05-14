# Entity API

This API allows you to create and manage autonomous AI entities with adapters for various integrations including contacts, calendars, and SMS.

## Setup

1. Install dependencies:

```bash
yarn
```

2. Build the project:

```bash
yarn build
```

3. Start the server:

```bash
yarn server
```

## Environment Variables

Create a `.env` file with the following variables:

```
# Required for server authentication
MASTER_ACCESS_KEY=your_master_access_key

# API connection settings
API_BASE_URL=http://localhost:8000

# OpenAI API key for entity intelligence
OPENAI_API_KEY=sk-your_openai_api_key_here

# Optional: Server port (defaults to 3000 if not specified)
PORT=3000
```

Note: Entity access keys are not stored in the `.env` file. Instead, each entity has its own access key that is stored in its entity file and used for authenticating API requests.

## API Endpoints

### Authentication

All requests require authentication using one of these methods:

- **Master Access Key**: For creating new entities (sent as `X-Access-Key` header)
- **Entity Access Key**: For entity-specific operations (sent as `X-Access-Key` header)

### Entities

#### Create a New Entity

```
POST /api/entities
```

Headers:

```
X-Access-Key: your_master_access_key
Content-Type: application/json
```

Body:

```json
{
  "id": "entity-id",
  "model": "gpt-4o-mini",
  "access_key": "entity-specific-access-key"
}
```

**Note:** All adapters (contacts, calendar, and SMS) are automatically enabled by default for each new entity.

#### Get Entity Information

```
GET /api/entities/:id
```

Headers:

```
X-Access-Key: entity-specific-access-key
```

#### Delete an Entity

```
DELETE /api/entities/:id
```

Headers:

```
X-Access-Key: entity-specific-access-key
```

### Adapters

#### Add an Adapter to an Entity

```
POST /api/entities/:id/adapters
```

Headers:

```
X-Access-Key: entity-specific-access-key
Content-Type: application/json
```

Body:

```json
{
  "adapter_name": "contacts"
}
```

Available adapters:

- `contacts`: Manage contacts for the entity
- `calendar`: Manage calendar events
- `sms`: Send and receive SMS messages

#### Get Entity Adapters

```
GET /api/entities/:id/adapters
```

Headers:

```
X-Access-Key: entity-specific-access-key
```

#### Remove an Adapter from an Entity

```
DELETE /api/entities/:id/adapters/:adapter
```

Headers:

```
X-Access-Key: entity-specific-access-key
```

## Adapter Features

### Contacts Adapter

The contacts adapter allows entities to manage contacts:

- **List contacts**: Get all contacts
- **Create contact**: Add a new contact
- **Retrieve contact**: Get a specific contact by ID
- **Update contact**: Update an existing contact
- **Delete contact**: Remove a contact

### Calendar Adapter

The calendar adapter allows entities to manage calendars and events:

- **List calendars**: Get all calendars
- **Create calendar**: Add a new calendar
- **Get calendar details**: Retrieve a specific calendar
- **Update calendar**: Modify a calendar's properties
- **Delete calendar**: Remove a calendar
- **List events**: Get all events
- **Create event**: Schedule a new event
- **Update event**: Modify an event's details
- **Delete event**: Remove an event

### SMS Adapter

The SMS adapter allows entities to send and receive SMS messages:

- **Read messages**: Retrieve SMS messages
- **Send message**: Send a new SMS message

## Example Usage

### Creating a new entity

```bash
curl -X POST http://localhost:3000/api/entities \
  -H "X-Access-Key: your_master_access_key" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "assistant1",
    "model": "gpt-4o-mini",
    "access_key": "assistant1-key"
  }'
```

### Adding the contacts adapter

```bash
curl -X POST http://localhost:3000/api/entities/assistant1/adapters \
  -H "X-Access-Key: assistant1-key" \
  -H "Content-Type: application/json" \
  -d '{
    "adapter_name": "contacts"
  }'
```
