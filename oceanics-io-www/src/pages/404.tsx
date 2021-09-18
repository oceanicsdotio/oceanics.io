/**
 * React and friends.
 */
import React from "react";

/**
 * Page content, could be externalized in `data/`.
 */
const CONTENT = {
  title: "404",
  message: "You can't get there from here.",
  img: "/dagan-sprite.gif"
};

/**
 * Just a dumb functional component.
 */
const PageNotFound = () => {
  return (
    <>
      <p>{CONTENT.message}</p>
      <img src={CONTENT.img} alt={"Sea creature seeking answers"} />
    </>
  )
};

export default PageNotFound;