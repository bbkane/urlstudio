import test from "node:test";
import assert from "node:assert/strict";

import {
    buildAppHref,
    buildGeneratedUrl,
    createEmptyState,
    createQueryRow,
    normalizePath,
    parseAppStateFromSearch,
    parseUserUrlIntoState,
    serializeAppStateToQuery,
    serializeQueryRows,
} from "./lib.js";

test("normalizePath enforces leading slash", () => {
    assert.equal(normalizePath("abc"), "/abc");
    assert.equal(normalizePath("/abc"), "/abc");
    assert.equal(normalizePath(""), "/");
});

test("parseUserUrlIntoState extracts URL pieces", () => {
    const next = parseUserUrlIntoState("https://example.com/path?key=value&otherkey=othervalue");
    assert.equal(next.userUrlError, "");
    assert.equal(next.originalOrigin, "https://example.com");
    assert.equal(next.originalPath, "/path");
    assert.deepEqual(
        next.originalRows.map((row) => [row.key, row.value]),
        [
            ["key", "value"],
            ["otherkey", "othervalue"],
        ],
    );
});

test("serializeQueryRows keeps blank keys and values", () => {
    const rows = [
        createQueryRow("", ""),
        createQueryRow("key", ""),
        createQueryRow("", "value"),
    ];
    assert.equal(serializeQueryRows(rows), "=&key=&=value");
});

test("buildGeneratedUrl builds URL with query rows in insertion order", () => {
    const rows = [createQueryRow("b", "2"), createQueryRow("a", "1")];
    assert.equal(buildGeneratedUrl("https://example.com", "/newpath", rows), "https://example.com/newpath?b=2&a=1");
});

test("buildGeneratedUrl omits query when only blank default row exists", () => {
    const rows = [createQueryRow("", "")];
    assert.equal(buildGeneratedUrl("https://example.com", "/", rows), "https://example.com/");
});

test("serializeAppStateToQuery puts t first when present", () => {
    const state = createEmptyState();
    state.title = "Bookmark";
    state.userUrl = "https://example.com/path?key=value";
    state.editableOrigin = "https://example.com";
    state.editablePath = "/newpath";
    state.editableRows = [createQueryRow("key", "value")];

    const query = serializeAppStateToQuery(state);
    assert.match(query, /^t=Bookmark&u=/);
});

test("serializeAppStateToQuery omits default blank row in untouched empty state", () => {
    const state = createEmptyState();
    assert.equal(serializeAppStateToQuery(state), "");
});

test("serializeAppStateToQuery omits default blank row when only origin/path are set", () => {
    const state = createEmptyState();
    state.userUrl = "https://example.com";
    state.editableOrigin = "https://example.com";
    state.editablePath = "/";
    assert.equal(serializeAppStateToQuery(state), "u=https%3A%2F%2Fexample.com&origin=https%3A%2F%2Fexample.com&path=%2F");
});

test("parseAppStateFromSearch rebuilds paired qk/qv rows", () => {
    const parsed = parseAppStateFromSearch("?qk=key&qv=value&qk=otherkey&qv=othervalue");
    assert.deepEqual(
        parsed.editableRows.map((row) => [row.key, row.value]),
        [
            ["key", "value"],
            ["otherkey", "othervalue"],
        ],
    );
});

test("buildAppHref applies query string to current app URL", () => {
    const state = createEmptyState();
    state.title = "A title";
    state.editableOrigin = "https://example.com";
    state.editablePath = "/path";
    state.editableRows = [createQueryRow("", "")];

    const href = buildAppHref("https://app.example/", state);
    assert.match(href, /^https:\/\/app\.example\/\?t=A%20title/);
});
