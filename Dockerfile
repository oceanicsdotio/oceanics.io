FROM python:3.7

WORKDIR /bathysphere
COPY openapi ./openapi
COPY config ./config
COPY bathysphere ./bathysphere
COPY setup.py ./setup.py
COPY cli.py ./cli.py
COPY Pipfile ./Pipfile
RUN pip install pipenv
RUN pipenv install -e .

HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD "curl -f localhost:5000/api"
CMD pipenv shell && gunicorn bathysphere:app --bind 0.0.0.0:5000