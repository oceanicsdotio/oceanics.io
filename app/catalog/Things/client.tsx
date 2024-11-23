"use client";
import React, {
  useEffect,
  useState,
  useRef,
  type MutableRefObject,
} from "react";
import type { InteractiveMesh, MeshStyle } from "@oceanics/app";
import OpenAPI from "@app/../specification.json";
import type { Things } from "@oceanics/app";
import {
  TextInput,
  type Initial,
  type FormArgs,
  Collection,
  Create,
  Edit as EditGeneric,
  Linked as LinkedGeneric,
} from "@catalog/client";
import style from "@catalog/page.module.css";
/**
 * Metadata from the OpenAPI specification
 */
const schema = OpenAPI.components.schemas.Things;
const properties = schema.properties;
export function Data({}) {
  return (
    <Collection<Things>
      title={schema.title}
      nav={"view"}
      AdditionalProperties={AdditionalProperties as any}
    />
  );
}
export function New({}) {
  return <Create<Things> Form={Form} title={schema.title}></Create>;
}
export function Edit({}) {
  return <EditGeneric<Things> Form={Form} title={schema.title}></EditGeneric>;
}
export function Linked({}) {
  return <LinkedGeneric<Things> {...schema} />;
}
/**
 * Display an index of all or some subset of the
 * available nodes in the database. Shared between
 * `/create` and `/edit` interfaces.
 */
export function Form({
  action,
  initial,
  onSubmit,
  formRef,
  disabled,
}: FormArgs<Things>) {
  /**
   * User must input uuid, it will not be generated within
   * the system. Currently duplicate UUID silently fails.
   */
  const uuid = useRef<HTMLInputElement | null>(null);
  /**
   * Non-unique display name for humans. Can be unique
   * and contain information if you so choose, but it
   * doesn't matter to the database.
   */
  const name = useRef<HTMLInputElement | null>(null);
  /**
   * Freeform text description input reference.
   */
  const _description = useRef<HTMLInputElement | null>(null);
  /**
   * JSON format input.
   */
  const _properties = useRef<HTMLInputElement | null>(null);
  /**
   * On submission, we delegate the request to our background
   * worker, which will report on success/failure.
   */
  const onSubmitCallback = () => {
    return {
      uuid: uuid.current?.value,
      name: name.current?.value || undefined,
      description: _description.current?.value || undefined,
      properties: _properties.current?.value || undefined,
    };
  };
  return (
    <form
      className={style.form}
      onSubmit={onSubmit(onSubmitCallback)}
      ref={formRef}
    >
      <TextInput
        name={"uuid"}
        readOnly
        required={!properties.uuid.type.includes("null")}
        inputRef={uuid}
        description={properties.uuid.description}
        defaultValue={initial.uuid}
      ></TextInput>
      <TextInput
        name={"name"}
        required={!properties.name.type.includes("null")}
        inputRef={name}
        description={properties.name.description}
        defaultValue={initial.name}
      ></TextInput>
      <TextInput
        name={"description"}
        required={!properties.description.type.includes("null")}
        inputRef={_description}
        description={properties.description.description}
        defaultValue={initial.description}
      ></TextInput>
      <TextInput
        name={"properties"}
        required={!properties.properties.type.includes("null")}
        inputRef={_properties}
        description={properties.properties.description}
        defaultValue={initial.properties}
      ></TextInput>
      <button className={style.submit} disabled={disabled}>
        {action}
      </button>
      <button className={style.submit} type="reset">
        Reset
      </button>
    </form>
  );
}
export function AdditionalProperties(thing: Initial<Things>) {
  return (
    <>
      <p>description: {thing.description ?? "n/a"}</p>
      <p>properties: {thing.properties ?? "n/a"}</p>
    </>
  );
}
/**
 * Visualization interface wrapper as custom hook
 */
function useWebAssembly() {
  /**
   * Preview 2D render target.
   */
  const ref: MutableRefObject<HTMLCanvasElement | null> = useRef(null);
  /**
   * Keep reference to the WASM constructor
   */
  const [wasm, setWasm] = useState<{
    InteractiveMesh: typeof InteractiveMesh;
  } | null>(null);
  /**
   * Runtime will be passed back to calling Hook or Component.
   * The WASM runtime contains all of the draw functions that
   * target the GL context.
   */
  const [interactive, setInteractive] = useState<InteractiveMesh | null>(null);
  /**
   * Load WASM runtime and save just the method handles
   * we need locally. Not sure if this saves us anything,
   * but seems like a clean idea.
   */
  useEffect(() => {
    (async () => {
      const wasm = await import("@oceanics/app");
      const { panic_hook, InteractiveMesh } = wasm;
      panic_hook();
      setWasm({ InteractiveMesh });
    })();
  }, []);
  /**
   * Once we have the WASM instance, create and
   * save the control and data structure.
   */
  useEffect(() => {
    if (!wasm) return;
    const { InteractiveMesh } = wasm;
    const data = new InteractiveMesh(10, 10);
    setInteractive(data);
  }, [wasm]);
  return {
    ref,
    interactive,
  };
}
/**
 * Interactive visualization viewport
 */
export function View() {
  const { ref, interactive } = useWebAssembly();
  const meshStyle: Initial<MeshStyle> = {
    backgroundColor: "#11002299",
    overlayColor: "lightblue",
    lineWidth: 0.5,
    fontSize: 24,
    tickSize: 10,
    fade: 0.6,
    labelPadding: 10,
    radius: 5,
  };
  useEffect(() => {
    if (!interactive || !ref.current) return;
    const handle = ref.current;
    [handle.width, handle.height] = ["width", "height"].map((dim) =>
      Number(getComputedStyle(handle).getPropertyValue(dim).slice(0, -2))
    );
    let requestId: number | null = null;
    (function render() {
      const elapsed = performance.now();
      interactive.draw(handle, elapsed, meshStyle);
      interactive.rotate(0.01, 0.5, 0.5, 0.5);
      requestId = requestAnimationFrame(render);
    })();
    return () => {
      if (requestId) cancelAnimationFrame(requestId);
    };
  }, [interactive]);
  return <canvas className={style.canvas} ref={ref}></canvas>;
}
