import React from "react";
import Link from "next/link";
import layout from "@app/layout.module.css";
import specification from "@app/../specification.json";
import Markdown from "react-markdown";
const { description } = specification.components.schemas.DataStreams;
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {"/"}
      <Link
        className={layout.link}
        href={"/catalog/data_streams/"}
        prefetch={false}
      >
        DataStreams
      </Link>
      <Markdown>{description}</Markdown>
      <div className={layout.content}>{children}</div>
    </>
  );
}
