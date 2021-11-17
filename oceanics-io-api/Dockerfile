FROM python:3.8

WORKDIR /bathysphere

COPY openapi ./openapi
COPY config ./config
COPY bathysphere ./bathysphere
COPY cli.py ./cli.py
COPY requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt
CMD $(bathysphere start --port=${PORT})