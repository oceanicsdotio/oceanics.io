// Force module to know it's a Web Worker
const ctx: Worker = self as unknown as Worker;
// Message passing enum
const Messages = {
  status: "status",
  error: "error",
  texture: "texture",
  attribute: "attribute",
  start: "start",
  uniform: "uniform"
};
/**
 * Listener function
 */
const handleMessage = async ({ data }: MessageEvent) => {
  switch (data.type) {
    case Messages.status:
      ctx.postMessage({
        type: Messages.status,
        data: "ready",
      });
      return;
    case Messages.start:
      ctx.postMessage({
        type: Messages.uniform,
        data: {
          name: "u_screen",
          data_type: "i",
          value: [2]
        }
      });
      ctx.postMessage({
        type: Messages.uniform,
        data: {
          name: "u_opacity",
          data_type: "f",
          value: [data.opacity]
        }
      });
      ctx.postMessage({
        type: Messages.uniform,
        data: {
          name: "u_wind",
          data_type: "i",
          value: [0]
        }
      });
      ctx.postMessage({
        type: Messages.uniform,
        data: {
          name: "u_particles",
          data_type: "i",
          value: [1]
        }
      });
      ctx.postMessage({
        type: Messages.uniform,
        data: {
          name: "u_color_ramp",
          data_type: "i",
          value: [2]
        }
      });
      ctx.postMessage({
        type: Messages.uniform,
        data: {
          name: "u_particles_res",
          data_type: "i",
          value: [data.res]
        }
      });
      ctx.postMessage({
        type: Messages.uniform,
        data: {
          name: "u_point_size",
          data_type: "i",
          value: [data.pointSize]
        }
      });
      ctx.postMessage({
        type: Messages.uniform,
        data: {
          name: "u_wind_max",
          data_type: "f",
          value: [data.metadata.u.max, data.metadata.v.max]
        }
      });
      ctx.postMessage({
        type: Messages.uniform,
        data: {
          name: "u_wind_min",
          data_type: "f",
          value: [data.metadata.u.min, data.metadata.v.min]
        }
      });
      ctx.postMessage({
        type: Messages.uniform,
        data: {
          name: "speed",
          data_type: "f",
          value: [data.speed]
        }
      });
      ctx.postMessage({
        type: Messages.uniform,
        data: {
          name: "diffusivity",
          data_type: "f",
          value: [data.diffusivity]
        }
      });
      ctx.postMessage({
        type: Messages.uniform,
        data: {
          name: "drop",
          data_type: "f",
          value: [data.drop]
        }
      });
      ctx.postMessage({
        type: Messages.uniform,
        data: {
          name: "seed",
          data_type: "f",
          value: [Math.random()]
        }
      });
      ctx.postMessage({
        type: Messages.uniform,
        data: {
          name: "u_wind_res",
          data_type: "f",
          value: [data.width, data.height]
        }
      });
      let blank = new Uint8Array(data.data.width * data.data.height * 4);
      ctx.postMessage({
        type: Messages.texture,
        data: {
          name: "screen",
          data: blank,
          shape: [data.data.width, data.data.height],
          filter: "NEAREST",
        },
      });
      ctx.postMessage({
        type: Messages.texture,
        data: {
          name: "back",
          data: blank,
          shape: [data.data.width, data.data.height],
          filter: "NEAREST",
        },
      });
      let particles = new Uint8Array(Array.from(
        { length: data.data.res * data.data.res * 4 },
        () => Math.floor(Math.random() * 256)
      ))
      ctx.postMessage({
        type: Messages.texture,
        data: {
          name: "state",
          data: particles,
          shape: [data.data.res, data.data.res],
          filter: "NEAREST",
        },
      });
      ctx.postMessage({
        type: Messages.texture,
        data: {
          name: "previous",
          data: particles,
          shape: [data.data.res, data.data.res],
          filter: "NEAREST",
        },
      });
      ctx.postMessage({
        type: Messages.attribute,
        data: {
          name: "a_index",
          data: new Float32Array(particles),
          order: 2
        },
      });
      ctx.postMessage({
        type: Messages.attribute,
        data: {
          name: "a_pos",
          data: new Float32Array([0, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1, 1]),
          order: 1
        },
      });
      return;
    default:
      ctx.postMessage({
        type: Messages.error,
        message: "unknown message format",
        data
      });
      return;
  }
}
ctx.addEventListener("message", handleMessage)
export { handleMessage }
