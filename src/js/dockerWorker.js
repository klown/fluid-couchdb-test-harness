"use strict";
var fluid = require("infusion");

fluid.registerNamespace("fluid.test.couchdb.worker.docker");

require("./runCommand");
require("./checkUrl");

/**
 *
 * Check to see if there is a container with our label that is running.
 *
 * @param {Object} that - The docker worker component.
 * @return {Promise} - A `fluid.promise` that will be resolved with `true` if a container is running, resolved with `false` if no container is running, or rejected if there is an error checking the container status.
 *
 */
fluid.test.couchdb.worker.docker.isContainerUp = function (that) {
    var isUpPromise = fluid.promise();

    var containerListPromise = that.listContainers();
    containerListPromise.then(
        function (containerListOutput) {
            var containerEntries = fluid.test.couchdb.worker.docker.parseDockerOutput(containerListOutput);
            var runningContainer = fluid.find(containerEntries, function (containerEntry) {
                return containerEntry.Status.indexOf("Up") === 0 ? containerEntry : undefined;
            });
            if (runningContainer) {
                that.containerName = runningContainer.Names;
                isUpPromise.resolve(true);
            }
            else {
                isUpPromise.resolve(false);
            }
        },
        isUpPromise.reject
    );

    return isUpPromise;
};

fluid.test.couchdb.worker.docker.parseDockerOutput = function (rawOutput) {
    var individualOutputLines = rawOutput.trim().split("\n");
    var containerEntries = [];
    fluid.each(individualOutputLines, function (individualOutputLine) {
        if (individualOutputLine.length) {
            containerEntries.push(JSON.parse(individualOutputLine));
        }
    });
    return containerEntries;
};

fluid.test.couchdb.worker.docker.startIfNeeded = function (that, containerIsUp) {
    var outerStartupPromise = fluid.promise();

    if (containerIsUp) {
        fluid.log("Container already running, worker does not need to start anything.");
        outerStartupPromise.resolve("Container already running.");
    }
    else {
        var containerCreationPromise = fluid.test.couchdb.runCommandAsPromise(that.options.commandTemplates.createContainer, that);
        containerCreationPromise.then(outerStartupPromise.resolve, outerStartupPromise.reject);
    }

    return outerStartupPromise;
};

/**
 *
 * During shutdown, look at how aggressively we're meant to manage our containers, and based on that, either:
 *
 * 1. Do nothing.
 * 2. Stop the containers.
 * 3. Remove the containers.
 *
 * @param {Object} that - The Docker worker component.
 * @param {String} listContainerOutput - The results of a previous "list containers" command.
 * @return {Promise} - A `fluid.promise` that will resolve when our part of shutdown is complete, or reject on an error.
 *
 */
fluid.test.couchdb.worker.docker.stopOrRemoveContainers = function (that, listContainerOutput) {
    var containerShutdownPromises = [];

    var containerData = fluid.test.couchdb.worker.docker.parseDockerOutput(listContainerOutput);
    fluid.each(containerData, function (containerEntry) {
        var containerId = containerEntry.ID;
        if (that.options.removeContainer || that.options.shutdownContainer) {
            var commandTemplate = that.options.removeContainer ? that.options.commandTemplates.removeContainer : that.options.commandTemplates.stopContainer;
            containerShutdownPromises.push(function () {
                return fluid.test.couchdb.runCommandAsPromise(commandTemplate, { containerId: containerId });
            });
        }
    });

    return fluid.promise.sequence(containerShutdownPromises);
};

fluid.defaults("fluid.test.couchdb.worker.docker", {
    gradeNames: ["fluid.component"],
    containerLabel: "fluid-couchdb-test-harness",
    members: {
        containerName: {
            expander: {
                funcName: "fluid.stringTemplate",
                args:     ["fluid-couchdb-test-harness-%id", { id: "{that}.id" }]
            }
        }
    },
    couchVersion: "2.3.1",
    couchUsername: "admin",
    couchPassword: "admin",
    commandTemplates: {
        listContainers:  "docker ps -a --filter label=%options.containerLabel --format '{{ json . }}'",
        createContainer: "docker run -d -l %options.containerLabel -p %options.port:5984 --name %containerName -e COUCHDB_USER=%options.couchUsername -e COUCHDB_PASSWORD=%options.couchPassword couchdb:%options.couchVersion",
        startContainer:  "docker start %containerId",
        removeContainer: "docker rm -f %containerId",
        stopContainer:   "docker stop %containerId"
    },
    invokers: {
        isUp: {
            funcName: "fluid.test.couchdb.worker.docker.isContainerUp",
            args:     ["{that}"]
        },
        listContainers: {
            funcName: "fluid.test.couchdb.runCommandAsPromise",
            args: [
                "{that}.options.commandTemplates.listContainers",
                "{that}",
                "Retrieving list of docker containers."
            ]
        }
    },
    listeners: {
        "combinedShutdown.listContainers": {
            priority: "first",
            func:     "{that}.listContainers"
        },
        "combinedShutdown.stopOrRemoveContainers": {
            priority: "after:listContainers",
            funcName: "fluid.test.couchdb.worker.docker.stopOrRemoveContainers",
            args:     ["{that}", "{arguments}.0"] // listContainerOutput
        },
        "combinedShutdown.fireEvent": {
            func: "{that}.events.onShutdownComplete.fire"
        },
        "combinedStartup.log": {
            priority: "first",
            funcName: "fluid.log",
            args:     ["Running using 'docker' worker."]
        },
        "combinedStartup.isUp": {
            priority: "after:log",
            func:     "{that}.isUp"
        },
        "combinedStartup.startIfNeeded": {
            priority: "after:isUp",
            funcName: "fluid.test.couchdb.worker.docker.startIfNeeded",
            args:     ["{that}", "{arguments}.0"] // isUp
        },
        "combinedStartup.fireEvent": {
            priority: "last",
            func: "{that}.events.onStartupComplete.fire"
        }
    }
});

fluid.defaults("fluid.test.couchdb.lucene.worker.docker", {
    gradeNames: ["fluid.test.couchdb.worker.docker"],
    containerLabel: "fluid-couchdb-lucene-test-harness",
    members: {
        containerName: {
            expander: {
                funcName: "fluid.stringTemplate",
                args:     ["fluid-couchdb-lucene-test-harness-%id", { id: "{that}.id" }]
            }
        },
        couchContainerName: ""
    },
    commandTemplates: {
        listContainers:  "docker ps -a --filter label=%options.containerLabel --format '{{ json . }}'",
        createContainer: "docker run -d -l %options.containerLabel -p %options.port:5985 --link %couchContainerName:couchdb --name %containerName klaemo/couchdb-lucene:2.1.0"
    }
});

fluid.defaults("fluid.test.cockroachdb.worker.docker", {
    gradeNames: ["fluid.component"],
    containerLabel: "fluid-cockroachdb-test-harness",
    members: {
        containerName: {
            expander: {
                funcName: "fluid.stringTemplate",
                args:     ["fluid-cockroachdb-test-harness-%id", { id: "{that}.id" }]
            }
        }
    },
    cockroachVersion: "20.1.7",
    cockroachUsername: "maxroach",
    cockroachPassword: "",
    commandTemplates: {
        listContainers:  "docker ps -a --filter label=%options.containerLabel --format '{{ json . }}'",
        createContainer: "./scripts/startDockerInsecureCluster.sh %options.containerLabel %options.port %options.adminPort --name %containerName %option.cockroachUsername cockroachdb/cockroach:v%options.cockroachVersion",
        startContainer:  "docker start %containerId",
        removeContainer: "docker rm -f %containerId",
        stopContainer:   "./scripts/stopDockerInsecureCluster.sh %option.containerName"
    },
    invokers: {
        isUp: {
            funcName: "fluid.test.couchdb.worker.docker.isContainerUp",
            args:     ["{that}"]
        },
        listContainers: {
            funcName: "fluid.test.couchdb.runCommandAsPromise",
            args: [
                "{that}.options.commandTemplates.listContainers",
                "{that}",
                "Retrieving list of docker containers."
            ]
        }
    },
    listeners: {
        "combinedShutdown.listContainers": {
            priority: "first",
            func:     "{that}.listContainers"
        },
        "combinedShutdown.stopOrRemoveContainers": {
            priority: "after:listContainers",
            funcName: "fluid.test.couchdb.worker.docker.stopOrRemoveContainers",
            args:     ["{that}", "{arguments}.0"] // listContainerOutput
        },
        "combinedShutdown.fireEvent": {
            func: "{that}.events.onShutdownComplete.fire"
        },
        "combinedStartup.log": {
            priority: "first",
            funcName: "fluid.log",
            args:     ["Running using 'docker' worker."]
        },
        "combinedStartup.isUp": {
            priority: "after:log",
            func:     "{that}.isUp"
        },
        "combinedStartup.startIfNeeded": {
            priority: "after:isUp",
            funcName: "fluid.test.couchdb.worker.docker.startIfNeeded",
            args:     ["{that}", "{arguments}.0"] // isUp
        },
        "combinedStartup.fireEvent": {
            priority: "last",
            func: "{that}.events.onStartupComplete.fire"
        }
    }
});
