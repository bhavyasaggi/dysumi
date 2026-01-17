type LanguageType =
  | "bat"
  | "cpp"
  | "css"
  | "html"
  | "ini"
  | "java"
  | "javascript"
  | "markdown"
  | "php"
  | "plaintext"
  | "powershell"
  | "python"
  | "shell"
  | "sql"
  | "typescript"
  | "xml"
  | "yaml";

export function extToLanguage(path: string): LanguageType {
  const ext = path.split(".").pop()?.toLowerCase();

  switch (ext) {
    case "json":
    case "js":
    case "mjs":
    case "cjs":
    case "jsx":
      return "javascript";
    case "ts":
    case "tsx":
      return "typescript";
    case "py":
      return "python";
    case "c":
    case "cpp":
    case "cc":
    case "cxx":
    case "c++":
    case "hpp":
    case "h":
      return "cpp";
    case "php":
      return "php";
    case "sh":
    case "bash":
    case "zsh":
      return "shell";
    case "ps1":
      return "powershell";
    case "bat":
    case "cmd":
      return "bat";
    case "html":
    case "htm":
      return "html";
    case "css":
      return "css";
    case "xml":
    case "xsl":
    case "xsd":
      return "xml";
    case "yaml":
    case "yml":
      return "yaml";
    case "md":
      return "markdown";
    case "sql":
      return "sql";
    default:
      return "plaintext";
  }
}
