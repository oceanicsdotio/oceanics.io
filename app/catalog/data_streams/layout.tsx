import React from "react";
import Link from "next/link";
import layout from "@app/layout.module.css";
import specification from "@app/../specification.json";
import Markdown from "react-markdown";
const schema = specification.components.schemas.DataStreams;
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {"/"}
      <Link
        className={layout.link}
        href={"/catalog/data_streams"}
        prefetch={false}
      >
        {schema.title}
      </Link>
      <Markdown>{schema.description}</Markdown>
      <div className={layout.content}>{children}</div>
    </>
  );
}
