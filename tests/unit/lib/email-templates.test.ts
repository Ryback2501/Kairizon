import path from "path";

const mockExistsSync = jest.fn();
const mockWriteFileSync = jest.fn();
const mockReadFileSync = jest.fn();

jest.mock("fs", () => ({
  existsSync: (...args: unknown[]) => mockExistsSync(...args),
  writeFileSync: (...args: unknown[]) => mockWriteFileSync(...args),
  readFileSync: (...args: unknown[]) => mockReadFileSync(...args),
}));

const DB_URL = "file:./data/kairizon.db";
const DATA_DIR = path.dirname(path.resolve("./data/kairizon.db"));

beforeEach(() => {
  jest.clearAllMocks();
  process.env.DATABASE_URL = DB_URL;
});

describe("ensureEmailTemplates", () => {
  it("creates both template files when neither exists", () => {
    mockExistsSync.mockReturnValue(false);
    const { ensureEmailTemplates } = require("@/lib/email-templates");
    ensureEmailTemplates();
    expect(mockWriteFileSync).toHaveBeenCalledTimes(2);
    expect(mockWriteFileSync.mock.calls[0][0]).toBe(path.join(DATA_DIR, "email-price-alert.html"));
    expect(mockWriteFileSync.mock.calls[1][0]).toBe(path.join(DATA_DIR, "email-stock-alert.html"));
  });

  it("does not overwrite files that already exist", () => {
    mockExistsSync.mockReturnValue(true);
    const { ensureEmailTemplates } = require("@/lib/email-templates");
    ensureEmailTemplates();
    expect(mockWriteFileSync).not.toHaveBeenCalled();
  });

  it("creates only the missing file when one already exists", () => {
    mockExistsSync
      .mockReturnValueOnce(true)   // price alert exists
      .mockReturnValueOnce(false); // stock alert missing
    const { ensureEmailTemplates } = require("@/lib/email-templates");
    ensureEmailTemplates();
    expect(mockWriteFileSync).toHaveBeenCalledTimes(1);
    expect(mockWriteFileSync.mock.calls[0][0]).toBe(path.join(DATA_DIR, "email-stock-alert.html"));
  });
});

describe("renderTemplate", () => {
  it("replaces all placeholders with provided values", () => {
    mockReadFileSync.mockReturnValue("Hello {{NAME}}, price is {{PRICE}}.");
    const { renderTemplate } = require("@/lib/email-templates");
    const result = renderTemplate("email-price-alert.html", { NAME: "Alice", PRICE: "€9.99" });
    expect(result).toBe("Hello Alice, price is €9.99.");
  });

  it("replaces all occurrences of the same placeholder", () => {
    mockReadFileSync.mockReturnValue("{{TITLE}} — {{TITLE}}");
    const { renderTemplate } = require("@/lib/email-templates");
    const result = renderTemplate("email-price-alert.html", { TITLE: "Widget" });
    expect(result).toBe("Widget — Widget");
  });

  it("leaves unknown placeholders intact", () => {
    mockReadFileSync.mockReturnValue("Hello {{NAME}} {{UNKNOWN}}");
    const { renderTemplate } = require("@/lib/email-templates");
    const result = renderTemplate("email-price-alert.html", { NAME: "Alice" });
    expect(result).toBe("Hello Alice {{UNKNOWN}}");
  });

  it("escapes HTML special characters in placeholder values", () => {
    mockReadFileSync.mockReturnValue("{{TITLE}}");
    const { renderTemplate } = require("@/lib/email-templates");
    const result = renderTemplate("email-price-alert.html", {
      TITLE: '<script>alert("xss&\'test\'");</script>',
    });
    expect(result).toBe(
      "&lt;script&gt;alert(&quot;xss&amp;&#39;test&#39;&quot;);&lt;/script&gt;"
    );
  });

  it("reads from the correct data directory", () => {
    mockReadFileSync.mockReturnValue("");
    const { renderTemplate } = require("@/lib/email-templates");
    renderTemplate("email-price-alert.html", {});
    expect(mockReadFileSync).toHaveBeenCalledWith(
      path.join(DATA_DIR, "email-price-alert.html"),
      "utf-8"
    );
  });
});
