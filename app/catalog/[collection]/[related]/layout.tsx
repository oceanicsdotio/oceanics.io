import React from "react";
import layout from "@app/layout.module.css";
import Link from "next/link";
import {toKey} from "../layout";
interface LayoutProps {
  children: React.ReactNode;
  params: {
    collection: string;
    related: string;
  };
}
/**
 * Append a link to the layout, uses the getStaticPaths to determine the href
 */
export default function Layout({
  children,
  params,
}: LayoutProps) {
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
