export const BLOG_CATEGORIES: {
  title: string;
  slug: "news" | "education";
  description: string;
}[] = [
  {
    title: "News",
    slug: "news",
    description: "Новости и обновления LEO.",
  },
  {
    title: "Education",
    slug: "education",
    description: "Обучающие материалы по работе с LEO.",
  },
];

export const BLOG_AUTHORS = {
  leo: {
    name: "LEO Team",
    image: "/_static/avatars/leo.png",
    twitter: "",
  },
};
