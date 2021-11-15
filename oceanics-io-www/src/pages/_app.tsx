// import App from "next/app";
import type { AppProps /*, AppContext */ } from 'next/app'
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

// Only uncomment this method if you have blocking data requirements for
// every single page in your application. This disables the ability to
// perform automatic static optimization, causing every page in your app to
// be server-side rendered.
//
// MyApp.getInitialProps = async (appContext: AppContext) => {
//   // calls page's `getInitialProps` and fills `appProps.pageProps`
//   const appProps = await App.getInitialProps(appContext);

//   return { ...appProps }
// }

export default MyApp
