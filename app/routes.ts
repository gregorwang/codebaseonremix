import { type RouteConfig, index, layout, prefix, route } from "@react-router/dev/routes";

export default [
  index("routes/_index.tsx"),
  ...prefix("learn", [
    layout("routes/learn.tsx", [
      index("routes/learn._index.tsx"),
      route("courses", "routes/learn.courses._index.tsx"),
      route("courses/:courseSlug", "routes/learn.courses.$courseSlug.tsx"),
      route(
        "courses/:courseSlug/lessons/:lessonSlug",
        "routes/learn.courses.$courseSlug.lessons.$lessonSlug.tsx",
      ),
      route("review", "routes/learn.review.tsx"),
      route("ability-map", "routes/learn.ability-map.tsx"),
      route("account", "routes/learn.account.tsx"),
      route("source", "routes/learn.source.tsx"),
      route("exams", "routes/learn.exams._index.tsx"),
      route("exams/:examSlug", "routes/learn.exams.$examSlug.tsx"),
      route("snippets", "routes/learn.snippets._index.tsx"),
      route("snippets/new", "routes/learn.snippets.new.tsx"),
      route("snippets/:snippetId", "routes/learn.snippets.$snippetId.tsx"),
      ...prefix("admin", [
        layout("routes/learn.admin.tsx", [
          route("ai-generate", "routes/learn.admin.ai-generate.tsx"),
          route("drafts", "routes/learn.admin.drafts.tsx"),
          route("questions", "routes/learn.admin.questions.tsx"),
        ]),
      ]),
    ]),
  ]),
] satisfies RouteConfig;
