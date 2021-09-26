/**
 * React and friends.
 */
import React, { FC, useMemo, MouseEventHandler } from "react";

/**
 * Preview of article
 */
import Stub from "./Stub";
import Button from "../Form/Button";

/**
 * Typing and lookups
 */
import type { DocumentType, QueryType, IStyled } from "./types";

/**
 * Main page inputs
 */
 export interface DocumentIndexType extends IStyled {
    documents: DocumentType[];
    query: QueryType;
    onShowMore: MouseEventHandler<HTMLButtonElement>;
    onClearConstraints: MouseEventHandler<HTMLButtonElement>;
};

/**
 * Base component for web landing page.
 * 
 * Optionally use query parameters and hash anchor to filter content. 
 */
const Index: FC<DocumentIndexType> = ({
  className,
  documents,
  query,
  onShowMore,
  onClearConstraints
}) => {
  /**
   * The array of visible articles. The initial value is the subset from 0 to
   * the increment constant. 
   */
  const visible: DocumentType[] = useMemo(
    () => {
      const selectedTag = query.label??"";
      return documents.filter(({metadata}: DocumentType): boolean => {
          const match = metadata.labels.map(({value})=>value);
          return !match.includes("wip") && (!selectedTag || match.includes(selectedTag))
      }).slice(0, query.items);
    },
    [query]
  );

  return (
    <div className={className}>
      {visible.map((props) =>
        <Stub key={props.metadata.title} {...props} />)}
      <Button onClick={onShowMore}>{"More arcana"}</Button>
      <Button onClick={onClearConstraints}>{"Clear selection"}</Button>
    </div>
  )
};

/**
 * Default export is the base version
 */
export default Index;