import * as vscode from 'vscode';

/**
 * Stata output channel for displaying command results, errors,
 * and execution timing in the VS Code output panel.
 */
export class StataOutputChannel {
    private channel: vscode.OutputChannel;

    constructor() {
        this.channel = vscode.window.createOutputChannel('Stata AI Fusion');
    }

    /**
     * Append a line to the output channel.
     */
    appendLine(text: string): void {
        this.channel.appendLine(text);
    }

    /**
     * Append text without a newline.
     */
    append(text: string): void {
        this.channel.append(text);
    }

    /**
     * Show the output channel panel.
     */
    reveal(): void {
        this.channel.show(true);
    }

    /**
     * Display the start of a Stata command run with timestamp.
     */
    showRunStart(code: string): void {
        this.reveal();
        const timestamp = new Date().toLocaleTimeString();
        this.channel.appendLine('');
        this.channel.appendLine(
            `${'='.repeat(60)}`
        );
        this.channel.appendLine(`[${timestamp}] Running Stata command:`);
        this.channel.appendLine(`${'─'.repeat(60)}`);

        // Show the code being run (truncate if very long)
        const displayCode =
            code.length > 500 ? code.substring(0, 500) + '...' : code;
        this.channel.appendLine(displayCode);
        this.channel.appendLine(`${'─'.repeat(60)}`);
    }

    /**
     * Display a successful result with execution time.
     */
    showResult(output: string, elapsedMs: number): void {
        const timestamp = new Date().toLocaleTimeString();
        const elapsed = this.formatElapsed(elapsedMs);

        if (output && output.trim()) {
            this.channel.appendLine(output);
        }

        this.channel.appendLine(`${'─'.repeat(60)}`);
        this.channel.appendLine(
            `[${timestamp}] Completed in ${elapsed}`
        );
        this.channel.appendLine(`${'='.repeat(60)}`);
    }

    /**
     * Display an error result with execution time and highlighting.
     */
    showError(error: string, elapsedMs: number): void {
        const timestamp = new Date().toLocaleTimeString();
        const elapsed = this.formatElapsed(elapsedMs);

        this.channel.appendLine('');
        this.channel.appendLine(`ERROR: ${error}`);
        this.channel.appendLine(`${'─'.repeat(60)}`);
        this.channel.appendLine(
            `[${timestamp}] Failed after ${elapsed}`
        );
        this.channel.appendLine(`${'='.repeat(60)}`);
    }

    /**
     * Show a formatted result from an MCP tool call.
     * Includes output text, optional error info, and timing.
     */
    show(result: {
        output?: string;
        error?: string;
        elapsedMs?: number;
    }): void {
        const timestamp = new Date().toLocaleTimeString();
        const elapsed = result.elapsedMs
            ? this.formatElapsed(result.elapsedMs)
            : '';

        this.reveal();
        this.channel.appendLine('');
        this.channel.appendLine(`${'='.repeat(60)}`);
        this.channel.appendLine(`[${timestamp}] Stata Output`);
        this.channel.appendLine(`${'─'.repeat(60)}`);

        if (result.error) {
            this.channel.appendLine(`ERROR: ${result.error}`);
        }

        if (result.output && result.output.trim()) {
            this.channel.appendLine(result.output);
        }

        if (elapsed) {
            this.channel.appendLine(`${'─'.repeat(60)}`);
            this.channel.appendLine(`Execution time: ${elapsed}`);
        }

        this.channel.appendLine(`${'='.repeat(60)}`);
    }

    /**
     * Format elapsed milliseconds into a human-readable string.
     */
    private formatElapsed(ms: number): string {
        if (ms < 1000) {
            return `${ms}ms`;
        }
        if (ms < 60000) {
            return `${(ms / 1000).toFixed(2)}s`;
        }
        const minutes = Math.floor(ms / 60000);
        const seconds = ((ms % 60000) / 1000).toFixed(1);
        return `${minutes}m ${seconds}s`;
    }

    /**
     * Dispose the output channel.
     */
    dispose(): void {
        this.channel.dispose();
    }
}
