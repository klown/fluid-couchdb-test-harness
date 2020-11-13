"use strict";
var fluid = require("infusion");
var process = require("process");

require("./dockerWorker");
require("./vagrantWorker");
require("./externalWorker");

fluid.registerNamespace("fluid.test.couchdb.worker");

fluid.test.couchdb.worker.useVagrant = function () {
    return fluid.get(process, "env.FLUID_TEST_COUCH_USE_VAGRANT") ? true : false;
};

fluid.contextAware.makeChecks({
    "fluid.test.couchdb.useVagrant": "fluid.test.couchdb.worker.useVagrant"
});

fluid.test.couchdb.worker.useExternal = function () {
    return fluid.get(process, "env.FLUID_TEST_COUCH_USE_EXTERNAL") ? true : false;
};

fluid.contextAware.makeChecks({
    "fluid.test.couchdb.useExternal": "fluid.test.couchdb.worker.useExternal"
});

fluid.defaults("fluid.test.couchdb.worker.base", {
    gradeNames: ["fluid.component", "fluid.contextAware"],
    setupCheckInterval: 250,
    setupTimeout: 30000,
    hostname: "localhost",
    port: 25984,
    username: "admin",
    password: "admin",
    baseUrl: {
        expander: {
            funcName: "fluid.stringTemplate",
            args: ["{that}.options.templates.baseUrl", { hostname: "{that}.options.hostname", port: "{that}.options.port", username: "{that}.options.username", password: "{that}.options.password"}]
        }
    },
    templates: {
        baseUrl: "http://%username:%password@%hostname:%port"
    },
    events: {
        combinedShutdown:   null,
        combinedStartup:    null,
        onShutdownComplete: null,
        onStartupComplete:  null
    },
    invokers: {
        shutdown: {
            funcName: "fluid.promise.fireTransformEvent",
            args:     ["{that}.events.combinedShutdown"]
        },
        startup: {
            funcName: "fluid.promise.fireTransformEvent",
            args:     ["{that}.events.combinedStartup"]
        },
        isUp: {
            funcName: "fluid.notImplemented"
        },
        isReady: {
            funcName: "fluid.test.couchdb.checkUrlRepeatedly",
            args:     ["{that}.options"]
        }
    }
});

fluid.defaults("fluid.test.couchdb.worker.couch", {
    gradeNames: ["fluid.test.couchdb.worker.base", "fluid.contextAware"],
    port: 25984,
    allDbsUrl: {
        expander: {
            funcName: "fluid.stringTemplate",
            args: ["{that}.options.templates.allDbsUrl", { baseUrl: "{that}.options.baseUrl"}]
        }
    },
    templates: {
        allDbsUrl: "%baseUrl/_all_dbs"
    },
    contextAwareness: {
        whichWorker: {
            defaultGradeNames: "fluid.test.couchdb.worker.docker",
            checks: {
                useVagrant: {
                    contextValue: "{fluid.test.couchdb.useVagrant}",
                    gradeNames: "fluid.test.couchdb.worker.vagrant"
                },
                useExternal: {
                    contextValue: "{fluid.test.couchdb.useExternal}",
                    gradeNames: "fluid.test.couchdb.worker.external"
                }
            }
        }
    }
});

fluid.defaults("fluid.test.cockroachdb.worker.base", {
    gradeNames: ["fluid.component", "fluid.contextAware"],
    setupCheckInterval: 250,
    setupTimeout: 30000,
    hostname: "localhost",
    port: 26257,
    username: "maxroach",
    password: "",   // running in insecure mode
    baseUrl: {
        expander: {
            funcName: "fluid.stringTemplate",
            args: ["{that}.options.templates.baseUrl", { hostname: "{that}.options.hostname", port: "{that}.options.port", username: "{that}.options.username", password: "{that}.options.password"}]
        }
    },
    templates: {
        baseUrl: "postgres://%username:%password@%hostname:%port"
    },
    events: {
        combinedShutdown:   null,
        combinedStartup:    null,
        onShutdownComplete: null,
        onStartupComplete:  null
    },
    invokers: {
        shutdown: {
            funcName: "fluid.promise.fireTransformEvent",
            args:     ["{that}.events.combinedShutdown"]
        },
        startup: {
            funcName: "fluid.promise.fireTransformEvent",
            args:     ["{that}.events.combinedStartup"]
        },
        isUp: {
            funcName: "fluid.notImplemented"
        },
        isReady: {
            funcName: "fluid.test.couchdb.checkUrlRepeatedly",
            args:     ["{that}.options"]
        }
    }
});

fluid.defaults("fluid.test.cockroachdb.worker.cockroach", {
    gradeNames: ["fluid.test.cockroachdb.worker.base", "fluid.contextAware"],
    port: 25984,
    allDbsSql: "SELECT datname FROM pg_database;",
    contextAwareness: {
        whichWorker: {
            defaultGradeNames: "fluid.test.cockroachdb.worker.docker",
            checks: {
                useVagrant: {
                    contextValue: "{fluid.test.cockroachdb.useVagrant}",
                    gradeNames: "fluid.test.cockroachdb.worker.vagrant"
                },
                useExternal: {
                    contextValue: "{fluid.test.cockroachdb.useExternal}",
                    gradeNames: "fluid.test.cockroachdb.worker.external"
                }
            }
        }
    }
});

fluid.defaults("fluid.test.couchdb.worker.lucene", {
    gradeNames: ["fluid.test.couchdb.worker.base", "fluid.contextAware"],
    port: 25985,
    contextAwareness: {
        whichWorker: {
            defaultGradeNames: "fluid.test.couchdb.lucene.worker.docker",
            checks: {
                useVagrant: {
                    contextValue: "{fluid.test.couchdb.useVagrant}",
                    gradeNames: "fluid.test.couchdb.lucene.worker.vagrant"
                },
                useExternal: {
                    contextValue: "{fluid.test.couchdb.useExternal}",
                    gradeNames: "fluid.test.couchdb.lucene.worker.external"
                }
            }
        }
    }
});
