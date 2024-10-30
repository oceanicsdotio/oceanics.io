import React from "react";
import Link from "next/link";
import layout from "@app/layout.module.css";
import Markdown from "react-markdown";
import openapi from "@app/../specification.json";
const schema = openapi.components.schemas.Things;
/**
 * Layer the navigation links in nested layouts.
 */
export default function({ children }: { children: React.ReactNode }) {
  return (
    <>
      {"/"}
      <Link
        className={layout.link}
        style={{ display: "inline-block" }}
        href={`/catalog/${schema.title.toLowerCase()}/`}
      >
        {schema.title}
      </Link>
      <div className={layout.content}>
        <Markdown>{schema.description}</Markdown>
        {children}
      </div>
    </>
  );
}
