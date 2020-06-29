import React from "react";
import { graphql } from "gatsby";

import SEO from "../components/seo";
import Layout from "../components/Layout";
import Form from "../components/Form";


const cultureMethods = ["Bottom", "Rope (Horizontal)", "Rope (Vertical)", "Ear hang (Scallop)", "Midwater (Cage/Basket)"];
const cultureSpecies = ["Oysters", "Scallops", "Mussels", "Macroalgae", "Finfish"];
const stages = ['Prospecting', "Applying", "Operating", "Renewing", "Expanding"];
const reason = ["Shellfish sanitation", "Lease hearing", "Lawsuit", "Exploring"];


export default () => {
    
    return (
        <Layout>
            <SEO title={"Onboarding"} />
            <Form 
                id={"onboarding-form"} 
                method={"POST"} 
                data-netlify={"true"}
                fields={[
                    {id: "name", name: "person", placeholder: "Person to contact", required: true},
                    {id: "company", placeholder: "Legal entity", required: true},
                    {id: "lease", placeholder: "Maine lease/license code"},
                    {id: "website", placeholder: "URL for company or lease PDF"},
                    {inputType:"email", id: "e-mail", name: "e-mail", placeholder: "name@example.com", required: true},
                    {id: "location", placeholder: "43.998178, -69.54253"},
                    {id: "species", options: cultureSpecies},
                    {id: "method", options: cultureMethods},
                    {id: "stage",  options: stages},
                    {id: "urgency", options: reason, required: true},
                    {id: "details", placeholder: "Provide as much detail as you can about your desired growing area", long: true, required: true},
                ]}
                actions={[{
                    id: "submit",
                    value: "Submit",
                    onClick: (event) => { }
                }]} />
        </Layout>
    )   
    
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


