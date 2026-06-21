import type { CourseOrigin } from "~/lib/learn/types";
import {
  PROJECT_COURSES,
  SAMPLE_COURSES,
} from "./seed-data";
import { EXAM_BANK_COURSE } from "./seed-data/examQuestionBank";
import { SEED_EXAMS, type SeedExamData } from "./seed-data/exams";
import type { SeedCourseData } from "./seed-data/types";
import { createCourse, getCourseBySlug } from "./courses.server";
import {
  createExam,
  getExamBySlug,
  resolveQuestionIdFromRef,
} from "./exams.server";
import { getQuestionById } from "./questions.server";
import { createLesson } from "./lessons.server";
import { createQuestion } from "./questions.server";
import type { ExamTask } from "~/lib/learn/types";
import { newId } from "./db-json.server";
import { warmLearnPublicCache } from "./cache-public.server";

export { PROJECT_COURSES, SAMPLE_COURSES };

export type SeedResult = {
  coursesCreated: number;
  lessonsCreated: number;
  questionsCreated: number;
  examsCreated: number;
  skipped: boolean;
};

export async function clearLearningContent(db: D1Database): Promise<void> {
  await db.prepare("DELETE FROM exam_results").run();
  await db.prepare("DELETE FROM answer_attempts").run();
  await db.prepare("DELETE FROM mistakes").run();
  await db.prepare("DELETE FROM ability_scores").run();
  await db.prepare("DELETE FROM lesson_progress").run();
  await db.prepare("DELETE FROM course_progress").run();
  await db.prepare("DELETE FROM ai_question_drafts").run();
  await db.prepare("DELETE FROM code_snippets").run();
  await db.prepare("DELETE FROM exams").run();
  await db.prepare("DELETE FROM questions").run();
  await db.prepare("DELETE FROM lessons").run();
  await db.prepare("DELETE FROM courses").run();
}

async function seedCourseList(
  db: D1Database,
  courses: SeedCourseData[],
  options: {
    origin: CourseOrigin;
    isPublished: boolean;
    orderIndexOffset?: number;
  },
): Promise<{ coursesCreated: number; lessonsCreated: number; questionsCreated: number }> {
  let coursesCreated = 0;
  let lessonsCreated = 0;
  let questionsCreated = 0;
  const offset = options.orderIndexOffset ?? 0;

  for (const courseData of courses) {
    const existing = await getCourseBySlug(db, courseData.slug);
    if (existing) continue;

    const course = await createCourse(db, {
      slug: courseData.slug,
      title: courseData.title,
      subtitle: courseData.subtitle,
      description: courseData.description,
      projectContext: courseData.projectContext,
      difficulty: courseData.difficulty,
      abilityTags: courseData.abilityTags,
      orderIndex: courseData.orderIndex + offset,
      unitIndex: courseData.unitIndex,
      isPublished: options.isPublished,
      origin: options.origin,
    });
    coursesCreated++;

    for (const lessonData of courseData.lessons) {
      const lesson = await createLesson(db, {
        courseId: course.id,
        slug: lessonData.slug,
        title: lessonData.title,
        description: lessonData.description,
        learningGoal: lessonData.learningGoal,
        sourceFilePath: lessonData.sourceFilePath,
        sourceSummary: lessonData.sourceSummary,
        orderIndex: lessonData.orderIndex,
        remixModules: lessonData.remixModules,
        teachingBlocks: lessonData.teachingBlocks,
        lessonMeta: lessonData.lessonMeta,
        isPublished: options.isPublished,
      });
      lessonsCreated++;

      for (const questionData of lessonData.questions) {
        await createQuestion(db, {
          ...questionData,
          lessonId: lesson.id,
          isPublished: options.isPublished,
        });
        questionsCreated++;
      }
    }
  }

  return { coursesCreated, lessonsCreated, questionsCreated };
}

async function seedExamList(db: D1Database, exams: SeedExamData[]): Promise<number> {
  let examsCreated = 0;

  for (const examData of exams) {
    const existing = await getExamBySlug(db, examData.slug);
    if (existing) continue;

    const course = await getCourseBySlug(db, examData.courseSlug);
    if (!course) {
      throw new Error(`Course not found for exam seed: ${examData.courseSlug}`);
    }

    const tasks: ExamTask[] = [];
    for (const ref of examData.taskRefs) {
      const questionId = await resolveQuestionIdFromRef(db, ref);
      if (!questionId) {
        throw new Error(
          `Question not found: ${ref.courseSlug}/${ref.lessonSlug}[${ref.questionIndex}]`,
        );
      }
      const question = await getQuestionById(db, questionId);
      tasks.push({
        id: newId(),
        questionId,
        title: question?.title ?? `任务 ${tasks.length + 1}`,
        prompt: question?.prompt ?? "",
        type: question?.type ?? "single_choice",
        weight: ref.weight,
      });
    }

    await createExam(db, {
      slug: examData.slug,
      courseId: course.id,
      title: examData.title,
      description: examData.description,
      scenario: examData.scenario,
      briefing: examData.briefing,
      tasks,
      passingScore: examData.passingScore,
      abilityTags: examData.abilityTags,
      difficulty: examData.difficulty,
      isPublished: examData.isPublished ?? true,
      origin: examData.origin ?? "project",
    });
    examsCreated++;
  }

  return examsCreated;
}

export async function seedLearningData(
  db: D1Database,
  options?: { force?: boolean; cache?: KVNamespace; warmCache?: boolean },
): Promise<SeedResult> {
  if (options?.force) {
    await clearLearningContent(db);
  }

  const project = await seedCourseList(db, PROJECT_COURSES, {
    origin: "project",
    isPublished: true,
    orderIndexOffset: 0,
  });

  const sample = await seedCourseList(db, SAMPLE_COURSES, {
    origin: "sample",
    isPublished: true,
    orderIndexOffset: 1000,
  });

  const examBank = await seedCourseList(db, [EXAM_BANK_COURSE], {
    origin: "project",
    isPublished: false,
    orderIndexOffset: 0,
  });

  const examsCreated = await seedExamList(db, SEED_EXAMS);

  const coursesCreated =
    project.coursesCreated + sample.coursesCreated + examBank.coursesCreated;
  const lessonsCreated =
    project.lessonsCreated + sample.lessonsCreated + examBank.lessonsCreated;
  const questionsCreated =
    project.questionsCreated + sample.questionsCreated + examBank.questionsCreated;

  const result = {
    coursesCreated,
    lessonsCreated,
    questionsCreated,
    examsCreated,
    skipped:
      coursesCreated === 0 &&
      lessonsCreated === 0 &&
      questionsCreated === 0 &&
      examsCreated === 0,
  };

  if (options?.cache && options.warmCache !== false) {
    await warmLearnPublicCache(db, options.cache);
  }

  return result;
}

/** @deprecated Use seedLearningData — kept for sample-only scripts */
export async function seedSampleLearningData(
  db: D1Database,
  options?: { force?: boolean; cache?: KVNamespace },
): Promise<SeedResult> {
  return seedLearningData(db, options);
}
