FROM python:3.7

WORKDIR /bathysphere
COPY openapi ./openapi
COPY config ./config
COPY bathysphere ./bathysphere
COPY setup.py ./setup.py
COPY cli.py ./cli.py
COPY requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD "curl -f localhost:5000/api"
CMD $(bathysphere start)