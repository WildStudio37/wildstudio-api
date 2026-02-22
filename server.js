import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { Client, GatewayIntentBits } from "discord.js";

dotenv.config();

const app = express();
app.use(cors({ origin: "*" }));

let botOnline = false;

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

async function startBot() {
  try {
    await client.login(process.env.DISCORD_TOKEN);
  } catch (err) {
    console.error("Bot failed to login:", err.message);
    botOnline = false;
  }
}

client.on("clientReady", () => {
  console.log("Bot connected");
  botOnline = true;
});

client.on("disconnect", () => {
  console.log("Bot disconnected");
  botOnline = false;
});

client.on("error", (err) => {
  console.error("Discord error:", err.message);
  botOnline = false;
});

process.on("unhandledRejection", (err) => {
  console.error("Unhandled promise rejection:", err);
});

process.on("uncaughtException", (err) => {
  console.error("Uncaught exception:", err);
});

startBot();

client.login(process.env.DISCORD_TOKEN);

app.get("/status", (req, res) => {

  const services = [
    {
      name: "Discord Bot",
      status: botOnline ? "operational" : "outage",
      uptime: botOnline ? 99.99 : 0,
      response_time: botOnline ? 85 : 0,
      error_rate: botOnline ? 0.01 : 100,
      description: "Handles Announcements"
    },
    {
      name: "Status API",
      status: "operational",
      uptime: 99.98,
      response_time: 120,
      error_rate: 0.02,
      description: ""
    }
  ];

  const overall =
    services.some(s => s.status === "outage") ? "outage" :
    services.some(s => s.status === "maintenance") ? "maintenance" :
    "operational";

  res.json({
    overall,
    services,
    updated_at: new Date().toISOString()
  });

});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`API running on ${PORT}`));