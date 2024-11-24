"use client";
import React, {
  useRef,
  useEffect,
  useCallback,
  type FormEventHandler,
} from "react";
import style from "@catalog/page.module.css";
import { useSearchParams } from "next/navigation";
import { useRouter } from "next/navigation";
import { type NodeLike, useClient, ACTIONS, TextSelectInput } from "@catalog/client";
/**
 * Display an index of all or some subset of the
 * available nodes in the database.
 */
export function Linked<T extends NodeLike>(schema: {
  properties: Object;
  title: string;
  description: string;
}) {
  const options = Object.keys(schema.properties)
    .filter((key: string) => key.includes("@"))
    .map((key) => key.split("@")[0]);

  const query = useSearchParams();
  const right = query.get("right");
  const left_uuid = query.get("uuid");
  const { push, refresh } = useRouter();
  
  const {message, collection, worker, linked} = useClient<T>();
  useEffect(()=>{
    if (worker.disabled) return;
    worker.post({
      type: ACTIONS.getCollection,
      data: {
        query: {
          left: schema.title,
          limit: 100,
          offset: 0
        },
      },
    });
    if (!right || !left_uuid) return;
    console.log("GET LINKED")
    worker.post({
      type: ACTIONS.getLinked,
      data: {
        query: {
          left: schema.title,
          left_uuid: left_uuid,
          right: right,
          limit: 100,
          offset: 0
        },
      },
    });
  }, [worker.disabled])
  const neighborType = useRef<HTMLSelectElement | null>(null);
  const leftUuid = useRef<HTMLSelectElement | null>(null);
  const onSubmit = useCallback<FormEventHandler<HTMLFormElement>>((event) => {
    event.preventDefault();
    if (!neighborType.current || !leftUuid.current) return;
    const search = new URLSearchParams(query);
    search.set("right", neighborType.current.value);
    search.set("uuid", leftUuid.current.value);
    push(`?${search.toString()}`);
    refresh();
  }, [])
  return (
    <>
      <p>{message}</p>
      <form
        className={style.form}
        onSubmit={onSubmit}
      >
        <TextSelectInput
          name={"uuid"}
          inputRef={leftUuid}
          description={"The root node"}
          options={(collection||(left_uuid?[{uuid:left_uuid}]:[])).map((each)=>each.uuid)}
          defaultValue={left_uuid||undefined}
        />
        <TextSelectInput
          name={"right"}
          inputRef={neighborType}
          description={"The type of neighboring node to connect to"}
          options={options}
          defaultValue={right||options[0]}
        />
        <button className={style.submit}>Refresh</button>
      </form>
      <div>
        {linked.map(({ uuid, ...rest }) => {
          const _right = (right??"").split(/\.?(?=[A-Z])/).join("_").toLowerCase();
          return (
            <p key={uuid}>
              <a href={`/catalog/${_right}/linked?uuid=${uuid}&right=${schema.title}`}>{rest.name ?? uuid}</a>
            </p>
          );
        })}
      </div>
    </>
  );
}
