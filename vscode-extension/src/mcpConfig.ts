import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

/**
 * MCP server configuration entry structure.
 */
interface McpServerEntry {
    command: string;
    args: string[];
    env?: Record<string, string>;
}

/**
 * MCP config file structure.
 */
interface McpConfig {
    mcpServers?: Record<string, McpServerEntry>;
}

/**
 * IDE detection result.
 */
type IdeType = 'vscode' | 'cursor' | 'windsurf' | 'unknown';

/**
 * Detect which IDE is currently running based on the executable path
 * and environment variables.
 */
function detectIde(): IdeType {
    const execPath = process.execPath.toLowerCase();

    if (execPath.includes('cursor')) {
        return 'cursor';
    }
    if (execPath.includes('windsurf')) {
        return 'windsurf';
    }
    if (
        execPath.includes('code') ||
        execPath.includes('vscode')
    ) {
        return 'vscode';
    }

    // Fallback: check environment variables
    if (process.env.CURSOR_CHANNEL) {
        return 'cursor';
    }
    if (process.env.WINDSURF_CHANNEL) {
        return 'windsurf';
    }

    return 'vscode';
}

/**
 * Get the path to the MCP configuration file for the detected IDE.
 */
function getMcpConfigPath(ide: IdeType): string {
    const homeDir = os.homedir();
    const platform = process.platform;

    let configDir: string;

    if (platform === 'darwin') {
        // macOS
        const appSupport = path.join(
            homeDir,
            'Library',
            'Application Support'
        );
        switch (ide) {
            case 'cursor':
                configDir = path.join(appSupport, 'Cursor', 'User');
                break;
            case 'windsurf':
                configDir = path.join(appSupport, 'Windsurf', 'User');
                break;
            default:
                configDir = path.join(appSupport, 'Code', 'User');
                break;
        }
    } else if (platform === 'win32') {
        // Windows
        const appData = process.env.APPDATA || path.join(homeDir, 'AppData', 'Roaming');
        switch (ide) {
            case 'cursor':
                configDir = path.join(appData, 'Cursor', 'User');
                break;
            case 'windsurf':
                configDir = path.join(appData, 'Windsurf', 'User');
                break;
            default:
                configDir = path.join(appData, 'Code', 'User');
                break;
        }
    } else {
        // Linux
        const xdgConfig =
            process.env.XDG_CONFIG_HOME ||
            path.join(homeDir, '.config');
        switch (ide) {
            case 'cursor':
                configDir = path.join(xdgConfig, 'Cursor', 'User');
                break;
            case 'windsurf':
                configDir = path.join(xdgConfig, 'Windsurf', 'User');
                break;
            default:
                configDir = path.join(xdgConfig, 'Code', 'User');
                break;
        }
    }

    return path.join(configDir, 'mcp.json');
}

/**
 * Automatically configure the stata-ai-fusion MCP server entry in the
 * IDE's mcp.json configuration file. This function:
 *
 * 1. Detects the current IDE (VS Code, Cursor, Windsurf)
 * 2. Locates the appropriate mcp.json config path
 * 3. Reads existing config (if any)
 * 4. Adds the stata-ai-fusion server entry if not already present
 * 5. Writes the updated config back
 *
 * Does NOT overwrite existing server entries for stata-ai-fusion.
 */
export async function autoConfigureMcp(): Promise<void> {
    const ide = detectIde();
    const configPath = getMcpConfigPath(ide);
    const serverKey = 'stata-ai-fusion';

    const serverEntry: McpServerEntry = {
        command: 'uvx',
        args: ['--from', 'stata-ai-fusion', 'stata-ai-fusion'],
    };

    // Read existing config or start fresh
    let config: McpConfig = {};
    try {
        if (fs.existsSync(configPath)) {
            const content = fs.readFileSync(configPath, 'utf-8');
            config = JSON.parse(content) as McpConfig;
        }
    } catch {
        // If the file is corrupt or unreadable, start with empty config
        config = {};
    }

    // Initialize mcpServers if missing
    if (!config.mcpServers) {
        config.mcpServers = {};
    }

    // Do not overwrite existing config for this server
    if (config.mcpServers[serverKey]) {
        return;
    }

    // Add the server entry
    config.mcpServers[serverKey] = serverEntry;

    // Ensure the config directory exists
    const configDir = path.dirname(configPath);
    if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
    }

    // Write the config file
    fs.writeFileSync(
        configPath,
        JSON.stringify(config, null, 2) + '\n',
        'utf-8'
    );
}
