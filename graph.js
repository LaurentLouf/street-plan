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
    if (labels.has(start)) {
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

function getRatRuns(graph, transitSets, transitBlacklists, transitWhitelists) {
    transitNodesAll = new Set();
    for (let s of transitSets) {
        for (let n of s) {
            transitNodesAll.add(n);
        }
    }

    let ratRuns = [];
    for (let transit of transitSets) {
        for (let startNode of transit) {
            let destinationNodes = new Set([...transitNodesAll].filter(x => !transit.has(x)));

            // supersede transit set logic
            if (transitBlacklists && transitBlacklists[startNode]) {
                destinationNodes = new Set([...destinationNodes].filter(x => !transitBlacklists[startNode].includes(x)));
            }

            // supersede transit set and transit blacklist logics
            if (transitWhitelists && transitWhitelists[startNode]) {
                destinationNodes = new Set(transitWhitelists[startNode]);
                destinationNodes.delete(0); // id '0' is a special case that must be dismissed
            }

            if (destinationNodes.size > 0) {
                let newRatRuns = depthFirstSearch(graph, startNode, destinationNodes);
                ratRuns = ratRuns.concat(newRatRuns);
            }
        }
    }
    return ratRuns;
}

module.exports = getUniqueElements;
