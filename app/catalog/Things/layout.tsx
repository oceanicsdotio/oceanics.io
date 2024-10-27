import React from "react";
import Link from "next/link";
import layout from "@app/layout.module.css";
import Markdown from "react-markdown";
import openapi from "@app/../specification.json";
const schema = openapi.components.schemas.Things;

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {"/"}
      <Link
        className={layout.link}
        style={{ display: "inline-block" }}
        href={"/catalog/things/"}
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
