import React, {useEffect, useState} from "react";

export default () => {

    const nullState = {};
    const [ summary, setSummary ] = useState(nullState);
    const [ fileSystem, setFileSystem ] = useState("");

    useEffect(() => {
        
        (async () => {
            fetch(
                "https://oceanicsdotio.nyc3.digitaloceanspaces.com/",
                {
                    method: 'GET',
                    mode: 'cors',
                    cache: 'no-cache',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                }
            )
                .then(response => response.text())
                .then(text => {
                    console.log(text);
                    setFileSystem(text);
                })
                .catch(err => console.log(err))
        })()
    }, []);

    return (
        <div>
            <h2>Object storage interface</h2>
            <p>
                Some statistics go here: {fileSystem}
            </p>
        </div>
    );
};