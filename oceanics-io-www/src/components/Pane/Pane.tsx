import React from "react";
import type {ReactNode} from "react";
import styled from "styled-components";
import { ghost } from "../../palette";

export interface PaneType {
    /**
     * Placement in horizontal grid
     */
    column: number
    /**
     * Styled components identifier
     */
    className?: string
    /**
     * Passthrough
     */
    children: ReactNode
}

/**
 * Page component rendered.
 */
export const Pane = ({
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
export const StyledPane = styled(Pane)`
    grid-row: 1;
    grid-column: ${({ column }) => column + 1};
    border: 1px dotted ${ghost};
    overflow-x: hidden;
    overflow-y: hidden;
    height: 100vh;
 `;

export default StyledPane;
