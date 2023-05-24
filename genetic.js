

function otherDirectionExists(pairs, pair) {
    var i_pair;
    for ( i_pair = 0; i_pair < pairs.length; i_pair++)
    {
        if ( pairs[i_pair][0] == pair[1] && pairs[i_pair][1] == pair[0] )
            return true;
    }

    return false;
}

function randomizePairs(pairs, number_changes)
{
    for (var i_change = 0; i_change < number_changes; i_change++)
    {
        let type_of_change = Math.floor(Math.random() * 3);
        let number_pairs = pairs.length;
        // Delete a direction
        if ( type_of_change == 0 )
        {
            let index = Math.floor(Math.random() * number_pairs);
            pairs.splice(index, 1);
            // console.log("Deleted pair at index " + index);
        }
        // Invert a direction
        else if ( type_of_change == 1 )
        {
            // Don't invert a direction whose contrary already exists
            let index = 0;
            let attempts = 0;
            do {
                index = Math.floor(Math.random() * number_pairs);
                attempts++;
            } while (otherDirectionExists(pairs, pairs[index]) == true && attempts < 100) ;

            if ( attempts < 100 )
            {
                let first_element = pairs[index][0];
                pairs[index][0] = pairs[index][1];
                pairs[index][1] = first_element;
                // console.log("Inverted pair at index " + index);
            }
        }
        // Add a direction
        else if ( type_of_change == 2 )
        {
            // Don't add a direction whose contrary already exists
            let index = 0;
            let attempts = 0;
            do {
                index = Math.floor(Math.random() * number_pairs);
                attempts++;
            } while (otherDirectionExists(pairs, pairs[index]) == true && attempts < 100) ;

            if ( attempts < 100 )
            {
                pairs.push([pairs[index][1], pairs[index][0]]);
            }
        }
    }

    return pairs;
}

function fitness(pairs, transitStreet, transitExceptions) {
    let graph = buildGraphfromPairs(pairs);
    let ratRuns = getRatRuns(graph, transitStreet, transitExceptions);

    return ratRuns.length;
}

function searchBestFit(pairs, transitStreet, transitExceptions) {
    let bestPairs = pairs;
    let bestFitness = fitness(pairs, transitStreet, transitExceptions);
    console.log("Fitness : " + bestFitness);

    let iteration = 0;
    for ( iteration = 0; iteration < 100 ; iteration++ )
    {
        console.log("Iteration n°" + iteration)
        let new_pairs = pairs;
        new_pairs = randomizePairs(new_pairs, Math.floor(Math.random() * pairs.length))
        let new_fitness = fitness(new_pairs, transitStreet, transitExceptions);
        if ( new_fitness < bestFitness )
        {
            console.log("Fitness : " + new_fitness);
            bestFitness = new_fitness;
            bestPairs = new_pairs;
        }
    }

    return bestPairs;
}