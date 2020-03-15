FROM python:3.7

WORKDIR /bathysphere
COPY openapi ./openapi
COPY config ./config
COPY bathysphere ./bathysphere
COPY setup.py ./setup.py
COPY cli.py ./cli.py
RUN pip install -e .

HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD "curl -f localhost:5000/api"
CMD gunicorn bathysphere.graph:app --bind 0.0.0.0:5000