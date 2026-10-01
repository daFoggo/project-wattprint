"""In-process cache of the demo endpoints' answers.

The demo household's series is imported once and never changes, and every answer is a pure
function of the URL (or, for the copilot, the request body), so repeating a request only repeats
work. Importing data (`POST /households/import`) calls `clear()`. Bounded, oldest out first.
"""
from collections import OrderedDict

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


class DemoCacheMiddleware(BaseHTTPMiddleware):
    """Caches successful GETs under `<prefix>/demo/`; marks them with `X-Cache`."""

    def __init__(self, app, prefix: str):
        super().__init__(app)
        self.prefix = f"{prefix}/demo/"

    async def dispatch(self, request: Request, call_next):
        if request.method != "GET" or not request.url.path.startswith(self.prefix):
            return await call_next(request)
        key = f"{request.url.path}?{request.url.query}"
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
