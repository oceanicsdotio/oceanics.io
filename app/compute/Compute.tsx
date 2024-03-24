"use client";
import React, {
  useEffect,
  useState,
  useRef,
  type MutableRefObject,
} from "react";
import type { WebGl } from "@oceanics/app";
import noiseVertex from "./glsl/noise-vertex.glsl";
import noiseFragment from "./glsl/noise-fragment.glsl";
import quadVertex from "./glsl/quad-vertex.glsl";
import updateFragment from "./glsl/update-fragment-test.glsl";
import screenFragment from "./glsl/screen-fragment.glsl";
import drawVertex from "./glsl/draw-vertex-test.glsl";
import drawFragment from "./glsl/draw-fragment-test.glsl";
/**
 * Known message types
 */
const Messages = {
  start: "start",
  status: "status",
  error: "error",
      /**
     * Create and insert a texture. These are assumed
     * to be 2D. They can either be image data, or
     * vector tiles.
     */
  texture: "texture",
  attribute: "attribute",
  /**
   * Set uniforms using pre-calculated values from image
   * metadata and simulation configuration.
   */
  uniform: "uniform",
};
/**
 * Mapping of uniforms to program components. Requires
 * knowledge of GLSL variable names and types.
 */
const PARAMETER_MAP = {
  screen: [
    "u_screen", 
    "u_opacity"
  ],
  sim: [
    "speed", 
    "drop", 
    "seed", 
    "u_wind_res", 
    "diffusivity"
  ],
  wind: [
    "u_wind",
    "u_particles",
    "u_color_ramp",
    "u_particles_res",
    "u_wind_max",
    "u_wind_min",
  ],
  color: [
    "u_color_ramp", 
    "u_opacity"
  ],
};
/**
 * Listener for Web Worker message events
 */
const handleMessage = (webgl: WebGl, { data }: any) => {
  const _data = data.data as any;
  switch (data.type) {
    case Messages.status:
      console.log("Worker", data.type, _data);
      return;
    case Messages.uniform:
      console.log("Worker", data.type, _data);
      webgl.set_uniform(_data.name, _data.data_type, _data.value);
      return;
    case Messages.texture:
      console.warn("Worker", data.type, _data);
      // webgl.texture_from_u8_array(
      //   _data.shape[0],
      //   _data.shape[1],
      //   _data.data,
      //   _data.name
      // );
      return;
    case Messages.attribute:
      console.warn("Worker", data.type, _data);
      // let [name, attribute] = _data as [string, AttribInfo];
      // webgl.update_attribute(name, attribute);
      return;
    case Messages.error:
      console.error("Worker", data.message, data.type, data.data);
      return;
    default:
      console.warn("Worker", data.type, data.data);
      return;
  }
};
/**
 * Input to the lagrangian simulation hook
 */
type ICompute = {
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
 * Use WebGL to calculate particle trajectories from velocity data.
 * This example uses wind data to move particles around the globe.
 * The velocity field is static, but in the future the component
 * will support pulling frames from video or gif formats.
 *   Paints a color-map to a hidden canvas and then samples it as
 * a lookup table for speed calculations.
 *
 * The recommended size is 16 x 16, but we require input so that
 * we don't set defaults that need to be passed out.
 *
 * This is one way to implement fast lookups of piece-wise functions.
 */
export default function Compute({
  velocity: { metadataFile, ...velocity },
  res,
  colors,
  opacity,
  speed,
  diffusivity,
  pointSize,
  drop,
}: ICompute) {
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
   * Create a temporary canvas element to paint a color
   * map to. This will be an orphan, and we need to make
   * sure it gets cleaned up.
   * Then draw a gradient and extract a color look up table from it.
   * Fires once when canvas is set.
   */
  useEffect(() => {
    if (!colorMapRef.current || !interactive) return;
    const canvas = colorMapRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    [canvas.width, canvas.height] = [ res * res, res ];
    interactive.webgl.texture_from_color_map(ctx, res, colors, "color");
  }, [interactive, res, colors]);
  /**
   * Use external data as a velocity field to force movement of particles.
   *    * Display the wind data in a secondary 2D HTML canvas, for debugging
   * and interpretation. Broken out as a separate hook so that the
   * canvas can be hidden/removed from DOM without altering the control
   * flow of the data loading hook.
   */
  useEffect(() => {
    if (!velocity.source || !previewRef.current || !interactive) return;
    const canvas = previewRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const data = new Image();
    data.addEventListener(
      "load",
      () => {
        interactive.webgl.texture_from_image(canvas, data, "velocity");
      },
      { capture: true, once: true }
    );
    data.crossOrigin = "";
    data.src = velocity.source;
  }, [velocity, interactive]);
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
    if (!webglRef.current) return;
    let canvas = webglRef.current;
    const webgl = canvas.getContext("webgl");
    if (!webgl) return;
    worker.current = new Worker(new URL("./worker.ts", import.meta.url), {
      type: "module",
    });
    const handle = worker.current;
    let callback: ({data}: any) => void;

    (async () => {
      const wasm = await import("@oceanics/app");
      const { panic_hook, WebGl } = wasm;
      panic_hook();
      const webgl = new WebGl(
        canvas,
        {
          vertex: quadVertex,
          fragment: updateFragment,
        },
        {
          vertex: quadVertex,
          fragment: screenFragment,
        },
        {
          vertex: drawVertex,
          fragment: drawFragment,
        },
        {
          vertex: noiseVertex,
          fragment: noiseFragment,
        }
      );
      callback = handleMessage.bind(undefined, webgl);
      handle.addEventListener("message", callback, { passive: true });
      handle.postMessage({
        type: Messages.start,
        data: {
          metadata: {
            source: metadataFile,
          },
          opacity,
          speed,
          diffusivity,
          pointSize,
          drop,
          width: canvas.width,
          height: canvas.height,
          res,
        },
      });
      setInteractive({
        webgl,
      });
    })();
    return () => {
      handle.removeEventListener("message", callback);
    };
  }, [res, metadataFile, opacity, interactive, speed, pointSize, diffusivity, drop]);

  /**
   * Set pipeline value to signal ready for rendering. The saved object
   * contains a `render()` function bound to a WebGL context.
   *
   * It also has a `stages()` function that produces an array of executable
   * stages. This is required, because we need to pass in the texture handles
   * between steps to do double buffering.
   * Render function calls itself recursively, swapping front/back
   * buffers between passes. Triggered when pipeline of functions are ready.
   */
  useEffect(() => {
    if (!webglRef.current || !interactive) return;
    const canvas = webglRef.current;
    let requestId: number;
    console.log("Looping...");
    return;

    (function render() {
      // let time = performance.now();
      // interactive.webgl.screen(
      //   PARAMETER_MAP.screen,
      //   canvas.width,
      //   canvas.height,
      //   screenBuffer,
      //   time
      // );
      // interactive.webgl.draw(
      //   [...PARAMETER_MAP.wind, "u_point_size"],
      //   canvas.width,
      //   canvas.height,
      //   screenBuffer,
      //   time,
      //   res
      // );
      // interactive.webgl.offscreen(
      //   PARAMETER_MAP.color,
      //   canvas.width,
      //   canvas.height,
      //   screenBuffer,
      //   time,
      //   res
      // );
      // interactive.webgl.swap_textures("screen", "back");
      
      // interactive.webgl.update(
      //   [...PARAMETER_MAP.sim, ...PARAMETER_MAP.wind],
      //   res,
      //   res,
      //   screenBuffer,
      //   time,
      //   res
      // );
      // interactive.webgl.swap_textures("state", "previous");

      // // Noise
      // renderPipelineStage({
      //   webgl,
      //   runtime,
      //   uniforms,
      //   program: programs.screen,
      //   textures: [
      //       [assets.textures.state, 1],
      //       [assets.textures.back, 2]
      //   ],
      //   parameters: ["u_screen", "u_opacity"],
      //   attributes: [assets.buffers.quad],
      //   framebuffer: [assets.framebuffer, assets.textures.screen],
      //   topology: [webgl.TRIANGLES, 0, 6],
      //   viewport: [webglRef.current.width, webglRef.current.height]
      // });

      // renderPipelineStage({
      //   webgl,
      //   runtime,
      //   uniforms,
      //   program: programs.draw,
      //   attributes: [buffers.quad],
      //   framebuffer: [framebuffer, textures.screen],
      //   topology: [webgl.TRIANGLES, 0, 6],
      //   viewport: [webglRef.current.width, webglRef.current.height]
      // });

      // renderPipelineStage({
      //   webgl,
      //   runtime,
      //   uniforms,
      //   program: programs.screen,
      //   textures: [[assets.textures.screen, 2]],
      //   parameters: ["u_opacity"],
      //   attributes: [buffers.quad],
      //   framebuffer: [null, null],
      //   topology: [webgl.TRIANGLES, 0, 6],
      //   viewport: [webglRef.current.width, webglRef.current.height]
      // });
      requestId = requestAnimationFrame(render);
    })();
    return () => {
      cancelAnimationFrame(requestId);
    };
  }, [interactive, res]);

  return (
    <div>
      <canvas ref={webglRef} />
      <canvas ref={previewRef} />
      <canvas ref={colorMapRef} />
    </div>
  );
}
