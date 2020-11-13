/* eslint-env node */
"use strict";
var fluid = require("infusion");

fluid.registerNamespace("fluid.test.couchdb.harness.config");

fluid.test.couchdb.harness.config = {
    databases: {
        sample:           { data: [ "%fluid-couchdb-test-harness/tests/data/data.json", "%fluid-couchdb-test-harness/tests/data/supplemental.json"] },
        users:            { data: "%fluid-couchdb-test-harness/tests/data/users.json"},
        // A ~100k data set to confirm that the async data loads do not take too long.
        massive:          { data: "%fluid-couchdb-test-harness/tests/data/massive.json"},
        rgb:              { data: "%fluid-couchdb-test-harness/tests/data/rgb.json"},
        // Sample data to test views, including map/reduce
        views:            { data: "%fluid-couchdb-test-harness/tests/data/views.json"},
        // Test loading of payloads that have not been wrapped in a "docs" element.
        nonbulk:          { data: "%fluid-couchdb-test-harness/tests/data/non-bulk.json"},
        nodata:           {}
    }
};

fluid.registerNamespace("fluid.test.cockroachdb.harness.config");

fluid.test.cockroachdb.harness.config = {
    tableModelDefs: "%fluid-couchdb-test-harness/tests/data/tableModels",
    databases: fluid.test.couchdb.harness.config.databases
};
