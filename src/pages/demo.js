// import React from "react"
// import { Link, graphql } from "gatsby"

// import Layout from "../src/components/layout"
// import SEO from "../src/components/seo"
// import { rhythm } from "../src/utils/typography"

// import init, {panic_hook} from "../demo/space";
// import {DataStreamLoop} from "../demo/stream.js";
// import {RenderingContext} from '../demo/cadet.js';


// const DefaultProps = {
//     eid: "data-stream",
//     context: "2d",
//     caption: "DataStream",
//     font: "12px Arial"
// };


// export default class extends React.Component {

// render(props) {
//     const { data } = this.props;
//     const siteTitle = data.site.siteMetadata.title;
//     const {eid, autoplay} = props;
//         let paused = (autoplay === undefined) || (!autoplay);

//     return (
//       <Layout location={this.props.location} title={siteTitle}>
//         <SEO title={"Situational awareness for a changing ocean"} />
//         <div className={"container"} onClick={async (event) => {
//             if (!paused) {
//                 await init();
//                 panic_hook();
//                 RenderingContext(DataStreamLoop, props);
//             }
//             paused = !paused;
//         }}>
//             <canvas id={eid} width={200} height={200} ></canvas>
//         </div>
//       </Layout>
//     )
//   }
// }

// export const pageQuery = graphql`
//   query {
//     site {
//       siteMetadata {
//         title
//       }
//     }
//   }
// `


    