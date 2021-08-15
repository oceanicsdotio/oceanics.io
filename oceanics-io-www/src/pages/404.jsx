/**
 * React and friends.
 */
import React from "react";
import Layout from "../components/Layout";

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
const PageNotFound = ({}) => {
    return (
        <Layout>
            <p>{CONTENT.message}</p>
            <img src={CONTENT.img}/>
        </Layout>
    )
};

export default PageNotFound;