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
  onDelete,
  left_uuid,
  controls
}: {
  name?: string
  children?: ReactNode
  onDelete: (uuid: string) => void
  left_uuid: string
  controls?: ReactNode
}) {
  const url = `edit/?uuid=${left_uuid}`;
  const [showDetails, setShowDetails] = useState(false);
  function onDetails() {
    setShowDetails((prev) => !prev);
  }
  return (
    <div>
      <hr />
      <h3>
        <Link className={styles.link} href={url} prefetch={false}>
          {name ?? left_uuid}
        </Link>
      </h3>
      {showDetails && children}
      <div>
        <button onClick={onDetails}>Details</button>
        <button onClick={onDelete.bind(undefined, left_uuid)}>Delete</button>
        {controls}
      </div>
    </div>
  );
}
