const LOG_LEVEL_GENETIC = 0;

function simplifyStreetLayoutStructure(streets_layout)
{
    let layers = streets_layout.getLayers();
    streets_layout.layers = [];
    for ( var i_layer = 0; i_layer < layers.length; i_layer++ )
    {
        let direction = layers[i_layer]['_direction'];
        let start = layers[i_layer]['_point_start'];
        let end = layers[i_layer]['_point_end'];
        let base = layers[i_layer]['_base'];

        streets_layout.layers.push({
            "direction": direction, "base": base,
            "start": start, "end": end,
            "id": layers[i_layer]._leaflet_id});
    }

    delete streets_layout._map;
    delete streets_layout._mapToAdd;
    delete streets_layout.options;
    delete streets_layout._initHooksCalled;
    delete streets_layout._zoomAnimated;
    delete streets_layout._layers;
    delete streets_layout._leaflet_id;
    return streets_layout;
}

function mutateStreetsLayout(streets_layout, number_changes)
{
    for (var i_change = 0; i_change < number_changes; i_change++)
    {
        let type_of_change = Math.floor(Math.random() * 4);
        let street_index = Math.floor(Math.random() * streets_layout.layers.length);
        // Set direction to 'base'
        if ( type_of_change == 0 )
        {
            if ( LOG_LEVEL_GENETIC >= 2 ) console.log("Set direction of " + street_index + " to base");
            streets_layout.layers[street_index].direction = Direction.BASE;
        }
        // Set direction to 'reverse'
        else if ( type_of_change == 1 )
        {
            if ( LOG_LEVEL_GENETIC >= 2 ) console.log("Set direction of " + street_index + " to reverse");
            streets_layout.layers[street_index].direction = Direction.REVERSE;
        }
        // Set direction to 'double'
        else if ( type_of_change == 2 )
        {
            if ( LOG_LEVEL_GENETIC >= 2 ) console.log("Set direction of " + street_index + " to double");
            streets_layout.layers[street_index].direction = Direction.DOUBLE;
        }
        // Set direction to 'none'
        else if ( type_of_change == 3 )
        {
            if ( LOG_LEVEL_GENETIC >= 2 ) console.log("Set direction of " + street_index + " to none");
            streets_layout.layers[street_index].direction = Direction.NONE;
        }
    }

    return streets_layout;
}

function breedStreetsLayout(street_layout_parent_1, street_layout_parent_2)
{
    let street_layout_child = street_layout_parent_1;

    for ( var i_street = 0; i_street < street_layout_parent_1.layers.length; i_street++ )
    {
        if ( Math.random() > 0.5 )
        {
            street_layout_child.layers[i_street].direction = street_layout_parent_2.layers[i_street].direction;
        }
    }

    return street_layout_child;
}

// The current formula for the fitness is :
//   - Fitness = number of rat runs
//                  + 0.5 * number of changes from initial plan
//                  + 5 * number of streets_layout where traffic is cut
function fitness(streets_layout, transit_streets, transit_exceptions) {
    let pairs = [];
    let number_changes = 0;
    let number_cut_traffic = 0;

    for ( var i_street = 0; i_street < streets_layout.layers.length; i_street++ )
    {
        let direction = streets_layout.layers[i_street].direction;
        let start = streets_layout.layers[i_street].start;
        let end = streets_layout.layers[i_street].end;
        let base = streets_layout.layers[i_street].base;

        if (direction === Direction.BASE) {
            pairs.push([start, end]);
        } else if (direction === Direction.REVERSE) {
            pairs.push([end, start]);
        } else if (direction === Direction.DOUBLE) {
            pairs.push([start, end]);
            pairs.push([end, start]);
        } else if (direction === Direction.NONE) {
            number_cut_traffic++;
        }

        if ( base != direction )
        {
            number_changes++;
        }
    }

    let graph = buildGraphfromPairs(pairs);
    let ratRuns = getRatRuns(graph, transit_streets, transit_exceptions);

    return ratRuns.length + 0.1 * number_changes + 5 * number_cut_traffic;
}

function searchBestFit(streets_layout, transit_streets, transit_exceptions, callbackNewBestFitness) {
    let best_streets_layout = streets_layout;
    let best_fitness = fitness(streets_layout, transit_streets, transit_exceptions);
    console.log("Fitness : " + best_fitness);

    let iteration = 0;
    for ( iteration = 0; iteration < 100 ; iteration++ )
    {
        console.log("Iteration n°" + iteration)
        let new_streets = streets_layout;
        new_streets = mutateStreetsLayout(new_streets, Math.floor(Math.random() * streets_layout.getLayers().length))
        let new_fitness = fitness(new_streets, transit_streets, transit_exceptions);
        if ( new_fitness < best_fitness )
        {
            console.log("Fitness : " + new_fitness);
            best_fitness = new_fitness;
            best_streets_layout = new_streets;

            if ( typeof callbackNewBestFitness == "function" ){
                callbackNewBestFitness(best_streets_layout, best_fitness);
            }
        }
    }

    return best_streets_layout;
}