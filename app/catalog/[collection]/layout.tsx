import React from "react";
import layout from "@app/layout.module.css";
import Link from "next/link";
export function capitalizeFirstLetter(string: string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}
export function toKey(collection: string) {
  return collection.split("_").map(capitalizeFirstLetter).join("");
}
export default function Layout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: {
    collection: string;
  };
}) {
  const href = `/catalog/${params.collection}`;
  const key = toKey(params.collection);
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
