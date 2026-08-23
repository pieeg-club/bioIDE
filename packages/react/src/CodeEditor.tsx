import { useEffect, useRef } from "react";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { javascript } from "@codemirror/lang-javascript";
import { python } from "@codemirror/lang-python";
import { EditorState } from "@codemirror/state";
import { oneDark } from "@codemirror/theme-one-dark";
import { EditorView, keymap, lineNumbers } from "@codemirror/view";
import type { Language } from "@bioide/core";

export interface CodeEditorProps {
  value: string;
  language: Language;
  onChange: (value: string) => void;
}

function languageExtension(language: Language) {
  return language === "python" ? python() : javascript();
}

export function CodeEditor({ value, language, onChange }: CodeEditorProps) {
  const parentRef = useRef<HTMLDivElement | null>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    const parent = parentRef.current;
    if (!parent) return;

    // StrictMode mounts twice; leftover CodeMirror DOM stacks a second editor.
    parent.replaceChildren();

    const view = new EditorView({
      parent,
      state: EditorState.create({
        doc: value,
        extensions: [
          lineNumbers(),
          history(),
          keymap.of([...defaultKeymap, ...historyKeymap]),
          languageExtension(language),
          oneDark,
          EditorView.updateListener.of((update) => {
            if (update.docChanged) {
              onChangeRef.current(update.state.doc.toString());
            }
          }),
          EditorView.theme({
            "&": { height: "100%" },
            "&.cm-focused": { outline: "none" },
            ".cm-scroller": {
              overflow: "auto",
              fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
              fontSize: "13px",
            },
          }),
        ],
      }),
    });

    viewRef.current = view;
    return () => {
      view.destroy();
      viewRef.current = null;
      parent.replaceChildren();
    };
    // Recreate when language changes so the highlighter swaps cleanly.
  }, [language]);

  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const current = view.state.doc.toString();
    if (current === value) return;
    view.dispatch({
      changes: { from: 0, to: current.length, insert: value },
    });
  }, [value]);

  return <div ref={parentRef} className="bioide-editor" />;
}
