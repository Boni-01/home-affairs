import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AccessibilityToolbar from "./AccessibilityToolbar";

describe("AccessibilityToolbar", () => {
  beforeEach(() => {
    localStorage.clear();
    delete document.body.dataset.contrast;
    document.documentElement.style.zoom = "";
  });

  test("increases page zoom and saves the selected size", async () => {
    render(<AccessibilityToolbar />);

    await userEvent.click(screen.getByRole("button", { name: /increase text size/i }));

    expect(document.documentElement.style.zoom).toBe("1.1");
    expect(localStorage.getItem("home-affairs-accessibility-zoom")).toBe("1.1");
  });

  test("turns high contrast on and persists the setting", async () => {
    render(<AccessibilityToolbar />);

    await userEvent.click(screen.getByRole("button", { name: "High contrast" }));

    expect(document.body).toHaveAttribute("data-contrast", "high");
    expect(localStorage.getItem("home-affairs-high-contrast")).toBe("true");
  });

  test("adds a speaker beside a focused field and reads its label", () => {
    const utterances = [];
    Object.defineProperty(window, "SpeechSynthesisUtterance", {
      configurable: true,
      value: class {
        constructor(text) {
          this.text = text;
        }
      }
    });
    Object.defineProperty(window, "speechSynthesis", {
      configurable: true,
      value: {
        cancel: jest.fn(),
        getVoices: () => [],
        speak: utterance => utterances.push(utterance)
      }
    });

    render(
      <>
        <AccessibilityToolbar />
        <label htmlFor="email-address">Email address</label>
        <input id="email-address" />
      </>
    );
    const field = screen.getByLabelText("Email address");
    fireEvent.focus(field);

    const speaker = screen.getByRole("button", { name: /read email address aloud/i });
    fireEvent.click(speaker);

    expect(utterances).toHaveLength(1);
    expect(utterances[0].text).toBe("Email address");
    expect(utterances[0].lang).toBe("en-LS");
  });

  test("reads known field labels in Sesotho when selected", async () => {
    const utterances = [];
    Object.defineProperty(window, "SpeechSynthesisUtterance", {
      configurable: true,
      value: class {
        constructor(text) {
          this.text = text;
        }
      }
    });
    Object.defineProperty(window, "speechSynthesis", {
      configurable: true,
      value: {
        cancel: jest.fn(),
        getVoices: () => [],
        speak: utterance => utterances.push(utterance)
      }
    });

    render(
      <>
        <AccessibilityToolbar />
        <label htmlFor="email-address">Email address</label>
        <input id="email-address" />
      </>
    );
    await userEvent.selectOptions(
      screen.getByRole("combobox", { name: "Voice" }),
      "st-LS"
    );
    fireEvent.focus(screen.getByLabelText("Email address"));

    fireEvent.click(screen.getByRole("button", {
      name: /read aterese ea imeile aloud/i
    }));

    expect(utterances[0].text).toBe("Aterese ea imeile");
    expect(utterances[0].lang).toBe("st-LS");
  });
});
