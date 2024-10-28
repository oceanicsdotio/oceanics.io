"use client";
import React, {
  useEffect,
  useState,
  useRef,
  type MutableRefObject,
} from "react";
import openapi from "@app/../specification.json";
import type { Things, InteractiveMesh } from "@oceanics/app";
import { NamedNode, TextInput, useCollection } from "@catalog/client";
import style from "@catalog/page.module.css";
interface IThings extends Omit<Things, "free"> {}
/**
 * Metadata from the OpenAPI specification
 */
const schema = openapi.components.schemas.Things;
const properties = schema.properties;
const parameters = openapi.components.parameters;

export function ThingsQuery({
  limit,
  offset,
  action,
  initial,
}: {
  limit: number;
  offset: number;
  action: string;
  initial: IThings;
}) {
  const { message, create, disabled, onSubmitCreate } = useCollection({
    left: schema.title,
    limit,
    offset,
  });
  return (
    <>
      <p>{message}</p>
      <ThingsForm
        action={action}
        create={create}
        disabled={disabled}
        onSubmit={onSubmitCreate}
        initial={initial}
      />
    </>
  );
}
/**
 * Display an index of all or some subset of the
 * available nodes in the database. Shared between
 * `/create` and `/edit` interfaces.
 */
export function ThingsForm({
  action,
  initial,
  onSubmit,
  create,
  disabled,
}: {
  action: string;
  initial: IThings;
  onSubmit: any;
  create: any;
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
      name: name.current?.value,
      description: _description.current?.value,
      properties: _properties.current?.value,
    };
  };
  /**
   * Client Component
   */
  return (
    <form
      className={style.form}
      onSubmit={onSubmit(onSubmitCallback)}
      ref={create}
    >
      <TextInput
        name={"uuid"}
        required
        inputRef={uuid}
        description={properties.uuid.description}
        defaultValue={initial.uuid}
      ></TextInput>
      <TextInput
        name={"name"}
        required
        inputRef={name}
        description={properties.name.description}
        defaultValue={initial.name}
      ></TextInput>
      <TextInput
        name={"description"}
        required
        inputRef={_description}
        description={properties.description.description}
        defaultValue={initial.description}
      ></TextInput>
      <TextInput
        name={"properties"}
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
 * Display an index of all or some subset of the
 * available nodes in the database.
 *
 * Use WebGL to calculate particle trajectories from velocity data.
 * This example uses wind data to move particles around the globe.
 * The velocity field is static, but in the future the component
 * will support pulling frames from video or gif formats.
 *
 * Paints a color-map to a hidden canvas and then samples it as
 * a lookup table for speed calculations. This is one way to
 * implement fast lookups of piece-wise functions.
 */
export default function () {
  /**
   * Preview 2D render target.
   */
  const previewRef: MutableRefObject<HTMLCanvasElement | null> = useRef(null);
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
   * Retrieve node data using Web Worker.
   */
  const { collection, message } = useCollection({
    left: schema.title,
    limit: parameters.limit.schema.default,
    offset: parameters.offset.schema.default,
  });
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
  /**
   * Once we have the interactive instance,
   * start trying to render a scene based on
   * the data.
   */
  useEffect(() => {
    console.info("Status", { interactive });
  }, [interactive]);
  /**
   * Client Component.
   */
  return (
    <>
      <p>{message}</p>
      <div>
        <canvas className={style.canvas} ref={previewRef} />
      </div>
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
