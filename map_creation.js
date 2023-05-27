function fetchOSMData(bounds) {
    fetch("https://overpass-api.de/api/interpreter?data=[out:json][timeout:25][maxsize:10485760];(way[\"highway\"](" + bounds[0].lat + ", " + bounds[0].lng + ", " + bounds[1].lat + ", " + bounds[1].lng + "););out body;>;out skel qt;")
        .then((response) => response.json())
        .then((json) => processOSMData(json));
}

function processOSMData(osm_map_data_highways) {
    let elements = osm_map_data_highways.elements;
    let ways = elements.filter(element => element.type == "way");
    let nodes = elements.filter(element => element.type == "node");
    let kept_nodes = [];
    // Search for each way
    for ( var i_way = 0 ; i_way < ways.length ; i_way++)
    {
        let other_ways = ways.filter(way => way.id != ways[i_way].id);
        let nodes_other_ways = other_ways.map(way => way.nodes).flat();

        // For each of its nodes
        for ( var i_node = 0; i_node < ways[i_way].nodes.length; i_node++ )
        {
            // If the node can be found in another way, meaning an intersection
            if ( nodes_other_ways.indexOf(ways[i_way].nodes[i_node]) != -1 )
                kept_nodes.push(ways[i_way].nodes[i_node]);
        }
    }

    console.log(kept_nodes);
}

// fetchOSMData([{lat: 48.87270360902764, lng:2.3259687423706055}, {lat:48.88495257890439, lng: 2.355194091796875}]);
fetchOSMData([{lat: 48.88163485778777, lng:2.331321090459823}, {lat:48.88269845742566, lng: 2.3326487839221954}])
