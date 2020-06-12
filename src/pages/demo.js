import React from "react"
import { graphql } from "gatsby"

import SEO from "../components/seo"
import Map from "../components/map"

// import init, {panic_hook} from "../utils/space.js";
// import {DataStreamLoop} from "../utils/stream.js";
// import {Particles, CursorLoop} from "../utils/agent.js";
// import {RenderingContext, LagrangianParticles} from '../utils/cadet.js';
// import {TriangularMeshLoop, RectilinearGridLoop, PixelData, HexagonalGrid} from "../utils/tessellate.js";


export default class extends React.Component {

    render(props) {
        const { data } = this.props;
        const siteTitle = data.site.siteMetadata.title;
       
        return (
            <>
                <SEO title={"Demo"} />
                <Map />
            </>
        )   
    }
}

export const pageQuery = graphql`
  query {
    site {
      siteMetadata {
        title
      }
    }
  }
`


