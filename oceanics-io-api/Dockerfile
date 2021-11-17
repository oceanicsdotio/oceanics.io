FROM python:3.8

WORKDIR /bathysphere

RUN pip install poetry==1.1.11
COPY poetry.lock pyproject.toml /
RUN poetry install


COPY openapi ./openapi
COPY config ./config
COPY bathysphere ./bathysphere
COPY cli.py ./cli.py
CMD $(bathysphere start --port=${PORT})