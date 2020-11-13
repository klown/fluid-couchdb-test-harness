/* eslint-env node */
/* Basic CRUD tests for the CouchDB test harness. */
"use strict";
var fluid = require("infusion");
fluid.logObjectRenderChars = 20480;

fluid.require("%fluid-couchdb-test-harness");
fluid.test.couchdb.loadTestingSupport();

var kettle = require("kettle");
kettle.loadTestingSupport();

require("./lib/checkResponse");

fluid.registerNamespace("fluid.tests.couchdb.basic");
fluid.registerNamespace("fluid.tests.cockroachdb.basic");

fluid.tests.couchdb.basic.checkRecordAndStartDelete = function (response, body, expectedStatus, expectedBody, deleteRequest) {
    var record = JSON.parse(body);
    fluid.test.couchdb.checkResponse(response, body, expectedStatus, expectedBody);

    // DELETE requests must reference a specific revision, as in:
    // DELETE /recipes/FishStew?rev=1-9c65296036141e575d32ba9c034dd3ee
    deleteRequest.send({}, { termMap: { rev: record._rev } });
};

fluid.defaults("fluid.tests.couchdb.basic.caseHolder", {
    gradeNames: ["fluid.test.couchdb.caseHolder"],
    expected: {
        root:             { couchdb:"Welcome","vendor":{ "name":"The Apache Software Foundation" } },
        massive:          { total_rows: 150 },
        noData:           { total_rows: 0 },
        read:             { foo: "bar" },
        supplementalRead: { has: "data" },
        afterDelete:      {},
        beforeDelete:     { _id: "todelete"},
        insert:           { id: "toinsert", foo: "bar"},
        nonBulkRequest:   { total_rows: 6 }
    },
    rawModules: [
        {
            name: "Testing docker test harness.",
            tests: [
                {
                    name: "Testing loading CouchDB root.",
                    type: "test",
                    sequence: [
                        {
                            func: "{rootRequest}.send",
                            args: [{}]
                        },
                        {
                            listener: "fluid.test.couchdb.checkResponse",
                            event:    "{rootRequest}.events.onComplete",
                            //        (response, body, expectedStatus, expectedBody)
                            args:     ["{rootRequest}.nativeResponse", "{arguments}.0", 200, "{testCaseHolder}.options.expected.root"]
                        }
                    ]
                },
                {
                    name: "Testing 'massive' database.",
                    type: "test",
                    sequence: [
                        {
                            func: "{massiveRequest}.send",
                            args: [{}]
                        },
                        {
                            listener: "fluid.test.couchdb.checkResponse",
                            event:    "{massiveRequest}.events.onComplete",
                            //        (response, body, expectedStatus, expectedBody)
                            args:     ["{massiveRequest}.nativeResponse", "{arguments}.0", 200, "{testCaseHolder}.options.expected.massive"]
                        }
                    ]
                },
                {
                    name: "Testing 'nodata' database.",
                    type: "test",
                    sequence: [
                        {
                            func: "{noDataRequest}.send",
                            args: [{}]
                        },
                        {
                            listener: "fluid.test.couchdb.checkResponse",
                            event:    "{noDataRequest}.events.onComplete",
                            //        (response, body, expectedStatus, expectedBody)
                            args:     ["{noDataRequest}.nativeResponse", "{arguments}.0", 200, "{testCaseHolder}.options.expected.noData"]
                        }
                    ]
                },
                {
                    name: "Testing reading a single record from the 'sample' database.",
                    type: "test",
                    sequence: [
                        {
                            func: "{readRequest}.send",
                            args: [{}]
                        },
                        {
                            listener: "fluid.test.couchdb.checkResponse",
                            event:    "{readRequest}.events.onComplete",
                            //        (response, body, expectedStatus, expectedBody)
                            args:     ["{readRequest}.nativeResponse", "{arguments}.0", 200, "{testCaseHolder}.options.expected.read"]
                        }
                    ]
                },
                {
                    name: "Confirm that supplemental data was loaded for the 'sample' database.",
                    type: "test",
                    sequence: [
                        {
                            func: "{supplementalReadRequest}.send",
                            args: [{}]
                        },
                        {
                            listener: "fluid.test.couchdb.checkResponse",
                            event:    "{supplementalReadRequest}.events.onComplete",
                            //        (response, body, expectedStatus, expectedBody)
                            args:     ["{supplementalReadRequest}.nativeResponse", "{arguments}.0", 200, "{testCaseHolder}.options.expected.supplementalRead"]
                        }
                    ]
                },
                {
                    name: "Confirm that 'non bulk' data was loaded correctly.",
                    type: "test",
                    sequence: [
                        {
                            func: "{nonBulkRequest}.send",
                            args: [{}]
                        },
                        {
                            listener: "fluid.test.couchdb.checkResponse",
                            event:    "{nonBulkRequest}.events.onComplete",
                            //        (response, body, expectedStatus, expectedBody)
                            args:     ["{nonBulkRequest}.nativeResponse", "{arguments}.0", 200, "{testCaseHolder}.options.expected.nonBulkRequest"]
                        }
                    ]
                },
                {
                    name: "Testing deleting a single record from the 'sample' database.",
                    type: "test",
                    sequence: [
                        // The record should exist before we delete it.
                        {
                            func: "{preDeleteRequest}.send",
                            args: [{}]
                        },
                        // confirm that the record exists now and delete the latest revision.
                        {
                            listener: "fluid.tests.couchdb.basic.checkRecordAndStartDelete",
                            event:    "{preDeleteRequest}.events.onComplete",
                            //        (response, body, expectedStatus, expectedBody)
                            args:     ["{preDeleteRequest}.nativeResponse", "{arguments}.0", 200, "{that}.options.expected.beforeDelete", "{deleteRequest}"]
                        },
                        // The delete request should be successful.
                        {
                            listener: "fluid.test.couchdb.checkResponse",
                            event:    "{deleteRequest}.events.onComplete",
                            //        (response, body, expectedStatus, expectedBody)
                            args:     ["{deleteRequest}.nativeResponse", "{arguments}.0", 200, "{testCaseHolder}.options.expected.afterDelete"]
                        },
                        // The record should no longer exist after we delete it.
                        {
                            func: "{verifyDeleteRequest}.send",
                            args: [{}]
                        },
                        {
                            listener: "fluid.test.couchdb.checkResponse",
                            event:    "{verifyDeleteRequest}.events.onComplete",
                            //        (response, body, expectedStatus, expectedBody)
                            args:     ["{verifyDeleteRequest}.nativeResponse", "{arguments}.0", 404]
                        }
                    ]
                },
                {
                    name: "Testing inserting a record into the 'sample' database.",
                    type: "test",
                    sequence: [
                        // The record should not exist before we create it.
                        {
                            func: "{preInsertRequest}.send",
                            args: [{}]
                        },
                        {
                            listener: "fluid.test.couchdb.checkResponse",
                            event:    "{preInsertRequest}.events.onComplete",
                            //        (response, body, expectedStatus, expectedBody)
                            args:     ["{preInsertRequest}.nativeResponse", "{arguments}.0", 404]
                        },
                        // The insert should be successful.
                        {
                            func: "{insertRequest}.send",
                            args: ["{that}.options.expected.insert"]
                        },
                        {
                            listener: "fluid.test.couchdb.checkResponse",
                            event:    "{insertRequest}.events.onComplete",
                            //        (response, body, expectedStatus, expectedBody)
                            args:     ["{insertRequest}.nativeResponse", "{arguments}.0", 201]
                        },
                        // The record should exist after we create it.
                        {
                            func: "{verifyInsertRequest}.send",
                            args: [{}]
                        },
                        {
                            listener: "fluid.test.couchdb.checkResponse",
                            event:    "{verifyInsertRequest}.events.onComplete",
                            //        (response, body, expectedStatus, expectedBody)
                            args:     ["{verifyInsertRequest}.nativeResponse", "{arguments}.0", 200, "{testCaseHolder}.options.expected.insert"]
                        }
                    ]
                }
            ]
        }
    ],
    components: {
        rootRequest: {
            type: "fluid.test.couchdb.request",
            options: {
                path: "/"
            }
        },
        massiveRequest: {
            type: "fluid.test.couchdb.request",
            options: {
                path: "/massive/_all_docs"
            }
        },
        noDataRequest: {
            type: "fluid.test.couchdb.request",
            options: {
                path: "/nodata/_all_docs"
            }
        },
        readRequest: {
            type: "fluid.test.couchdb.request",
            options: {
                path: "/sample/foo"
            }
        },
        supplementalReadRequest: {
            type: "fluid.test.couchdb.request",
            options: {
                path: "/sample/supplemental"
            }
        },
        preDeleteRequest: {
            type: "fluid.test.couchdb.request",
            options: {
                path: "/sample/todelete"
            }
        },
        deleteRequest: {
            type: "fluid.test.couchdb.request",
            options: {
                path:   "/sample/todelete?rev=%rev",
                method: "DELETE",
                termMap: { "rev": "%rev"}
            }
        },
        verifyDeleteRequest: {
            type: "fluid.test.couchdb.request",
            options: {
                path: "/sample/todelete"
            }
        },
        preInsertRequest: {
            type: "fluid.test.couchdb.request",
            options: {
                path:   "/sample/toinsert"
            }
        },
        insertRequest: {
            type: "fluid.test.couchdb.request",
            options: {
                path:   "/sample/toinsert",
                method: "PUT"
            }
        },
        verifyInsertRequest: {
            type: "fluid.test.couchdb.request",
            options: {
                path:   "/sample/toinsert"
            }
        },
        nonBulkRequest: {
            type: "fluid.test.couchdb.request",
            options: {
                path: "/nonbulk/_all_docs"
            }
        }
    }
});

fluid.defaults("fluid.tests.cockroachdb.basic.caseHolder", {
    gradeNames: ["fluid.test.cockroachdb.caseHolder"],
    expected: {
        root:             { couchdb:"Welcome","vendor":{ "name":"The Apache Software Foundation" } },
        massive:          { total_rows: 150 },
        noData:           { total_rows: 0 },
        read:             { foo: "bar" },
        supplementalRead: { has: "data" },
        afterDelete:      {},
        beforeDelete:     { _id: "todelete"},
        insert:           { id: "toinsert", foo: "bar"},
        nonBulkRequest:   { total_rows: 6 }
    },
    rawModules: [
        {
            name: "Testing docker test harness.",
            tests: [
                {
                    name: "Testing loading CouchDB root.",
                    type: "test",
                    sequence: [
                        {
                            func: "{rootRequest}.send",
                            args: [{}]
                        },
                        {
                            listener: "fluid.test.couchdb.checkResponse",
                            event:    "{rootRequest}.events.onComplete",
                            //        (response, body, expectedStatus, expectedBody)
                            args:     ["{rootRequest}.nativeResponse", "{arguments}.0", 200, "{testCaseHolder}.options.expected.root"]
                        }
                    ]
                },
                {
                    name: "Testing 'massive' database.",
                    type: "test",
                    sequence: [
                        {
                            func: "{massiveRequest}.send",
                            args: [{}]
                        },
                        {
                            listener: "fluid.test.couchdb.checkResponse",
                            event:    "{massiveRequest}.events.onComplete",
                            //        (response, body, expectedStatus, expectedBody)
                            args:     ["{massiveRequest}.nativeResponse", "{arguments}.0", 200, "{testCaseHolder}.options.expected.massive"]
                        }
                    ]
                },
                {
                    name: "Testing 'nodata' database.",
                    type: "test",
                    sequence: [
                        {
                            func: "{noDataRequest}.send",
                            args: [{}]
                        },
                        {
                            listener: "fluid.test.couchdb.checkResponse",
                            event:    "{noDataRequest}.events.onComplete",
                            //        (response, body, expectedStatus, expectedBody)
                            args:     ["{noDataRequest}.nativeResponse", "{arguments}.0", 200, "{testCaseHolder}.options.expected.noData"]
                        }
                    ]
                },
                {
                    name: "Testing reading a single record from the 'sample' database.",
                    type: "test",
                    sequence: [
                        {
                            func: "{readRequest}.send",
                            args: [{}]
                        },
                        {
                            listener: "fluid.test.couchdb.checkResponse",
                            event:    "{readRequest}.events.onComplete",
                            //        (response, body, expectedStatus, expectedBody)
                            args:     ["{readRequest}.nativeResponse", "{arguments}.0", 200, "{testCaseHolder}.options.expected.read"]
                        }
                    ]
                },
                {
                    name: "Confirm that supplemental data was loaded for the 'sample' database.",
                    type: "test",
                    sequence: [
                        {
                            func: "{supplementalReadRequest}.send",
                            args: [{}]
                        },
                        {
                            listener: "fluid.test.couchdb.checkResponse",
                            event:    "{supplementalReadRequest}.events.onComplete",
                            //        (response, body, expectedStatus, expectedBody)
                            args:     ["{supplementalReadRequest}.nativeResponse", "{arguments}.0", 200, "{testCaseHolder}.options.expected.supplementalRead"]
                        }
                    ]
                },
                {
                    name: "Confirm that 'non bulk' data was loaded correctly.",
                    type: "test",
                    sequence: [
                        {
                            func: "{nonBulkRequest}.send",
                            args: [{}]
                        },
                        {
                            listener: "fluid.test.couchdb.checkResponse",
                            event:    "{nonBulkRequest}.events.onComplete",
                            //        (response, body, expectedStatus, expectedBody)
                            args:     ["{nonBulkRequest}.nativeResponse", "{arguments}.0", 200, "{testCaseHolder}.options.expected.nonBulkRequest"]
                        }
                    ]
                },
                {
                    name: "Testing deleting a single record from the 'sample' database.",
                    type: "test",
                    sequence: [
                        // The record should exist before we delete it.
                        {
                            func: "{preDeleteRequest}.send",
                            args: [{}]
                        },
                        // confirm that the record exists now and delete the latest revision.
                        {
                            listener: "fluid.tests.couchdb.basic.checkRecordAndStartDelete",
                            event:    "{preDeleteRequest}.events.onComplete",
                            //        (response, body, expectedStatus, expectedBody)
                            args:     ["{preDeleteRequest}.nativeResponse", "{arguments}.0", 200, "{that}.options.expected.beforeDelete", "{deleteRequest}"]
                        },
                        // The delete request should be successful.
                        {
                            listener: "fluid.test.couchdb.checkResponse",
                            event:    "{deleteRequest}.events.onComplete",
                            //        (response, body, expectedStatus, expectedBody)
                            args:     ["{deleteRequest}.nativeResponse", "{arguments}.0", 200, "{testCaseHolder}.options.expected.afterDelete"]
                        },
                        // The record should no longer exist after we delete it.
                        {
                            func: "{verifyDeleteRequest}.send",
                            args: [{}]
                        },
                        {
                            listener: "fluid.test.couchdb.checkResponse",
                            event:    "{verifyDeleteRequest}.events.onComplete",
                            //        (response, body, expectedStatus, expectedBody)
                            args:     ["{verifyDeleteRequest}.nativeResponse", "{arguments}.0", 404]
                        }
                    ]
                },
                {
                    name: "Testing inserting a record into the 'sample' database.",
                    type: "test",
                    sequence: [
                        // The record should not exist before we create it.
                        {
                            func: "{preInsertRequest}.send",
                            args: [{}]
                        },
                        {
                            listener: "fluid.test.couchdb.checkResponse",
                            event:    "{preInsertRequest}.events.onComplete",
                            //        (response, body, expectedStatus, expectedBody)
                            args:     ["{preInsertRequest}.nativeResponse", "{arguments}.0", 404]
                        },
                        // The insert should be successful.
                        {
                            func: "{insertRequest}.send",
                            args: ["{that}.options.expected.insert"]
                        },
                        {
                            listener: "fluid.test.couchdb.checkResponse",
                            event:    "{insertRequest}.events.onComplete",
                            //        (response, body, expectedStatus, expectedBody)
                            args:     ["{insertRequest}.nativeResponse", "{arguments}.0", 201]
                        },
                        // The record should exist after we create it.
                        {
                            func: "{verifyInsertRequest}.send",
                            args: [{}]
                        },
                        {
                            listener: "fluid.test.couchdb.checkResponse",
                            event:    "{verifyInsertRequest}.events.onComplete",
                            //        (response, body, expectedStatus, expectedBody)
                            args:     ["{verifyInsertRequest}.nativeResponse", "{arguments}.0", 200, "{testCaseHolder}.options.expected.insert"]
                        }
                    ]
                }
            ]
        }
    ],
    components: {
        rootRequest: {
            type: "fluid.test.couchdb.request",
            options: {
                path: "/"
            }
        },
        massiveRequest: {
            type: "fluid.test.couchdb.request",
            options: {
                path: "/massive/_all_docs"
            }
        },
        noDataRequest: {
            type: "fluid.test.couchdb.request",
            options: {
                path: "/nodata/_all_docs"
            }
        },
        readRequest: {
            type: "fluid.test.couchdb.request",
            options: {
                path: "/sample/foo"
            }
        },
        supplementalReadRequest: {
            type: "fluid.test.couchdb.request",
            options: {
                path: "/sample/supplemental"
            }
        },
        preDeleteRequest: {
            type: "fluid.test.couchdb.request",
            options: {
                path: "/sample/todelete"
            }
        },
        deleteRequest: {
            type: "fluid.test.couchdb.request",
            options: {
                path:   "/sample/todelete?rev=%rev",
                method: "DELETE",
                termMap: { "rev": "%rev"}
            }
        },
        verifyDeleteRequest: {
            type: "fluid.test.couchdb.request",
            options: {
                path: "/sample/todelete"
            }
        },
        preInsertRequest: {
            type: "fluid.test.couchdb.request",
            options: {
                path:   "/sample/toinsert"
            }
        },
        insertRequest: {
            type: "fluid.test.couchdb.request",
            options: {
                path:   "/sample/toinsert",
                method: "PUT"
            }
        },
        verifyInsertRequest: {
            type: "fluid.test.couchdb.request",
            options: {
                path:   "/sample/toinsert"
            }
        },
        nonBulkRequest: {
            type: "fluid.test.couchdb.request",
            options: {
                path: "/nonbulk/_all_docs"
            }
        }
    }
});

fluid.defaults("fluid.tests.couchdb.basic.environment", {
    gradeNames: ["fluid.test.couchdb.environment"],
    components: {
        testCaseHolder: {
            type: "fluid.tests.couchdb.basic.caseHolder"
        }
    }
});

fluid.test.runTests("fluid.tests.couchdb.basic.environment");
