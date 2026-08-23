import {
  autocompletion,
  completionKeymap,
  type Completion,
  type CompletionContext,
  type CompletionResult,
} from "@codemirror/autocomplete";
import { SANDBOX_API } from "@bioide/core";
import { keymap } from "@codemirror/view";

const TYPE_BOOST: Record<string, number> = {
  variable: 99,
  class: 90,
  function: 80,
  property: 70,
};

const completions: Completion[] = SANDBOX_API.map((item) => ({
  label: item.name,
  type: item.type,
  detail: item.detail,
  info: item.info,
  apply: item.apply ?? item.name,
  boost: TYPE_BOOST[item.type] ?? 50,
}));

function wordBefore(context: CompletionContext): { from: number; text: string } {
  const word = context.matchBefore(/[\w.$]*/);
  return { from: word?.from ?? context.pos, text: word?.text ?? "" };
}

function sandboxCompletions(context: CompletionContext): CompletionResult | null {
  const { from, text } = wordBefore(context);
  if (!text && !context.explicit) return null;

  const prefix = text.toLowerCase();
  const options = prefix
    ? completions.filter((item) => {
        const label = item.label.toLowerCase();
        return label.startsWith(prefix) || label.includes(`.${prefix}`);
      })
    : completions;

  if (!options.length) return null;
  return { from, options, validFor: /[\w.$]*/ };
}

export const sandboxEditorExtensions = [
  autocompletion({ override: [sandboxCompletions], activateOnTyping: true }),
  keymap.of(completionKeymap),
];
