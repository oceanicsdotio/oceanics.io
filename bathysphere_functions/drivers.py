from os import getenv
from json import dumps
from google.cloud import secretmanager

client = secretmanager.SecretManagerServiceClient()


def googleCloudSecret(secret_name="my-secret"):
    # type: (str) -> str
    project_id = getenv("GCP_PROJECT")  # Google Compute default param
    resource_name = f"projects/{project_id}/secrets/{secret_name}/versions/latest"
    response = client.access_secret_version(resource_name)
    return response.payload.data.decode('UTF-8')


def generateStream(columns, records):
    try:
        prev = next(records)  # get first result
    except:
        yield '[]'
        raise StopIteration
    yield '['
    # Iterate over the releases
    for r in records:
        yield dumps(dict(zip(columns, r))) + ', '
        prev = r
    # Now yield the last iteration without comma but with the closing brackets
    yield dumps(dict(zip(columns, prev))) + ']'