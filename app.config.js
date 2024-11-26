import "dotenv/config";

export default {
  expo: {
    name: "chat-bot",
    slug: "chat-bot",
    version: "1.0.0",
    extra: {
      OPENAI_API_KEY: process.env.EXPO_PUBLIC_OPENAI_API_KEY,
    },
  },
};
