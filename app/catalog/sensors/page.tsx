"use client";
import Link from "next/link";
import React from "react";
import useCollection from "@catalog/useCollection";
import specification from "@app/../specification.json";
import type { Sensors } from "@oceanics/app";
import Markdown from "react-markdown";
import layout from "@app/layout.module.css";
import { NamedNode } from "../Node";
interface ISensors extends Omit<Sensors, "free"> {
  onDelete: (uuid: string) => void;
}
const components = specification.components;
const { title: left, description } = components.schemas.Sensors;
/**
 * Display an index of all or some subset of the
 * available nodes in the database.
 */
export default function Page({}) {
  /**
   * Retrieve node data use Web Worker.
   */
  const { collection, message } = useCollection({
    left,
    limit: components.parameters.limit.schema.default,
    offset: components.parameters.offset.schema.default,
  });
  /**
   * Client Component
   */
  return (
    <div>
      <Markdown>{description}</Markdown>
      <p>
        You can{" "}
        <Link href="create/" className={layout.link}>
          create
        </Link>{" "}
        <code>{left}</code>.
      </p>
      <p>{message}</p>
      {collection.map((sensor: ISensors) => {
        return (
          <NamedNode key={sensor.uuid} name={sensor.name} uuid={sensor.uuid}>
            <p>description: {sensor.description}</p>
          </NamedNode>
        );
      })}
    </div>
  );
}
