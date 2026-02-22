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

let supabaseOnline = true;
let lastSupabaseStatus = null;

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

/* =========================
   Discord Events
========================= */

client.on("clientReady", async () => {
  if (lastBotStatus === "outage") {
    await logIncident("Discord Bot", "recovery", "operational");
  }
  botOnline = true;
  lastBotStatus = "operational";
});

client.on("disconnect", async () => {
  if (lastBotStatus !== "outage") {
    await logIncident("Discord Bot", "outage", "outage");
  }
  botOnline = false;
  lastBotStatus = "outage";
});

client.on("error", async () => {
  if (lastBotStatus !== "outage") {
    await logIncident("Discord Bot", "outage", "outage");
  }
  botOnline = false;
  lastBotStatus = "outage";
});

/* =========================
   Supabase Health Check
========================= */

async function checkSupabase() {
  try {
    const { error } = await supabase
      .from("incidents")
      .select("id")
      .limit(1);

    if (error) throw error;

    if (lastSupabaseStatus === "outage") {
      await logIncident("Supabase Database", "recovery", "operational");
    }

    supabaseOnline = true;
    lastSupabaseStatus = "operational";

  } catch (err) {

    if (lastSupabaseStatus !== "outage") {
      await logIncident("Supabase Database", "outage", "outage");
    }

    supabaseOnline = false;
    lastSupabaseStatus = "outage";
  }
}

// Check every 15 seconds
setInterval(checkSupabase, 15000);
checkSupabase();

/* =========================
   Start Bot
========================= */

async function startBot() {
  try {
    await client.login(process.env.DISCORD_TOKEN);
  } catch {
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
      description: "Handles Announcements and Automations"
    },
    {
      name: "Database",
      status: supabaseOnline ? "operational" : "outage",
      uptime: supabaseOnline ? 99.99 : 0,
      response_time: 45,
      error_rate: supabaseOnline ? 0.01 : 100,
      description: "Primary data storage and incident logging."
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