import Link from "next/link";
import React, { type ReactNode, useState } from "react";
import styles from "@app/layout.module.css";
/**
 * Display an index of all or some subset of the
 * available nodes in the database.
 */
export function NamedNode({
  name,
  children,
  uuid,
  controls
}: {
  name?: string
  children?: ReactNode
  uuid: string
  controls?: ReactNode
}) {
  const url = `edit/?uuid=${uuid}`;
  const [showDetails, setShowDetails] = useState(false);
  function onDetails() {
    setShowDetails((prev) => !prev);
  }
  return (
    <div>
      <Link href={url} prefetch={false}>
        {name ?? uuid}
      </Link>
      <div>
        <button className={styles.button} onClick={onDetails}>Show Details</button>
        {controls}
      </div>
      {showDetails && children}
    </div>
  );
}
