import React from "react";
import layout from "@app/layout.module.css";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className={layout.content}>
      {children}
    </div>
  );
}
