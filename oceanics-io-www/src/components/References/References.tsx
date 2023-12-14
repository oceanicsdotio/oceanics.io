import React, { useMemo } from "react";
import type { MouseEventHandler } from "react";
import styled from "styled-components";
import type { Memo, QueryType } from "oceanics-io-www-wasm";
import { orange, ghost } from "../../palette";

/**
 * Main page inputs
 */
export interface IReferences {
  /**
   * CSS target for styled components
   */
  className?: string;
  /**
   * Articles to cross-reference and render
   */
  documents: Memo[];
  /**
   * Page query string parameters
   */
  query: QueryType;
  /**
   * Show more handler passed in from parent
   */
  onShowMore: MouseEventHandler<HTMLButtonElement>;
  /**
   * Clear page query string parameters
   */
  onClearConstraints: MouseEventHandler<HTMLButtonElement>;
  /**
   * Wrapper around page query string update
   */
  onClickLabel: (label: string) => MouseEventHandler<HTMLAnchorElement>;
  /**
   * How many articles per page
   */
  pagingIncrement: number;
}

/**
 * Base component for web landing page.
 *
 * Optionally use query parameters and hash anchor to filter content.
 */
const References = ({
  className,
  documents,
  query,
  onShowMore,
  onClearConstraints,
  onClickLabel,
  pagingIncrement
}: IReferences) => {
  /**
   * The array of visible articles sorted in reverse chronological order.
   * The initial value is the subset from 0 to the increment constant.
   *
   * Filters based on selected tag from user interface, removes work in progress ("wip")
   * and "internal" labels.
   */
  const available: Memo[] = useMemo(() => {
    const compare = (first: Memo, second: Memo) => {
      return (
        second.metadata.published.getTime() - first.metadata.published.getTime()
      );
    };

    const labelOrPublic = ({ metadata }: Memo): boolean => {
      const matchTag: string[] = metadata.labels.map(({ value }: any) => value);
      const matchRef: string[] = metadata.references?.map((ref: any) => ref.hash)??[];
      const selectedTag: string = query.label ?? "";
      const selectedRef: string = query.reference?.toString() ?? "";
      return (
        !matchTag.includes("wip") &&
        !matchTag.includes("internal") &&
        (!selectedTag || matchTag.includes(selectedTag)) &&
        (!selectedRef || matchRef.includes(selectedRef))
      );
    };
    return documents.sort(compare).filter(labelOrPublic);
  }, [query]);

  /**
   * We need to know the total number visible, and the total number possible,
   * in other words after the filter but before the slice.
   */
  const visible: Memo[] = useMemo(() => {
    return available.slice(0, query.items ?? pagingIncrement);
  }, [available, query, pagingIncrement]);

  /**
   * Remove button from DOM when we have no more results. To do this
   * we need to know the total number visible, and the total number possible,
   * in other words after the filter but before the slice.
   */
  const showMore = useMemo(() => {
    return {
      style: {
        display: visible.length === available.length ? "none" : undefined,
      },
      text: "More arcana",
    };
  }, [visible, available]);

  return (
    <div className={className}>
      {visible.map(({slug, metadata}) => (
        <article className={className}>
        <header>
          <a href={slug}>{metadata.title}</a>
          <p>{metadata.published.toISOString().replace(/T/, " ").replace(/Z/, "")}</p>
        </header>
        <section>{metadata.description}</section>
        <p>{metadata.labels.map(({value}: any) => 
          <a key={`${metadata.title} ${value}`} onClick={onClickLabel(value)}>{value}</a>)
        }</p>
      </article>
      ))}
      <button onClick={onShowMore} style={showMore.style}>
        {showMore.text}
      </button>
      <button onClick={onClearConstraints}>{"Clear selection"}</button>
    </div>
  );
};

export const StyledReferences = styled(References)`
  a {
    color: ${ghost};
    cursor: pointer;
  }
  a + a::before {
    content: " / ";
  }
  header {
    a {
      box-shadow: none;
      color: ${orange};
      border: none;
      font-size: inherit;
      text-decoration: underline;
      margin: 0;
      padding: 0;
      font-size: x-large;
    }
    span {
      display: block;
      color: ${ghost};
    }
  } 
`;

References.displayName = "References";
StyledReferences.displayName = "References";
export default StyledReferences;