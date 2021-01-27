import React from "react";

/**
 * Parse limited purpose aquaculture license data into
 * a data centric view
 */
export default ({ features }) =>
    <>
        {features.map(({ properties: {species}, coordinates: [lon, lat] }, key) => 
            <div key={key}>
                <p>{`@ lat: ${lat.toFixed(4)}, lon: ${lon.toFixed(4)}`}</p>
                <ul>
                    {species
                        .replace('and', ',')
                        .replace(';', ',')
                        .split(',')
                        .map(each => each.trim())
                        .map(each => <li key={each}>{each}</li>)}
                </ul>
            </div>
        )}
    </>;