import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import express, {
  Request,
  Response,
} from 'express';
import fs from 'fs';
import {
  isValidPhoneNumber,
  parsePhoneNumber,
} from 'libphonenumber-js';
import path from 'path';
import twilio from 'twilio';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Initialize Twilio client
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

// Middleware
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// Type definitions
interface Message {
  from: string;
  body: string;
  timestamp: string;
}

interface Conversation {
  phoneNumber: string;
  messages: Message[];
}

// Helper function to read/write conversations
const conversationsFile = path.join(__dirname, "../data/conversations.json");

const readConversations = (): Record<string, Conversation> => {
  try {
    if (!fs.existsSync(conversationsFile)) {
      fs.mkdirSync(path.dirname(conversationsFile), { recursive: true });
      fs.writeFileSync(conversationsFile, "{}");
    }
    return JSON.parse(fs.readFileSync(conversationsFile, "utf-8"));
  } catch (error) {
    console.error("Error reading conversations:", error);
    return {};
  }
};

const writeConversations = (conversations: Record<string, Conversation>) => {
  try {
    fs.writeFileSync(conversationsFile, JSON.stringify(conversations, null, 2));
  } catch (error) {
    console.error("Error writing conversations:", error);
  }
};

// Twilio webhook endpoint
app.post("/webhook", async (req: Request, res: Response) => {
  const { From, Body } = req.body;

  if (!From || !Body) {
    return res.status(400).send("Missing required fields");
  }

  const conversations = readConversations();

  if (!conversations[From]) {
    conversations[From] = {
      phoneNumber: From,
      messages: [],
    };
  }

  conversations[From].messages.push({
    from: From,
    body: Body,
    timestamp: new Date().toISOString(),
  });

  writeConversations(conversations);

  res.type("text/xml");
  res.send("<Response></Response>");
});

// Send message endpoint
app.post("/send_message", async (req: Request, res: Response) => {
  let { phoneNumber, message } = req.body;

  if (!phoneNumber || !message) {
    return res.status(400).json({ error: "Missing phone number or message" });
  }

  try {
    if (!isValidPhoneNumber(phoneNumber, "US")) {
      return res.status(400).json({ error: "Invalid phone number format" });
    }
    // Parse to ensure it's in the correct format for Twilio
    const parsedNumber = parsePhoneNumber(phoneNumber, "US").format("E.164");
    // Update phoneNumber to the correctly formatted version
    phoneNumber = parsedNumber;
  } catch (error) {
    return res.status(400).json({ error: "Invalid phone number format" });
  }

  try {
    await twilioClient.messages.create({
      body: message,
      to: phoneNumber,
      from: process.env.TWILIO_PHONE_NUMBER,
    });

    const conversations = readConversations();

    if (!conversations[phoneNumber]) {
      conversations[phoneNumber] = {
        phoneNumber,
        messages: [],
      };
    }

    conversations[phoneNumber].messages.push({
      from: process.env.TWILIO_PHONE_NUMBER!,
      body: message,
      timestamp: new Date().toISOString(),
    });

    writeConversations(conversations);

    res.json({ success: true });
  } catch (error) {
    console.error("Error sending message:", error);
    res.status(500).json({ error: "Failed to send message" });
  }
});

// Get conversation history endpoint
app.get("/conversations/:phoneNumber", (req: Request, res: Response) => {
  const { phoneNumber } = req.params;
  const conversations = readConversations();

  if (!conversations[phoneNumber]) {
    return res.status(404).json({ error: "Conversation not found" });
  }

  res.json(conversations[phoneNumber]);
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
