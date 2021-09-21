/**
 * Stuff for bots and browsers
 */
import React, { Fragment } from 'react';
import Head from "next/head";
import BaseLayout from "oceanics-io-ui/build/components/Layout/Layout";
import PageData from "oceanics-io-ui/build/components/Layout/PageData.json";
import GlobalStyle from "oceanics-io-ui/build/components/Layout/GlobalStyle";

const Layout = ({ children, title, description, site, ...props }) => {
 
  return (
    <Fragment>
      <GlobalStyle />
      <BaseLayout expand={false} {...{ ...PageData, ...props }}>
        <Head>
            <title>{`${title} | ${site.title}`}</title>
            <meta name="description" content={description} />
            <meta property="og:type" content="website" />
            <meta property="og:title" content={title} />
            <meta property="og:description" content={description} />
            <meta property="og:site_name" content={site.title} />
            <meta property="twitter:card" content="summary" />
            <meta property="twitter:title" content={title} />
            <meta property="twitter:description" content={description} />
        </Head>
        {children}
      </BaseLayout>
    </Fragment>
  )
}

export default Layout;