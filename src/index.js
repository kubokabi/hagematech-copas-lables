const DEFAULT_OPTIONS = {
    pageKey: window.location.pathname,
    storagePrefix: "hgm_any_tools_labels",
    defaultColor: "#2563eb",

    selector: [
        "td",
        "th",
        "article",
        "section",
        ".card",
        ".alert",
        ".badge",
        ".btn",
        "button",
        "a",
        "p",
        "span",
        "div",
        "li",
        "pre",
        "code",
        "blockquote",
        "h1",
        "h2",
        "h3",
        "h4",
        "h5",
        "h6"
    ].join(","),

    ignoreSelector: [
        "#hgmAnyMenu",
        "#hgmAnyMenu *",
        "#hgmAnyBadge",
        "#hgmAnyBadge *",
        "#hgmAnyToast",
        "#hgmAnyToast *",
        "#hgmAnyLabelPopover",
        "#hgmAnyLabelPopover *",
        "#hgmAnyWarning",
        "#hgmAnyWarning *",
        "script",
        "style",
        "meta",
        "link",
        "svg",
        "path"
    ].join(",")
};

export default function createHgmAnyTools(userOptions = {}) {
    const attrOptions = readAttributeOptions();
    const config = deepMerge(DEFAULT_OPTIONS, deepMerge(attrOptions, userOptions));

    let mounted = false;
    let activeMode = null;

    let isDragging = false;
    let anchorCell = null;
    let activeLabelTarget = null;
    let pendingModeAfterWarning = null;

    const selectedMap = new Map();

    const api = {
        mount,
        destroy,
        openMenu,
        closeMenu,
        disableMode,
        copySelected,
        clearSelection,
        renderStoredLabels
    };

    function mount() {
        if (mounted) return api;

        createUI();
        bindEvents();
        renderStoredLabels();

        mounted = true;
        return api;
    }

    function destroy() {
        unbindEvents();

        document.getElementById("hgmAnyMenu")?.remove();
        document.getElementById("hgmAnyBadge")?.remove();
        document.getElementById("hgmAnyToast")?.remove();
        document.getElementById("hgmAnyLabelPopover")?.remove();
        document.getElementById("hgmAnyWarning")?.remove();

        document.body.classList.remove("hgm-any-copas-active");
        document.body.classList.remove("hgm-any-labels-active");

        clearSelection(false);
        mounted = false;
    }

    function createUI() {
        if (document.getElementById("hgmAnyMenu")) return;

        const menu = document.createElement("div");
        menu.id = "hgmAnyMenu";
        menu.className = "hgm-any-menu";

        menu.innerHTML = `
            <div class="hgm-any-menu-card">
                <button type="button" class="hgm-any-menu-close" data-hgm-close-menu>×</button>

                <div class="hgm-any-main-view" data-hgm-main-view>
                    <div class="hgm-any-menu-title">Choose Tools Mode</div>
                    <div class="hgm-any-menu-subtitle">
                        Select one mode to continue working on this page.
                    </div>

                    <div class="hgm-any-menu-options">
                        <button type="button" class="hgm-any-option" data-hgm-mode="copas">
                            <strong>Copas</strong>
                            <span>Select content like Excel, then copy it.</span>
                        </button>

                        <button type="button" class="hgm-any-option" data-hgm-mode="labels">
                            <strong>Labels</strong>
                            <span>Create and apply temporary labels to any content.</span>
                        </button>
                    </div>

                    <button type="button" class="hgm-any-guide" data-hgm-guide>
                        GUIDE
                    </button>
                </div>

                <div class="hgm-any-guide-view" data-hgm-guide-view>
                    <button type="button" class="hgm-any-back" data-hgm-guide-back>
                        ← Back
                    </button>

                    <div class="hgm-any-guide-title">Shortcut Guide</div>

                    <div class="hgm-any-guide-item">
                        <kbd>Ctrl</kbd> + <kbd>T</kbd>
                        <span>Open mode chooser. If blocked by browser, use Alt + T.</span>
                    </div>

                    <div class="hgm-any-guide-item">
                        <kbd>Alt</kbd> + <kbd>T</kbd>
                        <span>Open mode chooser fallback.</span>
                    </div>

                    <div class="hgm-any-guide-item">
                        <kbd>Ctrl</kbd> + <kbd>X</kbd>
                        <span>Disable active Copas or Labels mode.</span>
                    </div>

                    <div class="hgm-any-guide-item">
                        <kbd>Ctrl</kbd> + <kbd>C</kbd>
                        <span>Copy selected content in Copas Mode.</span>
                    </div>

                    <div class="hgm-any-guide-item">
                        <kbd>Click</kbd> + <kbd>Drag</kbd>
                        <span>Select multiple table cells or visible page elements.</span>
                    </div>

                    <div class="hgm-any-guide-item">
                        <kbd>Shift</kbd> + <kbd>Click</kbd>
                        <span>Select table cell range like Excel.</span>
                    </div>

                    <div class="hgm-any-guide-item">
                        <kbd>Ctrl</kbd> + <kbd>Click</kbd>
                        <span>Add item to current selection without clearing previous selection.</span>
                    </div>

                    <div class="hgm-any-guide-warning">
                        Labels are temporary because they are stored in sessionStorage. They usually survive page reloads in the same tab, but are cleared when the browser tab or browser session is closed.
                    </div>
                </div>
            </div>
        `;

        const badge = document.createElement("div");
        badge.id = "hgmAnyBadge";
        badge.className = "hgm-any-badge";
        badge.innerHTML = `
            <span class="hgm-any-badge-dot"></span>
            <strong id="hgmAnyBadgeText">Copas Mode</strong>
        `;

        const toast = document.createElement("div");
        toast.id = "hgmAnyToast";
        toast.className = "hgm-any-toast";

        const popover = document.createElement("div");
        popover.id = "hgmAnyLabelPopover";
        popover.className = "hgm-any-label-popover";
        popover.innerHTML = `
            <div class="hgm-any-label-header">
                <div>
                    <strong>Manage Label</strong>
                    <span id="hgmAnyLabelTargetText">Selected content</span>
                </div>

                <button type="button" class="hgm-any-label-close" data-hgm-close-label-popover>
                    ×
                </button>
            </div>

            <div class="hgm-any-label-body">
                <label class="hgm-any-field-label">Choose Existing Label</label>
                <select id="hgmAnyLabelSelect" class="hgm-any-input"></select>

                <div class="hgm-any-label-preview" id="hgmAnyLabelPreview">
                    <span class="hgm-any-label-preview-dot"></span>
                    <span id="hgmAnyLabelPreviewText">No label selected</span>
                </div>

                <div class="hgm-any-label-divider"></div>

                <label class="hgm-any-field-label">Create New Label</label>
                <input
                    id="hgmAnyNewLabelName"
                    class="hgm-any-input"
                    type="text"
                    placeholder="Example: Priority, Need Review, Done">

                <label class="hgm-any-field-label">Label Color</label>
                <input
                    id="hgmAnyNewLabelColor"
                    class="hgm-any-input hgm-any-color-input"
                    type="color"
                    value="${escapeAttribute(normalizeHex(config.defaultColor))}">

                <button type="button" class="hgm-any-button light" data-hgm-create-label>
                    Create Label
                </button>

                <div class="hgm-any-label-actions">
                    <button type="button" class="hgm-any-button primary" data-hgm-save-label>
                        Apply Label
                    </button>

                    <button type="button" class="hgm-any-button danger" data-hgm-remove-label>
                        Remove Label
                    </button>
                </div>
            </div>
        `;

        const warning = document.createElement("div");
        warning.id = "hgmAnyWarning";
        warning.className = "hgm-any-warning-modal";
        warning.innerHTML = `
            <div class="hgm-any-warning-card">
                <div class="hgm-any-warning-title">Temporary Labels Notice</div>
                <div class="hgm-any-warning-text">
                    Labels are stored only in sessionStorage. They usually remain available after page reloads in the same tab, but they are temporary and may be cleared when the browser tab or browser session is closed.
                </div>

                <button type="button" class="hgm-any-button primary" data-hgm-warning-ok>
                    OK, I Understand
                </button>
            </div>
        `;

        document.body.appendChild(menu);
        document.body.appendChild(badge);
        document.body.appendChild(toast);
        document.body.appendChild(popover);
        document.body.appendChild(warning);

        syncLabelSelectOptions();
        syncLabelPreview();
    }

    function bindEvents() {
        document.addEventListener("keydown", handleKeydown, true);
        document.addEventListener("click", handleClick, true);
        document.addEventListener("mousedown", handleMouseDown, true);
        document.addEventListener("mouseover", handleMouseOver, true);
        document.addEventListener("mouseup", handleMouseUp, true);
        document.addEventListener("change", handleChange, true);
    }

    function unbindEvents() {
        document.removeEventListener("keydown", handleKeydown, true);
        document.removeEventListener("click", handleClick, true);
        document.removeEventListener("mousedown", handleMouseDown, true);
        document.removeEventListener("mouseover", handleMouseOver, true);
        document.removeEventListener("mouseup", handleMouseUp, true);
        document.removeEventListener("change", handleChange, true);
    }

    function handleKeydown(event) {
        if (isTypingTarget(event.target)) return;

        const key = String(event.key || "").toLowerCase();
        const code = String(event.code || "").toLowerCase();
        const isCtrlOrMeta = event.ctrlKey || event.metaKey;

        const isOpenShortcut =
            (isCtrlOrMeta && (key === "t" || code === "keyt")) ||
            (event.altKey && (key === "t" || code === "keyt"));

        const isCloseShortcut =
            isCtrlOrMeta && (key === "x" || code === "keyx");

        const isCopyShortcut =
            isCtrlOrMeta && (key === "c" || code === "keyc");

        if (isOpenShortcut) {
            event.preventDefault();
            event.stopPropagation();
            openMenu();
            return;
        }

        if (isCloseShortcut) {
            event.preventDefault();
            event.stopPropagation();
            disableMode();
            return;
        }

        if (isCopyShortcut && activeMode === "copas") {
            event.preventDefault();
            event.stopPropagation();
            copySelected();
            return;
        }

        if (event.key === "Escape") {
            closeMenu();
            closeLabelPopover();
            closeLabelWarning();
        }
    }

    function handleClick(event) {
        const target = event.target;

        if (target.closest("[data-hgm-close-menu]")) {
            event.preventDefault();
            closeMenu();
            return;
        }

        const modeButton = target.closest("[data-hgm-mode]");
        if (modeButton) {
            event.preventDefault();

            const mode = modeButton.dataset.hgmMode;

            if (mode === "labels") {
                pendingModeAfterWarning = "labels";
                closeMenu();
                openLabelWarning();
                return;
            }

            activateMode(mode);
            closeMenu();
            return;
        }

        if (target.closest("[data-hgm-guide]")) {
            event.preventDefault();
            openGuideView();
            return;
        }

        if (target.closest("[data-hgm-guide-back]")) {
            event.preventDefault();
            backToMainView();
            return;
        }

        if (target.closest("[data-hgm-warning-ok]")) {
            event.preventDefault();
            confirmLabelWarning();
            return;
        }

        if (target.closest("[data-hgm-save-label]")) {
            event.preventDefault();
            saveActiveLabel();
            return;
        }

        if (target.closest("[data-hgm-remove-label]")) {
            event.preventDefault();
            removeActiveLabel();
            return;
        }

        if (target.closest("[data-hgm-close-label-popover]")) {
            event.preventDefault();
            closeLabelPopover();
            return;
        }

        if (target.closest("[data-hgm-create-label]")) {
            event.preventDefault();
            createNewLabelOption();
            return;
        }

        if (isInsideTools(target)) return;

        if (activeMode === "labels") {
            handleLabelClick(event);
            return;
        }

        if (!activeMode) {
            const menu = document.getElementById("hgmAnyMenu");

            if (
                menu?.classList.contains("is-open") &&
                !target.closest("#hgmAnyMenu")
            ) {
                closeMenu();
            }
        }
    }

    function handleMouseDown(event) {
        if (activeMode !== "copas") return;
        if (isInsideTools(event.target)) return;
        if (isTypingTarget(event.target)) return;

        const target = getSelectableTarget(event.target);
        if (!target) return;

        event.preventDefault();
        event.stopPropagation();

        const cell = getCellTarget(target);

        if (!event.ctrlKey && !event.metaKey && !event.shiftKey) {
            clearSelection(false);
        }

        if (cell) {
            if (event.shiftKey && anchorCell && isSameTable(anchorCell, cell)) {
                selectCellRange(anchorCell, cell, event.ctrlKey || event.metaKey);
                showToast(`${selectedMap.size} item selected. Press Ctrl + C to copy.`);
                return;
            }

            anchorCell = cell;
            isDragging = true;
            addSelection(cell);

            showToast(`${selectedMap.size} item selected. Press Ctrl + C to copy.`);
            return;
        }

        isDragging = true;
        addSelection(target);

        showToast(`${selectedMap.size} item selected. Press Ctrl + C to copy.`);
    }

    function handleMouseOver(event) {
        if (activeMode !== "copas") return;
        if (!isDragging) return;
        if (isInsideTools(event.target)) return;

        const target = getSelectableTarget(event.target);
        if (!target) return;

        const cell = getCellTarget(target);

        if (anchorCell && cell && isSameTable(anchorCell, cell)) {
            selectCellRange(anchorCell, cell, false);
            return;
        }

        if (!cell) {
            addSelection(target);
        }
    }

    function handleMouseUp() {
        if (activeMode !== "copas") return;

        if (isDragging) {
            isDragging = false;
            showToast(`${selectedMap.size} item selected. Press Ctrl + C to copy.`);
        }
    }

    function handleChange(event) {
        if (event.target?.id === "hgmAnyLabelSelect") {
            syncLabelPreview();
        }
    }

    function openMenu() {
        closeLabelPopover();
        closeLabelWarning();

        const menu = document.getElementById("hgmAnyMenu");
        if (!menu) return;

        backToMainView();
        menu.classList.add("is-open");
        showToast("Mode chooser opened.");
    }

    function closeMenu() {
        document.getElementById("hgmAnyMenu")?.classList.remove("is-open");
        backToMainView();
    }

    function openGuideView() {
        const menu = document.getElementById("hgmAnyMenu");
        const mainView = document.querySelector("[data-hgm-main-view]");
        const guideView = document.querySelector("[data-hgm-guide-view]");

        if (!menu || !mainView || !guideView) return;

        menu.classList.add("is-guide-mode");
        mainView.classList.add("is-hidden");
        guideView.classList.add("is-open");
    }

    function backToMainView() {
        const menu = document.getElementById("hgmAnyMenu");
        const mainView = document.querySelector("[data-hgm-main-view]");
        const guideView = document.querySelector("[data-hgm-guide-view]");

        if (!menu || !mainView || !guideView) return;

        menu.classList.remove("is-guide-mode");
        mainView.classList.remove("is-hidden");
        guideView.classList.remove("is-open");
    }

    function openLabelWarning() {
        const warning = document.getElementById("hgmAnyWarning");
        if (!warning) return;

        warning.classList.add("is-open");
    }

    function closeLabelWarning() {
        document.getElementById("hgmAnyWarning")?.classList.remove("is-open");
    }

    function confirmLabelWarning() {
        closeLabelWarning();

        if (pendingModeAfterWarning) {
            activateMode(pendingModeAfterWarning);
            pendingModeAfterWarning = null;
        }
    }

    function activateMode(mode) {
        if (!["copas", "labels"].includes(mode)) return;

        activeMode = mode;

        document.body.classList.toggle("hgm-any-copas-active", mode === "copas");
        document.body.classList.toggle("hgm-any-labels-active", mode === "labels");

        clearSelection(false);
        closeLabelPopover();
        updateBadge();

        showToast(mode === "copas" ? "Copas Mode enabled." : "Labels Mode enabled.");
    }

    function disableMode() {
        activeMode = null;
        isDragging = false;
        anchorCell = null;
        pendingModeAfterWarning = null;

        document.body.classList.remove("hgm-any-copas-active");
        document.body.classList.remove("hgm-any-labels-active");

        clearSelection(false);
        closeLabelPopover();
        closeLabelWarning();
        updateBadge();

        showToast("Mode disabled.");
    }

    function updateBadge() {
        const badge = document.getElementById("hgmAnyBadge");
        const text = document.getElementById("hgmAnyBadgeText");

        if (!badge || !text) return;

        if (!activeMode) {
            badge.classList.remove("is-open");
            return;
        }

        text.textContent = activeMode === "copas" ? "Copas Mode" : "Labels Mode";
        badge.classList.add("is-open");
    }

    function getSelectableTarget(target) {
        if (!target || target.nodeType !== 1) return null;
        if (target.closest(config.ignoreSelector)) return null;

        const cell = target.closest("td, th");

        if (cell && !isInsideTools(cell)) {
            return cell;
        }

        let element = target.closest(config.selector);

        if (!element) {
            element = target;
        }

        if (!element || element === document.body || element === document.documentElement) {
            return null;
        }

        if (isInsideTools(element)) return null;

        const rect = element.getBoundingClientRect();

        if (rect.width <= 0 || rect.height <= 0) {
            return null;
        }

        const text = cleanElementText(element);
        const hasUsefulContent =
            text ||
            element.getAttribute("aria-label") ||
            element.getAttribute("title") ||
            element.value;

        if (!hasUsefulContent) return null;

        return element;
    }

    function getCellTarget(element) {
        if (!element) return null;

        if (element.matches?.("td, th")) {
            return element;
        }

        return element.closest?.("td, th") || null;
    }

    function addSelection(element) {
        const key = getSelectionKey(element);

        selectedMap.set(key, {
            key,
            element,
            text: cleanElementText(element),
            type: element.matches?.("td, th") ? "cell" : "generic",
            meta: element.matches?.("td, th") ? getCellMeta(element) : null
        });

        element.classList.add("hgm-any-selected");
    }

    function selectCellRange(startCell, endCell, append = false) {
        if (!startCell || !endCell) return;
        if (!isSameTable(startCell, endCell)) return;

        if (!append) {
            clearSelection(false);
        }

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

                addSelection(cell);
            });
        });
    }

    function clearSelection(show = true) {
        selectedMap.forEach((item) => {
            item.element.classList.remove("hgm-any-selected");
        });

        selectedMap.clear();

        document.querySelectorAll(".hgm-any-label-target").forEach((element) => {
            element.classList.remove("hgm-any-label-target");
        });

        if (show) {
            showToast("Selection cleared.");
        }
    }

    async function copySelected() {
        if (!selectedMap.size) {
            showToast("No item selected.");
            return;
        }

        const items = Array.from(selectedMap.values());
        const onlyCells = items.length > 0 && items.every((item) => item.type === "cell");

        const text = onlyCells ? buildCellTsv(items) : buildGenericText(items);

        if (!text) {
            showToast("Selected item has no readable text.");
            return;
        }

        try {
            if (navigator.clipboard?.writeText) {
                await navigator.clipboard.writeText(text);
            } else {
                fallbackCopy(text);
            }

            showToast("Copied successfully.");
        } catch {
            fallbackCopy(text);
            showToast("Copied successfully.");
        }
    }

    function buildGenericText(items) {
        return items
            .map((item) => item.text)
            .filter(Boolean)
            .join("\n");
    }

    function buildCellTsv(items) {
        const metas = items
            .map((item) => item.meta)
            .filter(Boolean)
            .sort((a, b) => {
                if (a.tableIndex !== b.tableIndex) return a.tableIndex - b.tableIndex;
                if (a.rowIndex !== b.rowIndex) return a.rowIndex - b.rowIndex;
                return a.colIndex - b.colIndex;
            });

        const rowKeys = [...new Set(metas.map((meta) => `${meta.tableIndex}:${meta.rowIndex}`))];
        const colKeys = [...new Set(metas.map((meta) => meta.colIndex))].sort((a, b) => a - b);

        const rowMap = new Map(rowKeys.map((value, index) => [value, index]));
        const colMap = new Map(colKeys.map((value, index) => [value, index]));

        const matrix = Array.from({ length: rowKeys.length }, () =>
            Array.from({ length: colKeys.length }, () => "")
        );

        metas.forEach((meta) => {
            const rowKey = `${meta.tableIndex}:${meta.rowIndex}`;
            const r = rowMap.get(rowKey);
            const c = colMap.get(meta.colIndex);

            matrix[r][c] = meta.text;
        });

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

    function handleLabelClick(event) {
        if (isInsideTools(event.target)) return;
        if (isTypingTarget(event.target)) return;

        const target = getSelectableTarget(event.target);

        if (!target) return;

        event.preventDefault();
        event.stopPropagation();

        activeLabelTarget = target;

        document.querySelectorAll(".hgm-any-label-target").forEach((element) => {
            element.classList.remove("hgm-any-label-target");
        });

        target.classList.add("hgm-any-label-target");

        openLabelPopover(target);
    }

    function openLabelPopover(target) {
        syncLabelSelectOptions();

        const options = getLabelOptions();

        const popover = document.getElementById("hgmAnyLabelPopover");
        const targetText = document.getElementById("hgmAnyLabelTargetText");
        const select = document.getElementById("hgmAnyLabelSelect");

        if (!popover || !target || !select) return;

        const key = getElementStorageKey(target);
        const labels = getStoredLabels();
        const existing = labels[key];

        if (targetText) {
            const text = cleanElementText(target);
            targetText.textContent = text ? text.slice(0, 58) : "Selected content";
        }

        if (existing && options.length) {
            const index = options.findIndex((label) => {
                return label.name === existing.name &&
                    normalizeHex(label.color) === normalizeHex(existing.color);
            });

            select.value = index >= 0 ? String(index) : "";
        } else {
            select.value = options.length ? "0" : "";
        }

        syncLabelPreview();

        const rect = target.getBoundingClientRect();
        const width = 320;
        const height = 390;
        const margin = 14;

        let left = rect.left + window.scrollX + 16;
        let top = rect.bottom + window.scrollY + 12;

        const minLeft = window.scrollX + margin;
        const maxLeft = window.scrollX + window.innerWidth - width - margin;

        if (left > maxLeft) {
            left = maxLeft;
        }

        if (left < minLeft) {
            left = minLeft;
        }

        const viewportBottom = window.scrollY + window.innerHeight - margin;

        if (top + height > viewportBottom) {
            top = rect.top + window.scrollY - height - 12;
        }

        if (top < window.scrollY + margin) {
            top = window.scrollY + margin;
        }

        popover.style.position = "absolute";
        popover.style.left = `${left}px`;
        popover.style.top = `${top}px`;
        popover.classList.add("is-open");
    }

    function closeLabelPopover() {
        document.getElementById("hgmAnyLabelPopover")?.classList.remove("is-open");

        document.querySelectorAll(".hgm-any-label-target").forEach((element) => {
            element.classList.remove("hgm-any-label-target");
        });

        activeLabelTarget = null;
    }

    function saveActiveLabel() {
        if (!activeLabelTarget) {
            showToast("No selected content.");
            return;
        }

        const options = getLabelOptions();
        const select = document.getElementById("hgmAnyLabelSelect");

        if (!options.length || !select || select.value === "") {
            showToast("Please create or choose a label first.");
            return;
        }

        const selected = options[Number(select.value)];

        if (!selected) {
            showToast("Please choose an existing label.");
            return;
        }

        const labels = getStoredLabels();
        const key = getElementStorageKey(activeLabelTarget);

        labels[key] = {
            name: selected.name,
            color: normalizeHex(selected.color),
            updatedAt: new Date().toISOString()
        };

        saveStoredLabels(labels);
        renderStoredLabels();
        closeLabelPopover();

        showToast("Label applied.");
    }

    function removeActiveLabel() {
        if (!activeLabelTarget) return;

        const labels = getStoredLabels();
        const key = getElementStorageKey(activeLabelTarget);

        delete labels[key];

        saveStoredLabels(labels);
        renderStoredLabels();
        closeLabelPopover();

        showToast("Label removed.");
    }

    function renderStoredLabels() {
        clearRenderedLabels();

        const labels = getStoredLabels();

        Object.keys(labels).forEach((key) => {
            const element = findElementByStorageKey(key);

            if (!element) return;

            renderLabel(element, labels[key]);
        });
    }

    function clearRenderedLabels() {
        document.querySelectorAll(".hgm-any-label").forEach((label) => {
            label.remove();
        });

        document.querySelectorAll("[data-hgm-any-label-color]").forEach((element) => {
            element.removeAttribute("data-hgm-any-label-color");
            element.style.removeProperty("--hgm-any-label-color");
        });
    }

    function renderLabel(element, label) {
        const color = normalizeHex(label.color || config.defaultColor);

        element.setAttribute("data-hgm-any-label-color", color);
        element.style.setProperty("--hgm-any-label-color", color);

        const badge = document.createElement("span");
        badge.className = "hgm-any-label";
        badge.style.setProperty("--hgm-any-label-color", color);
        badge.textContent = label.name;

        element.appendChild(badge);
    }

    function labelCatalogKey() {
        return `${storageKey()}:catalog`;
    }

    function getLabelOptions() {
        try {
            const raw = sessionStorage.getItem(labelCatalogKey());
            const saved = raw ? JSON.parse(raw) : [];

            if (Array.isArray(saved) && saved.length) {
                return saved
                    .map((item) => ({
                        name: normalize(item.name || ""),
                        color: normalizeHex(item.color || config.defaultColor)
                    }))
                    .filter((item) => item.name);
            }
        } catch {
            return [];
        }

        return [];
    }

    function saveLabelOptions(labels) {
        try {
            sessionStorage.setItem(labelCatalogKey(), JSON.stringify(labels || []));
        } catch {
            showToast("Storage is full or disabled.");
        }
    }

    function labelNameExists(name) {
        const targetName = normalize(name).toLowerCase();

        return getLabelOptions().some((item) => {
            return normalize(item.name).toLowerCase() === targetName;
        });
    }

    function createNewLabelOption() {
        const nameInput = document.getElementById("hgmAnyNewLabelName");
        const colorInput = document.getElementById("hgmAnyNewLabelColor");

        const name = normalize(nameInput?.value || "");
        const color = normalizeHex(colorInput?.value || config.defaultColor);

        if (!name) {
            showToast("Please enter a label name.");
            return;
        }

        if (labelNameExists(name)) {
            showToast("This label name already exists.");
            return;
        }

        const labels = getLabelOptions();

        labels.push({
            name,
            color,
            createdAt: new Date().toISOString()
        });

        saveLabelOptions(labels);
        syncLabelSelectOptions();

        const select = document.getElementById("hgmAnyLabelSelect");
        if (select) {
            select.value = String(labels.length - 1);
        }

        if (nameInput) {
            nameInput.value = "";
        }

        syncLabelPreview();
        showToast("Label created and saved temporarily.");
    }

    function syncLabelSelectOptions() {
        const select = document.getElementById("hgmAnyLabelSelect");
        if (!select) return;

        const labels = getLabelOptions();
        const previousValue = select.value;

        select.innerHTML = "";

        if (!labels.length) {
            const option = document.createElement("option");
            option.value = "";
            option.textContent = "No label created yet";
            select.appendChild(option);
            return;
        }

        labels.forEach((label, index) => {
            const option = document.createElement("option");
            option.value = String(index);
            option.textContent = `${label.name} — ${label.color}`;
            select.appendChild(option);
        });

        if (previousValue && Number(previousValue) < labels.length) {
            select.value = previousValue;
        }
    }

    function syncLabelPreview() {
        const select = document.getElementById("hgmAnyLabelSelect");
        const preview = document.getElementById("hgmAnyLabelPreview");
        const text = document.getElementById("hgmAnyLabelPreviewText");

        if (!select || !preview || !text) return;

        const options = getLabelOptions();
        const selected = options[Number(select.value)];

        if (!selected) {
            text.textContent = "No label selected";
            preview.style.setProperty("--hgm-any-label-color", "#64748b");
            return;
        }

        text.textContent = selected.name;
        preview.style.setProperty("--hgm-any-label-color", normalizeHex(selected.color));
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
        const tables = Array.from(document.querySelectorAll("table"));

        return {
            tableIndex: tables.indexOf(position.table),
            rowIndex: position.rowIndex,
            colIndex: position.colIndex,
            text: cleanElementText(cell)
        };
    }

    function getVisibleCells(row) {
        return Array.from(row.children)
            .filter((child) => child.matches("td, th"))
            .filter((cell) => {
                const style = window.getComputedStyle(cell);
                return style.display !== "none" && style.visibility !== "hidden";
            });
    }

    function isSameTable(a, b) {
        if (!a || !b) return false;
        return a.closest("table") === b.closest("table");
    }

    function storageKey() {
        return [
            config.storagePrefix,
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

    function saveStoredLabels(labels) {
        try {
            sessionStorage.setItem(storageKey(), JSON.stringify(labels || {}));
        } catch {
            showToast("Storage is full or disabled.");
        }
    }

    function getSelectionKey(element) {
        if (!element.dataset.hgmAnySelectUid) {
            element.dataset.hgmAnySelectUid = `hgm-select-${Date.now()}-${Math.random()
                .toString(16)
                .slice(2)}`;
        }

        return `selection::${element.dataset.hgmAnySelectUid}`;
    }

    function getElementStorageKey(element) {
        if (!element) return "";

        if (element.dataset.hgmLabelKey) {
            return `custom::${element.dataset.hgmLabelKey}`;
        }

        if (element.id) {
            return `id::${element.id}`;
        }

        const text = cleanElementText(element).slice(0, 80);
        const path = getCssPath(element);

        return `auto::${path}::${text}`;
    }

    function findElementByStorageKey(key) {
        if (!key) return null;

        if (key.startsWith("custom::")) {
            const value = key.replace(/^custom::/, "");
            return document.querySelector(`[data-hgm-label-key="${cssEscape(value)}"]`);
        }

        if (key.startsWith("id::")) {
            const value = key.replace(/^id::/, "");
            return document.getElementById(value);
        }

        const candidates = Array.from(document.querySelectorAll(config.selector))
            .filter((element) => !isInsideTools(element));

        return candidates.find((element) => getElementStorageKey(element) === key) || null;
    }

    function getCssPath(element) {
        const parts = [];
        let current = element;

        while (
            current &&
            current.nodeType === 1 &&
            current !== document.body &&
            current !== document.documentElement
        ) {
            let part = current.tagName.toLowerCase();

            if (current.id) {
                part += `#${current.id}`;
                parts.unshift(part);
                break;
            }

            const parent = current.parentElement;

            if (parent) {
                const siblings = Array.from(parent.children).filter(
                    (child) => child.tagName === current.tagName
                );

                if (siblings.length > 1) {
                    part += `:nth-of-type(${siblings.indexOf(current) + 1})`;
                }
            }

            parts.unshift(part);
            current = current.parentElement;
        }

        return parts.join(">");
    }

    function cleanElementText(element) {
        if (!element) return "";

        if (element.matches?.("input, textarea, select")) {
            return normalize(element.value || "");
        }

        const clone = element.cloneNode(true);

        clone.querySelectorAll(
            ".hgm-any-label, script, style, noscript, svg, canvas"
        ).forEach((item) => item.remove());

        clone.querySelectorAll("button, input, select, textarea").forEach((item) => {
            const replacement = document.createElement("span");

            replacement.textContent = normalize(
                item.value ||
                item.innerText ||
                item.getAttribute("aria-label") ||
                item.getAttribute("title") ||
                ""
            );

            item.replaceWith(replacement);
        });

        return normalize(
            clone.innerText ||
            clone.textContent ||
            element.getAttribute("aria-label") ||
            element.getAttribute("title") ||
            ""
        );
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

    function showToast(message) {
        const toast = document.getElementById("hgmAnyToast");
        if (!toast) return;

        toast.textContent = message;
        toast.classList.add("is-open");

        clearTimeout(showToast.timer);

        showToast.timer = setTimeout(() => {
            toast.classList.remove("is-open");
        }, 2200);
    }

    function isInsideTools(target) {
        return Boolean(
            target.closest?.(
                "#hgmAnyMenu, #hgmAnyBadge, #hgmAnyToast, #hgmAnyLabelPopover, #hgmAnyWarning"
            )
        );
    }

    function isTypingTarget(target) {
        return Boolean(
            target.closest?.("input, textarea, select, option, [contenteditable='true']")
        );
    }

    function normalize(value) {
        return String(value || "")
            .replace(/\u00a0/g, " ")
            .replace(/\s+/g, " ")
            .trim();
    }

    function normalizeHex(value) {
        const raw = normalize(value || "").toLowerCase();

        if (/^#[0-9a-f]{6}$/i.test(raw)) return raw;

        if (/^#[0-9a-f]{3}$/i.test(raw)) {
            return `#${raw[1]}${raw[1]}${raw[2]}${raw[2]}${raw[3]}${raw[3]}`;
        }

        return "#2563eb";
    }

    function escapeHtml(value) {
        return String(value || "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function escapeAttribute(value) {
        return escapeHtml(value).replace(/`/g, "&#096;");
    }

    function cssEscape(value) {
        if (window.CSS?.escape) return window.CSS.escape(value);
        return String(value || "").replace(/["\\]/g, "\\$&");
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
        const element = document.querySelector("[data-hgm-any-tools]");
        if (!element) return {};

        const options = {};

        if (element.dataset.pageKey) {
            options.pageKey =
                element.dataset.pageKey === "auto"
                    ? window.location.pathname
                    : element.dataset.pageKey;
        }

        if (element.dataset.defaultColor) {
            options.defaultColor = normalizeHex(element.dataset.defaultColor);
        }

        if (element.dataset.selector) {
            options.selector = element.dataset.selector;
        }

        return options;
    }

    return api;
}