import React from "react";
import type {ReactNode} from "react";
import styled from "styled-components";
import { ghost } from "../../palette";

export interface PaneType {
    column: number
    className?: string
    children: ReactNode
}

/**
 * Page component rendered.
 */
const Pane = ({
    className, 
    children
}: PaneType) => {
    return (
        <div className={className}>
            {children}
        </div>
    )
};

/**
* The div component holds one or more Mini-Apps.
*/
const StyledPane = styled(Pane)`
    grid-row: 1;
    grid-column: ${({ column }) => column + 1};
    border: 1px dotted ${ghost};
    overflow-x: hidden;
    overflow-y: hidden;
    height: 100vh;
 `;

export default StyledPane;
