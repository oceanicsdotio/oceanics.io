import type { AppProps } from "next/app"
import Head from "next/head";

import React from "react";
import GlobalStyle from "../src/components/Layout/GlobalStyle";

export interface ILayout {
    className?: string,
    title: string,
    HeadComponent: Element,
    description: string,
    children: JSX.Element,
}

/**
 * The NavBar is a <nav> element that displays links or buttons
 * as a horizontal bar with the current choice styled
 * prominently.
 * 
 * Internal links emphasized.
 */
function MyApp({ Component, pageProps }: AppProps) {
    return (
        <>
        <GlobalStyle />
        <Head>
            <title>{`${"Oceanics.io"} | ${pageProps.title}`}</title>
            <meta name="description" content={pageProps.description} />
         </Head>
        <nav>
            <a href={"/"}>{pageProps.title}</a>  
        </nav>
        <main>
            <Component {...pageProps} />
        </main>
        <footer>
            We love you! Regardless of identity, ability, or belief. That being said, when you arrive we track your user agent, actions, and location. These data are never transmitted, but may be stored on your device. We manage risk with encryption and best security practices.
        </footer>
    </>
    )
}

export default MyApp
