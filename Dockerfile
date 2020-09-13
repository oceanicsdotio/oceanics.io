FROM python:3.7

WORKDIR /bathysphere
COPY openapi ./openapi
COPY config ./config
COPY bathysphere ./bathysphere
COPY setup.py ./setup.py
COPY cli.py ./cli.py
COPY requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt
CMD $(bathysphere start --port=8080)