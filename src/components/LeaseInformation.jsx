import React from "react";

export default ({ features }) =>
    <>
        {features.map(({ properties: {species} }, key) => 
            <div key={key}>
                <ul>
                    {species
                        .replace('and', ',')
                        .replace(';', ',')
                        .split(',')
                        .map(each => each.trim())
                        .map(each => <li key={each}>{each}</li>)
                    }
                </ul>
            </div>
        )}
    </>;