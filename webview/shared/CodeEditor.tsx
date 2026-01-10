import React, { useEffect, useRef, useMemo, useState } from "react";
import styled from "styled-components";

import { REQUEST, RESPONSE } from "../constants";
import ResponsePreview from "../features/Response/Preview/ResponsePreview";

// JSON Syntax Highlighter Component with Search Support
const syntaxHighlight = (json: string, searchTerm?: string, currentMatchIndex?: number): string => {
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
  let highlighted = formatted.replace(
    /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)(?:[eE][+-]?\d+)?)/g,
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

  // Highlight search matches
  if (searchTerm && searchTerm.length > 0) {
    const escapedSearch = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const searchRegex = new RegExp(`(${escapedSearch})`, 'gi');
    let matchCount = 0;
    
    highlighted = highlighted.replace(searchRegex, (match) => {
      const isCurrentMatch = matchCount === currentMatchIndex;
      const className = isCurrentMatch ? 'search-match-current' : 'search-match';
      matchCount++;
      return `<span class="${className}">${match}</span>`;
    });
  }

  return highlighted;
};

interface ICodeEditorProps {
  language: string;
  editorOption: unknown;
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
  const [searchTerm, setSearchTerm] = useState("");
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const [matchCount, setMatchCount] = useState(0);
  const [showSearch, setShowSearch] = useState(false);

  // Calculate match count
  useEffect(() => {
    if (searchTerm.length > 0) {
      const escapedSearch = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const searchRegex = new RegExp(escapedSearch, 'gi');
      const matches = codeEditorValue.match(searchRegex);
      setMatchCount(matches ? matches.length : 0);
      setCurrentMatchIndex(0);
    } else {
      setMatchCount(0);
    }
  }, [searchTerm, codeEditorValue]);

  // Handle keyboard shortcut for search (Cmd+F / Ctrl+F)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
        e.preventDefault();
        setShowSearch(true);
      } else if (e.key === 'Escape') {
        setShowSearch(false);
        setSearchTerm("");
      } else if ((e.metaKey || e.ctrlKey) && e.key === 'g') {
        e.preventDefault();
        if (showSearch && matchCount > 0) {
          setCurrentMatchIndex((prev) => (prev + 1) % matchCount);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showSearch, matchCount]);

  // Memoize the highlighted JSON for Pretty view
  const highlightedCode = useMemo(() => {
    if (viewOption === RESPONSE.PRETTY && (language === "json" || language === "javascript")) {
      return syntaxHighlight(codeEditorValue, searchTerm, currentMatchIndex);
    }
    return null;
  }, [codeEditorValue, viewOption, language, searchTerm, currentMatchIndex]);

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
        {showSearch && (
          <SearchContainer>
            <SearchInput
              type="text"
              placeholder="Search in response..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              autoFocus
            />
            <SearchInfo>
              {searchTerm && matchCount > 0 ? `${currentMatchIndex + 1}/${matchCount}` : ''}
            </SearchInfo>
            <SearchButton onClick={() => setShowSearch(false)}>✕</SearchButton>
          </SearchContainer>
        )}
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
      {showSearch && (
        <SearchContainer>
          <SearchInput
            type="text"
            placeholder="Search in response..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            autoFocus
          />
          <SearchInfo>
            {searchTerm && matchCount > 0 ? `${currentMatchIndex + 1}/${matchCount}` : ''}
          </SearchInfo>
          <SearchButton onClick={() => setShowSearch(false)}>✕</SearchButton>
        </SearchContainer>
      )}
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

const SearchContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem;
  background-color: var(--vscode-editor-background, #1e1e1e);
  border-bottom: 1px solid var(--vscode-editorBorder, #333);
  border-radius: 4px 4px 0 0;
`;

const SearchInput = styled.input`
  flex: 1;
  padding: 0.4rem 0.7rem;
  font-size: 13px;
  background-color: var(--vscode-input-background, #3c3c3c);
  color: var(--vscode-input-foreground, #d4d4d4);
  border: 1px solid var(--vscode-inputBorder, #555);
  border-radius: 3px;
  
  &:focus {
    outline: none;
    border-color: var(--vscode-focusBorder, #007acc);
    box-shadow: 0 0 0 1px var(--vscode-focusBorder, #007acc);
  }

  &::placeholder {
    color: var(--vscode-input-placeholderForeground, #888);
  }
`;

const SearchInfo = styled.span`
  color: var(--vscode-input-foreground, #d4d4d4);
  font-size: 12px;
  white-space: nowrap;
  min-width: 3rem;
  text-align: right;
`;

const SearchButton = styled.button`
  padding: 0.3rem 0.5rem;
  background-color: transparent;
  color: var(--vscode-input-foreground, #d4d4d4);
  border: 1px solid var(--vscode-inputBorder, #555);
  border-radius: 3px;
  cursor: pointer;
  font-size: 14px;
  
  &:hover {
    background-color: var(--vscode-button-hoverBackground, #3e3e42);
  }
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

  .search-match {
    background-color: #7a4a1e;
    color: inherit;
  }

  .search-match-current {
    background-color: #ff6b35;
    color: #000;
    font-weight: bold;
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
