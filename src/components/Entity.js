import React, { useState, useEffect } from "react";

export default (props) => {

    const [state, setState] = useState({
        ...props,
        type: "generic",
    });

    return <li key={state.key}>{Object.entries(state).map((kv) => kv.join(": ")).join(", ")}</li>;
}