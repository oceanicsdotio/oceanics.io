/**
 * React and friends.
 */
import React, { FC } from "react";

/**
 * Component-level styling.
 */
import styled from "styled-components";
import { columnSize } from "../utils";


type PaneType = {
    row: number;
    column: number;
    expand: boolean;
    mobile: boolean;
    className: string;
}

/**
 * Page component rendered by GatsbyJS.
 */
const Pane: FC<PaneType> = ({
    className, children
}) => {
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
    display: ${({ expand, mobile, column }) => !columnSize({ expand, mobile, column }) ? "none" : undefined};
    grid-row: ${({ row }) => row + 1};
    grid-column: ${({ column }) => column + 1};
    overflow-x: hidden;
    overflow-y: ${({ column }) => column !== 1 ? undefined : "hidden"};
    min-height: 100vh;
    bottom: 0;
 `;

export default StyledPane;
