import { describe, expect, it } from "vitest";
import { extractGeminiText } from "./gemini";

describe("Gemini REST output parsing", () => {
  it("extracts text from a model output step", () => {
    expect(extractGeminiText({
      steps: [
        { type: "thought", signature: "hidden" },
        { type: "model_output", content: [{ type: "text", text: "{\"ok\":true}" }] }
      ]
    })).toBe('{"ok":true}');
  });

  it("accepts the SDK convenience shape when supplied", () => {
    expect(extractGeminiText({ output_text: '{"ok":true}' })).toBe('{"ok":true}');
  });
});
