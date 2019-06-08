# FROM tensorflow/tensorflow:py3

#WORKDIR /
#COPY requirements.txt requirements.txt
#COPY src ./src
#RUN pip install --no-cache-dir -r requirements.txt
#CMD ["sh", "/src/start.sh"]

FROM continuumio/miniconda3

WORKDIR neritics_ml

# build the environment, and make it start automatically

COPY config/environment.yml ./
RUN conda env create -f environment.yml
COPY openapi/api.yml ./openapi/api.yml
COPY neritics_ml ./neritics_ml
COPY src ./src

RUN chmod +x ./src/start.sh

ENTRYPOINT ["./src/start.sh"]