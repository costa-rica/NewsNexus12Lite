import { createApp } from "./app";
import { syncModels } from "./models/sync";
import { loadDefaultPrompts } from "./services/defaultPrompts";

const defaultPort = 8010;
const port = Number.parseInt(process.env.PORT ?? String(defaultPort), 10);
const app = createApp();

async function startServer(): Promise<void> {
  await syncModels();
  await loadDefaultPrompts();

  app.listen(port, "0.0.0.0", () => {
    console.log(`NewsNexus12Lite API listening on http://0.0.0.0:${port}`);
  });
}

void startServer();
