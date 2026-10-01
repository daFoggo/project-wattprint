"""Print the OpenAPI 3.2 document: `python -m app.openapi_export > openapi.json`."""
import json

from app.main import app

print(json.dumps(app.openapi(), indent=2, ensure_ascii=False))
