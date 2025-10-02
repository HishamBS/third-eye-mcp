"""Generic retry helpers based on tenacity."""
from __future__ import annotations

from collections.abc import Awaitable, Callable
from typing import ParamSpec, TypeVar

from tenacity import AsyncRetrying, RetryError, retry_if_exception_type, stop_after_attempt, wait_exponential

P = ParamSpec("P")
R = TypeVar("R")


def async_retry(
    func: Callable[P, Awaitable[R]],
    *,
    attempts: int = 2,
    exceptions: tuple[type[BaseException], ...] = (Exception,),
) -> Callable[P, Awaitable[R]]:
    async def wrapper(*args: P.args, **kwargs: P.kwargs) -> R:
        try:
            async for attempt in AsyncRetrying(
                retry=retry_if_exception_type(exceptions),
                stop=stop_after_attempt(attempts),
                wait=wait_exponential(multiplier=0.5, min=0.5, max=3),
            ):
                with attempt:
                    return await func(*args, **kwargs)
        except RetryError as exc:  # pragma: no cover - errors bubbled up
            raise exc.last_attempt.result() from exc  # type: ignore[misc]
        raise RuntimeError("Retry wrapper exited unexpectedly")

    return wrapper


__all__ = ["async_retry"]
