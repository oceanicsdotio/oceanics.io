FROM continuumio/miniconda3

WORKDIR neritics_filter

# build the environment, and make it start automatically

COPY config/environment.yml ./
RUN conda env create -f environment.yml
COPY openapi/api.yml ./openapi/api.yml
COPY neritics_filter ./neritics_filter
COPY src ./src

RUN chmod +x ./src/start.sh

ENTRYPOINT ["./src/start.sh"]