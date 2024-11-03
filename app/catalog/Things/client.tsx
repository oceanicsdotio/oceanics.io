"use client";
import React, {
  useEffect,
  useState,
  useRef,
  type MutableRefObject,
} from "react";
import OpenAPI from "@app/../specification.json";
import type { Things, InteractiveMesh } from "@oceanics/app";
import { NamedNode, TextInput, useCollection } from "@catalog/client";
import style from "@catalog/page.module.css";
export interface IThings extends Omit<Things, "free"> {}
/**
 * Metadata from the OpenAPI specification
 */
const schema = OpenAPI.components.schemas.Things;
const properties = schema.properties;
const parameters = OpenAPI.components.parameters;
/**
 * Display an index of all or some subset of the
 * available nodes in the database. Shared between
 * `/create` and `/edit` interfaces.
 */
export function ThingsForm({
  action,
  initial,
  onSubmit,
  formRef,
  disabled,
}: {
  action: string;
  initial: IThings;
  onSubmit: any;
  formRef: any;
  disabled: boolean;
}) {
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
/**
 * Visualization interface wrapper as custom hook
 */
export function useWebAssembly() {
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
    interactive
  }
}
/**
 * Display an index of all or some subset of the
 * available nodes in the database.
 */
export default function () {
    /**
   * Retrieve node data using Web Worker.
   */
    const { message, disabled, collection, onGetCollection } = useCollection({
      left: schema.title,
      limit: parameters.limit.schema.default,
      offset: parameters.offset.schema.default,
    });
    useEffect(()=>{
      if (disabled) return
      onGetCollection()
    },[disabled])
  /**
   * Client Component.
   */
  return (
    <>
      <p>{message}</p>
      {collection.map(({ uuid, ...thing }: IThings) => {
        return (
          <NamedNode key={uuid} name={thing.name} uuid={uuid}>
            <p>description: {thing.description ?? "n/a"}</p>
            <p>properties: {thing.properties ?? "n/a"}</p>
          </NamedNode>
        );
      })}
    </>
  );
}
