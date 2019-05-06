FROM continuumio/miniconda3

WORKDIR bathysphere_graph

# build the environment, and make it start automatically

COPY environment.yml ./
RUN conda env create -f environment.yml
COPY openapi/api.yml ./openapi/api.yml
COPY bathysphere_graph ./bathysphere_graph
COPY src ./src

RUN chmod +x ./src/start.sh

ENTRYPOINT ["./src/start.sh"]