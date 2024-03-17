"use client";
import React, { useEffect, useRef } from "react";
import useSimulation, { type ISimulation } from "./useSimulation";

export default function Simulation(args: Omit<ISimulation, "worker">) {
  const worker = useRef<Worker | undefined>();
  useEffect(() => {
    worker.current = new Worker(
      new URL("./worker.ts", import.meta.url),
      {
        type: "module",
      }
    );
  }, []);

  const simulation = useSimulation({
    worker, ...args
  });
  return (
    <div>
      <p>{simulation.message}</p>
      <p>{simulation.noise.message}</p>
      <canvas ref={simulation.ref} />
      <canvas ref={simulation.preview.ref} />
    </div>
  );
}
