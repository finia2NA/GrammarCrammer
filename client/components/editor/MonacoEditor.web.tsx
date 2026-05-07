import { useRef, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import MonacoReact, { DiffEditor, type OnMount, type DiffOnMount } from '@monaco-editor/react';
import type { editor } from 'monaco-editor';

interface MonacoEditorProps {
  value: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
  /** Original text shown in the left (read-only) pane of the diff view. */
  original?: string;
  /** When true and `original` is provided, renders a side-by-side diff editor. */
  showDiff?: boolean;
}

export function MonacoEditor({ value, onChange, readOnly, original, showDiff }: MonacoEditorProps) {
  const colorScheme = useColorScheme();
  // Always holds the editable editor instance (IStandaloneCodeEditor),
  // regardless of whether we're in diff or normal mode.
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const isExternalUpdateRef = useRef(false);
  const lastExternalValueRef = useRef(value);

  // Sync external value changes (e.g. from AI edits) without disrupting cursor position.
  useEffect(() => {
    const ed = editorRef.current;
    if (!ed) return;
    if (value !== lastExternalValueRef.current && value !== ed.getValue()) {
      isExternalUpdateRef.current = true;
      lastExternalValueRef.current = value;
      ed.setValue(value);
      isExternalUpdateRef.current = false;
    }
  }, [value]);

  const commonOptions: editor.IStandaloneEditorConstructionOptions = {
    wordWrap: 'on',
    minimap: { enabled: false },
    fontSize: 14,
    automaticLayout: true,
    readOnly: readOnly ?? false,
    scrollBeyondLastLine: false,
    lineNumbers: 'off',
    glyphMargin: false,
    folding: false,
    lineDecorationsWidth: 0,
    lineNumbersMinChars: 0,
  };

  const handleMount: OnMount = (ed) => {
    editorRef.current = ed;
    lastExternalValueRef.current = value;
  };

  const handleDiffMount: DiffOnMount = (diffEditor) => {
    isExternalUpdateRef.current = true;
    const modifiedEditor = diffEditor.getModifiedEditor();
    editorRef.current = modifiedEditor;
    lastExternalValueRef.current = value;
    modifiedEditor.onDidChangeModelContent(() => {
      if (!isExternalUpdateRef.current) {
        const v = modifiedEditor.getValue();
        onChange(v);
        lastExternalValueRef.current = v;
      }
    });
    setTimeout(() => { isExternalUpdateRef.current = false; }, 0);
  };

  if (showDiff && original !== undefined) {
    return (
      <DiffEditor
        height="100%"
        language="markdown"
        theme={colorScheme === 'dark' ? 'vs-dark' : 'light'}
        original={original}
        modified={value}
        onMount={handleDiffMount}
        keepCurrentModifiedModel
        options={{
          ...commonOptions,
          renderSideBySide: true,
          originalEditable: false,
        }}
      />
    );
  }

  return (
    <MonacoReact
      height="100%"
      language="markdown"
      theme={colorScheme === 'dark' ? 'vs-dark' : 'light'}
      value={value}
      onMount={handleMount}
      onChange={(v) => {
        if (!isExternalUpdateRef.current) {
          onChange(v ?? '');
          lastExternalValueRef.current = v ?? '';
        }
      }}
      options={commonOptions}
    />
  );
}
