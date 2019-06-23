FROM continuumio/miniconda3:4.6.14 AS base

COPY config/environment.yml ./
RUN conda env create -f environment.yml

FROM continuumio/miniconda3:4.6.14

COPY --from=base /opt/conda/ /opt/conda/

WORKDIR bathysphere_graph
COPY openapi/api.yml ./openapi/api.yml
COPY bathysphere_graph ./bathysphere_graph
COPY src ./src

RUN chmod +x ./src/start.sh

ENTRYPOINT ["./src/start.sh"]