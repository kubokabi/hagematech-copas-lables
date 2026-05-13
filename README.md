# hagematech-copas-labels

Reusable JavaScript and CSS tools for **Copas Mode**, **Labels Mode**, table copy, pin badges, and temporary session-based annotation.

HGM Table Tools can be used in:

- Plain HTML
- CDN usage
- Laravel / PHP pages
- React
- Vue
- Vite
- Next.js client components
- Admin dashboards
- CRM tables
- Inventory tables
- Finance reports
- Internal tools

---

## Features

- Copy table cells like a spreadsheet
- Select table cells and copy as TSV format
- Label table cells, cards, text, headings, buttons, and other HTML elements
- Colored pin badge for labeled elements
- Label filter bar
- Temporary label storage using `sessionStorage`
- Auto restore labels after page refresh
- Keyboard shortcuts
- Works without framework
- Works with React, Vue, Vite, Laravel, and plain HTML

---

## Installation

```bash
npm install hagematech-copas-labels
```

---

## Quick Start

After publishing to npm, you can use the package from CDN.

### Using jsDelivr

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/hagematech-copas-labels/src/style.css">

<div
    data-hgm-any-tools
    data-page-key="auto"
    data-default-color="#2563eb"
    data-labels='[
        {"name":"Urgent","color":"#dc2626"},
        {"name":"Hold","color":"#f59e0b"},
        {"name":"Recheck","color":"#2563eb"},
        {"name":"Done","color":"#16a34a"}
    ]'>
</div>

<div class="hgm-table-tools-shortcut-badge">
    Press <kbd>Ctrl</kbd> / <kbd>Alt</kbd> + <kbd>T</kbd>
</div>

<script type="module">
    import createHgmAnyTools from "https://cdn.jsdelivr.net/npm/hagematech-copas-labels/src/index.js";

    createHgmAnyTools().mount();
</script>
```

### Using unpkg

```html
<link rel="stylesheet" href="https://unpkg.com/hagematech-copas-labels/src/style.css">

<div
    data-hgm-any-tools
    data-page-key="auto"
    data-default-color="#2563eb"
    data-labels='[
        {"name":"Urgent","color":"#dc2626"},
        {"name":"Hold","color":"#f59e0b"},
        {"name":"Recheck","color":"#2563eb"},
        {"name":"Done","color":"#16a34a"}
    ]'>
</div>

<div class="hgm-table-tools-shortcut-badge">
    Press <kbd>Ctrl</kbd> / <kbd>Alt</kbd> + <kbd>T</kbd>
</div>

<script type="module">
    import createHgmAnyTools from "https://unpkg.com/hagematech-copas-labels/src/index.js";

    createHgmAnyTools().mount();
</script>
```

---

## Plain HTML Full Example

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>HGM Table Tools Example</title>

    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/hagematech-copas-labels/src/style.css">

    <style>
        body {
            margin: 0;
            padding: 32px;
            background: #f1f5f9;
            font-family: Arial, sans-serif;
            color: #0f172a;
        }

        .page-card {
            max-width: 1100px;
            margin: 0 auto;
            padding: 24px;
            border-radius: 24px;
            background: #ffffff;
            border: 1px solid #dbeafe;
            box-shadow: 0 18px 50px rgba(15, 23, 42, .08);
        }

        .page-header {
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            gap: 16px;
            margin-bottom: 20px;
        }

        .page-title {
            margin: 0;
            font-size: 32px;
            font-weight: 900;
            color: #0f172a;
        }

        .page-subtitle {
            margin: 8px 0 0;
            color: #64748b;
            font-size: 15px;
        }

        .table-wrapper {
            width: 100%;
            overflow-x: auto;
            border-radius: 16px;
            border: 1px solid #bfdbfe;
        }

        table {
            width: 100%;
            border-collapse: collapse;
            background: #ffffff;
        }

        th,
        td {
            padding: 14px;
            border-bottom: 1px solid #bfdbfe;
            border-right: 1px solid #bfdbfe;
            text-align: left;
            white-space: nowrap;
        }

        th {
            background: #eff6ff;
            color: #0f172a;
            font-weight: 900;
        }

        td {
            color: #334155;
        }

        tr:last-child td {
            border-bottom: 0;
        }

        th:last-child,
        td:last-child {
            border-right: 0;
        }

        .status {
            display: inline-flex;
            align-items: center;
            padding: 5px 10px;
            border-radius: 999px;
            font-size: 12px;
            font-weight: 900;
        }

        .status.completed {
            background: #dcfce7;
            color: #16a34a;
        }

        .status.failed {
            background: #fee2e2;
            color: #dc2626;
        }
    </style>
</head>
<body>

    <div
        data-hgm-any-tools
        data-page-key="auto"
        data-default-color="#2563eb"
        data-labels='[
            {"name":"Urgent","color":"#dc2626"},
            {"name":"Hold","color":"#f59e0b"},
            {"name":"Recheck","color":"#2563eb"},
            {"name":"Done","color":"#16a34a"}
        ]'>
    </div>

    <div class="page-card">
        <div class="page-header">
            <div>
                <h1 class="page-title">Sales CRM Pipeline</h1>
                <p class="page-subtitle">Example table for copy mode and labels mode.</p>
            </div>

            <div class="hgm-table-tools-shortcut-badge">
                Press <kbd>Ctrl</kbd> / <kbd>Alt</kbd> + <kbd>T</kbd>
            </div>
        </div>

        <div class="table-wrapper">
            <table>
                <thead>
                    <tr>
                        <th>Deal ID</th>
                        <th>Customer</th>
                        <th>Segment</th>
                        <th>Region</th>
                        <th>Status</th>
                        <th>Revenue</th>
                    </tr>
                </thead>

                <tbody>
                    <tr>
                        <td data-hgm-label-key="deal-crm-1001-id">CRM-1001</td>
                        <td data-hgm-label-key="deal-crm-1001-customer">Nusantara Capital Bank</td>
                        <td data-hgm-label-key="deal-crm-1001-segment">Enterprise</td>
                        <td data-hgm-label-key="deal-crm-1001-region">Jakarta</td>
                        <td data-hgm-label-key="deal-crm-1001-status">
                            <span class="status completed">Completed</span>
                        </td>
                        <td data-hgm-label-key="deal-crm-1001-revenue">Rp 285.000.000</td>
                    </tr>

                    <tr>
                        <td data-hgm-label-key="deal-crm-1004-id">CRM-1004</td>
                        <td data-hgm-label-key="deal-crm-1004-customer">Samudra Freight</td>
                        <td data-hgm-label-key="deal-crm-1004-segment">Enterprise</td>
                        <td data-hgm-label-key="deal-crm-1004-region">Makassar</td>
                        <td data-hgm-label-key="deal-crm-1004-status">
                            <span class="status completed">Completed</span>
                        </td>
                        <td data-hgm-label-key="deal-crm-1004-revenue">Rp 198.000.000</td>
                    </tr>

                    <tr>
                        <td data-hgm-label-key="deal-crm-1005-id">CRM-1005</td>
                        <td data-hgm-label-key="deal-crm-1005-customer">Borneo Wealth Platform</td>
                        <td data-hgm-label-key="deal-crm-1005-segment">Enterprise</td>
                        <td data-hgm-label-key="deal-crm-1005-region">Pontianak</td>
                        <td data-hgm-label-key="deal-crm-1005-status">
                            <span class="status failed">Failed</span>
                        </td>
                        <td data-hgm-label-key="deal-crm-1005-revenue">Rp 44.000.000</td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>

    <script type="module">
        import createHgmAnyTools from "https://cdn.jsdelivr.net/npm/hagematech-copas-labels/src/index.js";

        createHgmAnyTools().mount();
    </script>

</body>
</html>
```

---

## React Usage

### Vite React

Install:

```bash
npm install hagematech-copas-labels
```

Use in your React component:

```jsx
import { useEffect } from "react";
import createHgmAnyTools from "hagematech-copas-labels";
import "hagematech-copas-labels/style.css";

export default function App() {
    useEffect(() => {
        const tools = createHgmAnyTools({
            pageKey: "react-sales-crm",
            defaultColor: "#2563eb"
        });

        tools.mount();

        return () => {
            tools.destroy();
        };
    }, []);

    return (
        <>
            <div
                data-hgm-any-tools
                data-page-key="react-sales-crm"
                data-default-color="#2563eb"
                data-labels='[
                    {"name":"Urgent","color":"#dc2626"},
                    {"name":"Hold","color":"#f59e0b"},
                    {"name":"Recheck","color":"#2563eb"},
                    {"name":"Done","color":"#16a34a"}
                ]'
            />

            <div className="hgm-table-tools-shortcut-badge">
                Press <kbd>Ctrl</kbd> / <kbd>Alt</kbd> + <kbd>T</kbd>
            </div>

            <table>
                <thead>
                    <tr>
                        <th>Deal ID</th>
                        <th>Customer</th>
                        <th>Status</th>
                    </tr>
                </thead>

                <tbody>
                    <tr>
                        <td data-hgm-label-key="react-deal-1001-id">CRM-1001</td>
                        <td data-hgm-label-key="react-deal-1001-customer">Nusantara Capital Bank</td>
                        <td data-hgm-label-key="react-deal-1001-status">Completed</td>
                    </tr>
                    <tr>
                        <td data-hgm-label-key="react-deal-1005-id">CRM-1005</td>
                        <td data-hgm-label-key="react-deal-1005-customer">Borneo Wealth Platform</td>
                        <td data-hgm-label-key="react-deal-1005-status">Failed</td>
                    </tr>
                </tbody>
            </table>
        </>
    );
}
```

---

## Next.js Usage

Because this package works with the browser DOM, use it in a client component.

```jsx
"use client";

import { useEffect } from "react";
import createHgmAnyTools from "hagematech-copas-labels";
import "hagematech-copas-labels/style.css";

export default function TableToolsClient() {
    useEffect(() => {
        const tools = createHgmAnyTools({
            pageKey: "next-sales-crm",
            defaultColor: "#2563eb"
        });

        tools.mount();

        return () => {
            tools.destroy();
        };
    }, []);

    return (
        <>
            <div
                data-hgm-any-tools
                data-page-key="next-sales-crm"
                data-default-color="#2563eb"
                data-labels='[
                    {"name":"Urgent","color":"#dc2626"},
                    {"name":"Hold","color":"#f59e0b"},
                    {"name":"Recheck","color":"#2563eb"},
                    {"name":"Done","color":"#16a34a"}
                ]'
            />

            <div className="hgm-table-tools-shortcut-badge">
                Press <kbd>Ctrl</kbd> / <kbd>Alt</kbd> + <kbd>T</kbd>
            </div>
        </>
    );
}
```

Then render your table normally in the page.

---

## Vue Usage

```vue
<script setup>
import { onMounted, onBeforeUnmount } from "vue";
import createHgmAnyTools from "hagematech-copas-labels";
import "hagematech-copas-labels/style.css";

let tools = null;

onMounted(() => {
    tools = createHgmAnyTools({
        pageKey: "vue-sales-crm",
        defaultColor: "#2563eb"
    });

    tools.mount();
});

onBeforeUnmount(() => {
    tools?.destroy();
});
</script>

<template>
    <div
        data-hgm-any-tools
        data-page-key="vue-sales-crm"
        data-default-color="#2563eb"
        data-labels='[
            {"name":"Urgent","color":"#dc2626"},
            {"name":"Hold","color":"#f59e0b"},
            {"name":"Recheck","color":"#2563eb"},
            {"name":"Done","color":"#16a34a"}
        ]'>
    </div>

    <div class="hgm-table-tools-shortcut-badge">
        Press <kbd>Ctrl</kbd> / <kbd>Alt</kbd> + <kbd>T</kbd>
    </div>

    <table>
        <thead>
            <tr>
                <th>Deal ID</th>
                <th>Customer</th>
                <th>Status</th>
            </tr>
        </thead>

        <tbody>
            <tr>
                <td data-hgm-label-key="vue-deal-1001-id">CRM-1001</td>
                <td data-hgm-label-key="vue-deal-1001-customer">Nusantara Capital Bank</td>
                <td data-hgm-label-key="vue-deal-1001-status">Completed</td>
            </tr>
        </tbody>
    </table>
</template>
```

---

## Laravel / Blade Usage

```blade
<link rel="stylesheet" href="{{ asset('vendor/hagematech-copas-labels/src/style.css') }}">

<div
    data-hgm-any-tools
    data-page-key="sales-crm"
    data-default-color="#2563eb"
    data-labels='[
        {"name":"Urgent","color":"#dc2626"},
        {"name":"Hold","color":"#f59e0b"},
        {"name":"Recheck","color":"#2563eb"},
        {"name":"Done","color":"#16a34a"}
    ]'>
</div>

<div class="hgm-table-tools-shortcut-badge">
    Press <kbd>Ctrl</kbd> / <kbd>Alt</kbd> + <kbd>T</kbd>
</div>

<table>
    <thead>
        <tr>
            <th>Deal ID</th>
            <th>Customer</th>
            <th>Status</th>
        </tr>
    </thead>

    <tbody>
        @foreach ($deals as $deal)
            <tr>
                <td data-hgm-label-key="deal-{{ $deal->id }}-id">
                    {{ $deal->deal_id }}
                </td>

                <td data-hgm-label-key="deal-{{ $deal->id }}-customer">
                    {{ $deal->customer_name }}
                </td>

                <td data-hgm-label-key="deal-{{ $deal->id }}-status">
                    {{ $deal->status }}
                </td>
            </tr>
        @endforeach
    </tbody>
</table>

<script type="module">
    import createHgmAnyTools from "{{ asset('vendor/hagematech-copas-labels/src/index.js') }}";

    createHgmAnyTools().mount();
</script>
```

---

## Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Ctrl + T` | Open tools menu |
| `Alt + T` | Open tools menu fallback |
| `Ctrl + X` | Disable active mode |
| `Ctrl + Shift + X` | Clear all temporary labels |
| `Ctrl + C` | Copy selected content in Copas Mode |
| `Esc` | Close active menu, warning, or label popup |

---

## Modes

### Copas Mode

Copas Mode allows users to select content or table cells and copy them.

How to use:

1. Press `Ctrl + T` or `Alt + T`
2. Choose **Copas**
3. Click or drag table cells/content
4. Press `Ctrl + C`

When table cells are selected, the copied result is generated as TSV format. This makes it easy to paste into Excel, Google Sheets, or another spreadsheet tool.

---

### Labels Mode

Labels Mode allows users to mark HTML elements using colored labels.

How to use:

1. Press `Ctrl + T` or `Alt + T`
2. Choose **Labels**
3. Click an element
4. Choose an existing label or create a new label
5. Click **Apply Label**

The selected element will show a small pin badge using the label color.

---

## HTML Configuration

```html
<div
    data-hgm-any-tools
    data-page-key="auto"
    data-default-color="#2563eb"
    data-labels='[
        {"name":"Urgent","color":"#dc2626"},
        {"name":"Hold","color":"#f59e0b"},
        {"name":"Recheck","color":"#2563eb"},
        {"name":"Done","color":"#16a34a"}
    ]'>
</div>
```

### `data-page-key`

Used as the storage key for labels.

```html
data-page-key="auto"
```

Use `auto` to follow the current page path.

Custom example:

```html
data-page-key="sales-crm-page"
```

### `data-default-color`

Default color for new labels.

```html
data-default-color="#2563eb"
```

### `data-labels`

Initial label list.

```html
data-labels='[
    {"name":"Urgent","color":"#dc2626"},
    {"name":"Hold","color":"#f59e0b"},
    {"name":"Recheck","color":"#2563eb"},
    {"name":"Done","color":"#16a34a"}
]'
```

---

## JavaScript Configuration

```js
import createHgmAnyTools from "hagematech-copas-labels";

const tools = createHgmAnyTools({
    pageKey: "sales-crm",
    defaultColor: "#2563eb"
});

tools.mount();
```

Destroy when needed:

```js
tools.destroy();
```

Available methods:

```js
tools.mount();
tools.destroy();
tools.openMenu();
tools.closeMenu();
tools.disableMode();
tools.copySelected();
tools.clearSelection();
tools.renderStoredLabels();
tools.clearAllLabels();
tools.clearLabelFilter();
```

---

## Stable Label Key

For dynamic tables, it is highly recommended to add `data-hgm-label-key`.

```html
<td data-hgm-label-key="deal-crm-1001-status">
    Completed
</td>
```

This keeps labels attached to the correct data even if the table is filtered, sorted, refreshed, or rendered again.

Laravel Blade example:

```blade
<td data-hgm-label-key="deal-{{ $deal->id }}-status">
    {{ $deal->status }}
</td>
```

PHP example:

```php
<td data-hgm-label-key="deal-<?= $deal['id']; ?>-status">
    <?= $deal['status']; ?>
</td>
```

React example:

```jsx
<td data-hgm-label-key={`deal-${deal.id}-status`}>
    {deal.status}
</td>
```

---

## Storage

Labels are stored in:

```js
sessionStorage
```

This means:

- Labels remain after refresh in the same browser tab
- Labels are temporary
- Labels are not stored in database
- Labels disappear after the session ends
- Labels are useful for temporary review, checking, marking, and internal workflows

---

## License

MIT
