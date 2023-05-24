

function otherDirectionExists(pairs, pair) {
    var i_pair;
    for ( i_pair = 0; i_pair < pairs.length; i_pair++)
    {
        if ( pairs[i_pair][0] == pair[1] && pairs[i_pair][1] == pair[0] )
            return true;
    }

    return false;
}

function randomizeStreets(streets, number_changes)
{
    for (var i_change = 0; i_change < number_changes; i_change++)
    {
        let type_of_change = Math.floor(Math.random() * 4);
        let streetIndex = Math.floor(Math.random() * streets.getLayers().length);
        let street = streets.getLayers()[streetIndex];
        // Set direction to 'base'
        if ( type_of_change == 0 )
        {
            street._direction = 'base';
        }
        // Set direction to 'reverse'
        else if ( type_of_change == 1 )
        {
            street._direction = 'reverse';
        }
        // Set direction to 'double'
        else if ( type_of_change == 2 )
        {
            street._direction = 'double';
        }
        // Set direction to 'none'
        else if ( type_of_change == 3 )
        {
            street._direction = 'none';
        }
    }

    return streets;
}

// The current formula for the fitness is :
//   - Fitness = number of rat runs
function fitness(streets, transitStreet, transitExceptions) {
    let pairs = [];
    streets.eachLayer(function(polyline){
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
    let ratRuns = getRatRuns(graph, transitStreet, transitExceptions);

    return ratRuns.length;
}

function searchBestFit(streets, transitStreet, transitExceptions) {
    let bestStreets = streets;
    let bestFitness = fitness(streets, transitStreet, transitExceptions);
    console.log("Fitness : " + bestFitness);

    let iteration = 0;
    for ( iteration = 0; iteration < 100 ; iteration++ )
    {
        console.log("Iteration n°" + iteration)
        let new_streets = streets;
        new_streets = randomizeStreets(new_streets, Math.floor(Math.random() * streets.getLayers().length))
        let new_fitness = fitness(new_streets, transitStreet, transitExceptions);
        if ( new_fitness < bestFitness )
        {
            console.log("Fitness : " + new_fitness);
            bestFitness = new_fitness;
            bestStreets = new_streets;
        }
    }

    return bestStreets;
}