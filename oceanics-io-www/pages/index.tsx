import React from "react";
import type { GetStaticProps } from "next";
import type { ILayout } from "./_app";
import Index from "../src/components/Index/Index";

export const getStaticProps = (async () => {
    return {
        props: {
            meta: {
                title: "Oceanics.io",
                description: "The trust layer for the blue economy."
            }
        }
    }
}) satisfies GetStaticProps<{
    meta: ILayout
}>

const IndexPage = () =>
    <Index {...{
        size: 96,
        view: {
            size: 9
        },
        grid: {
            size: 7
        },
        datum: 0.8,
        runtime: null,
        src: "/nodes.json"
    }}/>;

export default IndexPage;