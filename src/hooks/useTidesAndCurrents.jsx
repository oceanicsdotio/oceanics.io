

/**
 * 
 */
useEffect(() => {
    if (!map) return;   
    setAnimatedIcons({
        pulsingDot: pulsingDot(map),
        waterLevel: waterLevel(map)
    });
}, [map])


/* 
 * Fetch tide data from NOAA. 
 * Render a tide gauge animated icon at each position. 
 */
useEffect(() => {
    
    if (!map || !animatedIcons) return;
    const id = "tidal-stations";
    const extent = [-71.190, 40.975, -63.598, 46.525];

    map.addImage(id, animatedIcons.waterLevel, { pixelRatio: 4 });

    (async () => {
        const queue = await fetch("https://api.tidesandcurrents.noaa.gov/mdapi/prod/webapi/stations.json?type=waterlevels")
            .then(r => r.json())
            .then(({stations}) => {
                return stations.filter(({lat, lng}) => {
                    return lng >= extent[0] && lng <= extent[2] && lat >= extent[1] && lat <= extent[3];
                }).map(({id})=>{
                    return fetch(`https://api.tidesandcurrents.noaa.gov/api/prod/datagetter?date=latest&station=${id}&product=water_level&datum=mllw&units=metric&time_zone=lst_ldt&application=oceanics.io&format=json`).then(r => r.json())
                    }
                );
            });
        
        map.addLayer({
            id,
            type: 'symbol',
            source: parseFeatureData({
                features: await Promise.all(queue), 
                standard: "noaa"
            }),
            layout: {
                'icon-image': id
            }
        });     
   })();
}, [map, animatedIcons]);