FROM mono:slim
RUN apt update && apt install -y curl mono-mcs build-essential zlib1g-dev libncurses5-dev libgdbm-dev libnss3-dev \
    libssl-dev libreadline-dev libffi-dev wget
RUN curl -O https://www.python.org/ftp/python/3.7.3/Python-3.7.3.tar.xz && \
    tar -xf Python-3.7.3.tar.xz && \
    cd Python-3.7.3 && \
    ./configure && \
    make -j 4 && \
    make altinstall

RUN python3.7 --version && pip3.7 --version

WORKDIR /bivalve

COPY setup.py ./
COPY src ./src
COPY openapi ./openapi
COPY bivalve ./bivalve
COPY bin ./bin
COPY config ./config
COPY requirements.txt ./requirements.txt

RUN sh src/compile.sh && \
    pip3.7 install -e . && \
    pip3.7 install -r requirements.txt && \
    chmod +x src/start.sh
    
ENTRYPOINT ["src/start.sh"]
