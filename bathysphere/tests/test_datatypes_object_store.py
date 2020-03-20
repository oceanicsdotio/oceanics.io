from minio import Minio


def storeJson(name, data, apiKey, headers=None):
    _transmit = dumps(
        {
            "headers": {
                "x-amz-meta-service-file-type": "index",
                "x-amz-acl": "public-read",
                "x-amz-meta-extent": "null",
                **(headers or {}),
            },
            "object_name": f"{name}/index.json",
            "bucket_name": "bathysphere-test",
            "data": dumps(data).encode(),
            "content_type": "application/json",
        }
    )
    response = post(
        url="http://faas.oceanics.io:8080/async-function/repository",
        data=_transmit,
        headers={
            "hmac": hmac.new(
                apiKey.encode(), _transmit.encode(), hashlib.sha1
            ).hexdigest()
        },
    )
    assert response.status_code == 202


