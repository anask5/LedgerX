from datetime import datetime, date
from bson import ObjectId

def serialize_doc(doc: dict | None) -> dict | None:
    if not doc:
        return None
    out = {}
    for k, v in doc.items():
        if k == "_id":
            out["id"] = str(v)
        elif isinstance(v, ObjectId):
            out[k] = str(v)
        elif isinstance(v, (datetime, date)):
            out[k] = v.isoformat()
        elif isinstance(v, list):
            out[k] = [serialize_doc(i) if isinstance(i, dict) else (str(i) if isinstance(i, ObjectId) else i) for i in v]
        elif isinstance(v, dict):
            out[k] = serialize_doc(v)
        else:
            out[k] = v
    return out