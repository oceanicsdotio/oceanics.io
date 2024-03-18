import React from "react";
import styles from "@app/layout.module.css";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.content}>
      {children}
    </div>
  );
}
