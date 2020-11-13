/*
 * Copyright 2020 Inclusive Design Research Centre, OCAD University
 * All rights reserved.
 *
 * Licensed under the New BSD license. You may not use this file except in
 * compliance with this License.
 */
"use strict";

var fluid = require("infusion"),
    Sequelize = require("sequelize-cockroachdb");  // for SQL data types

fluid.setLogging(true);     // TODO: remove (for debugging)

fluid.require("%fluid-couchdb-test-harness/src/test/harness-config.js");

fluid.registerNamespace("fluid.test.cockroachdb");

fluid.defaults("fluid.test.cockroachdb.request", {
    gradeNames: ["fluid.component"],
    dataBaseName:   "fluid_prefsdb",    // TODO:  make more generic for testing, e.g. "test_cockroachdb", and use "{testEnvironment}"
    dialect:        "postgres",
    port:           26257,              // TODO: something like: "{testEnvironment}.options.cockroach.port",
    user:           "maxroach",
    password:       "",                 // TODO:  make secure
    members: {
        // Reference to a sequelize instance that will handle the Postgres
        // requests, initialized when created.  Note that the database can be
        // non-existent when the sequelize member is initialized, but the
        // database must be up before the first request is issued.
        sequelize:  null
    },
    listeners: {
        "onCreate": {
            funcName: "fluid.test.cockroachdb.initConnection",
            arguments: ["{that}"]
        }
    }
});

/**
 * Initiallize connection to the cockroachdb, using Sequelize.
 *
 * @param {Object} that - Contains the options for the connection and a member
 *                        for hold a referenct to the connection.
 * @param {String} that.options.dataBaseName - Name of the database.
 * @param {String} that.options.user - Name of the user with admin access.
 * @param {String} that.options.password - User's password.
 * @param {String} that.options.dialect - The dialect for SQL requests,
 *                                        e.g. "postgres".
 * @param {Number} that.options.port - The port number for the connection.
 * @param {Object} that.sequelize - Object set herein to use for requests.
 *
 */
fluid.test.cockroachdb.initConnection = function (that) {
    that.sequelize = new Sequelize(
        that.options.dataBaseName, that.options.user, that.options.password, {
            dialect: that.options.dialect,
            port: that.options.port
        }
    );
};


fluid.defaults("fluid.test.cockroachdb.initialze", {
    gradeNames: ["fluid.component"],
    members: {
        // contains table definitions and their data
        tableInfo: fluid.test.cockroachdb.harness.config,
        tables: {}
    },
    invokers: {
        createTables: {
            funcName: "fluid.test.cockroachdb.createTables",
            args: ["{that}"]
        },
        createOneTable: {
            funcName: "fluid.test.cockroachdb.createOneTable",
            args: ["{that}", "{that}.request", "{arguments}.0"]
                                               // model definition
        },
        loadTables: {
            funcName: "fluid.test.cockroachdb.loadTables",
            args: ["{that}"]
        },
        loadOneTable: {
            funcName: "fluid.test.cockroachdb.loadOneTable",
            args: ["{that}", "{that}.request", "{arguments}.0"]
                                                // table name
        }
    },
    components: {
        request: {
            type: "fluid.test.cockroachdb.request"
        }
    }
});

/**
 * Loop to define and create the database tables.
 *
 * @param {Object} that - The table initializer
 * @param {Object} request - An instance of fluid.test.cockroachdb.request
 * @param {Object} that.tables - Set to references the created tables.
 * @return {Promise} Final Promise of the sequence that created the tables.
 */
fluid.test.cockroachdb.createTables = function (that) {
    var tableDefs = fluid.require(that.tableInfo.tableModelDefs);
    var start = new Date();
    var creationSequence = [];
    fluid.each(tableDefs, function (aTableDef) {
        var aPromise = that.createOneTable(aTableDef);
        creationSequence.push(aPromise);
        aPromise.then(
            function (createdTable) {
                that.tables[createdTable.name] = createdTable;
                fluid.log("Created table '", createdTable.name, "'");
                fluid.log("XXXX ", (new Date() - start) / 60);
            },
            function (error) {
                fluid.log(fluid.logLevel.FAIL, "Failed to create table", error);
            }
        );
    });
    return fluid.promise.sequence(creationSequence);
};

/**
 * Define structure of a database table, and request it be created.
 *
 * @param {Object} that - The table initializer
 * @param {Object} request - An instance of fluid.test.cockroachdb.request
 * @param {Object} tableDef - The table definition.
 * @param {Object} tableDef.modelName - Name to use for the table.
 * @param {Object} tableDef.options - Table columne (varies).
 * @return {Promise} Promise resulting from the request to create the table in
 *                   the database.
 */
fluid.test.cockroachdb.createOneTable = function (that, request, tableDef) {
    var theTable = tableDef(request.sequelize);

    // Force the destruction (drop) of any existing tablev before (re)creating
    // it.
    return theTable.model.sync({force: true});
};

/*
 * Load data sets into the tables that this initializer knows about.
 *
 * @param {Object} that - The table initializer.
 * @param {Object} that.tables - The known tables.
 * @return {Promise} Promise resulting from the requests to load the tables with
 *                   the data sets.
 */
fluid.test.cockroachdb.loadTables = function (that) {
    var tableNames = fluid.keys(that.tableInfo.databases);
    var loadSequence = [];
    var start = new Date();
    fluid.each(tableNames, function (aTableName) {
        var aPromise = that.loadOneTable(aTableName);
        aPromise.then(
            function () {
                fluid.log("Loaded table '", aTableName, "'");
                fluid.log("XXXX  ", (new Date() - start) / 60);
            },
            function (error) {
                fluid.log(fluid.logLevel.FAIL,
                    "Failed to load table '", aTableName, "'",
                    error.stack
                );
            }
        );
        loadSequence.push(aPromise);
    });
    return fluid.promise.sequence(loadSequence);
};


/*
 * Load a data set into a table.
 *
 * @param {Object} that - The table initializer
 * @param {Object} tableDef - The table definition.
 * @param {Object} tableDef.modelName - Name to use for the table.
 * @param {Object} tableDef.options - Table columne (varies).
 * @return {Promise} Promise resulting from the request to create the table in
 *                   the database.
 */
fluid.test.cockroachdb.loadOneTable = function (that, request, tableName) {
    var model = that.tables[tableName];
    if (model && tableName !== "nonbulk") { // TODO: handle non bulk loading (ignore nonbulk dataset for now)
        var dataSet = fluid.require(that.tableInfo.databases[tableName].data);
        return model.bulkCreate(dataSet.docs);
    } else {
        return fluid.promise().resolve("No table defined for '", tableName, "' dataset");   // TODO: error (reject)?
    }
};

// ============= TESTING =============

var cockroachInit = fluid.test.cockroachdb.initialze();
var createThenLoad = [];

var finalCreatePromise = cockroachInit.createTables();
finalCreatePromise.then(
    function (result) {
        fluid.log("Created all tables: ", JSON.stringify(result, null, 2));
    },
    function (error) {
        fluid.log(fluid.logLevel.FAIL, "Failed to create all tables: ", error);
    }
);
createThenLoad.push(finalCreatePromise);
createThenLoad.push(cockroachInit.loadTables);
fluid.promise.sequence(createThenLoad).then(
    function (loadResult) {
        fluid.log("Loaded all tables: ", JSON.stringify(loadResult, null, 2));
    },
    function (loadError) {
        fluid.log(fluid.logLevel.FAIL, "Failed to create all tables: ", loadError);
    }
);
