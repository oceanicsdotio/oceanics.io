import React from "react";
import Layout from "../components/Layout";
import SEO from "../components/SEO";

export default ({
    location
}) => 
    <Layout location={location} title={"Policy"}>
        <SEO title={"Policy"} />
        <h2>Data we collect</h2>

        <p>
        Our website is <a>https://www.oceanics.io</a>. When you visit our site, your IP address and browser user agent string may be collected. We may retain all requests made to our APIs and subdomains.
        </p>
        <p>
        When you visit subdomains of our site interactive, we will attempt to load executable code in the from of data vizualization web components. These may track your mouse and keystrokes to provide interface options.
        </p>
        <p>
        If you access location-based services you will be asked if you want to share your location. None of these data are transmitted, and are used only while the browser remains open.
        </p>
        <p>
        If you have an account and log in, we grant you a temporary token to access our services. This contains no personal data and is valid for a fixed amount of time. It may be stored in your browser. 
        </p>

        <h2>Uses of your data</h2>

        <p>
        We do not share your data, nor use it for automated decision-making and/or profiling. We do generate anonymous metrics to guide research activity.
        </p>
        <p>
        Derived products may include training materials, open source code and software, trained models, simulation results, and primary sensor observations.
        </p>
        <p>
        Depending on uses of infrastructure by industry partners, proprietary or business data may be exposed to risk. If improperly configured, the network could provide ingress for
        attacks into enterprise networks, or result in the loss of data.
        </p>

        <h2>Your data rights</h2>
        <p>
        All users can see, edit, or delete personal information at any time.
        
        If you have an account on this site you can request data we hold about you, including data you have provided to us. 
        
        You can also request we erase personal data we hold about you.
        </p>

        <h2>How we protect your data</h2>

        <p>
        We manage risk by implementing good security practices, and backing up critical assets and repositories. Raw data from sensors, satellites and models are backed-up in a redundant data lake.

        We take precautions in preserving privacy and confidentiality through controlled access, and strong authorization methods.
        </p>

        <p>
        Routes of network ingress and egress are monitored and logged.
        Nodes communicate over an encrypted virtual private network.
        Partner organizations and individuals have access to managed services through a limited interface, which does not directly access databases and servers.
        </p>

        <p>
        Physical security is maintained by placing devices in locked enclosures or spaces where appropriate.
        
        Networked systems are tracked in real-time and self-report anomalies in position and conditions.
        </p>

        <h2>Code of Conduct</h2>
        <p>
        We value full expression of identity, and diversity in ideas, skills, and contributions regardless of
        technical or domain knowledge. Members and participants are encouraged to invite questions,
        listen as much as they speak, and adopt a “yes/and” over a “no/but” mentality.
        </p>

        <p>
        We provide an environment free from discrimination or harassment.
        We’ll engage an external mediator if there is disagreement in what constitutes harassment.
        If you or someone else are harassed in-person or online, contact a project member,
        and we will take action to resolve the situation safely. If you cannot reach a mediator,
        you should remove yourself from the situation or notify an appropriate emergency response agency.
        </p>

        <h2>Accessibility</h2>
        <p>
        It is our explicit goal to make data and tools more Accessible.
        This is not an end state, but an intentional development process.
        That takes work and cooperation, so we welcome all feedback from users.
        </p>
        <p>
        Web services conform to or derive from Open Geospatial Consortium (OGC) and OSGeo standards.
        </p>
        <p>
        Environmental data are available in industry- and web-standard formats including NetCDF, WaterML,
        GeoJSON, PNG and GeoTIFF.
        </p>
        <p>
        Analyses and products follow a standardized but flexible structure for doing and sharing data science work.
        </p>
        <p>
        We use modern practices and tools for collaborative development.
        </p>
        <p>
        Raw data from sensors, satellites and models are backed-up in a redundant data lake.
        </p>
        <p>
        Derived data are staged in databases for ready use in web services.
        </p>
        <p>
        Data are published along with documentation of the methodology,
        and trained models made available through algorithm marketplaces.
        </p>
        <p>
        Proprietary and provisional data are not be accessible to other users, and are not be archived beyond the term of the project.
        </p>
        <p>
        Aggregated data products based on proprietary data are made public.
        There is no “exclusive or validation” period for data—publishing is an ongoing and active process central to the project.
        </p>
        <p>
        All documentation is publicly available without requiring a sign up.
        </p>
        <p>
        Information is conveyed in both visual and written forms.
        </p>
    </Layout>


// export const pageQuery = graphql`
// query {
//     site {
//         siteMetadata {
//             title
//         }
//     }
//     allFile(
//         limit: 1,
//         filter: { 
//             sourceInstanceName: { eq: "data" }
//             name: { eq: "policy" }
//             extension: { eq: "yml" }
//         }
//     ) {
//         edges {
//           node {
           
//             dir
//             modifiedTime
//           }
//         }
//     }
// }
// `