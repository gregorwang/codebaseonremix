import { data } from "react-router";
import { ExamCard } from "~/components/learn/exam/ExamCard";
import { PageHeader } from "~/components/learn/ui/PageHeader";
import { EmptyState } from "~/components/learn/ui/EmptyState";
import { getPublicExamList } from "~/lib/server/learn/cache-public.server";
import { getLatestExamResult } from "~/lib/server/learn/exams.server";
import { ensureLearnUser, mergeHeaders } from "~/lib/server/learn/user.server";
import type { Route } from "./+types/learn.exams._index";

export async function loader({ request, context }: Route.LoaderArgs) {
  const { DB: db, LEARN_CACHE: cache } = context.cloudflare.env;
  const { userId, headers: cookieHeaders } = ensureLearnUser(request);

  const { exams } = await getPublicExamList(db, cache);
  const latestByExam = await Promise.all(
    exams.map(async (exam) => ({
      examId: exam.id,
      result: await getLatestExamResult(db, userId, exam.id),
    })),
  );
  const latestMap = Object.fromEntries(
    latestByExam.map((item) => [item.examId, item.result]),
  );

  return data(
    { exams, latestMap },
    cookieHeaders ? { headers: mergeHeaders(null, cookieHeaders) } : undefined,
  );
}

export default function ExamsIndexPage({ loaderData }: Route.ComponentProps) {
  const { exams, latestMap } = loaderData;
  const projectExams = exams.filter((e) => e.origin === "project");
  const sampleExams = exams.filter((e) => e.origin !== "project");

  const renderGrid = (list: typeof exams) => (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {list.map((exam) => (
        <ExamCard key={exam.id} exam={exam} latestResult={latestMap[exam.id]} />
      ))}
    </div>
  );

  return (
    <div>
      <PageHeader
        title="阶段考试"
        description="综合检验真实项目改造能力，类似多邻国大关卡。"
      />

      {exams.length === 0 ? (
        <EmptyState message="暂无已发布的考试。项目课程发布后可生成阶段考试。" />
      ) : (
        <>
          {projectExams.length > 0 && (
            <section className="mt-6">
              <h3 className="mb-4 text-lg font-semibold">项目考试</h3>
              {renderGrid(projectExams)}
            </section>
          )}
          {sampleExams.length > 0 && (
            <section className={projectExams.length > 0 ? "mt-10" : "mt-6"}>
              <h3 className="mb-4 text-lg font-semibold text-slate-600 dark:text-slate-400">
                示例考试
              </h3>
              {renderGrid(sampleExams)}
            </section>
          )}
        </>
      )}
    </div>
  );
}
