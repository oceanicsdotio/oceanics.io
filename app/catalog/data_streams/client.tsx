"use client";
import { type Initial, ACTIONS, useWorkerFixtures } from "@catalog/client";
import {
  Collection,
  TextInput,
  TextSelectInput,
  FormArgs,
} from "@catalog/[collection]/client";
import { Edit as EditGeneric } from "@catalog/[collection]/edit/client";
import { Create } from "@catalog/[collection]/create/client";
import { Linked as LinkedGeneric } from "@app/catalog/[collection]/[related]/client";
import openapi from "@app/../specification.json";
import style from "@catalog/page.module.css";
import React, { useState, useEffect, useRef, useCallback } from "react";
import type {
  InteractiveDataStream,
  DataStreamStyle,
  DataStreams,
  Observations,
} from "@oceanics/app";
import { useSearchParams } from "next/navigation";
const schema = openapi.components.schemas.DataStreams;
const properties = schema.properties;
const parameters = openapi.components.parameters;
export function Data() {
  return (
    <Collection<DataStreams>
      title={schema.title}
      nav={true}
      AdditionalProperties={AdditionalProperties as any}
    />
  );
}
export function New({}) {
  return <Create<DataStreams> Form={Form} title={schema.title}></Create>;
}
export function Edit({}) {
  return (
    <EditGeneric<DataStreams> Form={Form} title={schema.title}></EditGeneric>
  );
}
export function Linked({collection}: any) {
  return <LinkedGeneric<DataStreams> collection={collection} related={schema} />;
}
/**
 * Display an index of all or some subset of the
 * available nodes in the database.
 */
export function Form({
  action,
  initial,
  onSubmit,
  formRef,
  disabled,
}: FormArgs<DataStreams>) {
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
    <form
      className={style.form}
      onSubmit={onSubmit(onSubmitCallback)}
      ref={formRef}
    >
      <TextInput
        name={"uuid"}
        inputRef={uuid}
        required
        description={properties.uuid.description}
        defaultValue={initial.uuid}
        readOnly={true}
      ></TextInput>
      <TextInput
        name={"name"}
        inputRef={name}
        required
        description={properties.name.description}
        defaultValue={initial.name}
      ></TextInput>
      <TextInput
        name={"description"}
        inputRef={description}
        required
        description={properties.description.description}
        defaultValue={initial.description}
      ></TextInput>
      <TextInput
        name={"unitOfMeasurementName"}
        inputRef={unitOfMeasurementName}
        description={properties.unitOfMeasurement.properties.name.description}
        defaultValue={initial.unitOfMeasurement?.name}
      ></TextInput>
      <TextInput
        name={"unitOfMeasurementSymbol"}
        inputRef={unitOfMeasurementSymbol}
        description={properties.unitOfMeasurement.properties.symbol.description}
        defaultValue={initial.unitOfMeasurement?.symbol}
        readOnly={disabled}
      ></TextInput>
      <TextInput
        name={"unitOfMeasurementDefinition"}
        inputRef={unitOfMeasurementDefinition}
        description={
          properties.unitOfMeasurement.properties.definition.description
        }
        defaultValue={initial.unitOfMeasurement?.definition}
        readOnly={disabled}
      ></TextInput>
      <TextSelectInput
        name={"observationType"}
        description={properties.observationType.description}
        inputRef={observationType}
        defaultValue={"OM_Measurement"}
        options={properties.observationType.enum}
      ></TextSelectInput>
      <button className={style.submit} disabled={disabled}>
        {action}
      </button>
      <button className={style.submit} type="reset" disabled={disabled}>
        Reset
      </button>
    </form>
  );
}
export function AdditionalProperties(rest: Initial<DataStreams>) {
  return (
    <>
      <p>unit of measurement:</p>
      <p style={{ textIndent: "2em" }}>{`name: ${
        rest.unitOfMeasurement?.name ?? "n/a"
      }`}</p>
      <p style={{ textIndent: "2em" }}>{`symbol: ${
        rest.unitOfMeasurement?.symbol ?? "n/a"
      }`}</p>
      <p style={{ textIndent: "2em" }}>{`definition: ${
        rest.unitOfMeasurement?.definition ?? "n/a"
      }`}</p>
      <p>observation type: {rest.observationType ?? "n/a"}</p>
      <p>phenomenon time: unknown</p>
      <p>result time: unknown</p>
    </>
  );
}
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
/**
 * Drawing style type is from WASM, but we have to leave
 * out bound methods.
 */
let draw: Initial<DataStreamStyle> = {
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
 * Display an index of all or some subset of the
 * available nodes in the database. This is used
 * wherever you need to fetch and render all
 * or a subset of `DataStreams`.
 */
export function View({}) {
  /**
   * Retrieve node data using Web Worker. Redirect if there are
   * no nodes of the given type.
   */
  const query = useSearchParams();
  const limit = query.get("limit") ?? `${parameters.limit.schema.default}`;
  const offset = query.get("offset") ?? `${parameters.offset.schema.default}`;
  /**
   * Status message to understand what is going on in the background.
   */
  const [message, setMessage] = useState("↻ Loading");
  /**
   * Node or index data, if any.
   */
  const [collection, setCollection] = useState<DataStreams[]>([]);

  const [page, setPage] = useState<{
    next?: string;
    previous?: string;
    current: number;
  }>({
    current: 1,
  });
  /**
   * Process web worker messages.
   */
  const workerMessageHandler = useCallback(
    ({ data: { data, type } }: MessageEvent) => {
      switch (type) {
        case ACTIONS.getCollection:
          window.scrollTo({ top: 0, behavior: "smooth" });
          setCollection(data.value);
          setPage(data.page);
          return;
        case ACTIONS.getEntity:
          window.scrollTo({ top: 0, behavior: "smooth" });
          setCollection(data.value);
          return;
        case ACTIONS.error:
          console.error("@worker", type, data);
          return;
        case ACTIONS.status:
          setMessage(data.message);
          return;
        default:
          console.warn("@client", type, data);
          return;
      }
    },
    []
  );
  /**
   * Ref to Web Worker.
   */
  const worker = useWorkerFixtures();
  /**
   * Load Web Worker on component mount
   */
  useEffect(() => {
    if (worker.ref.current) return;
    worker.ref.current = new Worker(
      new URL("@catalog/[collection]/worker.ts", import.meta.url),
      {
        type: "module",
      }
    );
    worker.ref.current.addEventListener("message", workerMessageHandler, {
      passive: true,
    });
    worker.post({
      type: ACTIONS.getCollection,
      data: {
        query: {
          left: schema.title,
          limit: parseInt(limit),
          offset: parseInt(offset),
        },
      },
    });
    const handle = worker.ref.current;
    return () => {
      handle.removeEventListener("message", workerMessageHandler);
    };
  }, [workerMessageHandler]);
  /**
   * Keep reference to the WASM constructor
   */
  const [wasm, setWasm] = useState<{
    InteractiveDataStream: typeof InteractiveDataStream;
  } | null>(null);
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
  /**
   * Current data source. Only supports streaming one
   * at a time for now.
   */
  const [source, setSource] = useState<Initial<DataStreams> | null>(null);
  /**
   * User controlled playback.
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
      let obs: Initial<Observations> = { phenomenonTime, result, uuid: "" };
      interactive.pushObservation(obs, -1.0, 1.0);
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
    if (!wasm || !source) return;
    const { InteractiveDataStream } = wasm;
    const data = new InteractiveDataStream(capacity, bins, source);
    setInteractive(data);
  }, [wasm, source]);
  useEffect(() => {
    if (!collection.length) return;
    console.log(collection);
    setSource(collection[0] as any);
  }, [collection]);
  /**
   * UI Restart Controller
   */
  function onRestart() {
    if (!wasm || !source) return;
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
        <button onClick={onPlay} disabled={play || !source}>
          Play
        </button>
        <button onClick={onPause} disabled={!play}>
          Pause
        </button>
        <button onClick={onRestart} disabled={!clock.start}>
          Restart
        </button>
      </div>
      <div>
        <canvas className={style.canvas} ref={canvas} />
      </div>
    </div>
  );
}
