import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AccessibilityToolbar from "./AccessibilityToolbar";

describe("AccessibilityToolbar", () => {
  beforeEach(() => {
    localStorage.clear();
    delete document.body.dataset.contrast;
    delete document.body.dataset.theme;
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

  test("moves the dark mode toggle into the toolbar and persists the theme", async () => {
    render(<AccessibilityToolbar />);

    await userEvent.click(screen.getByRole("button", { name: "Turn dark mode on" }));

    expect(document.body).toHaveAttribute("data-theme", "dark");
    expect(localStorage.getItem("home-affairs-theme")).toBe("dark");
    expect(screen.getByRole("button", { name: "Turn light mode on" })).toBeInTheDocument();
  });

  test("stops page instructions when the read button is pressed again", () => {
    Object.defineProperty(window, "SpeechSynthesisUtterance", {
      configurable: true,
      value: class {
        constructor(text) {
          this.text = text;
        }
      }
    });
    const cancel = jest.fn();
    Object.defineProperty(window, "speechSynthesis", {
      configurable: true,
      value: {
        cancel,
        getVoices: () => [],
        speak: jest.fn()
      }
    });
    render(
      <>
        <AccessibilityToolbar />
        <main>
          <h1>Welcome</h1>
          <p>These are the page instructions.</p>
        </main>
      </>
    );
    document.querySelectorAll("main h1, main p").forEach(element => {
      jest.spyOn(element, "getClientRects").mockReturnValue([{}]);
    });

    fireEvent.click(screen.getByRole("button", { name: "Read page instructions" }));
    expect(screen.getByRole("button", { name: "Stop reading" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Stop reading" }));

    expect(cancel).toHaveBeenCalledTimes(2);
    expect(screen.getByRole("button", { name: "Read page instructions" })).toBeInTheDocument();
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
      screen.getByRole("combobox", { name: "Translate" }),
      "st-LS"
    );
    fireEvent.focus(screen.getByLabelText("Email address"));

    fireEvent.click(screen.getByRole("button", {
      name: /read aterese ea imeile aloud/i
    }));

    expect(utterances[0].text).toBe("Aterese ea imeile");
    expect(utterances[0].lang).toBe("st-LS");
  });

  test("places the read-aloud language selector after the page-reading control", () => {
    render(<AccessibilityToolbar />);
    const toolbar = screen.getByRole("region", { name: "Accessibility controls" });
    const pageReadButton = screen.getByRole("button", { name: "Read page instructions" });
    const languageSelect = screen.getByRole("combobox", { name: "Translate" });

    expect(
      pageReadButton.compareDocumentPosition(languageSelect) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
    expect(toolbar).toContainElement(languageSelect);
  });
});
