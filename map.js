// Build list of points
class Point {
    constructor(lat, long, id) {
        this.lat = lat;
        this.long = long;
        this.id = id;
        this.neighbors = {};
    }
}

const Constant = {
    MODAL_FILTER_DASH: '10,10'
}

const Direction = {
    BASE: 1,
    REVERSE: -1,
    DOUBLE: 2,
    NONE: 0
};

const arrowSettings = {
    size: '15px',
    //frequency: '100px',
    fill: true,
    yawn: 30
};

const LOG_LEVEL = 0;
const DEBUG = 1;

let dict = {};
let streets = L.featureGroup();
let streets_rr = L.featureGroup();
let marker_dead_ends = L.featureGroup();
let transitStreet = [];
let transitExceptions = {};

// Create the map
var map = L.map('map', { doubleClickZoom: false }).setView([48.89, 2.345], 15); // disable double-click zoom to avoid confusion when clicking arrows

// Add a tile layer
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: 'Map data © <a href="https://openstreetmap.org">OpenStreetMap</a> contributors'
}).addTo(map);

L.TextIcon = L.Icon.extend({
    options: {
        text: '',
        shadowUrl: null,
        iconSize: new L.Point(30, 30),
        iconAnchor: new L.Point(14, 30),
        className: 'leaflet-text-icon',
        size: '',
        color: 'black'
    },

    createIcon: function () {
        var div = document.createElement('div');
        div.innerHTML = this.options['text'] || '';
        div.style.fontSize = (this.options["size"] == 'big' ? '30px' : '15px');
        div.style.color = this.options["color"];
        this._setIconStyles(div, 'icon');
        return div;
    },

    //you could change this to add a shadow like in the normal marker if you really wanted
    createShadow: function () {
        return null;
    }
});

// Verify there is no duplicate  a->b b->a neighbor relationship
function checkNoSelfReferencingNeighbors(points) {
    let logs = "";
    for (let id in points) {
        let neighbors = points[id].neighbors;
        for (let n in neighbors) {
            if (points[n] && points[n].neighbors && points[n].neighbors[id] && id < n) { // Only display message once
                output = `Error: points ${id} and ${n} are self-referencing each other`
                console.log(output);
                logs += output + "\n";
            }
        }
    }
    return logs;
}

function checkPointErrors(points) {
    let logs = checkNoSelfReferencingNeighbors(points);
    if (logs) {
        alert("Error(s) on importing geojson, see details below. Please cleanup the geojson and reload the file.\n\n" + logs);
        throw("Geojson point configuration error");
    }
}

function parsePoints(points) {
    //console.log("parsing points:", points.length)
    let pointsDictionary = {};
    for (let point of points) {
        let newPoint = new Point(point.geometry.coordinates[1], point.geometry.coordinates[0], point.properties.id);
        function parseNeighbors(list, direction) {
            if (list) {
                neighborsList = Array.from(list.split(","), Number);
                neighborsList.forEach((n, i, a) => newPoint.neighbors[n] = direction);
            }
        }
        parseNeighbors(point.properties.local_street , Direction.BASE);
        parseNeighbors(point.properties.local_street_double_way , Direction.DOUBLE);
        parseNeighbors(point.properties.local_street_modal_filter , Direction.NONE);
        newPoint.transit = point.properties.transit_node && point.properties.transit_node == "1";
        if (point.properties.transit_street) {
            newPoint.neighbors_transit = Array.from(point.properties.transit_street.split(","), Number);
        }
        if (point.properties.transit_exceptions) {
            newPoint.transit_exceptions = Array.from(point.properties.transit_exceptions.split(","), Number);
        }
        pointsDictionary[point.properties.id] = newPoint;
    }
    return pointsDictionary;
}

function addDoubleArrow(polyline, arrowColor) {
    var polyline2 = L.polyline(polyline.getLatLngs(), {color: arrowColor, interactive: false }).arrowheads(arrowSettings);
    polyline2.setLatLngs(polyline2.getLatLngs().reverse());
    polyline2.addTo(map);
    polyline._polyline2 = polyline2;
}

function updateStreets(street_layout) {
    for ( var i_street = 0 ; i_street < street_layout.layers.length; i_street++)
    {
        let leaflet_id = street_layout.layers[i_street].id;
        if ( streets.getLayer(leaflet_id)._direction != street_layout.layers[i_street].direction )
        {
            streets.getLayer(leaflet_id)._direction = street_layout.layers[i_street].direction;
            // console.log("Direction of segment id " + leaflet_id + " changed to " + street_layout.layers[i_street].direction);
        }
    }

    streets.eachLayer(function(polyline){
        var arrowColor;
        if ( polyline._direction != Direction.DOUBLE && (typeof polyline._polyline2) != "undefined" )
        {
            polyline._polyline2.remove();
        }

        if (polyline._direction === Direction.REVERSE) {
            arrowColor = "green";
            if ( typeof polyline._arrowheads == "undefined")
            {
                polyline.arrowheads(arrowSettings);
            }
            polyline.setStyle({color : arrowColor});
            polyline.setLatLngs(polyline.getLatLngs().reverse()); // also applies the style changes to the arrowhead
            polyline.getArrowheads().addTo(map);
        } else if (polyline._direction === Direction.DOUBLE) {
            arrowColor = (polyline._base === Direction.DOUBLE) ? "blue" : "green";
            if ( typeof polyline._arrowheads == "undefined")
            {
                polyline.arrowheads(arrowSettings);
            }
            polyline.setStyle({color : arrowColor});
            polyline.setLatLngs(polyline.getLatLngs().reverse()); // reset
            polyline.getArrowheads().addTo(map);

            // Set double-arrow
            addDoubleArrow(polyline, arrowColor);
        } else if (polyline._direction === Direction.NONE) {
            arrowColor = (polyline._base === Direction.NONE) ? "blue" : "green";
            polyline.setStyle({color : arrowColor, dashArray: Constant.MODAL_FILTER_DASH });

            if ( typeof polyline._arrowheads != "undefined")
            {
                polyline.getArrowheads().remove();
            }
        } else if (polyline._direction === Direction.BASE) {
            arrowColor = (polyline._base === Direction.BASE) ? "blue" : "green";
            if ( typeof polyline._arrowheads == "undefined")
            {
                polyline.arrowheads(arrowSettings);
            }
            polyline.setStyle({color : arrowColor, dashArray: ''});
            polyline.setLatLngs(polyline.getLatLngs()); // Force redraw the polyline to display the arrow heads
            polyline.getArrowheads().addTo(map);
        }
    });
}

function reverseArrow(ev) {
    var polyline = ev.target;

    // Change the color of the polyline
    // BASE > REVERSE > DOUBLE > NONE > BASE > ...
    var arrowColor;
    if (polyline._direction === Direction.BASE) {
        // From BASE to REVERSE
        polyline._direction = Direction.REVERSE;
        arrowColor = "green";
        polyline.setStyle({color : arrowColor});
        polyline.setLatLngs(polyline.getLatLngs().reverse()); // also applies the style changes to the arrowhead

    } else if (polyline._direction === Direction.REVERSE) {
        // From REVERSE to DOUBLE
        polyline._direction = Direction.DOUBLE;
        arrowColor = (polyline._base === Direction.DOUBLE) ? "blue" : "green";
        polyline.setStyle({color : arrowColor});
        polyline.setLatLngs(polyline.getLatLngs().reverse()); // reset

        // Set double-arrow
        addDoubleArrow(polyline, arrowColor);

    } else if (polyline._direction === Direction.DOUBLE) {
        // From DOUBLE to NONE
        polyline._direction = Direction.NONE;
        arrowColor = (polyline._base === Direction.NONE) ? "blue" : "green";
        polyline.getArrowheads().remove();
        polyline.setStyle({color : arrowColor, dashArray: Constant.MODAL_FILTER_DASH });
        polyline._polyline2.remove();

    } else {
        // From NONE to BASE
        polyline._direction = Direction.BASE;
        arrowColor = (polyline._base === Direction.BASE) ? "blue" : "green";
        polyline.getArrowheads().addTo(map);
        polyline.setStyle({color : arrowColor, dashArray: ''});
        polyline.setLatLngs(polyline.getLatLngs());
    }

    refreshLayoutAnalysis();
}

function getTransitSets(transitGraph) {
    let assignedTransit = {};
    let transitStreets = {};
    let transitCounter = 0;

    for (let key in transitGraph) {
        // account for cases where no transit neighbors was defined for a transit node
        if (transitGraph[key] === undefined) {
            transitGraph[key] = [Number(key)];
        }
        for (let n of transitGraph[key]) {
            let transitId;
            if (!assignedTransit[key] && !assignedTransit[n]) {
                transitCounter += 1;
                transitId = transitCounter;
                transitStreets[transitId] = [];
            } else if (assignedTransit[key] && assignedTransit[n]) {
                transitId = assignedTransit[key];
                let transitIdOther = assignedTransit[n];
                if (transitId != transitIdOther) {  // merge two transit sets
                    let transitStreetOther = transitStreets[transitIdOther];
                    let transitStreetOtherNodes = getUniqueElements(transitStreetOther);
                    for (let i of transitStreetOtherNodes) {
                      assignedTransit[i] = transitId;
                    }
                    transitStreets[transitId] = transitStreets[transitId].concat(transitStreetOther);
                    delete transitStreets[transitIdOther]; //remove item from dico
                }
            } else if (assignedTransit[n]) {
                transitId = assignedTransit[n];
            } else if (assignedTransit[key]) {
                transitId = assignedTransit[key];
            }
            assignedTransit[key] = transitId;
            assignedTransit[n] = transitId;
            transitStreets[transitId].push([Number(key), n]);
        }
    }


    // TODO: verify all nodes marked as transit are part of a transit street
    return Object.values(transitStreets);
}

function buildTransitStreets(points) {
    let transitGraph = {};
    for (let p in points) {
        if (points[p].transit) {
            transitGraph[p] = points[p].neighbors_transit;
            if (LOG_LEVEL >= 2) {
                console.log(`Transit node ${p}: ${points[p].neighbors_transit}`)
            }
        }
    }

    return getTransitSets(transitGraph);
}

function buildTransitExceptions(points) {
    let transitExceptions = {};
    for (let p in points) {
        if (points[p].transit_exceptions) {
            transitExceptions[p] = points[p].transit_exceptions;
            if (LOG_LEVEL >= 2) {
                console.log(`Transit exception from ${p}: ${points[p].transit_exceptions}`)
            }
        }
    }

    return transitExceptions;
}

function analyzeLayout(street_layout) {
    let layout = street_layout;
    // Simplify the layout for memory consumption : discard non-needed leaflet parameters of the structure
    if ( typeof layout._leaflet_id != "undefined" )
    {
        layout = simplifyStreetLayoutStructure(street_layout);
    }

    let pairs = [];
    let number_changes = 0;
    let number_cut_traffic = 0;
    let possible_dead_ends = new Set();
    let transit_nodes = transitStreet.flat(2);

    // For every street, build the pairs (start --> end) of possible movements
    // During the process, register the numbers of change made, as well as
    // possible dead ends (note that is only the end of a movement) to minize the
    // number of graph walkthroughs
    for ( var i_street = 0; i_street < layout.layers.length; i_street++ )
    {
        let direction = layout.layers[i_street].direction;
        let start = layout.layers[i_street].start;
        let end = layout.layers[i_street].end;
        let base = layout.layers[i_street].base;

        if (direction === Direction.BASE) {
            pairs.push([start, end]);
            possible_dead_ends.add(end);
        } else if (direction === Direction.REVERSE) {
            pairs.push([end, start]);
            possible_dead_ends.add(start);
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

    // Confirm the possible dead ends, remove the transit nodes, and nodes being the start of a pair
    possible_dead_ends.forEach((dead_end_node) => {
        if ( transit_nodes.indexOf(dead_end_node) != -1 || pairs.find(pair => pair[0] == dead_end_node) != undefined )
            possible_dead_ends.delete(dead_end_node);
    });

    let graph = buildGraphfromPairs(pairs);
    let ratRuns = getRatRuns(graph, transitStreet, transitExceptions);

    return {"graph": graph, "ratRuns": ratRuns, "deadEnds" : possible_dead_ends, "numberChanges": number_changes, "numberCut": number_cut_traffic};
}

function markRatRuns(streets, ratRuns) {
    let ratRunPairs = new Set();
    for (let rr of ratRuns) {
        for (var i = 0; i < rr.length - 1; i++) {
            ratRunPairs.add(JSON.stringify([rr[i], rr[i+1]]));
        }
    }
    streets.eachLayer(function(polyline) {
        let start = polyline['_point_start'];
        let end = polyline['_point_end'];
        polyline._rat_run = ratRunPairs.has(JSON.stringify([start,end])) || ratRunPairs.has(JSON.stringify([end,start]));
    });
}

function refreshLayoutAnalysis(){
    let layoutAnalysis = analyzeLayout(streets);

    if (layoutAnalysis.ratRuns.length > 0 && LOG_LEVEL >= 1) {
        console.log(`Found ${layoutAnalysis.ratRuns.length} rat runs`);
        layoutAnalysis.ratRuns.forEach(r => console.log('- ', r));
    }
    markRatRuns(streets, layoutAnalysis.ratRuns);
    displayRatRuns();
    displayDeadEnds(layoutAnalysis.deadEnds);
}

function displayRatRuns() {
    streets_rr.clearLayers();
    streets.eachLayer(function(layer) {
        if (layer['_rat_run']) {
            streets_rr.addLayer(L.polyline(layer.getLatLngs(), {color: 'red', weight: 10, interactive: false }));
        }
    });
    streets_rr.addTo(map);
    streets_rr.bringToBack();
}

function displayDeadEnds(deadEnds) {
    marker_dead_ends.clearLayers();
    if ( deadEnds.size == 0 )
        return;

    let deadEndsArray = Array.from(deadEnds);
    streets.eachLayer(function(layer) {
        if ( deadEndsArray.indexOf(layer._point_start) != -1 )
        {
            marker_dead_ends.addLayer(
                L.marker(layer._latlngs[0],
                    { icon: new L.TextIcon({text: "⚠", size: "big", color: "red"})}).addTo(map) );
        }
        else if ( deadEndsArray.indexOf(layer._point_end) != -1 )
        {
            marker_dead_ends.addLayer(
                L.marker(layer._latlngs[1],
                    { icon: new L.TextIcon({text: "⚠", size: "big", color: "red"})}).addTo(map) );
        }
    });
}

function displayRatRuns() {
    streets_rr.clearLayers();
    streets.eachLayer(function(layer) {
        if (layer['_rat_run']) {
            streets_rr.addLayer(L.polyline(layer.getLatLngs(), {color: 'red', weight: 10, interactive: false }));
        }
    });
    streets_rr.addTo(map);
    streets_rr.bringToBack();
}

function drawStreets(pointDictionary) {
    // add segments for all local streets
    if (LOG_LEVEL >= 2) {
        console.log("drawing streets...");
        console.log("found dict with nb points:", Object.keys(pointDictionary).length);
    }
    for (let key in pointDictionary) {
        p = pointDictionary[key];
        way_start = L.latLng(p.lat, p.long);

        if ( DEBUG)
            L.marker(way_start, { icon: new L.TextIcon({text: Number(key)})}).addTo(map);

        if (Object.keys(p.neighbors).length > 0) {
            for (let n in p.neighbors) {
                if (n>0) {
                    p_end = pointDictionary[n];
                    way_end = L.latLng(p_end.lat, p_end.long);
                    direction = p.neighbors[n];
                    dashStyle = (direction === Direction.NONE) ? Constant.MODAL_FILTER_DASH : "";

                    var polyline = L.polyline([way_start, way_end], {color: 'blue', dashArray: dashStyle});
                    polyline['_rat_run'] = p.neighbors_rr && p.neighbors_rr.length > 0 && p.neighbors_rr.includes(n);
                    polyline['_direction'] = direction;
                    polyline['_base'] = direction;
                    polyline['_point_start'] = Number(key);
                    polyline['_point_end'] = Number(n);
                    polyline.on('click', reverseArrow);
                    streets.addLayer(polyline);

                    if (direction == Direction.BASE) {
                        polyline.arrowheads(arrowSettings);
                    } else if (direction == Direction.DOUBLE) {
                        polyline.arrowheads(arrowSettings);
                        addDoubleArrow(polyline, "blue");
                    }
                }
            }
        }
    }
    streets.addTo(map);

    refreshLayoutAnalysis();
}

function processGeojson(geojson) {
    // Remove previous lines
    streets.clearLayers();
    streets_rr.clearLayers();

    const geoJSON = JSON.parse(geojson);
    dict = parsePoints(geoJSON.features);
    checkPointErrors(dict);
    transitStreet = buildTransitStreets(dict);
    transitExceptions = buildTransitExceptions(dict);
    drawStreets(dict);
    bounds = L.geoJSON(geoJSON).getBounds();
    map.fitBounds(bounds);
}


function loadHostedGeojson(geojsonFilename) {
    var xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function() {
        if (xhr.readyState === 4 && xhr.status === 200) {
            processGeojson(xhr.responseText);
        }
    };
    xhr.open("GET", geojsonFilename);
    xhr.send();
}


function updateStreetsAndFitness(street_layout, fitness)
{
    document.getElementById("fitness").innerText = fitness;
    updateStreets(street_layout);

}

// Load points in geojson file and markers
const fileInput = document.getElementById('fileInput');
fileInput.addEventListener('change', function() {
    const file = fileInput.files[0];
    const reader = new FileReader();

    reader.addEventListener('load', function() {
        processGeojson(reader.result);
    });

    reader.readAsText(file);
});

const clearButton = document.getElementById("clear-rat-runs");
clearButton.addEventListener("click", function() {
    streets_rr.clearLayers();
});

const displayButton = document.getElementById("display-rat-runs");
displayButton.addEventListener("click", function() {
    refreshLayoutAnalysis();
});

const geneticButton = document.getElementById("genetic");
geneticButton.addEventListener("click", function() {
    let coeffs = {"rat_run": Number(document.getElementById("rat-run-coef").value), "change": Number(document.getElementById("change-coef").value), "cut": Number(document.getElementById("cut-coef").value)};
    best_streets_layout = searchBestFit(streets, coeffs, updateStreetsAndFitness);
    updateStreets(best_streets_layout);
    refreshLayoutAnalysis();
});
