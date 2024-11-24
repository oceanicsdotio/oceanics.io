"use client";
import React, {
  useRef,
  useState,
  type FormEventHandler,
} from "react";
import { v7 as uuid7 } from "uuid";
import { useClient, type FormArgs, ACTIONS, NodeLike, IMutate} from "@catalog/client"

export function Create<T extends NodeLike>({ title, Form }: IMutate<T>) {
  const action = "Create";
  const formRef = useRef<HTMLFormElement | null>(null);
  const { message, worker } = useClient<T>();

  const onSubmit =
    (callback: any): FormEventHandler =>
    (event) => {
      event.preventDefault();
      worker.post({
        type: ACTIONS.createEntity,
        data: {
          query: { left: title },
          body: JSON.stringify(callback()),
        },
      });
      window.scrollTo({ top: 0, behavior: "smooth" });
    };

  const [initial] = useState<{ uuid: string }>({
    uuid: uuid7(),
  });
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
    </>
  );
}