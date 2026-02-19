"""Shared fixtures for Stata AI Fusion tests."""

from __future__ import annotations

import pytest

from stata_ai_fusion.stata_discovery import discover_stata_or_none
from stata_ai_fusion.stata_session import SessionManager, StataSession
from stata_ai_fusion.result_extractor import ResultExtractor


@pytest.fixture
async def session():
    """Yield a started interactive StataSession; skip if Stata is absent."""
    installation = discover_stata_or_none()
    if installation is None:
        pytest.skip("Stata not installed")
    s = StataSession(installation)
    await s.start()
    yield s
    await s.close()


@pytest.fixture
async def session_manager():
    """Yield a SessionManager; skip if Stata is absent.  Closes all on teardown."""
    installation = discover_stata_or_none()
    if installation is None:
        pytest.skip("Stata not installed")
    sm = SessionManager(installation)
    yield sm
    await sm.close_all()


@pytest.fixture
async def extractor(session):
    """Yield a ResultExtractor bound to the ``session`` fixture."""
    return ResultExtractor(session)
