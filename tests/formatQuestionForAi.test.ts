import { describe, expect, it } from "vitest";
import {
  formatAnswerForAi,
  formatOptionsForAi,
  formatQuestionMaterialsForAi,
} from "~/lib/learn/formatQuestionForAi";

describe("formatQuestionForAi", () => {
  it("formats options with letter labels", () => {
    const text = formatOptionsForAi([
      { id: "a", text: "是 Layout，负责 Outlet" },
      { id: "b", text: "是普通页面组件" },
    ]);
    expect(text).toContain("A. id=a：是 Layout，负责 Outlet");
    expect(text).toContain("B. id=b：是普通页面组件");
  });

  it("resolves choice answers to option text", () => {
    const options = [
      { id: "a", text: "用户选错项" },
      { id: "b", text: "正确答案项" },
    ];
    expect(
      formatAnswerForAi(
        { type: "single_choice", choiceId: "a" },
        "single_choice",
        { options },
      ),
    ).toBe("a（用户选错项）");
    expect(
      formatAnswerForAi(
        { type: "single_choice", choiceId: "b" },
        "single_choice",
        { options },
      ),
    ).toBe("b（正确答案项）");
  });

  it("includes options in question materials", () => {
    const text = formatQuestionMaterialsForAi({
      type: "single_choice",
      options: [
        { id: "layout", text: "嵌套 layout" },
        { id: "page", text: "叶子页面" },
      ],
    });
    expect(text).toContain("layout");
    expect(text).toContain("嵌套 layout");
  });
});
