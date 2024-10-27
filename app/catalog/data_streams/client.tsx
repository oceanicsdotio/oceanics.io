"use client";
import React, { useState, useEffect, useRef } from "react";
import useCollection from "@catalog/useCollection";
import specification from "@app/../specification.json";
import Link from "next/link";
import type {
  InteractiveDataStream,
  DataStreamStyle,
  DataStreams
} from "@oceanics/app";
import styles from "@catalog/page.module.css";

const components = specification.components;
const {
  title: left,
} = specification.components.schemas.DataStreams;

import style from "@catalog/page.module.css";
import Markdown from "react-markdown";
import {TextInput} from "@catalog/client";
/**
 * Get DataStreams properties from OpenAPI schema
 */
const { properties, title } = specification.components.schemas.DataStreams;
/**
 * Display an index of all or some subset of the
 * available nodes in the database.
 */
export function Create({}) {
  /**
   * Form data is synced with user input
   */
  const uuid = useRef<HTMLInputElement | null>(null);
  const name = useRef<HTMLInputElement | null>(null);
  const description = useRef<HTMLInputElement | null>(null);
  const unitOfMeasurementName = useRef<HTMLInputElement | null>(null);
  const unitOfMeasurementSymbol = useRef<HTMLInputElement | null>(null);
  const unitOfMeasurementDefinition = useRef<HTMLInputElement | null>(null);
  const observationType = useRef<HTMLSelectElement | null>(null);
  const observedArea = useRef<HTMLInputElement | null>(null);
  const phenomenaTime = useRef<HTMLInputElement | null>(null);
  const resultTime = useRef<HTMLInputElement | null>(null);
  /**
   * Web Worker.
   */
  const { onSubmit, disabled, create, message } = useCollection({
    left: title,
    limit: 100,
    offset: 0
  });
  /**
   * On submission, we delegate the request to our background
   * worker, which will report on success/failure.
   */
  const onSubmitCallback = () => {
    return {
      uuid: uuid.current?.value,
      name: name.current?.value,
      description: description.current?.value,
      observationType: observationType.current?.value,
      // unitOfMeasurement: {
      //   name: unitOfMeasurementName.current?.value,
      //   symbol: unitOfMeasurementSymbol.current?.value,
      //   definition: unitOfMeasurementDefinition.current?.value,
      // },
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
          inputRef={uuid}
          required
          description={properties.uuid.description}
          defaultValue={crypto.randomUUID()}
        ></TextInput>
        <TextInput
          name={"name"}
          inputRef={name}
          required
          description={properties.name.description}
        ></TextInput>
        <TextInput
          name={"description"}
          inputRef={description}
          required
          description={properties.description.description}
        ></TextInput>
        <TextInput
          name={"unitOfMeasurementName"}
          inputRef={unitOfMeasurementName}
          description={properties.unitOfMeasurement.properties.name.description}
        ></TextInput>
        <TextInput
          name={"unitOfMeasurementSymbol"}
          inputRef={unitOfMeasurementSymbol}
          description={
            properties.unitOfMeasurement.properties.symbol.description
          }
        ></TextInput>
        <TextInput
          name={"unitOfMeasurementDefinition"}
          inputRef={unitOfMeasurementDefinition}
          description={
            properties.unitOfMeasurement.properties.definition.description
          }
        ></TextInput>

        <label className={style.label} htmlFor={"observationType"}>
          <code>observationType</code>
        </label>
        <select
          className={style.input}
          id={"observationType"}
          name={"observationType"}
          ref={observationType}
          defaultValue={"OM_Measurement"}
        >
          {properties.observationType.enum.map((value: string) => {
            return (
              <option key={value} value={value}>
                {value}
              </option>
            );
          })}
        </select>
        <Markdown>{properties.observationType.description}</Markdown>
        <button className={style.submit} disabled={disabled}>
          Create
        </button>
      </form>
    </>
  );
}

type WasmInteraction = {
  InteractiveDataStream: typeof InteractiveDataStream;
} | null;
/**
 * Buffer of visible/stored observations.
 */
let capacity = 100;
/**
 * Number of bins to use in histogram.
 */
let bins = 10;
/**
 * System time scalar
 */
let timeConstant = 1 / capacity;
let detailLevels = 4;
/**
 * Drawing style type is from WASM, but we have to leave
 * out bound methods.
 */
let draw: Omit<DataStreamStyle, "free"> = {
  streamColor: "lightblue",
  overlayColor: "lightblue",
  backgroundColor: "#11002299",
  lineWidth: 2,
  pointSize: 4,
  tickSize: 8,
  fontSize: 24,
  labelPadding: 8,
};
/**
 * Full information for a single node. Because we are using
 * static rendering, can have dynamic per entity route,
 * and have to fallback on query strings and client side
 * rendering.
 */
function DataStream({
  dataStream,
  setSource,
  active
}: {
  dataStream: DataStreams,
  setSource: (stream: DataStreams) => void,
  active: boolean
}) {
  /**
   * Show additional metadata
   */
  const [detailLevel, setDetailLevel] = useState(0);
  /**
   * Increment detail level
   */
  function onMore() {
    setDetailLevel((prev) => Math.min(prev + 1, detailLevels));
  }
  /**
   * Decrement detail level
   */
  function onLess() {
    setDetailLevel((prev) => Math.max(prev - 1, 0));
  }
  /**
   * Client component
   */
  return (
    <div>
      <Link
        href={`edit/?uuid=${dataStream.uuid}`}
        prefetch={false}
      >
        {dataStream.name ?? dataStream.uuid}
      </Link>
      {active ? " ✓" : ""}
      <div>
        <button onClick={onMore} disabled={detailLevel === detailLevels - 1}>
          More Detail
        </button>
        <button onClick={onLess} disabled={detailLevel === 0}>
          Less Detail
        </button>
        <button onClick={()=>{setSource(dataStream)}} disabled={active}>
          View
        </button>
      </div>
      {detailLevel > 0 && (
        <div>
          <p>description: {dataStream.description}</p>
        </div>
      )}
      {detailLevel > 1 && (
        <div>
          <p>unit of measurement:</p>
          <p>{`\tname: ${dataStream.unitOfMeasurement?.name ?? "n/a"}`}</p>
          <p>{`\tsymbol: ${dataStream.unitOfMeasurement?.symbol ?? "n/a"}`}</p>
          <p>{`\tdefinition: ${dataStream.unitOfMeasurement?.definition ?? "n/a"}`}</p>
        </div>
      )}
      {detailLevel > 2 && (
        <div>
          <p>observation type: {dataStream.observationType ?? "n/a"}</p>
          <p>phenomenon time: unknown</p>
          <p>result time: unknown</p>
        </div>
      )}
    </div>
  );
}
/**
 * Display an index of all or some subset of the
 * available nodes in the database.
 */
export default function Collection({}) {
  /**
   * Retrieve node data use Web Worker.
   */
  const { collection, message } = useCollection({ left, 
    limit: components.parameters.limit.schema.default,
    offset: components.parameters.offset.schema.default });
  /**
   * Keep reference to the WASM constructor
   */
  const [ wasm, setWasm ] = useState<WasmInteraction>(null);
  /**
   * Load Web Worker on component mount
   */
  useEffect(() => {
    (async () => {
      const { InteractiveDataStream, panic_hook } = await import(
        "@oceanics/app"
      );
      panic_hook();
      setWasm({ InteractiveDataStream });
    })();
  }, []);
  /**
   * Render target
   */
  const canvas = useRef<HTMLCanvasElement | null>(null);
  /**
   * The data stream structure.
   */
  const [interactive, setInteractive] = useState<InteractiveDataStream | null>(
    null
  );
  const [source, setSource] = useState<DataStreams | null>(null);
  /**
   * User controlled playback
   */
  const [play, setPlay] = useState(false);
  /**
   * Time keeping for pausing playback with
   * simulated signals.
   */
  const [clock, setClock] = useState<{
    offset: number;
    start: number | null;
    stop: number | null;
  }>({
    offset: 0,
    start: null,
    stop: null,
  });
    /**
   * Draw as time series. Or, Draw as histogram.
   */
    useEffect(() => {
      if (!interactive || !canvas.current || !play || !clock.start) return;
      const handle = canvas.current;
      handle.addEventListener("mousemove", ({ clientX, clientY }) => {
        const { left, top } = handle.getBoundingClientRect();
        interactive.update_cursor(clientX - left, clientY - top);
      });
      [handle.width, handle.height] = ["width", "height"].map((dim) =>
        Number(getComputedStyle(handle).getPropertyValue(dim).slice(0, -2))
      );
      let requestId: number | null = null;
      (function render() {
        if (!play) return;
        const elapsed = performance.now() - clock.offset - clock.start;
        const phenomenonTime = timeConstant * elapsed;
        const result = Math.sin(phenomenonTime);
        interactive.pushObservation({ phenomenonTime, result }, -1.0, 1.0);
        interactive.draw(handle, draw, false);
        requestId = requestAnimationFrame(render);
      })();
      return () => {
        if (requestId) cancelAnimationFrame(requestId);
      };
    }, [interactive, canvas, play]);
  /**
   * Load Web Worker on component mount
   */
  useEffect(() => {
    if (!wasm) return;
    const { InteractiveDataStream } = wasm;
    const data = new InteractiveDataStream(capacity, bins, source);
    setInteractive(data);
  }, [wasm, source]);
  /**
   * UI Restart Controller
   */
  function onRestart() {
    if (!wasm) return;
    const { InteractiveDataStream } = wasm;
    const data = new InteractiveDataStream(capacity, bins, source);
    setInteractive(data);
    setPlay(true);
    setClock({
      stop: null,
      start: performance.now(),
      offset: 0,
    });
  }
  /**
   * UI Play Controller
   */
  function onPlay() {
    if (play) return;
    setPlay(true);
    setClock((prev) => {
      return {
        ...prev,
        start: prev.start ? prev.start : performance.now(),
        offset: prev.stop ? prev.offset + (performance.now() - prev.stop) : 0,
      };
    });
  }
  /**
   * UI Pause Controller
   */
  function onPause() {
    if (!clock.start || !play) return;
    setPlay(false);
    setClock((prev) => {
      return {
        ...prev,
        stop: performance.now(),
      };
    });
  }
  /**
   * Client Component
   */
  return (
    <div>
      <p>{message}</p>
      <div>
        <canvas className={styles.canvas} ref={canvas} />
      </div>
        <button onClick={onPlay} disabled={play || !source}>
          Play
        </button>
        <button onClick={onPause} disabled={!play}>
          Pause
        </button>
        <button onClick={onRestart} disabled={!clock.start}>
          Restart
        </button>
      {collection.map((dataStream) => {
        const active = dataStream.uuid === source?.uuid;
        return (
          <DataStream
            key={dataStream.uuid}
            dataStream={dataStream}
            setSource={setSource}
            active={active}
          ></DataStream>
        );
      })}
    </div>
  );
}
