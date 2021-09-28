/**
 * React and friends.
 */
import React, {FC} from "react";
import {GetStaticProps} from "next";

/**
 * Just a dumb functional component.
 */
const PageNotFound: FC<{}> = () => {
  return (
    <>  
      <p>{"You can't get there from here."}</p>
      <img src={"/dagan-sprite.gif"} alt={"Sea creature seeking answers"} width={"100%"}/>
    </>
  )
};

PageNotFound.displayName = "404"
export default PageNotFound;

export const getStaticProps: GetStaticProps = async (doc) => Object({
    props: { 
        description: "404",
        title: "Oceanics.io"
     }
})