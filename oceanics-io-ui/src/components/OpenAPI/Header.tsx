/**
 * React and friends
 */
import React from "react";

/**
 * Type definitions for the metadata header
 */
type HeaderType = {
    info: {
        title: string,
        version: string,
        description: string[],
    }
}

/**
 * Metadata component about the API itself.
 */
export const Header = ({
    info: {
        title,
        version,
        description
    }
}: HeaderType) =>
    <div>
        <h1>{`${title}, v${version}`}</h1>
        {description.map((text: string, ii: number) => <p key={`title-text-${ii}`}>{text}</p>)}
    </div>

/**
 * Export default is base version
 */
export default Header