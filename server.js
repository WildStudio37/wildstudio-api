import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { Client, GatewayIntentBits } from "discord.js";
import { createClient } from "@supabase/supabase-js";

dotenv.config();

const app = express();
app.use(cors({ origin: "*" }));

/* =========================
   Supabase Setup
========================= */

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

/* =========================
   Discord Bot Setup
========================= */

let botOnline = false;
let lastBotStatus = null;

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

async function logIncident(service, eventType, status) {
  try {
    await supabase.from("incidents").insert([
      {
        service_name: service,
        event_type: eventType,
        status: status
      }
    ]);

    console.log(`Incident logged: ${service} - ${eventType}`);
  } catch (err) {
    console.error("Failed to log incident:", err.message);
  }
}

client.on("clientReady", async () => {
  console.log("Bot connected");

  if (lastBotStatus === "outage") {
    await logIncident("Discord Bot", "recovery", "operational");
  }

  botOnline = true;
  lastBotStatus = "operational";
});

client.on("disconnect", async () => {
  console.log("Bot disconnected");

  if (lastBotStatus !== "outage") {
    await logIncident("Discord Bot", "outage", "outage");
  }

  botOnline = false;
  lastBotStatus = "outage";
});

client.on("error", async (err) => {
  console.error("Discord error:", err.message);

  if (lastBotStatus !== "outage") {
    await logIncident("Discord Bot", "outage", "outage");
  }

  botOnline = false;
  lastBotStatus = "outage";
});

/* =========================
   Global Crash Protection
========================= */

process.on("unhandledRejection", (err) => {
  console.error("Unhandled promise rejection:", err);
});

process.on("uncaughtException", (err) => {
  console.error("Uncaught exception:", err);
});

/* =========================
   Start Bot
========================= */

async function startBot() {
  try {
    await client.login(process.env.DISCORD_TOKEN);
  } catch (err) {
    console.error("Bot failed to login:", err.message);
    botOnline = false;
  }
}

startBot();

/* =========================
   Status Endpoint
========================= */

app.get("/status", async (req, res) => {

  const { data: incidents } = await supabase
    .from("incidents")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);

  const services = [
    {
      name: "Discord Bot",
      status: botOnline ? "operational" : "outage",
      uptime: botOnline ? 99.99 : 0,
      response_time: botOnline ? 85 : 0,
      error_rate: botOnline ? 0.01 : 100,
      description: "Handles announcements and automation."
    },
    {
      name: "Status API",
      status: "operational",
      uptime: 99.98,
      response_time: 120,
      error_rate: 0.02,
      description: "Backend infrastructure API."
    }
  ];

  const overall =
    services.some(s => s.status === "outage")
      ? "outage"
      : services.some(s => s.status === "maintenance")
      ? "maintenance"
      : "operational";

  res.json({
    overall,
    services,
    incidents: incidents || [],
    updated_at: new Date().toISOString()
  });
});

/* =========================
   Start Server
========================= */

const PORT = process.env.PORT || 8080;

app.listen(PORT, () => {
  console.log(`API running on port ${PORT}`);
});