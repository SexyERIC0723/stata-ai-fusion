# stata-ai-fusion

MCP Server + Skill for Stata: execute commands, inspect data, and generate high-quality Stata code with AI.

## Overview

stata-ai-fusion bridges Stata and AI-powered coding assistants via the Model Context Protocol (MCP). It provides tools for running Stata commands, inspecting datasets, extracting results, and more -- all from within your AI assistant.

## Features

- Run Stata commands and `.do` files interactively
- Inspect datasets (describe, summarize, codebook)
- Extract stored results (`e()`, `r()`, `s()`)
- Export and cache graphs
- Search command logs
- Install community packages

## Installation

```bash
pip install stata-ai-fusion
```

Or for development:

```bash
git clone https://github.com/your-org/stata-ai-fusion.git
cd stata-ai-fusion
pip install -e ".[dev]"
```

## Requirements

- Python >= 3.11
- A licensed Stata installation (SE, MP, or BE)

## Usage

Start the MCP server:

```bash
stata-ai-fusion
```

Then configure your AI assistant to connect to the server. See the documentation for detailed setup instructions.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

MIT -- see [LICENSE](LICENSE) for details.
