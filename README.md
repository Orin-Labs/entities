Here, I introduce the concept of an AI entity. An entity is essentially a much more complex AI agent, but with a few key criteria:

## Omni-channel

Entities should be able to communicate through multiple channels like phone, SMS, email, etc.

## Persistent Memory

A persistent entity can manage a long term relationship with the user or multiple users - not just a single session or interaction. An entity needs to be able to manage an individual conversation, have some memory of conversational history but also their history with the user.

After a few messages back and forth to an entity, those message will be stored in the entity's short-term memory, like this:

```json
{
    ...
    "short-term-memory": {
        "2025-05-12T02:42:22.826Z": {
            "role": "user",
            "content": "[User identity: John Doe]\n[Communication channel: sms]\nhey"
        },
        "2025-05-12T02:42:23.475Z": {
            "role": "assistant",
            "content": "Hey, John! How's it going?",
            "refusal": null,
            "annotations": []
        }
    },
    "long-term-memory": {},
    ...
}
```

The short-term memory stores the exact OpenAI messages objects so the conversation can be resumed at will, regardless of which channel the message was sent through.

For long-term memory, we introduce a concept called enshrining. Enshrining a memory store is basically just having an LLM summarize the messages in the memory store.

For our example above, the enshrined version would look like this:

> John Doe initiated a conversation via SMS with a simple greeting. The exchange was brief and casual, primarily serving as a check-in. There are no significant details or topics discussed worth noting beyond the friendly interaction. The conversation reflects a willingness to engage and maintain communication.

We can then add this to the long-term memory store, and clear the short-term memory.

```json
{
    ...
    "stm": {},
    "ltm": {
        "2025-05-12T02:46:13.009Z": "John Doe initiated a conversation via SMS with a simple greeting. The exchange was brief and casual, primarily serving as a check-in. There are no significant details or topics discussed worth noting beyond the friendly interaction. The conversation reflects a willingness to engage and maintain communication."
    },
    ...
}
```

Notice how the data type of the long-term memory is a string, not an object.

This experience mimics how humans remember things - we remember short-term things very well, but the long-term memory has less resolution.

You could continue adding more memory layers, like an "ultra-long-term memory" that is a summary of the long-term memory, and so on.

## Autonomy

Entities do not just run when you are interacting with them, they are capable of running autonomously. Entities can do things in the background without you asking them to. They also sleep when they have nothing to do. When an entity falls asleep, it's short-term memory is automatically enshrined into long-term memory.

## Adapters

Adapters are how you give you entity access to other systems. For example, you could add an adapter that allows the entity to send and receive SMS messages.

To build an SMS adapter, you'd need to create tools that let the entity read and send SMS messages, then bundle them into the adapter. Give that adapter to the entity and voila, they can send and receive SMS messages. When the entity wakes up, it will
probably try and read new SMS messages to see if there are any new conversations to respond to.

Adapters like this can also be totally hidden - you might want to give you entity access to a todo list tool that the user never needs to know about. Just make the adapter, expose the tools, and add it to the entity.

## Example

Check index.ts for an example of how to use the entity with the CLI.

```ts
const entity = new Entity({
  id: "default",
  model: "gpt-4o-mini",
  stm: new Memory<ChatCompletionMessageParam>({}, "gpt-4o-mini"), // Stores a short-term memory of the conversation.
  ltm: new Memory<string>({}, "gpt-4o-mini"), // 'gpt-4o-mini' is the model used to enshrine this memory store.
  adapters: [new SMSAdapter()], // Allows the agent to read and send SMS messages.
});

/**
 * This will wake the entity asynchronously - it will check for new messages,
 * respond to them with it's tools, then go back to sleep an amount of time it can decide.
 */
await entity.run(); // Entity decides to sleep for 60 minutes after seeing no SMS messages.

/**
 * This will check if the entity should wake up. If it should, it will run.
 */
await entity.checkWakeup(); // False, entity is still sleeping.

/**
 * This will shift the time for the entity forward by 60 minutes. This is extremely useful
 * for testing.
 */
entity.shiftTime(60);
await entity.checkWakeup(); // True, entity should wake up. It will run `entity.run()`.

/**
 * You can also chat with the entity directly. No tools are available while directly
 * chatting with the entity.
 */
await entity.chat("Hello, how are you?", {
  channel: "sms", // The channel the message is sent through. Not required.
  identity: "John Doe", // The identity of the user sending the message. Not required.
});

/**
 * You can also import an entity from a JSON file, or export it back.
 */
entity.exportToFile("./entities/test.json");
const entity2 = Entity.importFromFile("./entities/test.json"); // Exact clone of
// the original entity.
```

## TODO

- [ ] Add email adapter.
- [ ] Add phone adapter.
- [ ] Allow adapters to forcibly wake the entity, like getting a phone call.
- [ ] Build a proper testing suite, probably with another LLM as the tester.
