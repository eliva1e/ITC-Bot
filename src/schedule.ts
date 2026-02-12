import { Cron } from 'croner';
import { bot } from './bot';

const SCHEDULE_API = 'https://students.it-college.ru/Schedule/schedule25.php';

type SubGroup = {
  SGCaID: string;
  SGrID: string;
  STitle: string;
  STopic: string;
};

type Lesson = {
  start: string;
  end: string;
  room: string;
  topic: string;
  title: string;
  SubGroup?: SubGroup[];
};

async function fetchSchedule() {
  const { COLLEGE_USERNAME, COLLEGE_PASSWORD, COLLEGE_GROUP } = process.env;

  const d_start = new Date();
  d_start.setHours(0, 0, 0, 0);

  const d_end = new Date(d_start);
  d_end.setDate(d_end.getDate() + 1);
  d_end.setHours(0, 0, 0, 0);

  const res = await fetch(SCHEDULE_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: `session=STDNT-login-user=${COLLEGE_USERNAME}&STDNT-login-pw=${COLLEGE_PASSWORD}`,
    },
    body: JSON.stringify({
      group: COLLEGE_GROUP,
      d_start: d_start.toISOString(),
      d_end: d_end.toISOString(),
      subgroup: '*',
    }),
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch schedule. Status code: ${res.status}`);
  }

  return (await res.json()) as Lesson[];
}

async function generateScheduleMessage() {
  const schedule = await fetchSchedule();
  const today = new Date();

  let lessons = '';

  for (const lesson of schedule) {
    const topic = lesson.topic ? ` (${lesson.topic})` : '';
    const room = lesson.room ? ` в ${lesson.room}` : '';
    const startTime = lesson.start.slice(-5);
    const endTime = lesson.end.slice(-5);

    lessons += `- ${startTime}-${endTime} <b>${lesson.title}</b>${topic + room}\n`;

    if (lesson.SubGroup) {
      for (const sg of lesson.SubGroup) {
        const sgTopic = sg.STopic ? ` (${sg.STopic})` : '';
        lessons += `  ${sg.STitle + sgTopic} для ${sg.SGrID} в ${sg.SGCaID}\n`;
      }
    }

    lessons += '\n';
  }

  return `<b>📆 Расписание на ${today.toDateString()}, ${schedule.length} пары:</b>\n\n${lessons}`;
}

export async function startScheduleLoop() {
  new Cron('0 8 * * 1-5', async () => {
    try {
      const message = await generateScheduleMessage();
      await bot.telegram.sendMessage(process.env.USER_ID!, message, { parse_mode: 'HTML' });
    } catch (err) {
      await bot.telegram.sendMessage(
        process.env.USER_ID!,
        'Произошла ошибка при получении расписания!',
      );
    }
  });
}
