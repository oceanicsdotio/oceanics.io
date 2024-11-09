import React from "react";
import layout from "@app/layout.module.css";
import Link from "next/link";

export function CollectionLayout({
  title,
  children
}: {
  children: React.ReactNode
  title: string
}) {
  const pathName = title.split(/\.?(?=[A-Z])/)
    .join("_")
    .toLowerCase();
  return (
    <>
      {"/"}
      <Link
        className={layout.link}
        href={`/catalog/${pathName}`}
        prefetch={false}
      >
        {title}
      </Link>
      <div className={layout.content}>{children}</div>
    </>
  );
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className={layout.content}>
      <Link className={layout.link} href={"/"} prefetch={false}>
        Home
      </Link>
      {"/"}
      <Link className={layout.link} href="/catalog" prefetch={false}>
        Catalog
      </Link>
      {children}
    </div>
  );
}
