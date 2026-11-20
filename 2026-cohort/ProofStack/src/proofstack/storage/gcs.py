import os
from google.cloud import storage

def upload_text(name: str, text: str, content_type="text/markdown"):
    bucket_name = os.getenv("GCS_BUCKET", "")
    if not bucket_name:
        raise RuntimeError("GCS_BUCKET is not configured")
    client = storage.Client(project=os.getenv("GCP_PROJECT_ID") or None)
    blob = client.bucket(bucket_name).blob(name)
    blob.upload_from_string(text, content_type=content_type)
    return f"gs://{bucket_name}/{name}"
