import * as vscode from 'vscode';
import { some, none, isNone, absurd, findOption, getOrElseOption } from '@tsfpp/prelude';
import type { Option } from '@tsfpp/prelude';

/** Where the AI-assisted commands hand their prompt (setting `conjurer.promptTarget`). */
export type PromptTarget = 'vscodeChat' | 'claudeCode' | 'clipboard';

export const PROMPT_TARGETS: ReadonlyArray<PromptTarget> = ['vscodeChat', 'claudeCode', 'clipboard'];

export const DEFAULT_PROMPT_TARGET: PromptTarget = 'vscodeChat';

/**
 * Read the setting's raw value; anything that is not a known target falls back to the default.
 *
 * @param raw - The configured value, as VS Code returns it.
 * @returns The prompt target.
 */
export const parsePromptTarget = (raw: unknown): PromptTarget =>
  getOrElseOption<PromptTarget>(() => DEFAULT_PROMPT_TARGET)(findOption((t: PromptTarget) => t === raw)(PROMPT_TARGETS));

/** A VS Code command that opens a chat with the prompt. */
export type ChatCommand = { readonly command: string; readonly args: ReadonlyArray<unknown> };

/**
 * The command that opens a chat with the prompt, or none when the target is the clipboard.
 *
 * `claudeCode` calls `claude-vscode.editor.open(sessionId, initialPrompt)`, which opens a new
 * Claude Code tab with the prompt in its input box, not sent. That is the Claude Code
 * extension's own call signature rather than a published API, so the caller falls back to
 * the clipboard when the command fails.
 *
 * @param target - Where to hand the prompt.
 * @param prompt - The prompt text.
 * @returns The command and its arguments.
 */
export const chatCommandFor = (target: PromptTarget, prompt: string): Option<ChatCommand> => {
  switch (target) {
    case 'vscodeChat': return some({ command: 'workbench.action.chat.open', args: [{ query: prompt }] });
    case 'claudeCode': return some({ command: 'claude-vscode.editor.open', args: [undefined, prompt] });
    case 'clipboard': return none;
    default: return absurd(target);
  }
};

const CLIPBOARD_NOTE = 'Prompt copied to clipboard — paste it into your AI chat (Ctrl+V / Cmd+V).';

const copyToClipboard = async (prompt: string, reason: string): Promise<void> => {
  await vscode.env.clipboard.writeText(prompt);
  void vscode.window.showInformationMessage(reason.length > 0 ? `${reason} ${CLIPBOARD_NOTE}` : CLIPBOARD_NOTE);
};

/**
 * Hand a prompt to the chat chosen in `conjurer.promptTarget`, or to the clipboard when that
 * chat cannot be opened. Calls no model itself.
 *
 * @param prompt - The prompt text.
 * @returns Resolves once the prompt is handed over.
 */
export const openInChat = async (prompt: string): Promise<void> => {
  const target = parsePromptTarget(vscode.workspace.getConfiguration('conjurer').get('promptTarget'));
  const chat = chatCommandFor(target, prompt);
  if (isNone(chat)) return copyToClipboard(prompt, '');
  try {
    await vscode.commands.executeCommand(chat.value.command, ...chat.value.args);
  } catch {
    await copyToClipboard(prompt, target === 'claudeCode' ? 'Claude Code could not be opened; is its extension installed?' : '');
  }
};
