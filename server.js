const express = require("express");
const cors = require("cors");
const { Client, GatewayIntentBits } = require("discord.js");
require("dotenv").config();

const app = express();
app.use(cors({
  origin: "*"
}));
app.use(express.json());

// ===== DISCORD BOT =====
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

client.once("clientReady", () => {
  console.log(`Bot online as ${client.user.tag}`);
});

console.log("TOKEN LENGTH:", process.env.DISCORD_TOKEN?.length);

// ===== API ROUTE =====
app.get("/status", (req, res) => {
  res.json({
    overall: "operational",
    services: [
      {
        id: "discord",
        name: "Discord Bot",
        description: "Handles automation, announcements and infrastructure monitoring.",
        status: client.isReady() ? "operational" : "outage",
        uptime: 99.99,
        response_time: 85,
        error_rate: 0.01
      },
      {
        id: "api",
        name: "WildStudio API",
        description: "Core backend API powering website and automation.",
        status: "operational",
        uptime: 99.98,
        response_time: 120,
        error_rate: 0.02
      }
    ],
    updated_at: new Date().toISOString()
  });
});

// ===== START SERVER =====
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`API running on port ${PORT}`);
});