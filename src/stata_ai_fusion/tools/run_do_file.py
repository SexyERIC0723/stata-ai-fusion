"""Run .do file tool.

Provides the ``stata_run_do_file`` MCP tool that executes an existing Stata
do-file in a managed session, returning text output and any generated graphs.
"""

from __future__ import annotations

import logging
from pathlib import Path
from typing import TYPE_CHECKING

from mcp.types import ImageContent, TextContent, Tool

if TYPE_CHECKING:
    from mcp.server import Server

    from ..stata_session import SessionManager

log = logging.getLogger(__name__)

TOOL_NAME = "stata_run_do_file"

TOOL_DEF = Tool(
    name=TOOL_NAME,
    description=(
        "Execute a Stata .do file by its full path. The file must exist and "
        "have a .do extension. Returns the text output and any graphs produced."
    ),
    inputSchema={
        "type": "object",
        "properties": {
            "path": {
                "type": "string",
                "description": "Absolute path to the .do file.",
            },
            "session_id": {
                "type": "string",
                "description": "Session identifier. Default 'default'.",
                "default": "default",
            },
            "timeout": {
                "type": "integer",
                "description": "Maximum seconds to wait. Default 300.",
                "default": 300,
            },
        },
        "required": ["path"],
    },
)


def register(server: Server, session_manager: SessionManager) -> None:
    """Register the ``stata_run_do_file`` tool with the MCP server."""
    # Registration is handled by the central dispatcher in tools/__init__.py.
    pass


async def handle(
    session_manager: SessionManager,
    arguments: dict,
) -> list[TextContent | ImageContent]:
    """Execute a Stata .do file and return content blocks."""
    raw_path: str = arguments.get("path", "")
    session_id: str = arguments.get("session_id", "default")
    timeout: int = arguments.get("timeout", 300)

    if not raw_path.strip():
        return [TextContent(type="text", text="Error: no file path provided.")]

    do_path = Path(raw_path).expanduser().resolve()

    # Validate extension
    if do_path.suffix.lower() != ".do":
        return [
            TextContent(
                type="text",
                text=f"Error: file must have a .do extension, got '{do_path.suffix}'.",
            )
        ]

    # Validate existence
    if not do_path.is_file():
        return [
            TextContent(
                type="text",
                text=f"Error: file not found: {do_path}",
            )
        ]

    try:
        session = await session_manager.get_or_create(session_id)
    except Exception as exc:
        log.error("Failed to get/create session %s: %s", session_id, exc)
        return [TextContent(type="text", text=f"Error creating session: {exc}")]

    code = f'do "{do_path}"'
    try:
        result = await session.execute(code, timeout=timeout)
    except Exception as exc:
        log.error("Execution error running %s: %s", do_path, exc)
        return [TextContent(type="text", text=f"Execution error: {exc}")]

    contents: list[TextContent | ImageContent] = []

    # Text output
    output_text = result.output or ""
    if result.error_message:
        output_text += f"\n\n--- Stata Error ---\n{result.error_message}"
        if result.error_code is not None:
            output_text += f" [r({result.error_code})]"
    if output_text.strip():
        contents.append(TextContent(type="text", text=output_text.strip()))

    # Graph images
    for graph in result.graphs:
        mime = f"image/{graph.format}" if graph.format != "pdf" else "application/pdf"
        contents.append(
            ImageContent(
                type="image",
                data=graph.base64,
                mimeType=mime,
            )
        )

    if not contents:
        contents.append(TextContent(type="text", text="(no output)"))

    return contents
