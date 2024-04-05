import React from "react";
import Link from "next/link";
import layout from "@app/layout.module.css";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <h2>
        <Link className={layout.link} href={"/catalog/things/"}>
          Things
        </Link>
      </h2>
      {children}
    </div>
  );
}
