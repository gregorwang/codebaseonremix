import { useSearchParams } from "react-router";
import type { Course, Lesson, Question } from "~/lib/learn/types";
import type { LessonProgressSummary } from "~/lib/server/learn/attempts.server";
import type { CachedQuestionSummary } from "~/lib/server/learn/cache-lesson.server";
import { LessonHeader } from "~/components/learn/lesson/LessonHeader";
import { TeachingPhase } from "~/components/learn/lesson/TeachingPhase";
import { LessonPractice } from "~/components/learn/question/LessonPractice";

type LessonFlowProps = {
  course: Course;
  lesson: Lesson;
  questionSummaries: CachedQuestionSummary[];
  currentQuestion: Question | null;
  questionIndex: number;
  initialProgress: LessonProgressSummary;
  /** loader 预查 KV cache 命中的 AI 讲解 markdown; 没命中则 null。 */
  initialAiTeachingText?: string | null;
  /** loader 预查 KV cache 命中的 AI 思维导图 mermaid 源码; 没命中则 null。 */
  initialAiDiagramSource?: string | null;
};

export function LessonFlow({
  course,
  lesson,
  questionSummaries,
  currentQuestion,
  questionIndex,
  initialProgress,
  initialAiTeachingText,
  initialAiDiagramSource,
}: LessonFlowProps) {
  const [searchParams] = useSearchParams();
  const hasTeaching = (lesson.teachingBlocks?.length ?? 0) > 0;
  // 默认 phase 决策:
  //   - 显式 ?phase=... 优先
  //   - 带 ?q=N 的链接(从 mistake review / dashboard 跳过来直奔某题) 直接进 practice,
  //     不要再卡用户先看教学块
  //   - 否则只要有教学块就先 teach
  const phase =
    searchParams.get("phase") ??
    (searchParams.has("q")
      ? "practice"
      : hasTeaching
        ? "teach"
        : "practice");

  return (
    <div>
      <LessonHeader lesson={lesson} questionCount={questionSummaries.length} />

      {phase === "teach" && hasTeaching ? (
        <TeachingPhase
          lesson={lesson}
          initialAiTeachingText={initialAiTeachingText}
          initialAiDiagramSource={initialAiDiagramSource}
        />
      ) : (
        <LessonPractice
          courseSlug={course.slug}
          lessonSlug={lesson.slug}
          questionSummaries={questionSummaries}
          currentQuestion={currentQuestion}
          questionIndex={questionIndex}
          initialProgress={initialProgress}
          lessonSourceFilePath={lesson.sourceFilePath}
        />
      )}
    </div>
  );
}
