import React, { useEffect, useRef } from "react";
import styled from "styled-components";

import { OPTION, REQUEST, RESPONSE } from "../constants";
import ResponsePreview from "../features/Response/Preview/ResponsePreview";

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

  return (
    <EditorWrapper>
      {viewOption === RESPONSE.PREVIEW && previewMode ? (
        <ResponsePreview sourceCode={codeEditorValue} />
      ) : (
        <SimpleTextEditor
          ref={textareaRef}
          value={codeEditorValue}
          onChange={(e) => handleEditorChange?.(e.target.value)}
          readOnly={viewOption !== REQUEST.RAW}
          style={{ height: editorHeight }}
          spellCheck="false"
        />
      )}
    </EditorWrapper>
  );
};

const EditorWrapper = styled.div`
  margin-top: 2rem;
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
