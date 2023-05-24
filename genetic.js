const LOG_LEVEL_GENETIC = 0;

function mutateStreetsLayout(streets_layout, number_changes)
{
    for (var i_change = 0; i_change < number_changes; i_change++)
    {
        let type_of_change = Math.floor(Math.random() * 4);
        let street_index = Math.floor(Math.random() * streets_layout.getLayers().length);
        let street = streets_layout.getLayers()[street_index];
        // Set direction to 'base'
        if ( type_of_change == 0 )
        {
            if ( LOG_LEVEL_GENETIC >= 2 ) console.log("Set direction of " + street._leaflet_id + " to base");
            street._direction = 'base';
        }
        // Set direction to 'reverse'
        else if ( type_of_change == 1 )
        {
            if ( LOG_LEVEL_GENETIC >= 2 ) console.log("Set direction of " + street._leaflet_id + " to reverse");
            street._direction = 'reverse';
        }
        // Set direction to 'double'
        else if ( type_of_change == 2 )
        {
            if ( LOG_LEVEL_GENETIC >= 2 ) console.log("Set direction of " + street._leaflet_id + " to double");
            street._direction = 'double';
        }
        // Set direction to 'none'
        else if ( type_of_change == 3 )
        {
            if ( LOG_LEVEL_GENETIC >= 2 ) console.log("Set direction of " + street._leaflet_id + " to none");
            street._direction = 'none';
        }
    }

    return streets_layout;
}

// The current formula for the fitness is :
//   - Fitness = number of rat runs
function fitness(streets_layout, transit_streets, transit_exceptions) {
    let pairs = [];
    streets_layout.eachLayer(function(polyline){
        let direction = polyline['_direction'];
        let start = polyline['_point_start'];
        let end = polyline['_point_end'];

        if (direction === Direction.BASE) {
            pairs.push([start, end]);
        } else if (direction === Direction.REVERSE) {
            pairs.push([end, start]);
        } else if (direction === Direction.DOUBLE) {
            pairs.push([start, end]);
            pairs.push([end, start]);
        }
    });

    let graph = buildGraphfromPairs(pairs);
    let ratRuns = getRatRuns(graph, transit_streets, transit_exceptions);

    return ratRuns.length;
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