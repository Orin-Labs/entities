import dotenv from 'dotenv';
import readline from 'readline';

import { Entity } from './entity';

dotenv.config();

const entity = Entity.importFromFile("./entities/test.json");
// const entity = new Entity({
//   id: "default",
//   model: "gpt-4o-mini",
//   stm: new Memory<ChatCompletionMessageParam>({}, "gpt-4o-mini"),
//   ltm: new Memory<string>({}, "gpt-4o-mini"),
//   adapters: [new SMSAdapter()],
// });

export const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

console.log(
  'CLI Environment started. Type "run" to run the entity, "exit" to export and quit, "shift <minutes>" to shift time, or any other text to chat with the entity.'
);

function promptUser() {
  rl.question("> ", (command) => {
    const lowerCommand = command.toLowerCase();

    switch (lowerCommand) {
      case "run":
        console.log("Running entity...");
        entity.run().then(() => {
          console.log("Entity run complete.");
          promptUser();
        });
        break;

      case "exit":
        console.log("Exporting entity and exiting...");
        entity.exportToFile("./entities/test.json");
        rl.close();
        break;

      case "enshrine":
        console.log("Enshrining entity...");
        entity.enshrine().then(() => {
          console.log("Entity enshrined.");
          promptUser();
        });
        break;

      case "clear":
        console.log("Clearing entity memory...");
        entity.options.stm.clear();
        console.log("Entity memory cleared.");
        promptUser();
        break;

      case "check":
        console.log("Checking wakeup...");
        entity.checkWakeup().then(() => {
          console.log("Wakeup check complete.");
          promptUser();
        });
        break;

      default:
        if (lowerCommand.startsWith("shift ")) {
          const minutes = parseInt(command.split(" ")[1]);
          if (!isNaN(minutes)) {
            console.log(`Shifting time by ${minutes} minutes...`);
            entity.shiftTime(minutes);
            console.log(
              `Current time: ${entity.getCurrentTime().toISOString()}`
            );
          } else {
            console.log("Invalid time shift. Format: shift <minutes>");
          }
          promptUser();
        } else {
          entity
            .chat(command, {
              channel: "sms",
              identity: "John Doe",
            })
            .then((response) => {
              console.log("Entity: " + response);
              promptUser();
            });
        }
        break;
    }
  });
}

promptUser();
