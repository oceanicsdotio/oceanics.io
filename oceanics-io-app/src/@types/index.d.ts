// types.d.ts
declare module "worker-loader!*" {
    class WebpackWorker extends Worker {
      constructor();
    }

    export default WebpackWorker;
}

declare module "\*.glsl" {
    const content: string;
    export default content;
}