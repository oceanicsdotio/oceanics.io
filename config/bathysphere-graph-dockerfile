FROM python:3.7-alpine

WORKDIR bathysphere_graph
COPY openapi/api.yml ./openapi/api.yml
COPY config/bathysphere-graph-entities.yml ./config/bathysphere-graph-entities.yml
COPY config/bathysphere-graph-env.txt ./bathysphere-graph-env.txt
COPY bathysphere_graph ./bathysphere_graph
COPY src ./src
RUN pip install -r bathysphere-graph-env.txt

HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD "curl -f localhost:5000/api"
CMD gunicorn bathysphere_graph:app --bind 0.0.0.0:5000