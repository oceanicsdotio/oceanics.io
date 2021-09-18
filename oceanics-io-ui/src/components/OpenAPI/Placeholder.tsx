 /**
  * Component level styles
  */
 import styled from "styled-components";
 
 /**
  * Color palette
  */
 import {grey} from "../../palette";
 
 /**
  * Divvy up blank space
  */
 export const Placeholder = styled.div`
     border-top: 0.1rem dashed ${grey};
     border-bottom: 0.1rem dashed ${grey};
     font-size: x-large;
     padding: 2rem;
 `;

 export default Placeholder