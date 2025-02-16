// From https://webpack.js.org/loaders/worker-loader/#loading-without-worker-loader
declare module "*.worker.ts" {
  // You need to change `Worker`, if you specified a different value for the `workerType` option
  class WebpackWorker extends Worker {
    constructor();
  }
  export default WebpackWorker;
}
