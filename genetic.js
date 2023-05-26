const LOG_LEVEL_GENETIC = 0;
const POPULATION_SIZE = 5;
const NUMBER_GENERATIONS = 1000;

function simplifyStreetLayoutStructure(streets_layout)
{
    let layers = [];
    for ( var i_layer = 0; i_layer < streets_layout.getLayers().length; i_layer++ )
    {
        let direction = streets_layout.getLayers()[i_layer]['_direction'];
        let start = streets_layout.getLayers()[i_layer]['_point_start'];
        let end = streets_layout.getLayers()[i_layer]['_point_end'];
        let base = streets_layout.getLayers()[i_layer]['_base'];

        layers.push({
            "direction": direction, "base": base,
            "start": start, "end": end,
            "id": streets_layout.getLayers()[i_layer]._leaflet_id});
    }

    return {"layers": layers};
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
function fitness(streets_layout, transit_streets, transit_exceptions, coeffs) {
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

    return ratRuns.length * coeffs.rat_run + number_changes * coeffs.change + number_cut_traffic * coeffs.cut;
}

function searchBestFit(streets_layout, transit_streets, transit_exceptions, coeffs, callbackNewBestFitness) {
    let simplified_layout = simplifyStreetLayoutStructure(streets_layout);
    let best_individual = {"layout": simplified_layout, "fitness": 0};
    best_individual.fitness = fitness(best_individual.layout, transit_streets, transit_exceptions, coeffs);
    console.log("Fitness : " + best_individual.fitness);

    // Iterate
    let population = Array(POPULATION_SIZE).fill({"layout": simplified_layout, "fitness": 0});
    let iteration = 0;
    for ( iteration = 0; iteration < NUMBER_GENERATIONS ; iteration++ )
    {
        // Add new individuals by mutating existing individuals
        let mutated_population = JSON.parse(JSON.stringify(population));
        for ( var i_individual = 0; i_individual < POPULATION_SIZE ; i_individual++)
        {
            mutated_population[i_individual].layout = mutateStreetsLayout(mutated_population[i_individual].layout, Math.floor(Math.random() * population[0].layout.layers.length));
            mutated_population.fitness = 0;
        }
        population = population.concat(mutated_population);


        // Breed all individuals together
        var population_before_breeding = population.length;
        for ( var i_parent_1 = 0; i_parent_1 < population_before_breeding ; i_parent_1++)
        {
            for ( var i_parent_2 = i_parent_1 + 1; i_parent_2 < population_before_breeding; i_parent_2++ )
            {
                population.push({"layout": breedStreetsLayout(JSON.parse(JSON.stringify(population[i_parent_1])).layout, JSON.parse(JSON.stringify(population[i_parent_2])).layout), "fitness": 0});
            }
        }

        // Get fitness for all the population
        for ( var i_individual = 0; i_individual < population.length ; i_individual++)
        {
            if ( population[i_individual].fitness === 0 )
            {
                population[i_individual].fitness = fitness(population[i_individual].layout, transit_streets, transit_exceptions, coeffs);
            }
        }
        population.sort((individual_1, individual_2) => individual_1.fitness > individual_2.fitness);

        // See if the best fitness has improved
        if ( population[0].fitness < best_individual.fitness )
        {
            console.log("Fitness : " + population[0].fitness + " at iteration " + iteration);
            best_individual = population[0];

            if ( typeof callbackNewBestFitness == "function" ){
                callbackNewBestFitness(best_individual.layout, best_individual.fitness);
            }
        }

        // Selection process : just keep the better individuals
        population = population.slice(0, POPULATION_SIZE);
    }

    return best_individual.layout;
}