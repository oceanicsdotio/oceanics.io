import { useState, useEffect } from "react";

export default (dependencies, callback) => {

    const [ stage, setStage ] = useState(null);

    useEffect(() => {
        if (dependencies.every(x => !!x)) setStage(() => callback);
    }, dependencies);

    return stage
}