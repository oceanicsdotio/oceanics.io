import React, {Fragment} from "react";
import styled from "styled-components";
import PropTypes from "prop-types";
import {grey, ghost} from "../palette";


/**
 * Location Components provide metadata about a location, as well
 * as topological information about other data entities associated
 * with the location. 
 */
export const Location = ({
    className,
    icon=null,
    properties: {
        name=null,
        nav_unit_n=null,
        ...properties
    },
    coordinates: [lon, lat]
}) => {


    return <div className={className}>
        <label>{`${lat.toFixed(4)}, ${lon.toFixed(4)}`}</label>
        <h3>
            {name || nav_unit_n || properties.port_name}
            <img src={icon?icon.data:null}/>
        </h3>
        <ul>
            {Object.entries(properties)
                .filter(([_, v]) => v !== " " && !!v)
                .map(([jj, item]) => <li key={jj}>{`${jj}: ${item}`}</li>)
            }
        </ul>
    </div>};


Location.propTypes = {
    /**
     Display name of the task.
     */
    name: PropTypes.string,
    className: PropTypes.string,
    icon: PropTypes.object
};

/**
 * The StyledLocation component is just a styled version of Location
 * that includes hover effects. 
 */
const StyledLocation = styled(Location)`
    display: block;
    margin: 0;
    height: auto;
    position: relative;
    background: none;
    box-sizing: border-box;

    border-bottom: 0.05rem solid ${ghost};
    padding: 0.5rem;
    color: ${ghost};

    & > h3 {
        & > img {
            image-rendering: crisp-edges;
            display: inline;
            height: 1.5em;
            margin-left: 1em;
        }
    }
`;

export default StyledLocation;

export const Locations = ({ features }) => 
    <>
        {features.map((feature, key) =>
            <Fragment key={key}>
                <StyledLocation {...feature}/>
            </Fragment>
        )}
    </>;