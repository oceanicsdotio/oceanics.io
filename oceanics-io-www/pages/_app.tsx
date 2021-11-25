import type { AppProps } from "next/app"
import Layout from "oceanics-io-ui/build/components/Layout/Layout";

import "mapbox-gl/dist/mapbox-gl.css";
import Head from "next/head";

function MyApp({ Component, pageProps }: AppProps) {
    return (
        <Layout
            description={pageProps.description}
            title={pageProps.title}
            HeadComponent={Head}
        >
            <Component {...pageProps} />
        </Layout>
    )
}

export default MyApp
