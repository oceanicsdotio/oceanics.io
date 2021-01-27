import React from "react";

export default ({ features }) => 
    <>
        {features.map(({ properties, coordinates: [lon, lat] }, key) =>
            <div key={key}>
                <p>{`@ lat: ${lat.toFixed(4)}, lon: ${lon.toFixed(4)}`}</p>
                <ul>
                    {Object.entries(properties).map(([jj, item]) => <li key={jj}>{`${jj}: ${item}`}</li>)}
                </ul>
            </div>
        )}
    </>;
