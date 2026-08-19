# Dashboard V2 — Component Foundation

This directory is the clean foundation for rebuilding the Dashboard V2 UI from scratch.

It intentionally contains only empty, purpose-labeled folders — no V1 code.

## Structure

| Folder       | Purpose                                              |
| ------------ | ---------------------------------------------------- |
| `layout/`    | Dashboard shells, layouts, wrappers                  |
| `navigation/`| Sidebar, topbar, nav menus, breadcrumbs              |
| `cards/`     | Dashboard cards, stat cards, quick-action tiles      |
| `tables/`    | Data tables and list view primitives                 |
| `charts/`    | Analytics graphs and visualizations                  |
| `forms/`     | Dashboard-specific forms and inputs                  |
| `feedback/`  | Toasts, empty states, loading, notifications          |
| `settings/`  | Settings-related UI components                       |
| `state/`     | Dashboard-level state/context providers              |

Each folder may hold component files, or a `README.md` describing its planned contents,
as the V2 UI is implemented.