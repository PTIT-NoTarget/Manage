const axios = require("axios");

const escapeTelegramHtml = (value) => {
  if (value == null) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
};

const sendTelegramMessage = async (text, options = {}) => {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!botToken || !chatId) {
    return { ok: false, skipped: true, reason: "not_configured" };
  }

  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
  const parseMode = options.parse_mode || options.parseMode || "HTML";

  try {
    const params = {
      chat_id: chatId,
      text,
      parse_mode: parseMode,
    };

    const response = await axios.post(url, params, {
      headers: {
        "Content-Type": "application/json",
      },
    });

    const data = response?.data;

    if (!data?.ok) {
      console.error(
        "Error sending Telegram notification:",
        response?.status,
        data
      );
      return { ok: false, status: response?.status, data };
    }

    return { ok: true, data };
  } catch (error) {
    console.log("Error caught in sendTelegramMessage:", error);
    const errorData = error?.response?.data;
    console.error(
      "Error sending Telegram notification:",
      errorData || error?.message || error
    );
    return {
      ok: false,
      status: error?.response?.status,
      data: errorData,
      error: error?.message || String(error),
    };
  }
};

module.exports = {
  sendTelegramMessage,
  escapeTelegramHtml,
};
