import React from "react";
import ReactDOM from "react-dom";
import styled from "styled-components";


const PopUpContent = styled.div`
    background: #101010AA;
    font-family:inherit;
    font-size: inherit;
    height: 100%;
    width: 100%;
    margin: 0;
    padding: 0;
`;


const StyledListItem = styled.li`
    color: #CCCCCCFF;
    margin: 0;
    padding: 0;
`;

const StyledOrderedList = styled.ol``;


export default ({ features }) => {
    return (
        <PopUpContent>
            {features.map(({ species, coordinates: [lon, lat] }, key) => {
                return (<>
                    <p>{`@ lat: ${lat.toFixed(4)}, lon: ${lon.toFixed(4)}`}</p>
                    <StyledOrderedList>
                        {species.map(each => <StyledListItem>{each}</StyledListItem>)}
                    </StyledOrderedList>
                </>)
            })}
        </PopUpContent>
    )
} 