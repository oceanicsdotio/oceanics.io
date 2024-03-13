import {
  useEffect,
  useState,
  useCallback,
  useRef,
  type MutableRefObject,
} from "react";
import {
  renderPipelineStage,
  useShaderContext,
  type BufferTriple,
  type IRenderStage,
  type TextureOptions
} from "./context";

/**
 * Known message types
 */
export const MESSAGES = {
  status: "status",
  error: "error",
  texture: "texture",
  attribute: "attribute",
};

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

/**
 * Input to the lagrangian simulation hook
 */
export type ISimulation = {
  /**
   * Map of program name to vertex and fragment source
   * names.
   */
  worker: MutableRefObject<Worker | undefined>;
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
  res?: number;
  /**
   * Blending colors
   */
  colors?: [number, string][];
  /**
   * How quickly to blend layers
   */
  opacity?: number;
  /**
   * Particle speed multiplier
   */
  speed?: number;
  /**
   * Randomness component
   */
  diffusivity?: number;
  /**
   * How large to draw particles on canvas
   */
  pointSize?: number;
  /**
   * Dropout rate determines how often stuck particles
   * are re-seeded at a new position
   */
  drop?: number;
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
export default function useSimulation({
  worker,
  velocity: { metadataFile, ...velocity }, // passed on to Hook as args
  res = 16,
  colors = [
    [0.0, "#deababff"],
    [1.0, "#660066ff"],
  ],
   // opacity = 0.92,
  // speed = 0.00007,
  // diffusivity = 0.004,
  // pointSize = 1.0,
  // drop = 0.01,
}: ISimulation) {
  /**
   * Hold reference to temporary canvas element.
   */
  const colorMapRef: MutableRefObject<HTMLCanvasElement | null> = useRef(null);
  const previewRef: MutableRefObject<HTMLCanvasElement | null> = useRef(null);
  const webglRef: MutableRefObject<HTMLCanvasElement | null> = useRef(null);

  const [colorMapContext, setColorMapContext] = useState<CanvasRenderingContext2D | null>(
    null
  );
  const [previewContext, setPreviewContext] = useState<CanvasRenderingContext2D | null>(
    null
  );
  const [webglContext, setWebglContext] = useState<WebGLRenderingContext | null>(
    null
  );
  useEffect(() => {
    if (!colorMapRef.current) return;
    setColorMapContext(colorMapRef.current.getContext("2d"));
  }, [colorMapRef]);
  useEffect(() => {
    if (!previewRef.current) return;
    setPreviewContext(previewRef.current.getContext("2d"));
  }, [previewRef]);
  useEffect(() => {
    if (!webglRef.current) return;
    setWebglContext(webglRef.current.getContext("webgl"));
  }, [webglRef]);

  /**
   * All WebGL related setup is relegated to the context
   * provider.
   */
  const { shaders } = useShaderContext();

  /**
   * Debugging level report on the compiled program.
   */
  useEffect(() => {
    if (shaders.programs) console.debug("programs", shaders.programs);
  }, [shaders.programs]);

  /**
   * Container for handles to GPU interface. Image data is loaded
   * and then handed off as a Texture.
   */
  const [imageData, setImageData] = useState<HTMLImageElement | null>(null);
  /**
   * Message for user interface, passed out to parent component. Shows
   * current status or summary statistics about the simulation.
   */
  const [message] = useState(`Ichthyoid (N=${res * res})`);
  /**
   * Point coordinates and window buffers for generic
   * drawArray rendering.
   */
  const [attributes, setAttributes] = useState<{ [key: string]: BufferTriple }>(
    {}
  );

  const createAttribute = useCallback(
    (name: string, attribute: BufferTriple) => {
      setAttributes({
        ...attributes,
        [name]: attribute,
      });
    },
    [attributes]
  );
  /**
   * Set the program source map triggers hooks that will
   * compile the shader program and return information
   * about how to bind real data to the textures and arrays.
   */
  useEffect(() => {
    shaders.setProgramSourceMap({
      screen: ["quad-vertex", "screen-fragment"],
      draw: ["draw-vertex", "draw-fragment"],
      update: ["quad-vertex", "update-fragment"],
    });
  }, [shaders]);
  /**
   * Create a temporary canvas element to paint a color
   * map to. This will be an orphan, and we need to make
   * sure it gets cleaned up.

   * Then draw a gradient and extract a color look up table from it.
   * Fires once when canvas is set.
   */
  useEffect(() => {
    const COLOR_MAP_SIZE = 16 * 16;
    colorMapRef.current = document.createElement("canvas");
    [colorMapRef.current.width, colorMapRef.current.height] = [
      COLOR_MAP_SIZE,
      1,
    ];
    if (!colorMapContext) return;
    const ctx = colorMapContext as CanvasRenderingContext2D;
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
    colorMapRef.current?.remove();
    colorMapRef.current = null;
  }, [colorMapRef, colorMapContext, colors, shaders]);
  /**
   * When we get a message back from the worker that matches a specific pattern,
   * report or act on that info. The worker will push buffers and texture data
   * that the frontend needs to send to the webgl rendering context.
   */
  useEffect(() => {
    if (!worker.current) return;
    const handle = worker.current;
    const callback = ({ data }: any) => {
      const _data = data.data as any;
      switch (data.type) {
        case "status":
          return;
        /**
         * Set uniforms using pre-calculated values from image
         * metadata and simulation configuration.
         */
        case "uniforms":
          console.log(data.type, _data);
          shaders.setUniforms(_data as any);
          return;
        /**
         * Create and insert a texture. These are assumed
         * to be 2D. They can either be image data, or
         * vector tiles.
         */
        case "texture":
          console.log(data.type, _data);
          shaders.createTexture(...(_data as [string, TextureOptions]));
          return;
        /**
         * Buffers are draw targets for WebGL.
         */
        case "attribute":
          console.warn(data.type, _data);
          createAttribute(...(_data as [string, BufferTriple]));
          return;
        /**
         * Report errors.
         */
        case "error":
          console.error(data.message, data.type, data.data);
          return;
        /**
         * Catch other messages for troubleshooting message passing.
         */
        default:
          console.warn(data.type, data.data);
          return;
      }
    };
    handle.addEventListener("message", callback, { passive: true });
    return () => {
      handle.removeEventListener("message", callback);
    };
  }, [worker, createAttribute, shaders]);
  /**
   * Use external data as a velocity field to force movement of particles.
   *
   */
  useEffect(() => {
    if (!velocity.source) return;
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
    data.crossOrigin = velocity.source.includes(".") ? "" : null;
    data.src = velocity.source;
  }, [velocity.source]);
  /**
   * Display the wind data in a secondary 2D HTML canvas, for debugging
   * and interpretation. Broken out as a separate hook so that the
   * canvas can be hidden/removed from DOM without altering the control
   * flow of the data loading hook.
   */
  useEffect(() => {
    if (!previewRef.current || !previewContext || !imageData) return;
    (previewContext as CanvasRenderingContext2D).drawImage(
      imageData,
      0,
      0,
      previewRef.current.width,
      previewRef.current.height
    );
  }, [previewContext, imageData]);
  /**
   * Fire startup messages
   */
  useEffect(() => {
    if (!webglRef.current || typeof worker.current === "undefined") return;
    worker.current.postMessage({
      type: "init",
      data: {
        metadata: {
          source: metadataFile,
        },
      },
    });
    worker.current.postMessage({
      type: "texture",
      data: {
        width: webglRef.current.width,
        height: webglRef.current.height,
        res,
      },
    });
  }, [webglRef, res, worker, metadataFile]);

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
      !webglContext ||
      typeof webglRef.current === "undefined" ||
      !webglRef.current ||
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
            [shaders.textures.uv, 0],
            [shaders.textures.state, 1], // variable
            [shaders.textures.back, 2], // variable
          ],
          attributes: [attributes.quad],
          parameters: PARAMETER_MAP.screen,
          framebuffer: [shaders.framebuffer, screen], // variable
          topology: [webglContext.TRIANGLES, 0, 6],
          viewport: [0, 0, shaders.ref.current?.width, shaders.ref.current?.height],
        },
        {
          program: shaders.programs.draw,
          textures: [[shaders.textures.color, 2]],
          attributes: [attributes.index],
          parameters: [...PARAMETER_MAP.wind, "u_point_size"],
          framebuffer: [shaders.framebuffer, screen], // variable
          topology: [webglContext.POINTS, 0, res * res],
          viewport: [0, 0, webglRef.current?.width, webglRef.current?.height],
        },
        {
          program: shaders.programs.screen,
          textures: [[shaders.textures.screen, 2]], // variable
          parameters: PARAMETER_MAP.color,
          attributes: [attributes.quad],
          framebuffer: [null, null],
          topology: [webglContext.TRIANGLES, 6],
          viewport: [0, 0, webglRef.current.width, webglRef.current.height],
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
          textures: [[shaders.textures.color, 2]],
          parameters: [...PARAMETER_MAP.sim, ...PARAMETER_MAP.wind],
          attributes: [attributes.quad],
          framebuffer: [shaders.framebuffer, shaders.textures.previous], // re-use the old data buffer
          topology: [webglContext.TRIANGLES, 0, 6],
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
          webgl: webglContext,
          runtime: shaders.runtime,
          uniforms: shaders.uniforms,
          ...stage,
        });
      });
      requestId = requestAnimationFrame(render);
    })();
    return () => {
      cancelAnimationFrame(requestId);
    };
  }, [shaders.programs, shaders.runtime]);

  
  // useEffect(() => {
  //     if (!ctx || !ref.current) return;
  //     const { width, height } = ref.current;
  //     setAssets({
  //         textures:
  //             Object.fromEntries(Object.entries({
  //                 screen: screenBuffer(width, height),
  //                 back: screenBuffer(width, height)
  //             }).map(([k, v]) => [k, createTexture({ctx, ...v})])),
  //         buffers: VertexArrayBuffers(ctx),
  //         framebuffer: ctx.createFramebuffer(),
  //         uniforms: {
  //             "u_screen" : ["i", 2],
  //             "u_opacity": ["f", 1.0]
  //         }
  //     });

  // }, [ref]);

  // useEffect(() => {

  //     const ctx = validContext();

  //     if (!fractal || !runtime || !ctx || !assets || !programs) return;

  //     const viewport = [0, 0, ref.current.width, ref.current.height];

  //     setPipeline([
  //         {
  //             program: programs.screen,
  //             textures: [
  //                 [assets.textures.state, 1],
  //                 [assets.textures.back, 2]
  //             ],
  //             parameters: ["u_screen", "u_opacity"],
  //             attributes: [assets.buffers.quad],
  //             framebuffer: [assets.framebuffer, assets.textures.screen],
  //             topology: [ctx.TRIANGLES, 6],
  //             viewport
  //         },
  //         {
  //             program: programs.draw,
  //             attributes: [assets.buffers.quad],
  //             framebuffer: [assets.framebuffer, assets.textures.screen],
  //             topology: [ctx.TRIANGLES, 6],
  //             viewport
  //         },
  //         {
  //             program: programs.screen,
  //             textures: [[assets.textures.screen, 2]],
  //             parameters: ["u_opacity"],
  //             attributes: [assets.buffers.quad],
  //             framebuffer: [null, null],
  //             topology: [ctx.TRIANGLES, 6],
  //             viewport
  //         }
  //     ]);
  // }, [programs]);

  /**
   * Resources available to parent Component or Hook.
   */
  return {
    ref: webglRef,
    message,
    preview: {
      ref: previewRef
    },
    noise: {
      message: "",
    },
  };
}
