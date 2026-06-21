import type { Course, Lesson } from "~/lib/learn/types";

type DraftPublishFormProps = {
  draftId: string;
  courses: Array<Course & { lessons: Lesson[] }>;
};

export function DraftPublishForm({ draftId, courses }: DraftPublishFormProps) {
  return (
    <form method="post" className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="intent" value="publish" />
      <input type="hidden" name="draftId" value={draftId} />
      <div>
        <label
          htmlFor={`lesson-${draftId}`}
          className="block text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--fg-soft)]"
        >
          发布到关卡
        </label>
        <select
          id={`lesson-${draftId}`}
          name="lessonId"
          required
          className="mt-1 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-raised)] px-2 py-1 text-sm shadow-sm focus:border-[var(--color-brand-500)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]/20"
        >
          <option value="">选择关卡</option>
          {courses.map((course) =>
            course.lessons.map((lesson) => (
              <option key={lesson.id} value={lesson.id}>
                {course.title} / {lesson.title}
              </option>
            )),
          )}
        </select>
      </div>
      <button
        type="submit"
        className="inline-flex items-center gap-1 rounded-lg bg-gradient-to-r from-[var(--color-brand-500)] to-[var(--color-brand-700)] px-3 py-1.5 text-sm font-semibold text-white shadow-sm transition-transform hover:-translate-y-0.5"
      >
        发布到题库 →
      </button>
    </form>
  );
}
