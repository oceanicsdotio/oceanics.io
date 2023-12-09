import React, { useState, useEffect } from "react";
import useWorker from "../../hooks/useWorker";
import styled from "styled-components";
import Markdown from "react-markdown";

export type OpenApiType = {
  // Network source for the JSON specification
  src: string
};
type SpecType = {
  info: {
    title: string
    version: string
    description: string
  }
  paths: object[]
};

// Defined in global scope to force Webpack to bundle the script.
const createWorker = () =>
  new Worker(new URL("./OpenApi.worker.ts", import.meta.url), {
    type: "module",
  });

/**
 * The OpenApi component uses an OpenAPI specification for a
 * simulation backend, and uses it to construct an interface.
 */
const OpenApi = ({ src }: OpenApiType) => {
  // Web worker makes requests in background
  const worker = useWorker(createWorker);
  
  /**
   * OpenAPI spec structure will be populated asynchronously once the
   * web worker is available.
   */
  const [apiSpec, setApiSpec] = useState<SpecType | null>(null);

  // Start listening to worker messages
  useEffect(() => {
    return worker.listen(({ data }) => {
      switch (data.type) {
        case "status":
          console.log(data.type, data.data);
          return;
        case "load":
          setApiSpec(data.data as SpecType);
          return;
        case "error":
          console.error(data.type, data.data);
          return;
        default:
          return;
      }
    });
  }, []);

  /**
   * Hook loads and parses an OpenAPI spec from a URL using a
   * background worker.
   *
   * It runs once when the component loads. This allows
   * the specification to be available before derived data
   * is calculated for UI.
   */
  useEffect(() => {
    worker.post({
        type: "load",
        data: {src}
    });
  }, []);

  const [title, setTitle] = useState(`Loading ${src}...`);
  const [description, setDescription] = useState(`Loading methods...`);
  useEffect(()=>{
    if (!apiSpec) return;
    console.log(apiSpec.paths);
    setTitle(`${apiSpec.info.title}, v${apiSpec.info.version}`);
    setDescription(apiSpec.info.description);
  }, [apiSpec]);

  return (
    <div>
        <h1>{title}</h1>
        <Markdown>{description}</Markdown>
    </div>
  );
};

const StyledOpenApi = styled(OpenApi)``;
export default StyledOpenApi;
