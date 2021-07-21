FROM mono:slim

RUN apt update && apt install -y mono-mcs 

# build-essential 
# zlib1g-dev libncurses5-dev libgdbm-dev libnss3-dev libssl-dev libreadline-dev libffi-dev wget

WORKDIR /bivalve

COPY src/c# ./src/c#
COPY bin ./bin

RUN mcs -reference:bin/${BIVALVE_DLL} \
        -out:bin/kernel.exe \
        src/c#/kernel.cs \
        src/c#/json.cs
    
ENTRYPOINT ["/usr/bin/mono", "bin/kernel.exe"]
