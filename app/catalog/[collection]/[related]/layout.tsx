import React from "react";
import layout from "@app/layout.module.css";
import Link from "next/link";
import {toKey} from "../layout";
/**
 * Append a link to the layout, uses the getStaticPaths to determine the href
 */
export default function Layout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: any;
}) {
  const href = `/catalog/${params.collection}/${params.related}`;
  const key = toKey(params.related);
  return (
    <>
      {"/"}
      <Link className={layout.link} href={href} prefetch={false}>
        {key}
      </Link>
      {children}
    </>
  );
}
