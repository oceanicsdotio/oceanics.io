import { useEffect, useState, useRef, useReducer, useCallback } from "react";
import {
  renderPipelineStage,
  useShaderContext,
  ArrayBuffer,
} from "../Shaders/Shaders.context";
import type { BufferTriple, IRenderStage, TextureOptions } from "../Shaders/Shaders.context";

import useCanvasContext from "../../hooks/useCanvasContext";
import useWorker from "../../hooks/useWorker";


  /**
   * Colormap size for velocity lookups.
   */
  const COLOR_MAP_SIZE = 16 * 16;
/**
 * Mapping of uniforms to program components. Requires
 * knowledge of GLSL variable names and types.
 */
const PARAMETER_MAP = {
  screen: ["u_screen", "u_opacity"],
  sim: ["speed", "drop", "seed", "u_wind_res", "diffusivity"],
  wind: [
    "u_wind",
    "u_particles",
    "u_color_ramp",
    "u_particles_res",
    "u_wind_max",
    "u_wind_min",
  ],
  color: ["u_color_ramp", "u_opacity"],
};

type StepInfo = {complete: boolean, name: string};
type StepState = {[key: string]: StepInfo};

/**
 * Metadata about how to source data from an image
 * that encodes position or velocity data
 */
type IImageData = {
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
 * Input to the lagrangian simulation hook
 */
export type ISimulation = {
  /**
   * Where to obtain velocity data for particle simulation
   */
  velocity: IImageData;
  /**
   * Particle vector tile resolution
   */
  res: number;
  /**
   * Blending colors
   */
  colors: [number, string][];
  /**
   * How quickly to blend layers
   */
  opacity: number;
  /**
   * Particle speed multiplier
   */
  speed: number;
  /**
   * Randomness component
   */
  diffusivity: number;
  /**
   * How large to draw particles on canvas
   */
  pointSize: number;
  /**
   * Dropout rate determines how often stuck particles
   * are re-seeded at a new position
   */
  drop: number;
};

/**
 * This has to be defined in global scope to force Webpack to bundle the script.
 */
const createWorker = () =>
  new Worker(new URL("./Simulation.worker.ts", import.meta.url), {
    type: "module",
  });

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
export const useSimulation = ({
  velocity: { source, metadataFile }, // passed on to Hook as args
  res = 16,
  colors = [
    [0.0, "#deababff"],
    [1.0, "#660066ff"],
  ],
  opacity = 0.92, // how fast the particle trails fade on each frame
  speed = 0.00007, // how fast the particles move
  diffusivity = 0.004,
  pointSize = 1.0,
  drop = 0.01, // how often the particles move to a random place
}: ISimulation) => {
  /**
   * Background web worker. Uses dedicated message interface to do
   * numerical calculations and map/reduce in background.
   */
  const worker = useWorker(createWorker);
  /**
   * Hold reference to temporary canvas element. This is available
   * for specific cases that reuse the canvas.
   */
  const colorMap = useCanvasContext("2d");
  /**
   * Exported ref to draw textures to a secondary HTML canvas component.
   * Generally not needed except when doing end-to-end testing or debugging.
   */
  const preview = useCanvasContext("2d");
  /**
   * Expose progress information about the loading state of the simulation
   * to show in the UI
   */
  const [steps, updateSteps] = useReducer((state: StepState, update: StepInfo) => {
    return {
      ...state,
      [update.name]: update
    }
  }, {} as StepState);
  /**
   * All WebGL related setup is relegated to the context
   * provider.
   */
  const {
    shaders: { webgl, ref, setProgramSourceMap, textures, ...shaders },
  } = useShaderContext();
  /**
   * Textures that are drawn to the screen.
   */
  const screenBuffers = useRef<{ [k: string]: WebGLTexture | null } | null>(
    null
  );
  /**
   * Reference for using and cancelling setTimeout. The render
   * loop uses setTimeout to limit how quickly the simulation
   * runs.
   */
  const timer = useRef<number | null>(null);
  /**
   * Adjustable scalar to fire faster/slower than 60fps. Works
   * with timer to control simulation speed.
   */
  const timeConstant = useRef(1.0);
  /**
   * Limit worker listener to firing once.
   */
  const [listening, setListening] = useState(false);
  /**
   * Container for handles to GPU interface. Image data is loaded
   * and then handed off as a Texture.
   */
  const [imageData, setImageData] = useState<HTMLImageElement | null>(null);
  /**
   * Message for user interface, passed out to parent component. Shows
   * current status or summary statistics about the simulation.
   */
  const [message, setMessage] = useState(`Ichthyoid (N=${res * res})`);
  /**
   * Particle locations. Will be set by web worker from remote source,
   * procedure, or randomly.
   */
  const [particles, setParticles] = useState(null);
  /**
   * Point coordinates and window buffers for generic
   * drawArray rendering.
   */
  const [attributes, setAttributes] = useState<{ [key: string]: BufferTriple }>({});
  const createBuffer = useCallback(() => {
    setAttributes(
      attributes
    )
  }, [webgl]);
  const [start, setStart] = useState(false);
  /**
   * Set the program source map triggers hooks that will
   * compile the shader program and return information
   * about how to bind real data to the textures and arrays.
   */
  useEffect(() => {
    setProgramSourceMap({
      screen: ["quad-vertex", "screen-fragment"],
      draw: ["draw-vertex", "draw-fragment"],
      update: ["quad-vertex", "update-fragment"],
    });
  }, []);
  /**
   * Create a temporary canvas element to paint a color
   * map to. This will be an orphan, and we need to make
   * sure it gets cleaned up.

   * Then draw a gradient and extract a color look up table from it.
   * Fires once when canvas is set.
   */
  useEffect(() => {
    colorMap.ref.current = document.createElement("canvas");
    [colorMap.ref.current.width, colorMap.ref.current.height] = [
      COLOR_MAP_SIZE,
      1,
    ];
    if (!colorMap.validContext) return;
    const ctx = colorMap.validContext as CanvasRenderingContext2D;
    // Create `CanvasGradient` and add color stops
    ctx.fillStyle = ctx.createLinearGradient(0, 0, COLOR_MAP_SIZE, 0);
    colors.forEach(([offset, color]) => {
      (ctx.fillStyle as CanvasGradient).addColorStop(offset, color);
    });
    // Draw to temp canvas
    ctx.fillRect(0, 0, COLOR_MAP_SIZE, 1);
    // Extract regularly interpolated data
    const buffer = ctx.getImageData(0, 0, COLOR_MAP_SIZE, 1).data;
    shaders.createTexture("color", {
      data: new Uint8Array(buffer),
      filter: "LINEAR",
      shape: [16, 16],
    });
    colorMap.ref.current?.remove();
    colorMap.ref.current = null;
  }, []);
  /**
   * When we get a message back from the worker that matches
   * a specific pattern, report or act on that info.
   * Once we have a valid context and initial positions, save the array buffers.
   * Create the textures for particle state.
   *  When we have some information ready, set the status message
   * to something informative, like number of particles.
   * 
   *    * Create the textures for back and front buffers.
   * We're using double buffering to draw to a back
   * buffer, and swap when we want to update the view.
   */
  useEffect(() => {
    if (!worker.ref.current || !ref.current || listening) return;
    // start listener
    const remove = worker.listen(({ data }) => {
      const _data = data.data as any;
      if (!ref.current) return; // typescript/linting
      switch (data.type) {
        case "status":
          return;
        /**
         * Update values of uniforms using pre-calculated values
         * from image metadata and simulation configuration
         * inputs
         */
        case "init":
          console.log(data.type, _data);
          shaders.setUniforms({
            u_screen: ["i", 2],
            u_opacity: ["f", opacity],
            u_wind: ["i", 0],
            u_particles: ["i", 1],
            u_color_ramp: ["i", 2],
            u_particles_res: ["f", res],
            u_point_size: ["f", pointSize],
            u_wind_max: ["f", [_data.metadata.u.max, _data.metadata.v.max]],
            u_wind_min: ["f", [_data.metadata.u.min, _data.metadata.v.min]],
            speed: ["f", speed],
            diffusivity: ["f", diffusivity],
            drop: ["f", drop],
            seed: ["f", Math.random()],
            u_wind_res: ["f", [ref.current.width, ref.current.height]],
          });
          return;
        /**
         * Create and insert a texture
         */
        case "texture":
          console.log(data.type, _data);
          shaders.createTexture(...(_data as [string, TextureOptions]))
          return;
        case "buffer":
          console.warn(data.type, _data);
          return;
        /**
         * Report errors and update UI
         */
        case "error":
          console.error(data.message, data.type, data.data);
          return;
        /**
         * Catch other messages for troubleshooting message
         * passing. 
         */
        default:
          console.warn(data.type, data.data);
          return;
      }
    });
    setListening(true);
    // return () => {
    //   if (!worker.ref.current || !ref.current) return;
    //   remove()
    // };
  }, [worker.ref.current, ref.current]);
  /**
   * Use external data as a velocity field to force movement of particles.
   *
   */
  useEffect(() => {
    if (!source) return;
    const data = new Image();
    const onLoad = () => {
      // setVelocity(
      //   shaders.createTexture({
      //     filter: "LINEAR",
      //     data,
      //   })
      // );
      setImageData(data);
    };
    data.addEventListener("load", onLoad, { capture: true, once: true });
    data.crossOrigin = source.includes(".") ? "" : null;
    data.src = source;
  }, []);
  /**
   * Display the wind data in a secondary 2D HTML canvas, for debugging
   * and interpretation.
   */
  useEffect(() => {
    if (!preview.ref.current || !preview.validContext || !imageData) return;
    (preview.validContext as CanvasRenderingContext2D).drawImage(
      imageData,
      0,
      0,
      preview.ref.current.width,
      preview.ref.current.height
    );
  }, [preview.validContext, imageData]);
  /**
   * In a stand alone loop, update the timeConstant to control
   * the time between render passes. This decouples that control,
   * so that it can be bound to UI elements, for example.
   */
  useEffect(() => {
    const control = () => {
      timeConstant.current = 0.5 * (Math.sin(0.005 * performance.now()) + 1.0);
    };
    const loop = setInterval(control, 30.0);
    return () => {
      clearInterval(loop);
    };
  }, []);
  /**
   * Fire startup messages
   */
  useEffect(() => {
    if (!listening || !webgl) return;
    worker.post({
      type: "init",
      data: {
        metadata: {
          source: metadataFile,
        },
      },
    });
    worker.post({
      type: "texture",
      data: {
        width: ref.current?.width,
        height: ref.current?.height,
        res
      },
    });
  }, [listening, webgl]);
  
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
    if (
      !start ||
      !webgl ||
      !shaders.programs ||
      !shaders.framebuffer ||
      !shaders.runtime ||
      !shaders.uniforms
    )
      return;
    let requestId: number;
    console.log("Starting simulation loop");
    (function render() {
      const pipeline = [
        {
          program: shaders.programs.screen,
          textures: [
            [textures.uv, 0],
            [textures.state, 1], // variable
            [textures.back, 2], // variable
          ],
          attributes: [attributes.quad],
          parameters: PARAMETER_MAP.screen,
          framebuffer: [shaders.framebuffer, screen], // variable
          topology: [webgl.TRIANGLES, 0, 6],
          viewport: [0, 0, ref.current?.width, ref.current?.height],
        },
        {
          program: shaders.programs.draw,
          textures: [[textures.color, 2]],
          attributes: [attributes.index],
          parameters: [...PARAMETER_MAP.wind, "u_point_size"],
          framebuffer: [shaders.framebuffer, screen], // variable
          topology: [webgl.POINTS, 0, res * res],
          viewport: [0, 0, ref.current?.width, ref.current?.height],
        },
        {
          program: shaders.programs.screen,
          textures: [[textures.screen, 2]], // variable
          parameters: PARAMETER_MAP.color,
          attributes: [attributes.quad],
          framebuffer: [null, null],
          topology: [webgl.TRIANGLES, 6],
          viewport: [0, 0, ref.current?.width, ref.current?.height],
          // callback: () => {
          //   textures.current = {
          //     ...shaders.textures.current,
          //     back: textures.current?.screen ?? null,
          //     screen: shaders.textures.current?.back ?? null,
          //   };
          // }, // blend frames
        },
        {
          program: shaders.programs.update,
          textures: [[textures.color, 2]],
          parameters: [...PARAMETER_MAP.sim, ...PARAMETER_MAP.wind],
          attributes: [attributes.quad],
          framebuffer: [
            shaders.framebuffer,
            textures.previous,
          ], // re-use the old data buffer
          topology: [webgl.TRIANGLES, 0, 6],
          viewport: [0, 0, res, res],
          // callback: () => {
          //   shaders.textures.current = {
          //     ...shaders.textures.current,
          //     previous: shaders.textures.current?.state ?? null,
          //     state: shaders.textures.current?.previous ?? null,
          //   };
          // }, // use previous pass to calculate next position
        },
      ] as IRenderStage[];

      pipeline.forEach((stage) => {
        if (!shaders.runtime || !shaders.uniforms) return;
        renderPipelineStage({
          webgl,
          runtime: shaders.runtime,
          uniforms: shaders.uniforms,
          ...stage,
        });
      });
      // timer.current = setTimeout(
      //   render,
      //   timeConstant.current * 17.0,
      //   screen,
      //   textures.back,
      //   textures.state,
      //   textures.previous
      // );
      requestId = requestAnimationFrame(render);
    })();
    return () => {
      cancelAnimationFrame(requestId);
      // if (timer.current) clearTimeout(timer.current);
    };
  }, [shaders.programs, shaders.runtime, start]);
  /**
   * Resources available to parent Component or Hook.
   */
  return { ref, message, preview, timeConstant, steps };
};

export default useSimulation;
