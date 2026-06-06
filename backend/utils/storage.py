import boto3
import os
import uuid
import mimetypes
from botocore.exceptions import NoCredentialsError, ClientError

# Read config from environment
AWS_ACCESS_KEY_ID = os.getenv("AWS_ACCESS_KEY_ID")
AWS_SECRET_ACCESS_KEY = os.getenv("AWS_SECRET_ACCESS_KEY")
AWS_REGION = os.getenv("AWS_REGION", "us-east-1")
AWS_S3_BUCKET_NAME = os.getenv("AWS_S3_BUCKET_NAME")

s3_client = None

def get_s3_client():
    global s3_client
    if not s3_client and AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY:
        s3_client = boto3.client(
            "s3",
            aws_access_key_id=AWS_ACCESS_KEY_ID,
            aws_secret_access_key=AWS_SECRET_ACCESS_KEY,
            region_name=AWS_REGION
        )
    return s3_client

def upload_to_s3(file_obj, filename, folder_path=""):
    client = get_s3_client()
    if not client:
        return None # Cloud storage not configured
        
    ext = os.path.splitext(filename)[1].lower()
    content_type = mimetypes.types_map.get(ext, "application/octet-stream")
    unique_name = f"{uuid.uuid4()}{ext}"
    key = f"{folder_path}/{unique_name}" if folder_path else unique_name
    
    try:
        client.upload_fileobj(
            file_obj,
            AWS_S3_BUCKET_NAME,
            key,
            ExtraArgs={"ContentType": content_type}
        )
        return key
    except Exception as e:
        import traceback
        traceback.print_exc()
        return None

def generate_presigned_url(key, expires_in=3600):
    client = get_s3_client()
    if not client:
        return None
    try:
        response = client.generate_presigned_url(
            'get_object',
            Params={'Bucket': AWS_S3_BUCKET_NAME, 'Key': key},
            ExpiresIn=expires_in
        )
        return response
    except ClientError as e:
        return None
