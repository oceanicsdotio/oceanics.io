
import React, { useEffect, useState } from "react"
import { graphql } from "gatsby";

import Oceanside from "../components/Oceanside";

export default ({data: {site: {siteMetadata: {title}}}, location}) => {
       
    return (
      <Oceanside />
    )
};

export const pageQuery = graphql`
  query {
    site {
      siteMetadata {
        title
      }
    }
  }
`
