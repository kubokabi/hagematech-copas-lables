/* =========================================================
   HGM TABLE TOOLS
   Auto Table Detection
   Excel-like Selective Copy + Session Row Labels

   Launcher Modes:
   - fixed    : floating fixed button, no drag, no minimize
   - shortcut : custom HTML trigger, Ctrl + T, draggable, minimizable
   ========================================================= */

const DEFAULT_OPTIONS = {
    tableSelector: "table",

    userId: "guest",
    pageKey: window.location.pathname,
    storagePrefix: "hgm_table_tools_labels",

    /*
    |--------------------------------------------------------------------------
    | Launcher
    |--------------------------------------------------------------------------
    | fixed    = floating fixed button, no minimize, no drag
    | shortcut = custom HTML trigger, Ctrl + T, draggable + minimizable
    |--------------------------------------------------------------------------
    */
    launcher: "fixed",

    autoDetectInterval: 700,
    autoDetectDuration: 8000,

    shortcut: {
        ctrl: true,
        shift: false,
        key: "T"
    },

    copyShortcut: {
        ctrl: true,
        shift: false,
        key: "C"
    },

    copy: {
        includeHiddenCells: false,
        excludeColumnTexts: []
    },

    labels: {
        colors: ["blue", "red", "yellow", "green", "gray", "purple"]
    },

    rowKey: {
        selector: null,
        columnIndex: null,
        headerCandidates: [
            "lot",
            "lot no",
            "lot_no",
            "lot number",
            "id",
            "deal id",
            "sku",
            "nik",
            "account",
            "account no",
            "account_no",
            "code",
            "number",
            "no"
        ]
    }
};

export function createTableTools(options = {}) {
    const attributeOptions = readAttributeOptions();
    const config = deepMerge(
        DEFAULT_OPTIONS,
        deepMerge(attributeOptions, options)
    );

    let mounted = false;
    let panelOpen = false;
    let panelMinimized = false;
    let activeView = "home";

    let copyMode = false;
    let labelMode = false;

    let observer = null;
    let autoDetectTimer = null;
    let autoDetectStopTimer = null;

    let lastTableSignature = "";
    let isSelectInteracting = false;
    let refreshLocked = false;

    let isMouseSelecting = false;
    let copyAnchorCell = null;
    let copyCurrentCell = null;
    let selectedCellMap = new Map();

    let labelAnchorRow = null;
    let selectedRowMap = new Map();

    let activeRowKeysForLabel = [];

    let isPanelDragging = false;
    let panelDragOffsetX = 0;
    let panelDragOffsetY = 0;
    let panelHasCustomPosition = false;

    function isFixedLauncher() {
        return normalize(config.launcher).toLowerCase() === "fixed";
    }

    function isShortcutLauncher() {
        return normalize(config.launcher).toLowerCase() === "shortcut";
    }

    function mount() {
        if (mounted) return api;

        injectRuntimeStyles();
        createUI();
        bindEvents();
        startAutoDetection();

        refreshTableList();
        renderStoredLabels();

        mounted = true;

        return api;
    }

    function destroy() {
        unbindEvents();
        stopAutoDetection();

        document.getElementById("hgmToolsFab")?.remove();
        document.getElementById("hgmToolsPanel")?.remove();
        document.getElementById("hgmToolsToast")?.remove();
        document.getElementById("hgmToolsLabelPopover")?.remove();

        document.body.classList.remove("hgm-copy-mode-active");
        document.body.classList.remove("hgm-label-mode-active");

        clearSelection(false);
        clearRowSelection(false);

        mounted = false;
    }

    function storageKey() {
        return [
            config.storagePrefix,
            config.userId || "guest",
            config.pageKey || window.location.pathname
        ].join(":");
    }

    function getStoredLabels() {
        try {
            const raw = sessionStorage.getItem(storageKey());
            return raw ? JSON.parse(raw) : {};
        } catch {
            return {};
        }
    }

    function saveStoredLabels(data) {
        sessionStorage.setItem(storageKey(), JSON.stringify(data || {}));
    }

    function createUI() {
        if (document.getElementById("hgmToolsPanel")) return;

        if (isFixedLauncher()) {
            const fab = document.createElement("button");
            fab.id = "hgmToolsFab";
            fab.type = "button";
            fab.className = "hgm-tools-fab";
            fab.title = "Table Tools";
            fab.innerHTML = `<span>☷</span>`;
            document.body.appendChild(fab);
        }

        const panel = document.createElement("div");
        panel.id = "hgmToolsPanel";
        panel.className = isShortcutLauncher()
            ? "hgm-tools-panel hgm-tools-panel-shortcut"
            : "hgm-tools-panel hgm-tools-panel-fixed";

        panel.innerHTML = `
            <div class="hgm-tools-header" data-hgm-drag-handle>
                <div class="hgm-tools-header-text">
                    <div class="hgm-tools-title">Table Tools</div>
                    <div class="hgm-tools-subtitle">Excel-like copy and temporary row labels</div>
                </div>

                <div class="hgm-tools-window-actions">
                    ${isShortcutLauncher()
                ? `<button type="button" class="hgm-tools-minimize" data-hgm-minimize title="Minimize">−</button>`
                : ``
            }
                    <button type="button" class="hgm-tools-close" data-hgm-close title="Close">×</button>
                </div>
            </div>

            <div class="hgm-tools-body">
                <div class="hgm-tools-view is-active" data-hgm-view="home">
                    <button type="button" class="hgm-tools-card" data-hgm-open="copy">
                        <strong>Selective Copy</strong>
                        <span>Select cells like Excel, then paste into Excel or Google Sheets.</span>
                    </button>

                    <button type="button" class="hgm-tools-card" data-hgm-open="label">
                        <strong>Session Row Labels</strong>
                        <span>Create temporary labels for selected rows without using a database.</span>
                    </button>
                </div>

                <div class="hgm-tools-view" data-hgm-view="copy">
                    <button type="button" class="hgm-tools-back" data-hgm-open="home">← Back</button>

                    <label class="hgm-tools-label">Detected Tables</label>
                    <select id="hgmToolsTableSelect" class="hgm-tools-select"></select>

                    <div class="hgm-tools-actions">
                        <button type="button" class="hgm-tools-button primary" data-hgm-copy-mode>
                            Enable Selection Mode
                        </button>

                        <button type="button" class="hgm-tools-button dark" data-hgm-copy-selected>
                            Copy Selected Cells
                        </button>

                        <button type="button" class="hgm-tools-button light" data-hgm-clear-selection>
                            Clear Selection
                        </button>
                    </div>

                    <div class="hgm-tools-info">
                        Click and drag to select a range. Shift + click extends the range.
                        Click a column header to select a column. Alt / Option + click a row to select a row.
                    </div>
                </div>

                <div class="hgm-tools-view" data-hgm-view="label">
                    <button type="button" class="hgm-tools-back" data-hgm-open="home">← Back</button>

                    <div class="hgm-tools-warning">
                        Labels are stored in sessionStorage. They are temporary and may disappear when the browser session ends.
                    </div>

                    <label class="hgm-tools-label">Detected Tables</label>
                    <select id="hgmToolsLabelTableSelect" class="hgm-tools-select"></select>

                    <div class="hgm-tools-actions">
                        <button type="button" class="hgm-tools-button primary" data-hgm-label-mode>
                            Enable Row Label Mode
                        </button>

                        <button type="button" class="hgm-tools-button light" data-hgm-refresh-labels>
                            Refresh Labels
                        </button>

                        <button type="button" class="hgm-tools-button light" data-hgm-clear-row-selection>
                            Clear Row Selection
                        </button>

                        <button type="button" class="hgm-tools-button danger" data-hgm-clear-labels>
                            Clear All Labels
                        </button>
                    </div>

                    <div class="hgm-tools-info">
                        Click one row to select it. Shift + click another row to select a row range.
                        Save label will apply to all selected rows.
                    </div>
                </div>
            </div>

            ${isShortcutLauncher()
                ? `
                    <div class="hgm-tools-minimized-bar" data-hgm-restore>
                        <span>☷</span>
                        <strong>Table Tools</strong>
                        <small>Click to restore</small>
                    </div>
                    `
                : ``
            }
        `;

        const toast = document.createElement("div");
        toast.id = "hgmToolsToast";
        toast.className = "hgm-tools-toast";

        const popover = document.createElement("div");
        popover.id = "hgmToolsLabelPopover";
        popover.className = "hgm-label-popover";
        popover.innerHTML = `
            <div class="hgm-label-popover-header">
                <strong>Create Row Label</strong>
                <span id="hgmActiveLotText">No row selected</span>
            </div>

            <div class="hgm-label-popover-body">
                <label class="hgm-tools-label">Label Name</label>
                <input id="hgmLabelNameInput" class="hgm-tools-input" type="text" placeholder="Example: Urgent, Hold, Recheck">

                <label class="hgm-tools-label">Label Color</label>
                <select id="hgmLabelColorInput" class="hgm-tools-select">
                    <option value="blue">Blue</option>
                    <option value="red">Red</option>
                    <option value="yellow">Yellow</option>
                    <option value="green">Green</option>
                    <option value="gray">Gray</option>
                    <option value="purple">Purple</option>
                </select>

                <button type="button" class="hgm-tools-button primary" data-hgm-save-label>
                    Save Label to Selected Rows
                </button>

                <button type="button" class="hgm-tools-button danger" data-hgm-remove-label>
                    Remove Label from Selected Rows
                </button>
            </div>
        `;

        document.body.appendChild(panel);
        document.body.appendChild(toast);
        document.body.appendChild(popover);
    }

    function bindEvents() {
        document.addEventListener("click", handleClick);
        document.addEventListener("keydown", handleShortcut);
        document.addEventListener("focusin", handleFocusIn);
        document.addEventListener("focusout", handleFocusOut);

        document.addEventListener("mousedown", handleMouseDown);
        document.addEventListener("mouseover", handleMouseOver);
        document.addEventListener("mouseup", handleMouseUp);

        document.addEventListener("mousemove", handlePanelDragMove);
        document.addEventListener("mouseup", handlePanelDragEnd);

        window.addEventListener("resize", handleResize);
    }

    function unbindEvents() {
        document.removeEventListener("click", handleClick);
        document.removeEventListener("keydown", handleShortcut);
        document.removeEventListener("focusin", handleFocusIn);
        document.removeEventListener("focusout", handleFocusOut);

        document.removeEventListener("mousedown", handleMouseDown);
        document.removeEventListener("mouseover", handleMouseOver);
        document.removeEventListener("mouseup", handleMouseUp);

        document.removeEventListener("mousemove", handlePanelDragMove);
        document.removeEventListener("mouseup", handlePanelDragEnd);

        window.removeEventListener("resize", handleResize);
    }

    function handleFocusIn(event) {
        if (
            event.target?.id === "hgmToolsTableSelect" ||
            event.target?.id === "hgmToolsLabelTableSelect"
        ) {
            isSelectInteracting = true;
        }
    }

    function handleFocusOut(event) {
        if (
            event.target?.id === "hgmToolsTableSelect" ||
            event.target?.id === "hgmToolsLabelTableSelect"
        ) {
            setTimeout(() => {
                isSelectInteracting = false;
            }, 250);
        }
    }

    function handleResize() {
        if (isShortcutLauncher()) {
            keepPanelInsideViewport();
        }
    }

    function handleClick(event) {
        const target = event.target;

        if (target.closest("[data-hgm-table-tools-trigger]")) {
            togglePanel();
            return;
        }

        if (target.closest("#hgmToolsFab")) {
            togglePanel();
            return;
        }

        if (target.closest("[data-hgm-close]")) {
            closePanel();
            return;
        }

        if (target.closest("[data-hgm-minimize]")) {
            if (isShortcutLauncher()) {
                minimizePanel();
            }
            return;
        }

        if (target.closest("[data-hgm-restore]")) {
            if (isShortcutLauncher()) {
                restorePanel();
            }
            return;
        }

        const openButton = target.closest("[data-hgm-open]");
        if (openButton) {
            restorePanel();
            openView(openButton.dataset.hgmOpen);
            return;
        }

        if (target.closest("[data-hgm-copy-mode]")) {
            toggleCopyMode();
            return;
        }

        if (target.closest("[data-hgm-copy-selected]")) {
            copySelectedCells();
            return;
        }

        if (target.closest("[data-hgm-clear-selection]")) {
            clearSelection();
            return;
        }

        if (target.closest("[data-hgm-label-mode]")) {
            toggleLabelMode();
            return;
        }

        if (target.closest("[data-hgm-refresh-labels]")) {
            renderStoredLabels();
            showToast("Labels refreshed.");
            return;
        }

        if (target.closest("[data-hgm-clear-row-selection]")) {
            clearRowSelection();
            return;
        }

        if (target.closest("[data-hgm-clear-labels]")) {
            clearAllLabels();
            return;
        }

        if (target.closest("[data-hgm-save-label]")) {
            saveActiveLabel();
            return;
        }

        if (target.closest("[data-hgm-remove-label]")) {
            removeActiveLabel();
            return;
        }

        if (labelMode) {
            const row = target.closest("tbody tr");
            const table = target.closest("table");

            if (row && table && isUsableTable(table) && isSelectedLabelTable(table)) {
                event.preventDefault();
                handleRowLabelSelection(row, event);
                return;
            }
        }

        const panel = document.getElementById("hgmToolsPanel");
        const popover = document.getElementById("hgmToolsLabelPopover");

        if (
            panel?.classList.contains("is-open") &&
            !target.closest("#hgmToolsPanel") &&
            !target.closest("#hgmToolsFab") &&
            !target.closest("[data-hgm-table-tools-trigger]")
        ) {
            closePanel();
        }

        if (
            popover?.classList.contains("is-open") &&
            !target.closest("#hgmToolsLabelPopover")
        ) {
            closeLabelPopover();
        }
    }

    function handleMouseDown(event) {
        const dragHandle = event.target.closest("[data-hgm-drag-handle]");

        if (
            isShortcutLauncher() &&
            dragHandle &&
            event.target.closest("#hgmToolsPanel")
        ) {
            if (
                event.target.closest("button") ||
                event.target.closest("input") ||
                event.target.closest("select") ||
                event.target.closest("textarea")
            ) {
                return;
            }

            startPanelDrag(event);
            return;
        }

        if (!copyMode) return;

        const cell = event.target.closest("td, th");
        const table = event.target.closest("table");

        if (!cell || !table) return;
        if (!isUsableTable(table) || !isSelectedCopyTable(table)) return;
        if (!isVisibleCell(cell)) return;

        event.preventDefault();

        if (cell.matches("th")) {
            selectColumnByHeader(cell);
            return;
        }

        if (event.altKey) {
            selectRowByCell(cell);
            return;
        }

        if (event.shiftKey && copyAnchorCell) {
            copyCurrentCell = cell;
            selectCellRange(copyAnchorCell, copyCurrentCell);
            return;
        }

        isMouseSelecting = true;
        copyAnchorCell = cell;
        copyCurrentCell = cell;

        clearSelection(false);
        selectCellRange(copyAnchorCell, copyCurrentCell);
    }

    function handleMouseOver(event) {
        if (!copyMode || !isMouseSelecting) return;

        const cell = event.target.closest("td, th");
        const table = event.target.closest("table");

        if (!cell || !table) return;
        if (!isUsableTable(table) || !isSelectedCopyTable(table)) return;
        if (cell.matches("th")) return;
        if (!isSameTable(copyAnchorCell, cell)) return;

        copyCurrentCell = cell;
        selectCellRange(copyAnchorCell, copyCurrentCell);
    }

    function handleMouseUp() {
        if (!copyMode) return;

        if (isMouseSelecting) {
            isMouseSelecting = false;
            showToast(`${selectedCellMap.size} cell(s) selected.`);
        }
    }

    function handleShortcut(event) {
        const key = String(event.key || "").toUpperCase();

        const launcherKey = String(config.shortcut.key || "T").toUpperCase();
        const launcherCtrlOk = config.shortcut.ctrl ? event.ctrlKey || event.metaKey : true;
        const launcherShiftOk = config.shortcut.shift ? event.shiftKey : true;

        if (launcherCtrlOk && launcherShiftOk && key === launcherKey) {
            event.preventDefault();
            togglePanel();
            return;
        }

        const copyKey = String(config.copyShortcut.key || "C").toUpperCase();
        const copyCtrlOk = config.copyShortcut.ctrl ? event.ctrlKey || event.metaKey : true;
        const copyShiftOk = config.copyShortcut.shift ? event.shiftKey : true;

        if (copyCtrlOk && copyShiftOk && key === copyKey && copyMode && selectedCellMap.size) {
            event.preventDefault();
            copySelectedCells();
            return;
        }

        if (event.key === "Escape") {
            closePanel();
            closeLabelPopover();
            clearSelection(false);
            clearRowSelection(false);
        }
    }

    function startPanelDrag(event) {
        const panel = document.getElementById("hgmToolsPanel");
        if (!panel) return;

        if (!isShortcutLauncher()) return;

        restorePanel();

        const rect = panel.getBoundingClientRect();

        isPanelDragging = true;
        panelDragOffsetX = event.clientX - rect.left;
        panelDragOffsetY = event.clientY - rect.top;
        panelHasCustomPosition = true;

        panel.classList.add("is-dragging");
        panel.style.left = `${rect.left}px`;
        panel.style.top = `${rect.top}px`;
        panel.style.right = "auto";
        panel.style.bottom = "auto";

        event.preventDefault();
    }

    function handlePanelDragMove(event) {
        if (!isShortcutLauncher()) return;
        if (!isPanelDragging) return;

        const panel = document.getElementById("hgmToolsPanel");
        if (!panel) return;

        const panelWidth = panel.offsetWidth;
        const panelHeight = panel.offsetHeight;

        const margin = 10;

        let left = event.clientX - panelDragOffsetX;
        let top = event.clientY - panelDragOffsetY;

        left = Math.max(margin, Math.min(left, window.innerWidth - panelWidth - margin));
        top = Math.max(margin, Math.min(top, window.innerHeight - panelHeight - margin));

        panel.style.left = `${left}px`;
        panel.style.top = `${top}px`;
        panel.style.right = "auto";
        panel.style.bottom = "auto";
    }

    function handlePanelDragEnd() {
        if (!isPanelDragging) return;

        const panel = document.getElementById("hgmToolsPanel");
        if (panel) {
            panel.classList.remove("is-dragging");
        }

        isPanelDragging = false;
    }

    function keepPanelInsideViewport() {
        const panel = document.getElementById("hgmToolsPanel");
        if (!panel || !panelHasCustomPosition) return;

        const rect = panel.getBoundingClientRect();
        const margin = 10;

        let left = rect.left;
        let top = rect.top;

        left = Math.max(margin, Math.min(left, window.innerWidth - rect.width - margin));
        top = Math.max(margin, Math.min(top, window.innerHeight - rect.height - margin));

        panel.style.left = `${left}px`;
        panel.style.top = `${top}px`;
    }

    function minimizePanel() {
        if (!isShortcutLauncher()) return;

        const panel = document.getElementById("hgmToolsPanel");
        if (!panel) return;

        panelMinimized = true;
        panel.classList.add("is-minimized");
        panel.classList.add("is-open");
        panelOpen = true;

        closeLabelPopover();
    }

    function restorePanel() {
        const panel = document.getElementById("hgmToolsPanel");
        if (!panel) return;

        panelMinimized = false;
        panel.classList.remove("is-minimized");
        panel.classList.add("is-open");
        panelOpen = true;

        refreshTableList();
    }

    function togglePanel() {
        if (!isSelectInteracting) {
            refreshTableList();
        }

        const panel = document.getElementById("hgmToolsPanel");
        if (!panel) return;

        if (isShortcutLauncher() && panelMinimized) {
            restorePanel();
            return;
        }

        panelOpen = !panelOpen;
        panel.classList.toggle("is-open", panelOpen);

        if (panelOpen) {
            panel.classList.remove("is-minimized");
            panelMinimized = false;
        }
    }

    function closePanel() {
        panelOpen = false;
        panelMinimized = false;

        const panel = document.getElementById("hgmToolsPanel");
        if (!panel) return;

        panel.classList.remove("is-open");
        panel.classList.remove("is-minimized");
    }

    function openView(view) {
        activeView = view || "home";

        if (!isSelectInteracting) {
            refreshTableList();
        }

        document.querySelectorAll("[data-hgm-view]").forEach((element) => {
            element.classList.toggle(
                "is-active",
                element.dataset.hgmView === activeView
            );
        });
    }

    function startAutoDetection() {
        safeRefreshTables();

        autoDetectTimer = setInterval(() => {
            safeRefreshTables();
        }, config.autoDetectInterval);

        autoDetectStopTimer = setTimeout(() => {
            if (autoDetectTimer) {
                clearInterval(autoDetectTimer);
                autoDetectTimer = null;
            }
        }, config.autoDetectDuration);

        if ("MutationObserver" in window) {
            observer = new MutationObserver(debounce(() => {
                safeRefreshTables();
            }, 250));

            observer.observe(document.body, {
                childList: true,
                subtree: true
            });
        }
    }

    function stopAutoDetection() {
        if (autoDetectTimer) {
            clearInterval(autoDetectTimer);
            autoDetectTimer = null;
        }

        if (autoDetectStopTimer) {
            clearTimeout(autoDetectStopTimer);
            autoDetectStopTimer = null;
        }

        if (observer) {
            observer.disconnect();
            observer = null;
        }
    }

    function safeRefreshTables() {
        if (refreshLocked) return;
        if (isSelectInteracting) return;

        const tables = getTables();
        const signature = getTableSignature(tables);

        if (signature === lastTableSignature) return;

        refreshLocked = true;
        lastTableSignature = signature;

        refreshTableList();
        renderStoredLabels();

        setTimeout(() => {
            refreshLocked = false;
        }, 120);
    }

    function getTableSignature(tables) {
        return tables
            .map((table, index) => {
                const rowCount = table.querySelectorAll("tr").length;
                const cellCount = table.querySelectorAll("td, th").length;
                const title = getNearestReadableTitle(table) || "";
                return `${index}:${title}:${rowCount}:${cellCount}`;
            })
            .join("|");
    }

    function refreshTableList() {
        const tables = getTables();

        syncTableSelect("hgmToolsTableSelect", tables);
        syncTableSelect("hgmToolsLabelTableSelect", tables);
    }

    function syncTableSelect(selectId, tables) {
        const select = document.getElementById(selectId);
        if (!select) return;

        if (document.activeElement === select || isSelectInteracting) return;

        const currentValue = select.value;

        const nextOptions = tables.map((table, index) => {
            ensureTableId(table, index);

            return {
                value: table.dataset.hgmTableUid,
                text: getTableLabel(table, index)
            };
        });

        const currentSignature = Array.from(select.options)
            .map((option) => `${option.value}:${option.textContent}`)
            .join("|");

        const nextSignature = nextOptions
            .map((option) => `${option.value}:${option.text}`)
            .join("|");

        if (currentSignature === nextSignature) return;

        select.innerHTML = "";

        if (!nextOptions.length) {
            const option = document.createElement("option");
            option.value = "";
            option.textContent = "No table detected";
            select.appendChild(option);
            return;
        }

        nextOptions.forEach((item) => {
            const option = document.createElement("option");
            option.value = item.value;
            option.textContent = item.text;
            select.appendChild(option);
        });

        if (currentValue && nextOptions.some((item) => item.value === currentValue)) {
            select.value = currentValue;
        }
    }

    function getTables() {
        return Array.from(document.querySelectorAll(config.tableSelector || "table"))
            .filter(isUsableTable)
            .map((table, index) => {
                ensureTableId(table, index);
                return table;
            });
    }

    function isUsableTable(table) {
        if (!table) return false;

        if (table.closest("#hgmToolsPanel")) return false;
        if (table.closest("#hgmToolsLabelPopover")) return false;

        const rows = table.querySelectorAll("tr");
        const cells = table.querySelectorAll("td, th");

        if (rows.length < 1) return false;
        if (cells.length < 2) return false;

        const style = window.getComputedStyle(table);
        if (style.display === "none" || style.visibility === "hidden") return false;

        return true;
    }

    function ensureTableId(table, index) {
        if (!table.dataset.hgmTableUid) {
            const label = getNearestReadableTitle(table) || `table-${index + 1}`;
            const safeLabel = slugify(label).slice(0, 48) || `table-${index + 1}`;

            table.dataset.hgmTableUid = `hgm-${safeLabel}-${index + 1}`;
        }
    }

    function getSelectedCopyTable() {
        return getTableFromSelect("hgmToolsTableSelect");
    }

    function getSelectedLabelTable() {
        return getTableFromSelect("hgmToolsLabelTableSelect");
    }

    function getTableFromSelect(selectId) {
        const select = document.getElementById(selectId);
        const tables = getTables();

        if (!tables.length) return null;

        if (!select || !select.value) return tables[0];

        return tables.find((table) => table.dataset.hgmTableUid === select.value) || tables[0];
    }

    function isSelectedCopyTable(table) {
        const selected = getSelectedCopyTable();
        return selected ? table === selected : true;
    }

    function isSelectedLabelTable(table) {
        const selected = getSelectedLabelTable();
        return selected ? table === selected : true;
    }

    function getTableLabel(table, index) {
        const readableTitle = getNearestReadableTitle(table);

        if (readableTitle) return `${index + 1}. ${readableTitle}`;

        const headers = getHeaderTexts(table);
        if (headers.length) return `${index + 1}. ${headers.slice(0, 3).join(" / ")}`;

        return `${index + 1}. Auto-detected table`;
    }

    function getNearestReadableTitle(table) {
        const section = table.closest("section, article, .card, .grid-section, .hagegrid, .hgm-grid");

        const titleSelector = [
            ".section-label",
            ".title",
            ".grid-title",
            ".hagegrid-title",
            ".card-title",
            "h1",
            "h2",
            "h3",
            "h4",
            "caption"
        ].join(",");

        const localTitle = section?.querySelector(titleSelector);
        if (localTitle) {
            const text = normalize(localTitle.innerText);
            if (text) return text;
        }

        const caption = table.querySelector("caption");
        if (caption) {
            const text = normalize(caption.innerText);
            if (text) return text;
        }

        const parentWithId = table.closest("[id]");
        if (parentWithId?.id) return parentWithId.id;

        if (table.id) return table.id;

        return "";
    }

    function getHeaderTexts(table) {
        const headerCells = table.querySelectorAll("thead th");

        if (headerCells.length) {
            return Array.from(headerCells)
                .map((th) => normalize(th.innerText))
                .filter(Boolean);
        }

        const firstRowCells = table.querySelectorAll("tr:first-child th, tr:first-child td");

        return Array.from(firstRowCells)
            .map((cell) => normalize(cell.innerText))
            .filter(Boolean);
    }

    function toggleCopyMode() {
        copyMode = !copyMode;

        if (copyMode && labelMode) {
            toggleLabelMode(false);
        }

        document.body.classList.toggle("hgm-copy-mode-active", copyMode);

        const button = document.querySelector("[data-hgm-copy-mode]");
        if (button) {
            button.textContent = copyMode
                ? "Disable Selection Mode"
                : "Enable Selection Mode";
        }

        if (copyMode && isShortcutLauncher()) {
            minimizePanel();
        }

        showToast(copyMode ? "Selection mode enabled." : "Selection mode disabled.");
    }

    function toggleLabelMode(forceValue = null) {
        labelMode = forceValue === null ? !labelMode : Boolean(forceValue);

        if (labelMode && copyMode) {
            toggleCopyMode();
        }

        document.body.classList.toggle("hgm-label-mode-active", labelMode);

        const button = document.querySelector("[data-hgm-label-mode]");
        if (button) {
            button.textContent = labelMode
                ? "Disable Row Label Mode"
                : "Enable Row Label Mode";
        }

        if (labelMode && isShortcutLauncher()) {
            minimizePanel();
        }

        showToast(labelMode ? "Row label mode enabled." : "Row label mode disabled.");
    }

    function selectCellRange(startCell, endCell) {
        if (!startCell || !endCell) return;
        if (!isSameTable(startCell, endCell)) return;

        clearSelection(false);

        const table = startCell.closest("table");
        const start = getCellPosition(startCell);
        const end = getCellPosition(endCell);

        const minRow = Math.min(start.rowIndex, end.rowIndex);
        const maxRow = Math.max(start.rowIndex, end.rowIndex);
        const minCol = Math.min(start.colIndex, end.colIndex);
        const maxCol = Math.max(start.colIndex, end.colIndex);

        const rows = Array.from(table.querySelectorAll("tr"));

        rows.forEach((row, rowIndex) => {
            if (rowIndex < minRow || rowIndex > maxRow) return;

            const cells = getVisibleCells(row);

            cells.forEach((cell, colIndex) => {
                if (colIndex < minCol || colIndex > maxCol) return;
                addCellToSelection(cell);
            });
        });
    }

    function selectColumnByHeader(headerCell) {
        const table = headerCell.closest("table");
        const position = getCellPosition(headerCell);

        clearSelection(false);
        copyAnchorCell = headerCell;

        const rows = Array.from(table.querySelectorAll("tr"));

        rows.forEach((row) => {
            const cells = getVisibleCells(row);
            const cell = cells[position.colIndex];

            if (cell) addCellToSelection(cell);
        });

        showToast(`Column selected: ${selectedCellMap.size} cell(s).`);
    }

    function selectRowByCell(cell) {
        const row = cell.closest("tr");

        clearSelection(false);
        copyAnchorCell = cell;

        getVisibleCells(row).forEach(addCellToSelection);

        showToast(`Row selected: ${selectedCellMap.size} cell(s).`);
    }

    function addCellToSelection(cell) {
        if (!cell || !isVisibleCell(cell)) return;

        const meta = getCellMeta(cell);
        const key = meta.key;

        selectedCellMap.set(key, {
            cell,
            meta
        });

        cell.classList.add("hgm-selected-cell");
    }

    async function copySelectedCells() {
        if (!selectedCellMap.size) {
            showToast("No cells selected.");
            return;
        }

        const matrix = buildSelectedMatrix();
        const tsv = matrixToTsv(matrix);
        const html = matrixToHtml(matrix);

        try {
            if (navigator.clipboard && window.ClipboardItem) {
                await navigator.clipboard.write([
                    new ClipboardItem({
                        "text/html": new Blob([html], { type: "text/html" }),
                        "text/plain": new Blob([tsv], { type: "text/plain" })
                    })
                ]);
            } else if (navigator.clipboard?.writeText) {
                await navigator.clipboard.writeText(tsv);
            } else {
                fallbackCopy(tsv);
            }

            showToast("Selected cells copied.");
        } catch {
            fallbackCopy(tsv);
            showToast("Selected cells copied.");
        }
    }

    function buildSelectedMatrix() {
        const items = Array.from(selectedCellMap.values())
            .map((item) => item.meta)
            .sort((a, b) => {
                if (a.tableIndex !== b.tableIndex) return a.tableIndex - b.tableIndex;
                if (a.rowIndex !== b.rowIndex) return a.rowIndex - b.rowIndex;
                return a.colIndex - b.colIndex;
            });

        const rowKeys = [...new Set(items.map((item) => `${item.tableIndex}:${item.rowIndex}`))];
        const colIndexes = [...new Set(items.map((item) => item.colIndex))];

        const rowMap = new Map(rowKeys.map((value, index) => [value, index]));
        const colMap = new Map(colIndexes.map((value, index) => [value, index]));

        const matrix = Array.from({ length: rowKeys.length }, () =>
            Array.from({ length: colIndexes.length }, () => "")
        );

        items.forEach((item) => {
            const rowKey = `${item.tableIndex}:${item.rowIndex}`;
            const r = rowMap.get(rowKey);
            const c = colMap.get(item.colIndex);

            matrix[r][c] = item.value;
        });

        return matrix;
    }

    function getCellPosition(cell) {
        const row = cell.closest("tr");
        const table = cell.closest("table");
        const rows = Array.from(table.querySelectorAll("tr"));
        const cells = getVisibleCells(row);

        return {
            table,
            row,
            rowIndex: rows.indexOf(row),
            colIndex: cells.indexOf(cell)
        };
    }

    function getCellMeta(cell) {
        const position = getCellPosition(cell);
        const tables = getTables();

        return {
            key: `${position.table.dataset.hgmTableUid}:${position.rowIndex}:${position.colIndex}`,
            tableIndex: tables.indexOf(position.table),
            tableUid: position.table.dataset.hgmTableUid || "",
            rowIndex: position.rowIndex,
            colIndex: position.colIndex,
            value: cleanCellText(cell)
        };
    }

    function clearSelection(show = true) {
        selectedCellMap.forEach((item) => {
            item.cell.classList.remove("hgm-selected-cell");
        });

        selectedCellMap.clear();

        if (show && mounted) {
            showToast("Selection cleared.");
        }
    }

    function handleRowLabelSelection(row, event) {
        if (!labelAnchorRow) {
            labelAnchorRow = row;
        }

        if (event.shiftKey && labelAnchorRow && isSameTable(labelAnchorRow, row)) {
            selectRowRange(labelAnchorRow, row);
        } else {
            clearRowSelection(false);
            labelAnchorRow = row;
            addRowToSelection(row);
        }

        const selectedRows = Array.from(selectedRowMap.values()).map((item) => item.row);
        const rowKeys = selectedRows.map(getRowKeyFromRow).filter(Boolean);

        activeRowKeysForLabel = rowKeys;

        openLabelPopoverForRows(rowKeys, row, event.clientX, event.clientY);
    }

    function selectRowRange(startRow, endRow) {
        if (!startRow || !endRow) return;
        if (!isSameTable(startRow, endRow)) return;

        clearRowSelection(false);

        const table = startRow.closest("table");
        const rows = Array.from(table.querySelectorAll("tbody tr"));

        const startIndex = rows.indexOf(startRow);
        const endIndex = rows.indexOf(endRow);

        const min = Math.min(startIndex, endIndex);
        const max = Math.max(startIndex, endIndex);

        rows.forEach((row, index) => {
            if (index >= min && index <= max) {
                addRowToSelection(row);
            }
        });

        showToast(`${selectedRowMap.size} row(s) selected.`);
    }

    function addRowToSelection(row) {
        const table = row.closest("table");
        const rows = Array.from(table.querySelectorAll("tbody tr"));
        const rowIndex = rows.indexOf(row);
        const key = `${table.dataset.hgmTableUid}:${rowIndex}`;

        selectedRowMap.set(key, {
            row,
            rowIndex
        });

        row.classList.add("hgm-selected-row");
    }

    function clearRowSelection(show = true) {
        selectedRowMap.forEach((item) => {
            item.row.classList.remove("hgm-selected-row");
        });

        selectedRowMap.clear();
        activeRowKeysForLabel = [];

        if (show && mounted) {
            showToast("Row selection cleared.");
        }
    }

    function openLabelPopoverForRows(rowKeys, row, x, y) {
        if (!rowKeys.length) {
            showToast("No row selected.");
            return;
        }

        const popover = document.getElementById("hgmToolsLabelPopover");
        const lotText = document.getElementById("hgmActiveLotText");

        if (!popover) return;

        if (lotText) {
            lotText.textContent =
                rowKeys.length === 1
                    ? getDisplayRowKey(rowKeys[0])
                    : `${rowKeys.length} rows selected`;
        }

        const input = document.getElementById("hgmLabelNameInput");
        const color = document.getElementById("hgmLabelColorInput");
        const stored = getStoredLabels();

        if (rowKeys.length === 1 && stored[rowKeys[0]]) {
            input.value = stored[rowKeys[0]].text || "";
            color.value = stored[rowKeys[0]].color || "blue";
        } else {
            input.value = "";
            color.value = "blue";
        }

        const width = 320;
        const margin = 14;

        const rowRect = row.getBoundingClientRect();

        let left = rowRect.left + window.scrollX + 24;
        let top = rowRect.bottom + window.scrollY + 12;

        const maxLeft = window.scrollX + window.innerWidth - width - margin;

        if (left > maxLeft) {
            left = maxLeft;
        }

        if (left < window.scrollX + margin) {
            left = window.scrollX + margin;
        }

        popover.style.position = "absolute";
        popover.style.left = `${left}px`;
        popover.style.top = `${top}px`;
        popover.classList.add("is-open");
    }

    function closeLabelPopover() {
        document
            .getElementById("hgmToolsLabelPopover")
            ?.classList.remove("is-open");
    }

    function saveActiveLabel() {
        if (!activeRowKeysForLabel.length) {
            showToast("No selected row.");
            return;
        }

        const nameInput = document.getElementById("hgmLabelNameInput");
        const colorInput = document.getElementById("hgmLabelColorInput");

        const labelText = normalize(nameInput?.value || "");
        const labelColor = colorInput?.value || "blue";

        if (!labelText) {
            showToast("Please enter a label name.");
            return;
        }

        const labels = getStoredLabels();

        activeRowKeysForLabel.forEach((rowKey) => {
            labels[rowKey] = {
                text: labelText,
                color: labelColor,
                updatedAt: new Date().toISOString()
            };
        });

        saveStoredLabels(labels);
        renderStoredLabels();
        closeLabelPopover();

        showToast(`Label saved to ${activeRowKeysForLabel.length} row(s).`);
    }

    function removeActiveLabel() {
        if (!activeRowKeysForLabel.length) return;

        const labels = getStoredLabels();

        activeRowKeysForLabel.forEach((rowKey) => {
            delete labels[rowKey];
        });

        saveStoredLabels(labels);
        renderStoredLabels();
        closeLabelPopover();

        showToast(`Label removed from ${activeRowKeysForLabel.length} row(s).`);
    }

    function clearAllLabels() {
        sessionStorage.removeItem(storageKey());
        renderStoredLabels();

        showToast("All temporary labels cleared.");
    }

    function renderStoredLabels() {
        clearRenderedLabels();

        const labels = getStoredLabels();

        getTables().forEach((table) => {
            table.querySelectorAll("tbody tr").forEach((row) => {
                const rowKey = getRowKeyFromRow(row);

                if (!rowKey || !labels[rowKey]) return;

                renderLabel(row, rowKey, labels[rowKey]);
            });
        });
    }

    function clearRenderedLabels() {
        document.querySelectorAll(".hgm-lot-label").forEach((label) => {
            label.remove();
        });

        document.querySelectorAll("[data-hgm-label-color]").forEach((row) => {
            row.removeAttribute("data-hgm-label-color");
        });
    }

    function renderLabel(row, rowKey, label) {
        row.setAttribute("data-hgm-label-color", label.color || "blue");

        const targetCell = getLabelAnchorCell(row);
        if (!targetCell) return;

        const badge = document.createElement("span");
        badge.className = `hgm-lot-label hgm-lot-label-${label.color || "blue"}`;
        badge.textContent = label.text;
        badge.title = `Temporary session label for ${getDisplayRowKey(rowKey)}`;

        targetCell.appendChild(badge);
    }

    function getLabelAnchorCell(row) {
        if (config.rowKey.selector) {
            const element = row.querySelector(config.rowKey.selector);
            if (element) return element;
        }

        const cells = Array.from(row.querySelectorAll("td")).filter(isVisibleCell);
        if (!cells.length) return null;

        const table = row.closest("table");
        const index = detectRowKeyColumnIndex(table);

        if (index !== null && cells[index]) {
            return cells[index];
        }

        return cells[0];
    }

    function getRowKeyFromRow(row) {
        if (!row) return "";

        const table = row.closest("table");
        if (!table) return "";

        ensureTableId(table, getTables().indexOf(table));

        const cells = Array.from(row.querySelectorAll("td")).filter(isVisibleCell);
        if (!cells.length) return "";

        if (config.rowKey.selector) {
            const element = row.querySelector(config.rowKey.selector);
            const value = normalize(element?.innerText || element?.value || "");

            if (value) {
                return `${table.dataset.hgmTableUid}::${value}`;
            }
        }

        if (
            typeof config.rowKey.columnIndex === "number" &&
            config.rowKey.columnIndex >= 0 &&
            cells[config.rowKey.columnIndex]
        ) {
            const value = cleanCellText(cells[config.rowKey.columnIndex]);

            if (value) {
                return `${table.dataset.hgmTableUid}::${value}`;
            }
        }

        const detectedIndex = detectRowKeyColumnIndex(table);

        if (detectedIndex !== null && cells[detectedIndex]) {
            const value = cleanCellText(cells[detectedIndex]);

            if (value) {
                return `${table.dataset.hgmTableUid}::${value}`;
            }
        }

        const fallbackValue = cells
            .map(cleanCellText)
            .find((text) => {
                return text &&
                    text !== "-" &&
                    text.length <= 120 &&
                    !isCheckboxLikeText(text);
            });

        if (fallbackValue) {
            return `${table.dataset.hgmTableUid}::${fallbackValue}`;
        }

        const rowIndex = Array.from(table.querySelectorAll("tbody tr")).indexOf(row);

        return `${table.dataset.hgmTableUid}::row-${rowIndex}`;
    }

    function detectRowKeyColumnIndex(table) {
        if (!table) return 0;

        const bodyRows = Array.from(table.querySelectorAll("tbody tr"))
            .filter((row) => {
                const cells = Array.from(row.querySelectorAll("td")).filter(isVisibleCell);
                if (!cells.length) return false;

                const text = normalize(row.innerText);
                if (!text) return false;

                if (/\|\s*\d+\s*rows/i.test(text)) return false;

                return true;
            });

        if (!bodyRows.length) return 0;

        const maxCols = Math.max(
            ...bodyRows.map((row) => Array.from(row.querySelectorAll("td")).filter(isVisibleCell).length)
        );

        const scores = [];

        for (let colIndex = 0; colIndex < maxCols; colIndex++) {
            const values = bodyRows
                .map((row) => {
                    const cells = Array.from(row.querySelectorAll("td")).filter(isVisibleCell);
                    return cleanCellText(cells[colIndex]);
                })
                .filter((value) => {
                    return value &&
                        value !== "-" &&
                        value.length <= 120 &&
                        !isCheckboxLikeText(value);
                });

            if (!values.length) continue;

            const uniqueCount = new Set(values).size;
            const uniqueRatio = uniqueCount / values.length;

            let score = 0;

            score += uniqueRatio * 100;

            const sample = values.slice(0, 8).join(" ");

            if (/[A-Z]{2,}[-_/]?\d+/i.test(sample)) score += 80;
            if (/\d{2,}[-_/]\d{2,}/.test(sample)) score += 60;
            if (/^[A-Z0-9][A-Z0-9\-_/]{2,}$/i.test(values[0])) score += 30;

            if (uniqueRatio < 0.8) score -= 70;
            if (looksLikeStatusOrCategory(values)) score -= 60;

            if (colIndex === 0 && values.every((v) => v.length <= 2)) score -= 80;

            scores.push({
                colIndex,
                score,
                uniqueRatio,
                uniqueCount
            });
        }

        if (!scores.length) return 0;

        scores.sort((a, b) => b.score - a.score);

        return scores[0].colIndex;
    }

    function isCheckboxLikeText(value) {
        const text = normalize(value).toLowerCase();

        return text === "" ||
            text === "on" ||
            text === "true" ||
            text === "false" ||
            text === "✓" ||
            text === "✔" ||
            text === "☑" ||
            text === "☐";
    }

    function looksLikeStatusOrCategory(values) {
        const normalized = values.map((value) => normalize(value).toLowerCase());

        const categoryWords = [
            "active",
            "inactive",
            "completed",
            "pending",
            "review",
            "failed",
            "paused",
            "enterprise",
            "sme",
            "mid market",
            "jakarta",
            "surabaya",
            "bandung",
            "makassar",
            "pontianak"
        ];

        const hitCount = normalized.filter((value) => categoryWords.includes(value)).length;

        return hitCount / normalized.length >= 0.5;
    }

    function matrixToTsv(matrix) {
        return matrix
            .map((row) =>
                row
                    .map((value) =>
                        String(value || "")
                            .replace(/\t/g, " ")
                            .replace(/\r?\n/g, " ")
                            .trim()
                    )
                    .join("\t")
            )
            .join("\n");
    }

    function matrixToHtml(matrix) {
        const rows = matrix
            .map((row) => {
                const cells = row
                    .map((value) => `<td>${escapeHtml(value)}</td>`)
                    .join("");

                return `<tr>${cells}</tr>`;
            })
            .join("");

        return `
            <!DOCTYPE html>
            <html>
                <head><meta charset="utf-8"></head>
                <body>
                    <table border="1" cellspacing="0" cellpadding="4">
                        <tbody>${rows}</tbody>
                    </table>
                </body>
            </html>
        `;
    }

    function fallbackCopy(text) {
        const textarea = document.createElement("textarea");

        textarea.value = text;
        textarea.setAttribute("readonly", "readonly");
        textarea.style.position = "fixed";
        textarea.style.left = "-9999px";
        textarea.style.top = "-9999px";

        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        textarea.remove();
    }

    function isSameTable(a, b) {
        if (!a || !b) return false;
        return a.closest("table") === b.closest("table");
    }

    function getVisibleCells(row) {
        return Array.from(row.children)
            .filter((child) => child.matches("td, th"))
            .filter(isVisibleCell);
    }

    function isVisibleCell(cell) {
        if (!cell) return false;
        if (config.copy.includeHiddenCells) return true;

        const style = window.getComputedStyle(cell);

        if (style.display === "none") return false;
        if (style.visibility === "hidden") return false;

        return true;
    }

    function cleanCellText(cell) {
        if (!cell) return "";

        const clone = cell.cloneNode(true);

        clone.querySelectorAll(".hgm-lot-label, script, style").forEach((element) => {
            element.remove();
        });

        clone.querySelectorAll("button, input, select, textarea").forEach((element) => {
            const replacement = document.createElement("span");
            replacement.textContent = normalize(
                element.value ||
                element.innerText ||
                element.getAttribute("title") ||
                ""
            );

            element.replaceWith(replacement);
        });

        return normalize(clone.innerText || clone.textContent || "");
    }

    function showToast(message) {
        const toast = document.getElementById("hgmToolsToast");
        if (!toast) return;

        toast.textContent = message;
        toast.classList.add("is-open");

        clearTimeout(showToast.timer);
        showToast.timer = setTimeout(() => {
            toast.classList.remove("is-open");
        }, 2200);
    }

    function getDisplayRowKey(rowKey) {
        return String(rowKey || "").split("::").pop();
    }

    function normalize(value) {
        return String(value || "")
            .replace(/\s+/g, " ")
            .replace(/\u00a0/g, " ")
            .trim();
    }

    function slugify(value) {
        return normalize(value)
            .toLowerCase()
            .replace(/[^a-z0-9]+/gi, "-")
            .replace(/^-+|-+$/g, "");
    }

    function escapeHtml(value) {
        return String(value || "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function debounce(callback, delay = 150) {
        let timer = null;

        return function (...args) {
            clearTimeout(timer);
            timer = setTimeout(() => callback.apply(this, args), delay);
        };
    }

    function deepMerge(target, source) {
        const output = { ...target };

        Object.keys(source || {}).forEach((key) => {
            if (
                source[key] &&
                typeof source[key] === "object" &&
                !Array.isArray(source[key])
            ) {
                output[key] = deepMerge(target[key] || {}, source[key]);
            } else {
                output[key] = source[key];
            }
        });

        return output;
    }

    function readAttributeOptions() {
        const element = document.querySelector("[data-hgm-table-tools]");
        if (!element) return {};

        const options = {};

        if (element.dataset.launcher) {
            options.launcher = element.dataset.launcher;
        }

        if (element.dataset.userId) {
            options.userId = element.dataset.userId;
        }

        if (element.dataset.pageKey) {
            options.pageKey =
                element.dataset.pageKey === "auto"
                    ? window.location.pathname
                    : element.dataset.pageKey;
        }

        if (element.dataset.tableSelector) {
            options.tableSelector = element.dataset.tableSelector;
        }

        if (element.dataset.rowKeyColumnIndex) {
            const value = Number(element.dataset.rowKeyColumnIndex);
            if (!Number.isNaN(value)) {
                options.rowKey = {
                    columnIndex: value
                };
            }
        }

        if (element.dataset.rowKeySelector) {
            options.rowKey = {
                ...(options.rowKey || {}),
                selector: element.dataset.rowKeySelector
            };
        }

        return options;
    }

    function injectRuntimeStyles() {
        if (document.getElementById("hgmToolsRuntimeStyles")) return;

        const style = document.createElement("style");
        style.id = "hgmToolsRuntimeStyles";
        style.textContent = `
            .hgm-tools-window-actions {
                display: flex;
                align-items: center;
                gap: 8px;
            }

            .hgm-tools-panel-shortcut .hgm-tools-header {
                cursor: move;
            }

            .hgm-tools-panel-fixed .hgm-tools-header {
                cursor: default;
            }

            .hgm-tools-panel.is-dragging {
                transition: none !important;
            }

            .hgm-tools-minimize {
                width: 30px;
                height: 30px;
                border: 0;
                border-radius: 999px;
                background: rgba(255, 255, 255, .14);
                color: #ffffff;
                cursor: pointer;
                font-size: 20px;
                font-weight: 900;
                line-height: 1;
            }

            .hgm-tools-panel .hgm-tools-minimized-bar {
                display: none;
            }

            .hgm-tools-panel-shortcut.is-minimized {
                width: 260px !important;
                max-width: calc(100vw - 28px);
                overflow: hidden;
            }

            .hgm-tools-panel-shortcut.is-minimized .hgm-tools-header,
            .hgm-tools-panel-shortcut.is-minimized .hgm-tools-body {
                display: none !important;
            }

            .hgm-tools-panel-shortcut.is-minimized .hgm-tools-minimized-bar {
                display: flex;
                align-items: center;
                gap: 10px;
                padding: 13px 15px;
                background: linear-gradient(135deg, #0f172a, #2563eb);
                color: #ffffff;
                cursor: pointer;
            }

            .hgm-tools-panel-shortcut.is-minimized .hgm-tools-minimized-bar span {
                font-size: 18px;
            }

            .hgm-tools-panel-shortcut.is-minimized .hgm-tools-minimized-bar strong {
                font-size: 13px;
                font-weight: 900;
            }

            .hgm-tools-panel-shortcut.is-minimized .hgm-tools-minimized-bar small {
                margin-left: auto;
                color: rgba(255, 255, 255, .75);
                font-size: 11px;
                font-weight: 700;
            }

            .hgm-selected-row td,
            .hgm-selected-row th {
                outline: 2px solid #2563eb !important;
                outline-offset: -2px;
                background: rgba(37, 99, 235, .12) !important;
            }

            body.hgm-copy-mode-active,
            body.hgm-label-mode-active {
                user-select: none;
            }
        `;

        document.head.appendChild(style);
    }

    const api = {
        mount,
        destroy,

        open: restorePanel,
        close: closePanel,
        minimize: minimizePanel,
        restore: restorePanel,

        refreshTableList,
        getTables,

        copySelectedCells,
        clearSelection,

        renderStoredLabels,
        clearAllLabels,
        clearRowSelection,
        getStoredLabels,
        storageKey
    };

    return api;
}

export default createTableTools;