import type { AppProps } from "next/app"
import Head from "next/head";

import React from "react";
import GlobalStyle from "../src/components/GlobalStyle";

export interface ILayout {
    title: string,
    description: string,
}

/**
 * The NavBar is a <nav> element that displays links or buttons
 * as a horizontal bar with the current choice styled
 * prominently.
 */
function MyApp({ Component, pageProps: { meta, ...props } }: AppProps) {
    return (
        <>
            <GlobalStyle />
            <Head>
                <title>{meta?.title} | {meta?.description}</title>
                <meta name="description" content={meta?.description} />
            </Head>
            <nav>
                <a href={"/"}>{meta?.title}</a>  
            </nav>
            <main>
                <Component {...props} />
            </main>
            
            <footer>
                <hr/>
                We love you! Regardless of identity, ability, or belief. That being said, when you arrive we track your user agent, actions, and location. These data are never transmitted, but may be stored on your device. We manage risk with encryption and best security practices.
            </footer>
        </>
    )
}

export default MyApp
