import { config } from "dotenv";
import express from "express";
import { rateLimit } from "express-rate-limit";
import TelegramBot from "node-telegram-bot-api";
import Call from "./Call.Model.js";
import RecentSearch from "./RecentSearch.Model.js";
import User from "./User.Model.js";
import UserDB from "./user.js";

config();
const app = express();
app.use(express.json());

// Enable trust proxy

const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 5 requests per window
});

app.use(limiter);

const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });

bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  if (msg.chat.first_name || msg.chat.last_name) {
    userName = `${msg.chat.first_name} ${msg.chat.last_name}`;
  }
  const message = `Welcome, ${
    userName ? userName : "Admin"
  }.\nServer is running`;
  bot.sendMessage(chatId, message, {
    parse_mode: "HTML",
  });
});

bot.onText(/\/call/, async (msg) => {
  const chatId = msg.chat.id;
  try {
    await UserDB();
    const isAdmin = await User.findOne({ id: chatId });
    if (!isAdmin) {
      bot.sendMessage(chatId, "User not found");
      return;
    }
    if (
      isAdmin.id !== process.env.ADMIN_05 &&
      isAdmin.id !== process.env.ADMIN_USF
    ) {
      bot.sendMessage(chatId, "Forbidden, Only Admins...");
      return;
    }

    await bot.sendMessage(
      chatId,
      "Send the Code Or ID Of The User For Adding More Call Points.",
      {
        allow_sending_without_reply: false,
      }
    );

    bot.once("message", async (msg) => {
      const code = msg.text;
      const user = await Call.findOne({ code });
      if (!user) {
        return bot.sendMessage(chatId, "User not found!");
      }
      bot.sendMessage(chatId, "Enter Number Of Points!");

      bot.once("message", async (msg) => {
        const points = msg.text;
        user.points = Number(points);
        await user.save();
        return bot.sendMessage(
          chatId,
          `Done, ${user.code} has ${user.points} now`
        );
      });
    });
  } catch (error) {
    console.log("Error adding points:", error);
    bot.sendMessage(chatId, "Sorry, an error occurred while adding points!");
  }
});

bot.onText(/\/addpoints/, async (msg) => {
  const chatId = msg.chat.id;
  try {
    await UserDB();

    const isAdmin = await User.findOne({ id: chatId });

    if (!isAdmin) {
      bot.sendMessage(chatId, "User not found");
      return;
    }

    if (
      isAdmin.id !== process.env.ADMIN_05 &&
      isAdmin.id !== process.env.ADMIN_USF
    ) {
      bot.sendMessage(chatId, "Forbidden, Only Admins...");
      return;
    }

    await bot.sendMessage(
      chatId,
      "Send the Code Or ID Of The User For Adding More Points...",
      {
        allow_sending_without_reply: false,
      }
    );

    bot.once("message", async (msg) => {
      const code = msg.text;
      const user = await User.findOne({ code });
      if (!user) {
        return bot.sendMessage(chatId, "User not found!");
      }
      bot.sendMessage(chatId, "Enter Number Of Points!");

      bot.once("message", async (msg) => {
        const points = msg.text;
        user.points = Number(points);
        await user.save();
        return bot.sendMessage(
          chatId,
          `Done, ${user.code} has ${user.points} now`
        );
      });
    });
  } catch (error) {
    console.log("Error adding points:", error);
    bot.sendMessage(chatId, "Sorry, an error occurred while adding points!");
  }
});

bot.onText(/\/user/, async (msg) => {
  const chatId = msg.chat.id;
  try {
    await UserDB();
    const isAdmin = await User.findOne({ id: chatId });
    if (!isAdmin) {
      bot.sendMessage(chatId, "User not found");
      return;
    }
    if (
      isAdmin.id !== process.env.ADMIN_05 &&
      isAdmin.id !== process.env.ADMIN_USF
    ) {
      bot.sendMessage(chatId, "Forbidden, Only Admins...");
      return;
    }

    await bot.sendMessage(chatId, "Send the Code Or ID Of The User.", {
      allow_sending_without_reply: false,
    });

    bot.once("message", async (msg) => {
      const code = msg.text;
      const user =
        (await User.findOne({ code })) || (await User.findOne({ id: code }));
      if (!user) {
        return bot.sendMessage(chatId, "User not found!");
      }

      const recent = await RecentSearch.findOne({ code: user.code });
      let urls;
      if (recent) {
        urls = recent.key.join("\n");
      }
      return bot.sendMessage(
        chatId,
        `
id: ${user.id}
code: ${user.code}
points: ${user.points}\n
Recent Search:
${urls}
`,
        {
          parse_mode: "HTML",
        }
      );
    });
  } catch (error) {
    console.log("Error", error);
    bot.sendMessage(chatId, "Sorry,While Searching For User!");
  }
});

bot.onText(/\/delete/, async (msg) => {
  const chatId = msg.chat.id;
  try {
    await UserDB();
    const isAdmin = await User.findOne({ id: chatId });
    if (!isAdmin) {
      bot.sendMessage(chatId, "User not found");
      return;
    }
    if (
      isAdmin.id !== process.env.ADMIN_05 &&
      isAdmin.id !== process.env.ADMIN_USF
    ) {
      bot.sendMessage(chatId, "Forbidden, Only Admins...");
      return;
    }

    await bot.sendMessage(
      chatId,
      "Send the Code Or ID Of The User whom you Want to Delete.",
      {
        allow_sending_without_reply: false,
      }
    );

    bot.once("message", async (msg) => {
      const code = msg.text;
      const user =
        (await User.findOneAndDelete({ code })) ||
        (await User.findOneAndDelete({ id: code }));
      if (!user) {
        return bot.sendMessage(chatId, "User not found!");
      }

      const recent = await RecentSearch.findOneAndDelete({ code: user.code });
      if (!recent) {
        return bot.sendMessage(chatId, "User dosen't has any search...");
      }

      return bot.sendMessage(chatId, `Deleted`, {
        parse_mode: "HTML",
      });
    });
  } catch (error) {
    console.log("Error", error);
    bot.sendMessage(chatId, "Sorry,While Searching For User!");
  }
});

app.get("/", (_req, res) => {
  res.json({ msg: "Run" });
});
// Start the server
const PORT = process.env.PORT || 8080;
app.listen(PORT, (_req) => {
  console.log(`Server is running on port ${PORT}`);
});
