// Utility functions
function displayText(sentence) {
    let p = document.createElement("p");
    p.innerHTML = sentence;
    let div = document.getElementById("rat-run-output");
    div.appendChild(p);
}

function printOutput(text) {
    displayText(text);
    console.log(text);
}

function getUniqueElements(pairs) {
    let uniqueElements = new Set();
    for (let pair of pairs) {
        uniqueElements.add(pair[0]);
        uniqueElements.add(pair[1]);
    }
    return uniqueElements;
}

function buildGraphfromPairs(pairs) {
    let graph = {};
    let nodes = getUniqueElements(pairs);
    for (let node of nodes) {
        graph[node] = new Set();
    }
    for (let pair of pairs) {
        let n0 = pair[0];
        let n1 = pair[1];
        graph[n0].add(n1);
    }
    return graph;
}

function depthFirstSearch(graph, start, labels, path = [], visited = new Set()) {
    visited.add(start);
    path = path.concat(start);
    if (labels.indexOf(start) != -1) {
        return [path];
    }
    let paths = [];
    if (graph[start]) {
        for (let node of graph[start]) {
            if (!visited.has(node)) {
                let newPaths = depthFirstSearch(graph, node, labels, path, new Set(visited));
                paths = paths.concat(newPaths);
            }
        }
    }
    return paths;
}

function getRatRuns(graph, transitStreet, transitExceptions) {
    let ratRuns = [];
    for (let way_id in transitStreet) {
        let startNodes = transitStreet[way_id];
        for (let start of startNodes) {
            let destinationNodes =
                Object.entries(transitStreet)
                .filter(entry => entry[0] != way_id)
                .map(entry => Array.from(entry[1])).flat(5)  ;
            if (transitExceptions && transitExceptions[start]) {
                destinationNodes = new Set([...destinationNodes].filter(x => !transitExceptions[start].includes(x)));
            }
            ratRuns = ratRuns.concat(depthFirstSearch(graph, start, destinationNodes));
        }
    }
    return ratRuns;
}

module.exports = getUniqueElements;
