"""In-process cache of the demo endpoints' answers.

The demo household's series is imported once and never changes, and every answer is a pure
function of the URL (or, for the copilot, the request body), so repeating a request only repeats
work. Importing data (`POST /households/import`) calls `clear()`. Bounded, oldest out first.
"""
from collections import OrderedDict
from datetime import UTC, datetime

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

MAX_ENTRIES = 1024

_store: OrderedDict[str, tuple[bytes, str]] = OrderedDict()
_memo: OrderedDict[str, object] = OrderedDict()


def clear() -> None:
    _store.clear()
    _memo.clear()


def memo_get(key: str):
    return _memo.get(key)


def memo_set(key: str, value) -> None:
    _memo[key] = value
    while len(_memo) > MAX_ENTRIES:
        _memo.popitem(last=False)


def _canon(value: str) -> str:
    """`...T23:59:00Z` and `...T23:59:00.000Z` are the same instant: one cache entry."""
    try:
        at = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return value
    return at.astimezone(UTC).isoformat() if at.tzinfo else value


def key_of(path: str, query_items: list[tuple[str, str]]) -> str:
    """Path plus the query with its parameters sorted and its instants normalised."""
    return path + "?" + "&".join(f"{k}={_canon(v)}" for k, v in sorted(query_items))


class DemoCacheMiddleware(BaseHTTPMiddleware):
    """Caches successful GETs under `<prefix>/demo/`; marks them with `X-Cache`."""

    def __init__(self, app, prefix: str):
        super().__init__(app)
        self.prefix = f"{prefix}/demo/"

    async def dispatch(self, request: Request, call_next):
        if request.method != "GET" or not request.url.path.startswith(self.prefix):
            return await call_next(request)
        key = key_of(request.url.path, request.query_params.multi_items())
        hit = _store.get(key)
        if hit is not None:
            _store.move_to_end(key)
            return Response(hit[0], media_type=hit[1], headers={"X-Cache": "HIT"})
        response = await call_next(request)
        if response.status_code != 200:
            return response
        body = b"".join([chunk async for chunk in response.body_iterator])
        media = response.media_type or response.headers.get("content-type", "application/json")
        _store[key] = (body, media)
        while len(_store) > MAX_ENTRIES:
            _store.popitem(last=False)
        return Response(body, media_type=media, headers={"X-Cache": "MISS"})
