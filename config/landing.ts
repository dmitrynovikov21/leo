import { FeatureLdg, InfoLdg, TestimonialType } from "types";

export const infos: InfoLdg[] = [
  {
    title: "Умные AI-агенты для бизнеса",
    description:
      "Создавайте агентов с базой знаний, подключайте к Telegram и получайте аналитику по каждому диалогу. Настройка за минуты, без программирования.",
    image: "/_static/illustrations/work-from-home.jpg",
    list: [
      {
        title: "База знаний",
        description: "Загружайте документы — агент отвечает на основе ваших данных.",
        icon: "laptop",
      },
      {
        title: "Интеграции",
        description: "Telegram, веб-виджет и API для любых сценариев.",
        icon: "settings",
      },
      {
        title: "Аналитика",
        description:
          "Отслеживайте качество ответов, расходы и активность агентов.",
        icon: "search",
      },
    ],
  },
  {
    title: "Простая интеграция",
    description:
      "Подключите агента к вашим каналам коммуникации за пару кликов. Telegram-бот готов к работе сразу после создания.",
    image: "/_static/illustrations/work-from-home.jpg",
    list: [
      {
        title: "Гибкая настройка",
        description:
          "Тон, поведение, ограничения — всё настраивается под ваши задачи.",
        icon: "laptop",
      },
      {
        title: "Автоматизация",
        description: "Расписание работы, автоответы и умная маршрутизация.",
        icon: "search",
      },
      {
        title: "Надёжность",
        description:
          "Фоллбеки между моделями, мониторинг и логирование каждого запроса.",
        icon: "settings",
      },
    ],
  },
];

export const features: FeatureLdg[] = [
  {
    title: "AI-агенты",
    description:
      "Создавайте агентов с уникальным поведением, тоном и базой знаний для любых задач.",
    link: "/",
    icon: "laptop",
  },
  {
    title: "База знаний",
    description:
      "Загружайте PDF, DOCX, сайты — агент использует ваши данные для точных ответов.",
    link: "/",
    icon: "copy",
  },
  {
    title: "Telegram-интеграция",
    description:
      "Подключите бота к Telegram за 2 минуты. Агент сразу начнёт отвечать клиентам.",
    link: "/",
    icon: "settings",
  },
  {
    title: "Аналитика и тестирование",
    description:
      "Автоматические тесты качества ответов, детальная статистика по каждому агенту.",
    link: "/",
    icon: "search",
  },
  {
    title: "Мультимодельность",
    description:
      "Claude, Gemini и другие модели с автоматическим переключением при сбоях.",
    link: "/",
    icon: "settings",
  },
  {
    title: "Биллинг и контроль",
    description:
      "Прозрачный учёт расходов по моделям, агентам и пользователям. Оплата в рублях.",
    link: "/",
    icon: "user",
  },
];

export const testimonials: TestimonialType[] = [
  {
    name: "Алексей К.",
    job: "Владелец интернет-магазина",
    image: "https://randomuser.me/api/portraits/men/1.jpg",
    review:
      "Подключили LEO-агента к Telegram за час. Теперь бот отвечает на вопросы по ассортименту и доставке 24/7 — нагрузка на поддержку снизилась вдвое.",
  },
  {
    name: "Мария С.",
    job: "HR-менеджер",
    image: "https://randomuser.me/api/portraits/women/2.jpg",
    review:
      "Загрузили в базу знаний все внутренние регламенты. Сотрудники теперь спрашивают бота вместо того, чтобы искать в документах. Экономим часы каждую неделю.",
  },
  {
    name: "Дмитрий П.",
    job: "Технический директор",
    image: "https://randomuser.me/api/portraits/men/3.jpg",
    review:
      "Нравится прозрачность — видим расходы по каждой модели, можем переключаться между Claude и Gemini без изменений в коде.",
  },
  {
    name: "Елена В.",
    job: "Руководитель поддержки",
    image: "https://randomuser.me/api/portraits/women/4.jpg",
    review:
      "Автоматическое тестирование качества ответов — киллер-фича. Сразу видно, где агент ошибается, и можно быстро исправить базу знаний.",
  },
  {
    name: "Сергей Л.",
    job: "Продакт-менеджер",
    image: "https://randomuser.me/api/portraits/men/5.jpg",
    review:
      "Создали агента для онбординга новых клиентов. Настройка тона и поведения — очень удобная, агент звучит именно так, как нам нужно.",
  },
];
