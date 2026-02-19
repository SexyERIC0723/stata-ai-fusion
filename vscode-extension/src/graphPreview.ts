import * as vscode from 'vscode';

/**
 * Graph data structure for preview display.
 */
export interface GraphData {
    format: string;
    base64: string;
    filename?: string;
}

/**
 * GraphPreview manages a WebviewPanel to display Stata graph output
 * as base64-encoded images in a side panel.
 */
export class GraphPreview {
    private static panel: vscode.WebviewPanel | undefined;

    /**
     * Show a graph in the preview panel. Creates the panel if it
     * does not already exist, or updates the existing one.
     */
    static show(graph: GraphData): void {
        const column = vscode.ViewColumn.Beside;

        if (GraphPreview.panel) {
            // Update existing panel
            GraphPreview.panel.webview.html = GraphPreview.getHtml(graph);
            GraphPreview.panel.reveal(column, true);
        } else {
            // Create new panel
            GraphPreview.panel = vscode.window.createWebviewPanel(
                'stataGraphPreview',
                GraphPreview.getTitle(graph),
                { viewColumn: column, preserveFocus: true },
                {
                    enableScripts: false,
                    retainContextWhenHidden: true,
                }
            );

            GraphPreview.panel.webview.html = GraphPreview.getHtml(graph);

            GraphPreview.panel.onDidDispose(() => {
                GraphPreview.panel = undefined;
            });
        }
    }

    /**
     * Generate the title for the webview panel.
     */
    private static getTitle(graph: GraphData): string {
        if (graph.filename) {
            return `Stata Graph: ${graph.filename}`;
        }
        return 'Stata Graph Preview';
    }

    /**
     * Generate the HTML content for the webview.
     */
    private static getHtml(graph: GraphData): string {
        const mimeType = GraphPreview.getMimeType(graph.format);
        const dataUri = `data:${mimeType};base64,${graph.base64}`;

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Stata Graph Preview</title>
    <style>
        body {
            margin: 0;
            padding: 16px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            background-color: var(--vscode-editor-background);
            color: var(--vscode-editor-foreground);
            font-family: var(--vscode-font-family);
        }
        .graph-container {
            max-width: 100%;
            text-align: center;
        }
        .graph-container img {
            max-width: 100%;
            height: auto;
            border: 1px solid var(--vscode-panel-border);
            border-radius: 4px;
            background-color: white;
        }
        .graph-info {
            margin-top: 12px;
            font-size: 12px;
            color: var(--vscode-descriptionForeground);
        }
        .graph-title {
            margin-bottom: 12px;
            font-size: 14px;
            font-weight: 600;
        }
    </style>
</head>
<body>
    <div class="graph-container">
        ${graph.filename ? `<div class="graph-title">${escapeHtml(graph.filename)}</div>` : ''}
        <img src="${dataUri}" alt="Stata Graph Output" />
        <div class="graph-info">
            Format: ${escapeHtml(graph.format.toUpperCase())}
        </div>
    </div>
</body>
</html>`;
    }

    /**
     * Map a graph format string to the corresponding MIME type.
     */
    private static getMimeType(format: string): string {
        switch (format.toLowerCase()) {
            case 'png':
                return 'image/png';
            case 'pdf':
                return 'application/pdf';
            case 'svg':
                return 'image/svg+xml';
            case 'jpg':
            case 'jpeg':
                return 'image/jpeg';
            default:
                return 'image/png';
        }
    }
}

/**
 * Escape HTML special characters to prevent XSS in webview content.
 */
function escapeHtml(text: string): string {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
