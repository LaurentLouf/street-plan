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
    let ways_split_at_intersections = [] ;

    // For each way
    for ( var i_way = 0 ; i_way < ways.length ; i_way++)
    {
        let other_ways = ways.filter(way => way.id != ways[i_way].id);
        let nodes_other_ways = other_ways.map(way => way.nodes).flat();
        let i_node_start = 0;

        // Associate with the nodes their coordinates
        ways[i_way].nodes = ways[i_way].nodes.map(node_way => {
            return nodes.filter(node => {
                return node.id == node_way;
            })[0];
        });

        if ( ways[i_way].tags.highway == "primary" || ways[i_way].tags.highway == "secondary" )
        {
            ways[i_way].tags["transit"] = true;
        }
        else {
            ways[i_way].tags["transit"] = false;
        }

        // For each of its nodes
        for ( var i_node = 0; i_node < ways[i_way].nodes.length; i_node++ )
        {
            // If the node can be found in another way, meaning an intersection
            if ( nodes_other_ways.indexOf(ways[i_way].nodes[i_node].id) != -1 )
            {
                // Split the way
                let i_new_way = ways_split_at_intersections.push(JSON.parse(JSON.stringify(ways[i_way]))) - 1;
                ways_split_at_intersections[i_new_way].nodes =
                    ways[i_way].nodes.slice(i_node_start, i_node + 1);
                    // Slice 2nd parameter is an index that is not included in the sliced array, so take the next index here

                i_node_start = i_node;
            }
        }

        let i_new_way = ways_split_at_intersections.push(ways[i_way]) - 1;
        ways_split_at_intersections[i_new_way].nodes = ways[i_way].nodes.slice(i_node_start,  ways[i_way].nodes.length - 1);
    }

    ways_split_at_intersections = ways_split_at_intersections.filter(way => way.nodes.length != 0);
    return ways_split_at_intersections;
}
