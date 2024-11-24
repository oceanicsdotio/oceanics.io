"use client";
import React, {
  useRef,
  useEffect,
  useState,
  type FormEventHandler,
} from "react";
import style from "@catalog/page.module.css";
import { useSearchParams } from "next/navigation";
import { type FormArgs, useClient, ACTIONS, type NodeLike, IMutate} from "@catalog/client"

export function Edit<T extends NodeLike>({Form, title}: IMutate<T>) {
  const action = "Update"
  const query = useSearchParams();
  const uuid = query.get("uuid") ?? "";
  /**
   * Form handle, used to reset inputs on successful submission,
   * as reported through the worker message.
   */
  const formRef = useRef<HTMLFormElement | null>(null);
  const { message, worker, collection } = useClient<T>();
  /**
   * Delete a resource
   */
  const onDelete = () => {
    const confirmation = window.confirm(
      "Are you sure you want to delete this node and its relationships?"
    );
    if (!confirmation) return;
    worker.post({
      type: ACTIONS.deleteEntity,
      data: {
        query: {
          left: title,
          left_uuid: uuid,
        },
      },
    });
  };

  const onSubmit =
    (callback: any): FormEventHandler =>
    (event) => {
      event.preventDefault();
      const { uuid, ...data } = callback();
      worker.post({
        type: ACTIONS.updateEntity,
        data: {
          query: { left: title, left_uuid: uuid },
          body: JSON.stringify(data),
        },
      });
      window.scrollTo({ top: 0, behavior: "smooth" });
    };

  const [initial, setInitial] = useState<T>({ uuid } as any);
  useEffect(() => {
    if (!worker.disabled) {
      worker.post({
        type: ACTIONS.getEntity,
        data: {
          query: {
            left: title,
            left_uuid: uuid,
          },
        },
      });
    }
  }, [worker.disabled]);
  useEffect(() => {
    if (!collection.length) return;
    const [node] = collection;
    setInitial(node);
  }, [collection]);
  return (
    <>
      <p>{message}</p>
      <Form 
        action={action}
        formRef={formRef}
        initial={initial as T}
        disabled={worker.disabled}
        onSubmit={onSubmit}
      />
      <button className={style.submit} onClick={onDelete}>
        Delete
      </button>
    </>
  );
}
