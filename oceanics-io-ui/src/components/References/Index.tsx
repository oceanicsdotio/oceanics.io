/**
 * React and friends.
 */
import React, { FC, useMemo } from "react";

/**
 * Preview of article
 */
import Stub from "./Stub";
import Button from "../Form/Button";
import Select from "../Form/Select";

/**
 * Typing and lookups
 */
import { IndexType, PartialArticle } from "./utils";

/**
 * Base component for web landing page.
 * 
 * Optionally use query parameters and hash anchor to filter content. 
 */
const Index: FC<IndexType> = ({
  className,
  data: {
    allMdx: {
      nodes,
      group
    }
  },
  query,
  onChangeSelect,
  onClickTag,
  onClickMore,
}) => {
  /**
   * The array of visible articles. The initial value is the subset from 0 to
   * the increment constant. 
   */
  const visible: PartialArticle[] = useMemo(
    () => {
      return nodes.filter((node: PartialArticle): boolean => (
        !!node && !node.frontmatter.tags.includes("wip")
      )).slice(0, query.items);
    },
    [query]
  );

  return (
    <div className={className}>
      {visible.map((props: PartialArticle) =>
        <Stub key={props.fields.slug} onClickTag={onClickTag} {...props} />)}
      <Select
        id={"filter-by-tag"}
        options={group.map(({ fieldValue }) => fieldValue)}
        name={"Select tag"}
        onChange={onChangeSelect}
      />
      <Button onClick={onClickMore}>{"More arcana"}</Button>
    </div>
  )
};

/**
 * Default export is the base version
 */
export default Index;