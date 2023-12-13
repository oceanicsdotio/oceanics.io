import { useEffect, useState, useRef } from "react";
import useGlslShaders, {
  renderPipelineStage,
} from "../../hooks/useGlslShaders";
import useCanvasContext from "../../hooks/useCanvasContext";
import useWorker from "../../hooks/useWorker";

/**
 * Mapping of uniforms to program components
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
type ISimulation = {
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
   * Colormap size
   */
  const size = 16 * 16;
  /**
   * Background web worker.
   */
  const worker = useWorker(createWorker);
  /**
   * Hold reference to temporary canvas element.
   *
   * This is available for specific use cases that reuse
   * the canvas.
   */
  const colorMap = useCanvasContext("2d");
  /**
   * Shader programs compiled from GLSL source.
   *
   * Comes with a recycled Rust-WASM runtime.
   */
  const webgl = useGlslShaders({
    shaders: {
      screen: ["quad-vertex", "screen-fragment"],
      draw: ["draw-vertex", "draw-fragment"],
      update: ["quad-vertex", "update-fragment"],
    },
  });
  /**
   * Exported ref to draw textures to a secondary HTML canvas component.
   * Generally not needed except when doing end-to-end testing or debugging.
   */
  const preview = useRef<HTMLCanvasElement>(null);
  /**
   * Textures that are drawn to the screen.
   */
  const screenBuffers = useRef(null);
  /**
   * Reference for using and cancelling setTimeout.
   */
  const timer = useRef(null);
  /**
   * Adjustable scalar to fire faster/slower than 60fps
   */
  const timeConstant = useRef(1.0);
  /**
   * Order of textures is swapped after every render pass.
   */
  const textures = useRef(null);
  /**
   * Interpreting image formatted velocity data requires having
   * information about the range.
   */
  const [metadata] = useState(null);
  /**
   * Container for handles to GPU interface
   */
  const [imageData, setImageData] = useState<HTMLImageElement | null>(null);
  /**
   * Message for user interface, passed out to parent component.
   */
  const [message, setMessage] = useState("Working...");
  /**
   * Use pipeline as an effect triggering state.
   */
  const [pipeline, setPipeline] = useState(null);
  /**
   * Particle locations. Will be set by web worker from remote source,
   * procedure, or randomly.
   */
  const [particles] = useState(null);
  /**
   * Error flag
   */
  const [error] = useState(null);
  /**
   * Break out velocity texture, we want this to be optional.
   */
  const [velocity, setVelocity] = useState(null);
  /**
   * State for data to be passed to WebGL
   */
  const [texture, setTexture] = useState<Uint8Array | null>(null);
  /**
   * Save framebuffer reference. This should be constant, but needs
   * a valid WebGL constant.
   */
  const [framebuffer, setFramebuffer] = useState(null);
  /**
   * Assets are our data
   */
  const [assets, setAssets] = useState(null);
  /**
   * Points and window buffers for generic drawArray rendering
   */
  const [buffers, setBuffers] = useState(null);
  /**
   * Create a temporary canvas element to paint a color
   * map to. This will be an orphan, and we need to make
   * sure it gets cleaned up.
   */
  useEffect(() => {
    colorMap.ref.current = document.createElement("canvas");
    [colorMap.ref.current.width, colorMap.ref.current.height] = [size, 1];
  }, []);
  /**
   * Fetch the metadata file.
   */
  useEffect(() => {
    worker.post({
      type: "getPublicJsonData",
      data: metadataFile,
    });
  }, []);
  /**
   * Create a initial distribution of particle positions,
   * encoded as 4-byte colors.
   */
    useEffect(() => {
        worker.post({
          type: "init",
          data: {},
        });
      }, []);
  /**
   * Then draw a gradient and extract a color look up table from it.
   * Fires once when canvas is set.
   */
  useEffect(() => {
    if (!colorMap.validContext) return;
    const ctx = colorMap.validContext as CanvasRenderingContext2D;
    // Create `CanvasGradient` and add color stops
    ctx.fillStyle = ctx.createLinearGradient(0, 0, size, 0);
    colors.forEach(([offset, color]) => {
      (ctx.fillStyle as CanvasGradient).addColorStop(offset, color);
    });
    // Draw to temp canvas
    ctx.fillRect(0, 0, size, 1);
    // Extract regularly interpolated data
    const buffer = ctx.getImageData(0, 0, size, 1).data;
    setTexture(new Uint8Array(buffer));
  }, [colorMap.validContext]);

  /**
   * Clean up color map instance. Remove canvas and delete state.
   * This hook fires once when texture is set.
   */
  useEffect(() => {
    if (!texture || !colorMap.ref.current) return;
    colorMap.ref.current?.remove();
    colorMap.ref.current = null;
  }, [texture]);
  /**
   * Use external data as a velocity field to force movement of particles.
   *
   */
  useEffect(() => {
    if (!source) return;
    const img = new Image();
    img.addEventListener(
      "load",
      () => {
        setImageData(img);
      },
      {
        capture: true,
        once: true,
      }
    );
    img.crossOrigin = source.includes(".") ? "" : null;
    img.src = source;
  }, []);
  /**
   * Display the wind data in a secondary 2D HTML canvas, for debugging
   * and interpretation.
   */
  useEffect(() => {
    if (!preview || !preview.current || !imageData) return;
    const ctx = preview.current?.getContext("2d");
    if (!ctx) throw TypeError("Canvas Rendering Context is Null");
    ctx.drawImage(
      imageData,
      0,
      0,
      preview.current.width,
      preview.current.height
    );
  }, [preview, imageData]);

  /**
   * When we have some information ready, set the status message
   * to something informative, like number of particles.
   *
   * Set an error message if necessary.
   */
  useEffect(() => {
    if (particles || error)
      setMessage(error ? error : `Ichthyoid (N=${res * res})`);
  }, [particles, error]);

  /**
   * Update values of uniforms.
   */
  useEffect(() => {
    if (webgl.validContext && metadata)
    webgl.setUniforms({
        u_screen: ["i", 2],
        u_opacity: ["f", opacity],
        u_wind: ["i", 0],
        u_particles: ["i", 1],
        u_color_ramp: ["i", 2],
        u_particles_res: ["f", res],
        u_point_size: ["f", pointSize],
        u_wind_max: ["f", [metadata.u.max, metadata.v.max]],
        u_wind_min: ["f", [metadata.u.min, metadata.v.min]],
        speed: ["f", speed],
        diffusivity: ["f", diffusivity],
        drop: ["f", drop],
        seed: ["f", Math.random()],
        u_wind_res: ["f", [webgl.ref.current?.width, webgl.ref.current?.height]],
      });
  }, [webgl.validContext, metadata]);
  /**
   * Once we have a valid context and initial positions, save the array buffers.
   * This may not be strictly necessary.
   */
  useEffect(() => {
    if (webgl.validContext && particles)
      setBuffers(webgl.VertexArrayBuffers(validContext, particles));
  }, [webgl.validContext, particles]);
  /**
   * Create the UV velocity texture
   */
  useEffect(() => {
    if (imageData && createTexture)
      setVelocity(
        createTexture({
          filter: "LINEAR",
          data: imageData,
        })
      );
  }, [imageData, createTexture]);
  /**
   * Generate assets and handles for rendering to canvas.
   * Use transducer to replace configs with texture instances.
   *
   * This is executed exactly once after the canvas is created,
   * and the initial positions have been loaded or generated
   */
  useEffect(() => {
    if (createTexture && colorMap.texture)
      setAssets(
        createTexture({
          data: colorMap.texture,
          filter: "LINEAR",
          shape: [16, 16],
        })
      );
  }, [createTexture, colorMap.texture]);
  /**
   * Create the textures.
   */
  useEffect(() => {
    if (!validContext || !createTexture) return;
    const { width, height } = ref.current;
    const size = width * height * 4;
    screenBuffers.current = Object.fromEntries(
      Object.entries({
        screen: {
          data: new Uint8Array(size),
          shape: [width, height],
          filter: "NEAREST",
        },
        back: {
          data: new Uint8Array(size),
          shape: [width, height],
          filter: "NEAREST",
        },
      }).map(([k, v]) => [k, createTexture(v)])
    );
  }, [validContext, createTexture]);

  /**
   * Create the textures.
   */
  useEffect(() => {
    if (!validContext || !particles || !createTexture) return;
    textures.current = Object.fromEntries(
      Object.entries({
        state: { data: particles, shape: [res, res], filter: "NEAREST" },
        previous: { data: particles, shape: [res, res], filter: "NEAREST" },
      }).map(([k, v]) => [k, createTexture(v)])
    );
  }, [ref, particles, createTexture]);

  /**
   * Save reference
   */
  useEffect(() => {
    if (!validContext) return;
    setFramebuffer(validContext.createFramebuffer());
  }, [validContext]);

  const stageDeps = [validContext, assets, framebuffer, programs, buffers];
  const frontBufferDeps = [validContext, programs, buffers];
  /**
   * Render stage
   */
  const indexBufferStage = usePipelineStage(stageDeps, (screen) =>
    Object({
      program: programs.draw,
      textures: [[assets, 2]],
      attributes: [buffers.index],
      parameters: [...PARAMETER_MAP.wind, "u_point_size"],
      framebuffer: [framebuffer, screen], // variable
      topology: [validContext.POINTS, 0, res * res],
      viewport: [0, 0, ref.current.width, ref.current.height],
    })
  );

  /**
   * Render stage
   */
  const backBufferStage = usePipelineStage(stageDeps, (state, back, screen) =>
    Object({
      program: programs.screen,
      textures: [
        [velocity, 0],
        [state, 1], // variable
        [back, 2], // variable
      ],
      attributes: [buffers.quad],
      parameters: PARAMETER_MAP.screen,
      framebuffer: [framebuffer, screen], // variable
      topology: [validContext.TRIANGLES, 0, 6],
      viewport: [0, 0, ref.current.width, ref.current.height],
    })
  );
  /**
   * Render stage.
   */
  const frontBufferStage = usePipelineStage(frontBufferDeps, (screen) =>
    Object({
      program: programs.screen,
      textures: [[screen, 2]], // variable
      parameters: PARAMETER_MAP.color,
      attributes: [buffers.quad],
      framebuffer: [null, null],
      topology: [validContext.TRIANGLES, 0, 6],
      viewport: [0, 0, ref.current.width, ref.current.height],
    })
  );
  /**
   * Shader program.
   */
  const updateStage = usePipelineStage(stageDeps, (previous) =>
    Object({
      program: programs.update,
      textures: [[assets, 2]],
      parameters: [...PARAMETER_MAP.sim, ...PARAMETER_MAP.wind],
      attributes: [buffers.quad],
      framebuffer: [framebuffer, previous], // re-use the old data buffer
      topology: [validContext.TRIANGLES, 0, 6],
      viewport: [0, 0, res, res],
    })
  );

  /**
   * Triggers for updating the rendering pipeline.
   */
  const renderDeps = [
    runtimeContext,
    indexBufferStage,
    backBufferStage,
    frontBufferStage,
    updateStage,
  ];
  /**
   * Set pipeline value to signal ready for rendering. The saved object
   * contains a `render()` function bound to a WebGL context.
   *
   * It also has a `stages()` function that produces an array of executable
   * stages. This is required, because we need to pass in the texture handles
   * between steps to do double buffering.
   */
  useEffect(() => {
    if (renderDeps.every((x) => !!x))
      setPipeline({
        render: renderPipelineStage.bind(null, runtimeContext),
        stages: (back, screen, previous, state) => [
          backBufferStage(state, back, screen),
          indexBufferStage(screen), // draw to front buffer
          frontBufferStage(back), // write over previous buffer
          updateStage(previous), // write over previous state
        ],
      });
  }, renderDeps);

  /**
   * Render function that calls itself recursively, swapping front/back buffers between
   * passes.
   *
   * Triggered when pipeline of functions are ready.
   */
  useEffect(() => {
    if (!pipeline || !textures.current || !screenBuffers.current) return;

    function render(back, screen, previous, state) {
      pipeline.stages(back, screen, previous, state).forEach(pipeline.render);
      timer.current = setTimeout(
        render,
        timeConstant.current * 17.0,
        screen,
        back,
        state,
        previous
      );
    }
    render(
      screenBuffers.current.back,
      screenBuffers.current.screen,
      textures.current.previous,
      textures.current.state
    );

    return () => clearTimeout(timer.current);
  }, [pipeline, textures.current, screenBuffers.current]);

  /**
   * In a stand alone loop, update the timeConstant to control
   * the time between render passes.
   *
   * This decouples that control, so that it can be bound to UI
   * elements, for example.
   */
  useEffect(() => {
    const simulateControl = () => {
      timeConstant.current = 0.5 * (Math.sin(0.005 * performance.now()) + 1.0);
    };
    const loop = setInterval(simulateControl, 30.0);
    return () => clearInterval(loop);
  }, []);
  /**
   * Resources available to parent Component or Hook.
   */
  return { ref, message, preview, timeConstant };
};
export default useSimulation;




// export const useLagrangianTrajectory = ({
//     res = 16,
//     opacity = 0.92, // how fast the particle trails fade on each frame
//     speed = 0.00007, // how fast the particles move
//     diffusivity = 0.004,
//     pointSize = 1.0,
//     drop = 0.01, // how often the particles move to a random place
// }) => { 
  
//     useEffect(() => {
//         const ctx = validContext();
     
//         const canvas: HTMLCanvasElement = ref.current;
//         const { width, height } = canvas;
//         const size = width * height * 4;
       
//         setAssets({
//             textures: 
//                 Object.fromEntries(Object.entries({
//                     screen: { data: new Uint8Array(size), shape: [ width, height ] },
//                     back: { data: new Uint8Array(size), shape: [ width, height ] },
//                     state: { data: particles, shape: [res, res] },
//                     previous: { data: particles, shape: [res, res] },
//                     color: { data: colorMap.texture, filter: "LINEAR", shape: [16, 16] },
//                     uv: { filter: "LINEAR", data: imageData },
//                 }).map(
//                     ([k, v]) => [k, createTexture({ctx: ctx, ...v})]
//                 )),
//             buffers: VertexArrayBuffers(ctx, particles),
//             framebuffer: ctx.createFramebuffer(),
//             uniforms: {
//                 "u_screen" : ["i", 2],
//                 "u_opacity": ["f", opacity],
//                 "u_wind": ["i", 0],
//                 "u_particles": ["i", 1],
//                 "u_color_ramp": ["i", 2],
//                 "u_particles_res": ["f", res],
//                 "u_point_size": ["f", pointSize],
//                 "u_wind_max": ["f", [metadata.u.max, metadata.v.max]],
//                 "u_wind_min": ["f", [metadata.u.min, metadata.v.min]],
//                 "speed": ["f", speed],
//                 "diffusivity": ["f", diffusivity],
//                 "drop": ["f", drop],
//                 "seed": ["f", Math.random()],
//                 "u_wind_res": ["f", [width, height]]
//             }
//         });
//     }, [ ref, particles, metadata, colorMap.texture, imageData ]);
//     useEffect(() => {
//         const ctx = validContext();
//         if (!ctx || !programs || !assets || !metadata) return;

//         let requestId: number;  
//         let {
//             textures: { 
//                 back, 
//                 previous, 
//                 state, 
//                 screen 
//             },
//         } = assets;  // non-static assets
 
//         (function render() {
//             const pipeline = [
//                 {
//                     program: programs.screen,
//                     textures: [
//                         [assets.textures.uv, 0],
//                         [state, 1],  // variable
//                         [back, 2]  // variable
//                     ],
//                     attributes: [assets.buffers.quad],
//                     parameters: parameters.screen,
//                     framebuffer: [assets.framebuffer, screen],  // variable
//                     topology: [ctx.TRIANGLES, 6],
//                     viewport: [0, 0, ref.current.width, ref.current.height]
//                 },
//                 {
//                     program: programs.draw,
//                     textures: [[assets.textures.color, 2]],
//                     attributes: [assets.buffers.index],
//                     parameters: [...parameters.wind, "u_point_size"],
//                     framebuffer: [assets.framebuffer, screen],  // variable
//                     topology: [ctx.LINE_STRIP, res * res],
//                     viewport: [0, 0, ref.current.width, ref.current.height]
//                 },
//                 {
//                     program: programs.screen,
//                     textures: [[screen, 2]], // variable  
//                     parameters: parameters.color,
//                     attributes: [assets.buffers.quad],
//                     framebuffer: [null, null], 
//                     topology: [ctx.TRIANGLES, 6],
//                     viewport: [0, 0, ref.current.width, ref.current.height],
//                     callback: () => [back, screen] = [screen, back]  // blend frames
//                 }, 
//                 {
//                     program: programs.update,
//                     textures: [[assets.textures.color, 2]],
//                     parameters: [...parameters.sim, ...parameters.wind],
//                     attributes: [assets.buffers.quad],
//                     framebuffer: [assets.framebuffer, previous],  // re-use the old data buffer
//                     topology: [ctx.TRIANGLES, 6],
//                     viewport: [0, 0, res, res],  
//                     callback: () => [state, previous] = [previous, state]  // use previous pass to calculate next position
//                 }
//             ];
            
//             renderPipeline(runtime, ctx, assets.uniforms, pipeline);
//             requestId = requestAnimationFrame(render);
//         })()
//         return () => cancelAnimationFrame(requestId);
//     }, [programs, assets]);
// };
