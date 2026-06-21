import { callAiGateway, type AiFeature } from "../ai/aiGateway.server";
import type { CurriculumBlueprintData } from "./curriculumPlanner.server";

export async function summarizeProjectStructure(
  env: Env,
  params: { userId: string; fileSummary: string },
): Promise<string> {
  const feature = "question_generation" as AiFeature;
  const result = await callAiGateway(env, {
    feature,
    userId: params.userId,
    systemPrompt:
      "你是项目架构分析助手。用中文简要总结 Remix/React Router 项目的模块结构与学习价值。",
    prompt: `以下是项目文件摘要，请输出 JSON：{ "summary": "...", "modules": ["..."] }\n\n${params.fileSummary.slice(0, 12000)}`,
    temperature: 0.3,
    maxTokens: 1500,
  });
  return result.text;
}

export async function generateCurriculumOutlineWithAi(
  env: Env,
  params: {
    userId: string;
    blueprint: CurriculumBlueprintData;
  },
): Promise<CurriculumBlueprintData> {
  try {
    const text = await summarizeProjectStructure(env, {
      userId: params.userId,
      fileSummary: JSON.stringify(params.blueprint.detectedModules),
    });
    return {
      ...params.blueprint,
      summary: `${params.blueprint.summary}\n\nAI 补充：${text.slice(0, 500)}`,
    };
  } catch {
    return params.blueprint;
  }
}
