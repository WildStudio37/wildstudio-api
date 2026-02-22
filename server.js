const express = require("express");
const cors = require("cors");
const { Client, GatewayIntentBits } = require("discord.js");
require("dotenv").config();

const app = express();
app.use(cors());
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

client.login(process.env.DISCORD_TOKEN);

// ===== API ROUTE =====
app.get("/status", (req, res) => {
  res.json({
    status: "operational",
    uptime_seconds: process.uptime(),
    bot_online: client.isReady()
  });
});

// ===== START SERVER =====
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`API running on port ${PORT}`);
});