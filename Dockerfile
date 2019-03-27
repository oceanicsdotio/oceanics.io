FROM tensorflow/tensorflow:latest-py3

WORKDIR /
COPY requirements.txt requirements.txt
COPY src ./src
RUN pip install --no-cache-dir -r requirements.txt
CMD ["sh", "/src/start.sh"]