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
import type { Document, QueryType, IStyled } from "./types";

/**
 * Main page inputs
 */
 export interface DocumentIndexType extends IStyled {
    documents: Document[];
    query: QueryType;
    onShowMore: MouseEventHandler<HTMLButtonElement>;
    onClearConstraints: MouseEventHandler<HTMLButtonElement>;
    pagingIncrement: number;
    navigate: (...args: any[]) => void;
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
  onClearConstraints,
  pagingIncrement,
  navigate,
}) => {
  /**
   * The array of visible articles. The initial value is the subset from 0 to
   * the increment constant. 
   * 
   * Filters based on selected tag from user interface, removes, work in progress (wip)
   * and internal labels. 
   */
  const visible: Document[] = useMemo(
    () => {
      const compare = (first: Document, second: Document) => {
        return second.metadata.published.getTime() - first.metadata.published.getTime()
      };

      const labelOrPublic = ({metadata}: Document): boolean => {
        const match = metadata.labels.map(({value})=>value);
        const selectedTag = query.label??"";
        return !match.includes("wip") && !match.includes("internal") && (!selectedTag || match.includes(selectedTag))
      }

      return documents.sort(compare).filter(labelOrPublic).slice(0, query.items??pagingIncrement);
    },
    [query]
  );

  return (
    <div className={className}>
      {visible.map((document) =>
        <Stub key={document.metadata.title} document={document}/>)}
      <Button onClick={onShowMore}>{"More arcana"}</Button>
      <Button onClick={onClearConstraints}>{"Clear selection"}</Button>
    </div>
  )
};

/**
 * Default export is the base version
 */
export default Index;