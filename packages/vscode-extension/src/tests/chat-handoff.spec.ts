import { describe, it, expect, vi, afterEach } from 'vitest';
import * as vscode from 'vscode';
import { some, none } from '@tsfpp/prelude';
import { parsePromptTarget, chatCommandFor, openInChat, DEFAULT_PROMPT_TARGET } from '../commands/chat-handoff.js';
import { setTestSetting, clearTestSettings } from '../mocks/vscode.js';

const PROMPT = 'Refine this form.';

const configure = (value: unknown): void => {
  setTestSetting('conjurer.promptTarget', value);
};

afterEach(() => {
  vi.restoreAllMocks();
  clearTestSettings();
});

describe('parsePromptTarget', () => {
  it('accepts each known target', () => {
    expect(['vscodeChat', 'claudeCode', 'clipboard'].map(parsePromptTarget)).toEqual(['vscodeChat', 'claudeCode', 'clipboard']);
  });

  it('falls back to the VS Code chat for a missing or unknown value', () => {
    expect(DEFAULT_PROMPT_TARGET).toBe('vscodeChat');
    expect([undefined, 'copilot', 3].map(parsePromptTarget)).toEqual(['vscodeChat', 'vscodeChat', 'vscodeChat']);
  });
});

describe('chatCommandFor', () => {
  it('opens the VS Code chat with the prompt as its query', () => {
    expect(chatCommandFor('vscodeChat', PROMPT)).toEqual(some({ command: 'workbench.action.chat.open', args: [{ query: PROMPT }] }));
  });

  it('opens a new Claude Code tab with the prompt as its initial input and no session', () => {
    expect(chatCommandFor('claudeCode', PROMPT)).toEqual(some({ command: 'claude-vscode.editor.open', args: [undefined, PROMPT] }));
  });

  it('runs no command for the clipboard', () => {
    expect(chatCommandFor('clipboard', PROMPT)).toEqual(none);
  });
});

describe('openInChat', () => {
  it('uses the VS Code chat when nothing is configured', async () => {
    configure(undefined);
    const run = vi.spyOn(vscode.commands, 'executeCommand');
    await openInChat(PROMPT);
    expect(run).toHaveBeenCalledWith('workbench.action.chat.open', { query: PROMPT });
  });

  it('opens Claude Code when configured', async () => {
    configure('claudeCode');
    const run = vi.spyOn(vscode.commands, 'executeCommand');
    const copy = vi.spyOn(vscode.env.clipboard, 'writeText');
    await openInChat(PROMPT);
    expect(run).toHaveBeenCalledWith('claude-vscode.editor.open', undefined, PROMPT);
    expect(copy).not.toHaveBeenCalled();
  });

  it('copies the prompt and says why when Claude Code cannot be opened', async () => {
    configure('claudeCode');
    vi.spyOn(vscode.commands, 'executeCommand').mockRejectedValue("command 'claude-vscode.editor.open' not found");
    const copy = vi.spyOn(vscode.env.clipboard, 'writeText');
    const note = vi.spyOn(vscode.window, 'showInformationMessage');
    await openInChat(PROMPT);
    expect(copy).toHaveBeenCalledWith(PROMPT);
    expect(note).toHaveBeenCalledWith(expect.stringMatching(/^Claude Code could not be opened; is its extension installed\? Prompt copied to clipboard/));
  });

  it('only copies the prompt when the clipboard is configured', async () => {
    configure('clipboard');
    const run = vi.spyOn(vscode.commands, 'executeCommand');
    const copy = vi.spyOn(vscode.env.clipboard, 'writeText');
    await openInChat(PROMPT);
    expect(run).not.toHaveBeenCalled();
    expect(copy).toHaveBeenCalledWith(PROMPT);
  });
});
