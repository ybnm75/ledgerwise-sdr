import { describe, expect, it } from "vitest";
import { extractGroqText } from "./groq";

describe("Groq REST output parsing", () => {
  it("extracts structured text from the first assistant choice", () => {
    expect(extractGroqText({
      choices: [{ message: { role: "assistant", content: '{"ok":true}' } }]
    })).toBe('{"ok":true}');
  });

  it("returns an empty string for a missing choice", () => {
    expect(extractGroqText({ choices: [] })).toBe("");
  });
});
