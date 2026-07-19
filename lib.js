/**
 * @typedef {{ id: string, key: string, value: string }} QueryRow
 */

/**
 * @typedef {{
 *   userUrl: string,
 *   title: string,
 *   originalOrigin: string,
 *   originalPath: string,
 *   originalRows: QueryRow[],
 *   editableOrigin: string,
 *   editablePath: string,
 *   editableRows: QueryRow[],
 *   userUrlError: string
 * }} AppState
 */

/**
 * @returns {AppState}
 */
export function createEmptyState() {
    return {
        userUrl: "",
        title: "",
        originalOrigin: "",
        originalPath: "",
        originalRows: [],
        editableOrigin: "",
        editablePath: "/",
        editableRows: [createQueryRow("", "")],
        userUrlError: "",
    };
}

/**
 * @param {string} key
 * @param {string} value
 * @returns {QueryRow}
 */
export function createQueryRow(key, value) {
    return {
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        key,
        value,
    };
}

/**
 * @param {string} path
 * @returns {string}
 */
export function normalizePath(path) {
    if (!path) {
        return "/";
    }
    return path.startsWith("/") ? path : `/${path}`;
}

/**
 * @param {URLSearchParams} params
 * @returns {QueryRow[]}
 */
export function searchParamsToRows(params) {
    /** @type {QueryRow[]} */
    const rows = [];
    for (const [key, value] of params.entries()) {
        rows.push(createQueryRow(key, value));
    }
    return rows;
}

/**
 * Parse a user-entered URL and derive both the original and editable defaults.
 *
 * @param {string} userUrl
 * @returns {Pick<AppState, "userUrl" | "userUrlError" | "originalOrigin" | "originalPath" | "originalRows" | "editableOrigin" | "editablePath" | "editableRows">}
 */
export function parseUserUrlIntoState(userUrl) {
    const trimmed = userUrl.trim();
    if (!trimmed) {
        return {
            userUrl: "",
            userUrlError: "",
            originalOrigin: "",
            originalPath: "",
            originalRows: [],
            editableOrigin: "",
            editablePath: "/",
            editableRows: [createQueryRow("", "")],
        };
    }

    try {
        const url = new URL(trimmed);
        const rows = searchParamsToRows(url.searchParams);
        const editableRows = rows.length > 0 ? rows.map((row) => createQueryRow(row.key, row.value)) : [createQueryRow("", "")];

        return {
            userUrl: trimmed,
            userUrlError: "",
            originalOrigin: url.origin,
            originalPath: url.pathname || "/",
            originalRows: rows,
            editableOrigin: url.origin,
            editablePath: normalizePath(url.pathname),
            editableRows,
        };
    } catch {
        return {
            userUrl: trimmed,
            userUrlError: "Enter a valid absolute URL (for example https://example.com/path).",
            originalOrigin: "",
            originalPath: "",
            originalRows: [],
            editableOrigin: "",
            editablePath: "/",
            editableRows: [createQueryRow("", "")],
        };
    }
}

/**
 * @param {QueryRow[]} rows
 * @returns {string}
 */
export function serializeQueryRows(rows) {
    return rows
        .map((row) => `${encodeURIComponent(row.key)}=${encodeURIComponent(row.value)}`)
        .join("&");
}

/**
 * @param {string} origin
 * @param {string} path
 * @param {QueryRow[]} rows
 * @returns {string}
 */
export function buildGeneratedUrl(origin, path, rows) {
    const trimmedOrigin = origin.trim();
    if (!trimmedOrigin) {
        return "";
    }

    const normalized = normalizePath(path);
    const hasOnlyBlankRow = rows.length === 1 && rows[0].key === "" && rows[0].value === "";
    const query = hasOnlyBlankRow ? "" : serializeQueryRows(rows);
    return query ? `${trimmedOrigin}${normalized}?${query}` : `${trimmedOrigin}${normalized}`;
}

/**
 * @param {AppState} state
 * @returns {string}
 */
export function serializeAppStateToQuery(state) {
    /** @type {string[]} */
    const pairs = [];
    const hasDefaultBlankOnly =
        state.editableRows.length === 1 &&
        state.editableRows[0].key === "" &&
        state.editableRows[0].value === "";
    const shouldIncludeRows = !hasDefaultBlankOnly;

    // Title must be first when present.
    if (state.title.trim()) {
        pairs.push(`t=${encodeURIComponent(state.title)}`);
    }

    if (state.userUrl.trim()) {
        pairs.push(`u=${encodeURIComponent(state.userUrl)}`);
    }

    if (state.editableOrigin.trim()) {
        pairs.push(`origin=${encodeURIComponent(state.editableOrigin.trim())}`);
    }

    const normalizedPath = normalizePath(state.editablePath);
    if (state.editableOrigin.trim() || normalizedPath !== "/") {
        pairs.push(`path=${encodeURIComponent(normalizedPath)}`);
    }

    if (shouldIncludeRows) {
        for (const row of state.editableRows) {
            pairs.push(`qk=${encodeURIComponent(row.key)}`);
            pairs.push(`qv=${encodeURIComponent(row.value)}`);
        }
    }

    return pairs.join("&");
}

/**
 * @param {string} search
 * @returns {Pick<AppState, "title" | "userUrl" | "editableOrigin" | "editablePath" | "editableRows">}
 */
export function parseAppStateFromSearch(search) {
    const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
    const qk = params.getAll("qk");
    const qv = params.getAll("qv");
    const maxLen = Math.max(qk.length, qv.length);
    /** @type {QueryRow[]} */
    const rows = [];
    for (let i = 0; i < maxLen; i += 1) {
        rows.push(createQueryRow(qk[i] ?? "", qv[i] ?? ""));
    }

    return {
        title: params.get("t") ?? "",
        userUrl: params.get("u") ?? "",
        editableOrigin: params.get("origin") ?? "",
        editablePath: normalizePath(params.get("path") ?? "/"),
        editableRows: rows.length > 0 ? rows : [createQueryRow("", "")],
    };
}

/**
 * @param {string} currentHref
 * @param {AppState} state
 * @returns {string}
 */
export function buildAppHref(currentHref, state) {
    const url = new URL(currentHref);
    const query = serializeAppStateToQuery(state);
    url.search = query;
    return url.toString();
}
