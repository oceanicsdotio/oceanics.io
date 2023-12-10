import React from "react";
import Index from "../src/components/Index/Index";

const IndexPage = () =>
    <Index {...{
        description: "The trust layer for the blue economy",
        title: "Oceanics.io",
        pagingIncrement: 3,
        size: 96,
        view: {
            size: 12
        },
        grid: {
            size: 6
        },
        datum: 0.7,
        runtime: null,
        src: "/nodes.json"
    }}/>;

export default IndexPage;