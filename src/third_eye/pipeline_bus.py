"""Pipeline event logging and broadcasting utilities."""
from __future__ import annotations

import asyncio
from collections import defaultdict
from datetime import datetime
from typing import Any, Dict, Set

from fastapi import WebSocket
import time

from . import db


class PipelineEventBus:
    """In-memory fan-out hub for pipeline WebSocket subscribers."""

    def __init__(self) -> None:
        self._sessions: dict[str, Set[WebSocket]] = defaultdict(set)
        self._lock = asyncio.Lock()

    async def register(self, session_id: str, websocket: WebSocket) -> None:
        async with self._lock:
            self._sessions[session_id].add(websocket)

    async def unregister(self, session_id: str, websocket: WebSocket) -> None:
        async with self._lock:
            sockets = self._sessions.get(session_id)
            if sockets and websocket in sockets:
                sockets.remove(websocket)
            if sockets and not sockets:
                self._sessions.pop(session_id, None)

    async def broadcast(self, session_id: str, message: Dict[str, Any]) -> None:
        sockets = None
        async with self._lock:
            if session_id in self._sessions:
                sockets = list(self._sessions[session_id])
        if not sockets:
            return
        for websocket in sockets:
            try:
                await websocket.send_json(message)
            except Exception:
                await self.unregister(session_id, websocket)


PIPELINE_BUS = PipelineEventBus()


def _serialize_timestamp(value: float | None) -> str | None:
    if value is None:
        return None
    try:
        numeric = float(value)
    except (TypeError, ValueError):
        return None
    return datetime.fromtimestamp(numeric).isoformat()


async def emit_eye_event(
    *,
    session_id: str | None,
    eye: str,
    ok: bool | None,
    code: str | None,
    tool_version: str | None,
    md: str | None,
    data: dict[str, Any] | None,
) -> None:
    if not session_id:
        return
    await db.log_pipeline_event_async(
        session_id=session_id,
        eye=eye,
        event_type="eye_update",
        ok=ok,
        code=code,
        tool_version=tool_version,
        md=md,
        data=data or {},
    )
    events = await db.list_pipeline_events_async(session_id=session_id, limit=1)
    if not events:
        return
    event = events[0]
    payload = {
        "type": "eye_update",
        "session_id": session_id,
        "eye": eye,
        "ok": ok,
        "code": code,
        "tool_version": tool_version,
        "md": md,
        "data": data or {},
        "ts": _serialize_timestamp(event.get("created_at")),
    }
    await PIPELINE_BUS.broadcast(session_id, payload)


async def emit_settings_event(*, session_id: str, settings: dict[str, Any]) -> None:
    if not session_id:
        return
    await db.upsert_session_settings_async(session_id=session_id, data=settings)
    payload = {
        "type": "settings_update",
        "session_id": session_id,
        "data": settings,
        "ts": _serialize_timestamp(time.time()),
    }
    await PIPELINE_BUS.broadcast(session_id, payload)


async def emit_custom_event(
    *,
    session_id: str,
    event_type: str,
    eye: str,
    data: dict[str, Any] | None = None,
    md: str | None = None,
) -> None:
    await db.log_pipeline_event_async(
        session_id=session_id,
        eye=eye,
        event_type=event_type,
        ok=None,
        code=None,
        tool_version=None,
        md=md,
        data=data or {},
    )
    events = await db.list_pipeline_events_async(session_id=session_id, limit=1)
    event = events[0]
    payload = {
        "type": event_type,
        "session_id": session_id,
        "eye": eye,
        "data": data or {},
        "md": md,
        "ts": _serialize_timestamp(event.get("created_at")),
    }
    await PIPELINE_BUS.broadcast(session_id, payload)


async def send_initial_snapshot(session_id: str, websocket: WebSocket, limit: int = 50) -> None:
    events = await db.list_pipeline_events_async(session_id=session_id, limit=limit)
    for event in reversed(events):
        payload = {
            "type": event.get("event_type", "eye_update"),
            "session_id": session_id,
            "eye": event.get("eye"),
            "ok": event.get("ok"),
            "code": event.get("code"),
            "tool_version": event.get("tool_version"),
            "md": event.get("md"),
            "data": event.get("data", {}),
            "ts": _serialize_timestamp(event.get("created_at")),
        }
        await websocket.send_json(payload)
