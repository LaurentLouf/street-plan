function getOverpassBounds(bounds) {
    return "(" + bounds[0]['lat'] + "," + bounds[0]['lng'] + "," + bounds[1]['lat'] + "," + bounds[1]['lng'] + ")" ;
}

async function fetchOSMData(bounds) {
    // Possible values seen used : secondary, primary, tertiary, residential, pedestrian, unclassified, living_street, service, footway, cycleway, steps, tertiary_link, elevator, primary_link, construction, path, corridor
    let property_filters = [
        '"highway"="primary"',
        '"highway"="secondary"',
        '"highway"="tertiary"',
        '"highway"="residential"',
        '"highway"="living_street"',
    ];

    let osm_filters = '';
    for (osm_filter of property_filters) {
        osm_filters = osm_filters + "way" + "[" + osm_filter + "]"
        osm_filters = osm_filters + getOverpassBounds(bounds) + ";"
    }

    let response = await fetch("https://overpass-api.de/api/interpreter?data=[out:json][timeout:25][maxsize:10485760];(" + osm_filters + ");out body;>;out skel qt;")
        .then((response) => response.json())
        .then((json) => processOSMData(json));

    return response;
}

function processOSMData(osm_map_data_highways) {
    let elements = osm_map_data_highways.elements;
    let ways = elements.filter(element => element.type == "way" && (typeof element.tags.area == "undefined" || element.tags.area == "no") );
    let nodes = elements.filter(element => element.type == "node");
    let nodes_intersection = [];
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
            {
                let corresponding_node = nodes.find(node => node.id == ways[i_way].nodes[i_node]);
                nodes_intersection.push(corresponding_node);
            } else
            {
                delete ways[i_way].nodes[i_node];
            }
        }
    }

    return nodes_intersection;
}

// fetchOSMData([{lat: 48.87270360902764, lng:2.3259687423706055}, {lat:48.88495257890439, lng: 2.355194091796875}]);
fetchOSMData([{lat: 48.88163485778777, lng:2.331321090459823}, {lat:48.88269845742566, lng: 2.3326487839221954}])
