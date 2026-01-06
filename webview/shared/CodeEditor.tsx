import React, { useEffect, useRef, useMemo } from "react";
import styled from "styled-components";

import { OPTION, REQUEST, RESPONSE } from "../constants";
import ResponsePreview from "../features/Response/Preview/ResponsePreview";

// JSON Syntax Highlighter Component
const syntaxHighlight = (json: string): string => {
  // First, try to format the JSON if it's valid
  let formatted = json;
  try {
    const parsed = JSON.parse(json);
    formatted = JSON.stringify(parsed, null, 2);
  } catch {
    // If it's not valid JSON, use as-is
    formatted = json;
  }

  // Escape HTML entities
  formatted = formatted
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // Apply syntax highlighting with regex
  return formatted.replace(
    /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
    (match) => {
      let cls = "json-number"; // number
      if (/^"/.test(match)) {
        if (/:$/.test(match)) {
          cls = "json-key"; // key
        } else {
          cls = "json-string"; // string
        }
      } else if (/true|false/.test(match)) {
        cls = "json-boolean"; // boolean
      } else if (/null/.test(match)) {
        cls = "json-null"; // null
      }
      return `<span class="${cls}">${match}</span>`;
    }
  );
};

interface ICodeEditorProps {
  language: string;
  editorOption: any;
  viewOption?: string;
  editorHeight: string;
  requestForm?: boolean;
  previewMode?: boolean;
  codeEditorValue: string;
  shouldBeautifyEditor?: boolean;
  handleEditorChange?: (value: string | undefined) => void;
  handleBeautifyButton?: () => void;
}

const CodeEditor = ({
  language,
  viewOption,
  requestForm,
  previewMode,
  editorHeight,
  codeEditorValue,
  handleEditorChange,
  shouldBeautifyEditor,
  handleBeautifyButton,
}: ICodeEditorProps) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Memoize the highlighted JSON for Pretty view
  const highlightedCode = useMemo(() => {
    if (viewOption === RESPONSE.PRETTY && (language === "json" || language === "javascript")) {
      return syntaxHighlight(codeEditorValue);
    }
    return null;
  }, [codeEditorValue, viewOption, language]);

  useEffect(() => {
    if (shouldBeautifyEditor && requestForm && textareaRef.current) {
      if (handleBeautifyButton) {
        handleBeautifyButton();
      }

      // Try to format JSON if possible
      try {
        const value = textareaRef.current.value;
        if (language === "json" || language === "javascript") {
          const parsed = JSON.parse(value);
          const formatted = JSON.stringify(parsed, null, 2);
          textareaRef.current.value = formatted;
          handleEditorChange?.(formatted);
        }
      } catch (error) {
        console.error("Error formatting content:", error);
      }
    }
  }, [shouldBeautifyEditor]);

  // Preview mode
  if (viewOption === RESPONSE.PREVIEW && previewMode) {
    return (
      <EditorWrapper>
        <ResponsePreview sourceCode={codeEditorValue} />
      </EditorWrapper>
    );
  }

  // Pretty mode with syntax highlighting (read-only)
  if (viewOption === RESPONSE.PRETTY && highlightedCode) {
    return (
      <EditorWrapper>
        <SyntaxHighlightedCode
          style={{ height: editorHeight }}
          dangerouslySetInnerHTML={{ __html: highlightedCode }}
        />
      </EditorWrapper>
    );
  }

  // Raw mode (editable textarea)
  return (
    <EditorWrapper>
      <SimpleTextEditor
        ref={textareaRef}
        value={codeEditorValue}
        onChange={(e) => handleEditorChange?.(e.target.value)}
        readOnly={viewOption !== REQUEST.RAW}
        style={{ height: editorHeight }}
        spellCheck="false"
      />
    </EditorWrapper>
  );
};

const EditorWrapper = styled.div`
  margin-top: 2rem;
`;

const SyntaxHighlightedCode = styled.pre`
  width: 100%;
  padding: 1rem;
  margin: 0;
  font-family: "Cascadia Code", "Monaco", "Menlo", "Ubuntu Mono", "Courier New", monospace;
  font-size: 13px;
  line-height: 1.5;
  background-color: var(--vscode-editor-background, #1e1e1e);
  color: var(--vscode-editor-foreground, #d4d4d4);
  border: 1px solid var(--vscode-editorBorder, #333);
  border-radius: 4px;
  overflow: auto;
  white-space: pre-wrap;
  word-wrap: break-word;
  tab-size: 2;

  .json-key {
    color: #9cdcfe;
  }

  .json-string {
    color: #ce9178;
  }

  .json-number {
    color: #b5cea8;
  }

  .json-boolean {
    color: #569cd6;
  }

  .json-null {
    color: #569cd6;
  }
`;

const SimpleTextEditor = styled.textarea`
  width: 100%;
  padding: 1rem;
  font-family: "Cascadia Code", "Monaco", "Menlo", "Ubuntu Mono", "Courier New", monospace;
  font-size: 13px;
  line-height: 1.5;
  background-color: var(--vscode-editor-background, #1e1e1e);
  color: var(--vscode-editor-foreground, #d4d4d4);
  border: 1px solid var(--vscode-editorBorder, #333);
  border-radius: 4px;
  resize: none;
  tab-size: 2;
  
  &:focus {
    outline: none;
    border-color: var(--vscode-focusBorder, #007acc);
    box-shadow: 0 0 0 1px var(--vscode-focusBorder, #007acc);
  }

  &:read-only {
    cursor: default;
    opacity: 1;
  }
`;

export default CodeEditor;
