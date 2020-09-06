
import React, { useEffect, useState } from "react"
import { graphql } from "gatsby";
import styled from "styled-components";

import Layout from "../components/Layout";
import SEO from "../components/SEO";
import { StatefulButton }  from "../components/Layout";
import DataStream from "../components/DataStream";
import Particles from "../components/Particles";
import RectilinearGrid from "../components/RectilinearGrid";
import TriangularMesh from "../components/TriangularMesh";
import HexagonalGrid from "../components/HexagonalGrid";
import Lagrangian from "../components/Lagrangian";
import Noise from "../components/Noise";
import Model from "../components/Model";

const StyledError = styled.div`
    color: orange;
    text-align: center;
    border: 1px solid;
    margin: 5px;
`;

const StyledTip = styled.div`
    color: orange;
    text-align: center;
    &:hover {
        animation: scroll 0.1s linear 3;
        @keyframes scroll {
            0% {text-indent: 0%;}
            25% {text-indent: 1%;}
            50% {text-indent: 3%;}
            75% {text-indent: 2%;}
            100% {text-indent: 1%;}
        }
    }
`;


export default ({data: {site: {siteMetadata: {title}}}, location}) => {
    
  
    const [ visibility, setVisibility ] = useState({
        rectilinearGrid: false,
        triangularMesh: false,
        hexGrid: false,
        dataStream: false,
        // particles: true,
        lagrangian: false,
        noise: false,
        // model: true
    });

     
    return (
      <Layout location={location} title={title}>
        <SEO title="Ocean analytics as a service" />
    
        <hr/>
        <div>
            {Object.keys(visibility).map((text, key)=>{
                const displayText = text;
                return <StatefulButton 
                    key={key}
                    onClick={() => setVisibility({...visibility, [text]: !visibility[text]})} 
                    active={visibility[text]} 
                    text={`${displayText} ↻`} 
                    altText={`${displayText} ⤫`}  
                />
            }
            )}
        </div>
        
        {!Object.values(visibility).some(x => x) ? <StyledTip>↑ Select some data sources and sinks to get started.</StyledTip> : null}
        {visibility.lagrangian ? <Lagrangian res={1000} source={"/wind.png"} metadataFile={"/wind.json"}/> : null}
        {visibility.noise ? <Noise/> : null}
        {visibility.dataStream ? <DataStream/> : null}
        {/* {visibility.particles ? <Particles/> : null} */}
        {visibility.rectilinearGrid ? <RectilinearGrid/> :null }
        {visibility.triangularMesh ? <TriangularMesh/> : null }
        {visibility.hexGrid ? <HexagonalGrid/> : null }
        {/* {visibility.model ? <Model /> : null} */}
        
      </Layout>
    )
};


export const pageQuery = graphql`
  query {
    site {
      siteMetadata {
        title
      }
    }
    allMarkdownRemark {
      edges {
        node {
          fields {
            slug
          }
          frontmatter {
            tags
            description
          }
        }
      }
    }
  }
`
