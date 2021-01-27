import React from "react";

export default ({features}) => 
    <p>{
        features.length > 1 ? 
        `Shellfish sanitation areas (${features.length})` : 
        `Shellfish sanitation area`
    }</p>