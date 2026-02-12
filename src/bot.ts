import { Telegraf } from 'telegraf';
import { startScheduleLoop } from './schedule';

export const bot = new Telegraf(process.env.BOT_TOKEN!);

bot.start((ctx) =>
  ctx.reply(`Your ID: ${ctx.message.from.id}\nSet it as USER_ID in the .env file.`),
);

startScheduleLoop();
