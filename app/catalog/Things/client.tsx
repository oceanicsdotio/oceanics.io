"use client";
import React, { useEffect,
  useState,
  useRef,
  type MutableRefObject, } from "react";
import specification from "@app/../specification.json";
import type { Things, WebGl } from "@oceanics/app";
import { NamedNode, useCollection } from "@catalog/client";
// import noiseVertex from "./glsl/noise-vertex.glsl";
// import noiseFragment from "./glsl/noise-fragment.glsl";
// import quadVertex from "./glsl/quad-vertex.glsl";
// import updateFragment from "./glsl/update-fragment-test.glsl";
// import screenFragment from "./glsl/screen-fragment.glsl";
// import drawVertex from "./glsl/draw-vertex-test.glsl";
// import drawFragment from "./glsl/draw-fragment-test.glsl";
interface IThings extends Omit<Things, "free"> {}
const {
  title: left,
  properties
} = specification.components.schemas.Things;
const { parameters } = specification.components;

import style from "@catalog/page.module.css";
import { TextInput } from "@catalog/client";
/**
 * Display an index of all or some subset of the
 * available nodes in the database. Shared between
 * `/create` and `/edit` interfaces.
 */
export function ThingsForm({
    limit,
    offset,
    initial
}: {
    limit: number
    offset: number
    initial: IThings
}) {
  /**
   * User must input uuid, it will not be generated within
   * the system. Currently duplicate UUID silently fails.
   */
  const uuid = useRef<HTMLInputElement | null>(null);
  /**
   * Non-unique display name for humans. Can be unique
   * and contain information if you so choose, but it
   * doesn't matter to the database.
   */
  const name = useRef<HTMLInputElement | null>(null);
  /**
   * Freeform text description input reference.
   */
  const _description = useRef<HTMLInputElement | null>(null);
  /**
   * JSON format input.
   */
  const _properties = useRef<HTMLInputElement | null>(null);
  /**
   * Web Worker initialization.
   */
  const { message, create, disabled, onSubmit } = useCollection({
    left, limit, offset
  });
  /**
   * On submission, we delegate the request to our background
   * worker, which will report on success/failure.
   */
  const onSubmitCallback = () => {
    return {
      uuid: uuid.current?.value,
      name: name.current?.value,
      description: _description.current?.value,
      properties: _properties.current?.value,
    };
  };
  /**
   * Client Component
   */
  return (
    <>
      <p>{message}</p>
      <hr />
      <form
        className={style.form}
        onSubmit={onSubmit(onSubmitCallback)}
        ref={create}
      >
        <TextInput
          name={"uuid"}
          required
          inputRef={uuid}
          description={properties.uuid.description}
          defaultValue={initial.uuid}
        ></TextInput>
        <TextInput
          name={"name"}
          required
          inputRef={name}
          description={properties.name.description}
          defaultValue={initial.name}
        ></TextInput>
        <TextInput
          name={"description"}
          required
          inputRef={_description}
          description={properties.description.description}
          defaultValue={initial.description}
        ></TextInput>
        <TextInput
          name={"properties"}
          inputRef={_properties}
          description={properties.properties.description}
          defaultValue={initial.properties}
        ></TextInput>
        <button className={style.submit} disabled={disabled}>
          Create
        </button>
      </form>
    </>
  );
}
/**
 * Listener for Web Worker message events
 */
const handleMessage = () => {
    // webgl.screen(
    //   _data.width,
    //   _data.height,
    //   _data.time
    // );
    // webgl.draw(
    //   _data.width,
    //   _data.height,
    //   _data.time,
    //   _data.res
    // );
    // webgl.offscreen(
    //   _data.width,
    //   _data.height,
    //   _data.time
    // );
    // webgl.swap_textures("screen", "back");
    // webgl.update(
    //   _data.time,
    //   _data.res
    // );
    // webgl.swap_textures("state", "previous");

    // // Noise
    // renderPipelineStage({
    //   program: programs.screen,
    //   textures: [
    //       [assets.textures.state, 1],
    //       [assets.textures.back, 2]
    //   ],
    //   parameters: ["u_screen", "u_opacity"],
    //   attributes: [buffers.quad],
    //   framebuffer: [framebuffer, textures.screen],
    //   topology: [webgl.TRIANGLES, 0, 6],
    //   viewport: [webglRef.current.width, webglRef.current.height]
    // });
    // renderPipelineStage({
    //   program: programs.draw,
    //   attributes: [buffers.quad],
    // });
    // renderPipelineStage({
    //   program: programs.screen,
    //   textures: [[assets.textures.screen, 2]],
    //   parameters: ["u_opacity"],
    //   attributes: [buffers.quad],
    //   framebuffer: [null, null],
    // });
};
/**
 * Input to the lagrangian simulation hook
 */
type IRender = {
  /**
   * Where to obtain velocity data for particle simulation
   */
  velocity: {
    /**
     * Source of RGB image encoding velocity field
     */
    source: string;
    /**
     * Precalculated ranges for data
     */
    metadataFile: string;
  };
  /**
   * Particle vector tile resolution
   */
  res: number;
  /**
   * Blending colors
   */
  colors: string[];
  /**
   * How quickly to blend layers
   */
  opacity: number;
  /**
   * Particle speed multiplier
   */
  speed: number;
  /**
   * Randomness component.
   */
  diffusivity: number;
  /**
   * How large to draw particles on canvas.
   */
  pointSize: number;
  /**
   * Dropout rate determines how often stuck particles
   * are re-seeded at a new position
   */
  drop: number;
};
/**
 * Display an index of all or some subset of the
 * available nodes in the database.
 * 
 * Use WebGL to calculate particle trajectories from velocity data.
 * This example uses wind data to move particles around the globe.
 * The velocity field is static, but in the future the component
 * will support pulling frames from video or gif formats.
 * 
 * Paints a color-map to a hidden canvas and then samples it as
 * a lookup table for speed calculations. This is one way to 
 * implement fast lookups of piece-wise functions.
 */
export function Webgl({
  velocity: { metadataFile, ...velocity },
  res,
  colors,
  opacity,
  speed,
  diffusivity,
  pointSize,
  drop,
}: IRender) {
    /**
   * Web worker reference.
   */
    const worker = useRef<Worker | undefined>();
    /**
     * Pixel color encoding 2D render target.
     */
    const colorMapRef: MutableRefObject<HTMLCanvasElement | null> = useRef(null);
    /**
     * Texture preview 2D render target.
     */
    const previewRef: MutableRefObject<HTMLCanvasElement | null> = useRef(null);
    /**
     * Webgl render target for shader programs.
     */
    const webglRef: MutableRefObject<HTMLCanvasElement | null> = useRef(null);
    /**
     * Runtime will be passed back to calling Hook or Component.
     * The WASM runtime contains all of the draw functions that
     * target the GL context.
     */
    const [interactive, setInteractive] = useState<{
      webgl: WebGl;
    } | null>(null);

  /**
   * Retrieve node data using Web Worker.
   */
  const { collection, message } = useCollection({
    left,
    limit: parameters.limit.schema.default,
    offset: parameters.offset.schema.default,
  });
  /**
     * When we get a message back from the worker that matches a specific pattern,
     * report or act on that info. The worker will push buffers and texture data
     * that the frontend needs to send to the webgl rendering context.
     * Compile our programs when we have the program source
     * map. The program data will contain references to
     * all of the GPU uniforms and attributes.
     * Set the program source map triggers hooks that will
     * compile the shader program and return information
     * about how to bind real data to the textures and arrays.
     */
  useEffect(() => {
    if (!webglRef.current || !colorMapRef.current || !previewRef.current) return;
    let canvas = webglRef.current;
    const colorMapCanvas = colorMapRef.current;
    const previewCanvas = previewRef.current;
    const ctx = colorMapCanvas.getContext("2d");
    const previewCtx = previewCanvas.getContext("2d");
    const webgl = canvas.getContext("webgl");
    if (!ctx || !webgl || !previewCtx) return;
    [colorMapCanvas.width, colorMapCanvas.height] = [ res * res, res ];
    
    const data = new Image();
    
    worker.current = new Worker(new URL("@app/catalog/worker.ts", import.meta.url), {
      type: "module",
    });
    const handle = worker.current;

    (async () => {
      const wasm = await import("@oceanics/app");
      const { panic_hook, WebGl } = wasm;
      panic_hook();
      const {width, height} = canvas;
      let particles = new Uint8Array(Array.from(
        { length: res * res * 4 },
        () => Math.floor(Math.random() * 256)
      ))
      // const webgl = new WebGl(
      //   canvas,
      //   uniforms: [{
      //   },{
      //     name: "u_opacity",
      //     value: [opacity]
      //   },{
      //     name: "u_point_size",
      //     value: [pointSize]
      //   },{
      //     name: "speed",
      //     value: [speed]
      //   },{
      //     name: "diffusivity",
      //     value: [diffusivity]
      //   },{
      //     name: "drop",
      //     value: [drop]
      //   },{
      //     name: "seed",
      //     value: [Math.random()]
      //   }, {
      //     name: "u_wind_max",
      //     value: [u.max, v.max]
      //   }, {
      //     name: "u_wind_min",
      //     data_type: "f",
      //     value: [u.min, v.min]
      //   }, {
      //     name: "u_wind_res",
      //     data_type: "f",
      //     value: [width, height]
      //   }],
      //   {
      //     vertex: quadVertex,
      //     fragment: updateFragment,
      //   },
      //   {
      //     vertex: quadVertex,
      //     fragment: screenFragment,
      //   },
      //   {
      //     vertex: drawVertex,
      //     fragment: drawFragment,
      //   },
      //   {
      //     vertex: noiseVertex,
      //     fragment: noiseFragment,
      //   }
      // );
      // data.addEventListener(
      //   "load",
      //   () => {
      //     webgl.texture_from_image(canvas, data, "velocity");
      //     console.debug(webgl.textures());
      //   },
      //   { capture: true, once: true }
      // );
      // data.crossOrigin = "";
      // data.src = velocity.source;
      // webgl.texture_from_color_map(ctx, res, colors, "color");
      // handle.addEventListener("message", handleMessage, { passive: true, capture: true });
      // setInteractive({
      //   webgl,
      // });
    })();
    // return () => {
    //   handle.removeEventListener("message", handleMessage);
    // };
  }, [res, metadataFile, opacity, speed, pointSize, diffusivity, drop, velocity.source, colors]);
  /**
   * Client Component.
   */
  return (
    <>
      <p>{message}</p>
      <div>
        <canvas ref={webglRef} />
        <canvas ref={previewRef} />
        <canvas ref={colorMapRef} />
      </div>
      {collection.map(({uuid, ...thing}: IThings) => {
        return (
          <NamedNode key={uuid} name={thing.name} uuid={uuid} >
            <p>description: {thing.description ?? "n/a"}</p>
            <p>properties: {thing.properties ?? "n/a"}</p>
          </NamedNode>
        );
      })}
    </>
  );
}
