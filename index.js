import {
  createEmptyState,
  createQueryRow,
  normalizePath,
  parseAppStateFromSearch,
  parseUserUrlIntoState,
  buildGeneratedUrl,
  buildAppHref,
} from "./lib.js";

/** @type {import('./lib.js').AppState} */
let state = createEmptyState();

const userUrlInput = document.querySelector("#user-url");
const userUrlExampleLink = document.querySelector("#user-url-example-link");
const titleInput = document.querySelector("#bookmark-title");
const bookmarkTitleEditLink = document.querySelector(
  "#bookmark-title-edit-link",
);
const generatedUrlLink = document.querySelector("#generated-url-link");
const generatedUrlOut = document.querySelector("#generated-url");
const userUrlError = document.querySelector("#user-url-error");
const originalOriginOut = document.querySelector("#original-origin");
const originalPathOut = document.querySelector("#original-path");
const originalQueryList = document.querySelector("#original-query-list");
const editableOriginInput = document.querySelector("#editable-origin");
const editablePathInput = document.querySelector("#editable-path");
const editableRowsWrap = document.querySelector("#editable-rows");
const addRowButton = document.querySelector("#add-row");

const exampleState = {
  ...createEmptyState(),
  title: "This saves in the URL",
  userUrl: "https://example.com/path?key=value",
  editableOrigin: "https://example.com",
  editablePath: "/path",
  editableRows: [
    createQueryRow("key", "value"),
    createQueryRow("newkey", "new value"),
  ],
};

/**
 * @returns {void}
 */
function hydrateFromAppUrl() {
  const fromUrl = parseAppStateFromSearch(window.location.search);
  const parsedUser = parseUserUrlIntoState(fromUrl.userUrl);

  state = {
    ...createEmptyState(),
    ...parsedUser,
    title: fromUrl.title,
    userUrl: fromUrl.userUrl || parsedUser.userUrl,
    editableOrigin: fromUrl.editableOrigin || parsedUser.editableOrigin,
    editablePath: normalizePath(
      fromUrl.editablePath || parsedUser.editablePath,
    ),
    editableRows: fromUrl.editableRows,
  };
}

/**
 * @returns {void}
 */
function syncAppUrl() {
  const href = buildAppHref(window.location.href, state);
  window.history.replaceState({}, "", href);
  bookmarkTitleEditLink.href = href;
}

/**
 * @returns {void}
 */
function syncExampleLink() {
  userUrlExampleLink.href = buildAppHref(window.location.href, exampleState);
}

/**
 * @returns {void}
 */
function renderOriginalPanel() {
  originalOriginOut.textContent = state.originalOrigin || "-";
  originalPathOut.textContent = state.originalPath || "-";

  originalQueryList.innerHTML = "";
  if (state.originalRows.length === 0) {
    const item = document.createElement("li");
    item.textContent = "(no query parameters)";
    originalQueryList.appendChild(item);
    return;
  }

  state.originalRows.forEach((row) => {
    const item = document.createElement("li");
    item.textContent = `${row.key} = ${row.value}`;
    originalQueryList.appendChild(item);
  });
}

/**
 * @returns {void}
 */
function renderEditableRows() {
  editableRowsWrap.innerHTML = "";

  state.editableRows.forEach((row, index) => {
    const prevRow = state.editableRows[index - 1];
    const nextRow = state.editableRows[index + 1];
    const hasKey = row.key.trim() !== "";
    const isContinuation = Boolean(
      prevRow && hasKey && prevRow.key === row.key,
    );
    const isSectionEnd = !(nextRow && hasKey && nextRow.key === row.key);

    const rowEl = document.createElement("div");
    rowEl.className = "query-row";
    rowEl.dataset.rowId = row.id;
    if (isContinuation) {
      rowEl.classList.add("query-row-continuation");
    }
    if (isSectionEnd) {
      rowEl.classList.add("query-row-section-end");
    }

    const keyInput = document.createElement("input");
    keyInput.name = "key";
    keyInput.placeholder = "key";
    keyInput.value = row.key;
    keyInput.addEventListener("input", (event) => {
      const target = /** @type {HTMLInputElement} */ (event.target);
      updateRowValue(row.id, "key", target.value);
    });

    const valueInput = document.createElement("input");
    valueInput.name = "value";
    valueInput.placeholder = "value";
    valueInput.value = row.value;
    valueInput.addEventListener("input", (event) => {
      const target = /** @type {HTMLInputElement} */ (event.target);
      updateRowValue(row.id, "value", target.value);
    });

    const addButton = document.createElement("button");
    addButton.type = "button";
    addButton.className = "btn-icon";
    addButton.textContent = "+";
    addButton.title = "Add another value for this key";
    if (!isSectionEnd) {
      addButton.hidden = true;
      addButton.setAttribute("aria-hidden", "true");
      addButton.tabIndex = -1;
    }
    addButton.addEventListener("click", () => {
      const currentRow = state.editableRows.find(
        (candidate) => candidate.id === row.id,
      );
      insertRowAfter(row.id, currentRow ? currentRow.key : "");
    });

    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.className = "btn-icon";
    removeButton.textContent = "x";
    removeButton.title = "Remove this row";
    removeButton.addEventListener("click", () => {
      rowEl.classList.add("removed");
      window.setTimeout(() => {
        removeRow(row.id);
      }, 130);
    });

    if (isContinuation) {
      rowEl.append(valueInput, addButton, removeButton);
    } else {
      rowEl.append(keyInput, valueInput, addButton, removeButton);
    }
    editableRowsWrap.appendChild(rowEl);
  });
}

/**
 * @returns {void}
 */
function renderDerivedOutputs() {
  const output = buildGeneratedUrl(
    state.editableOrigin,
    state.editablePath,
    state.editableRows,
  );
  generatedUrlLink.href = output || "#";
  generatedUrlLink.setAttribute(
    "aria-label",
    output
      ? `Open generated URL: ${output}`
      : "Generated URL is not available yet",
  );
  generatedUrlOut.textContent = output || "(generated URL will appear here)";
  userUrlError.textContent = state.userUrlError;
  userUrlError.hidden = !state.userUrlError;
}

/**
 * @returns {void}
 */
function render() {
  userUrlInput.value = state.userUrl;
  titleInput.value = state.title;
  editableOriginInput.value = state.editableOrigin;
  editablePathInput.value = state.editablePath;

  renderDerivedOutputs();
  renderOriginalPanel();
  renderEditableRows();
  syncAppUrl();
}

/**
 * @param {string} id
 * @param {"key" | "value"} field
 * @param {string} value
 * @returns {void}
 */
function updateRowValue(id, field, value) {
  state = {
    ...state,
    editableRows: state.editableRows.map((row) =>
      row.id === id ? { ...row, [field]: value } : row,
    ),
  };
  renderDerivedOutputs();
  syncAppUrl();
}

/**
 * @param {string} id
 * @param {string} key
 * @returns {void}
 */
function insertRowAfter(id, key) {
  const idx = state.editableRows.findIndex((row) => row.id === id);
  const nextRows = [...state.editableRows];
  nextRows.splice(idx + 1, 0, createQueryRow(key, ""));
  state = {
    ...state,
    editableRows: nextRows,
  };
  render();
}

/**
 * @param {string} id
 * @returns {void}
 */
function removeRow(id) {
  const rows = state.editableRows.filter((row) => row.id !== id);
  state = {
    ...state,
    editableRows: rows.length > 0 ? rows : [createQueryRow("", "")],
  };
  render();
}

userUrlInput.addEventListener("input", (event) => {
  const target = /** @type {HTMLInputElement} */ (event.target);
  const next = parseUserUrlIntoState(target.value);
  state = {
    ...state,
    ...next,
    title: state.title,
  };
  render();
});

titleInput.addEventListener("input", (event) => {
  const target = /** @type {HTMLInputElement} */ (event.target);
  state = {
    ...state,
    title: target.value,
  };
  render();
});

editableOriginInput.addEventListener("input", (event) => {
  const target = /** @type {HTMLInputElement} */ (event.target);
  state = {
    ...state,
    editableOrigin: target.value,
  };
  render();
});

editablePathInput.addEventListener("input", (event) => {
  const target = /** @type {HTMLInputElement} */ (event.target);
  state = {
    ...state,
    editablePath: normalizePath(target.value),
  };
  render();
});

addRowButton.addEventListener("click", () => {
  state = {
    ...state,
    editableRows: [...state.editableRows, createQueryRow("", "")],
  };
  render();
});

hydrateFromAppUrl();
render();
syncExampleLink();
