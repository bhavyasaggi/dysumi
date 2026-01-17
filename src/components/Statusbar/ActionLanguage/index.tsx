import { Select } from "@mantine/core";
import { useReduxDispatch, useReduxSelector } from "@/lib/redux/hooks";
import {
  actionInterfaceOpenFile,
  selectorInterfaceGetActiveFile,
} from "@/lib/redux/slices/interface";
import Icon from "@/lib/ui/Icon";
import { extToLanguage } from "@/lib/utils/ext-to-language";

const LANGUAGE_DATA = [
  "bat",
  "cpp",
  "css",
  "html",
  "ini",
  "java",
  "javascript",
  "markdown",
  "php",
  "plaintext",
  "powershell",
  "python",
  "shell",
  "sql",
  "typescript",
  "xml",
  "yaml",
] as const;

export default function StatusbarActionLanguage() {
  const dispatch = useReduxDispatch();
  const activeFile = useReduxSelector(selectorInterfaceGetActiveFile);
  const activeFileLanguage =
    activeFile?.language || extToLanguage(activeFile?.path || "");

  const activeFileMode = activeFile?.mode || "normal";
  if (
    activeFileMode !== "normal" ||
    ["md", "csv", "json", "yaml", "yml"].includes(
      String(activeFile?.path || "")
        .split(".")
        .pop()
        ?.trim()
        .toLowerCase() || ""
    )
  ) {
    return null;
  }

  return (
    <Select
      size="xs"
      variant="unstyled"
      searchable={true}
      comboboxProps={{
        position: "top-end",
        middlewares: {
          flip: false,
          shift: false,
          inline: false,
          size: false,
        },
        dropdownPadding: 0,
        shadow: "sm",
      }}
      checkIconPosition="right"
      value={activeFileLanguage}
      onChange={(v) => {
        if (activeFile) {
          dispatch(
            actionInterfaceOpenFile({
              ...activeFile,
              language: v === activeFileLanguage ? undefined : v || undefined,
            })
          );
        }
      }}
      data={LANGUAGE_DATA}
      leftSection={<Icon icon="code" height={16} width={16} title="Language" />}
      w={140}
      styles={{
        input: {
          fontFamily: "monospace",
        },
        option: {
          fontFamily: "monospace",
        },
      }}
    />
  );
}
