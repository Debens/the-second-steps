# Dashboards (design exploration)

**Status:** Proposal. Nothing here is adopted, and no production screen has changed. The mock-ups live in the development-only design lab at `/design-lab/dashboards` (`components/design-lab/dashboards/`), with sample data only.

## Aim

Make work **actionable from the dashboard**: staff should finish, snooze, hand over or plan work from the Overview without opening each record, and finishing something should always ask what happens next, so no open landlord lead is left without a next action.

## Round 1: five layouts of the main Overview (owner to choose)

All five share one set of sample data and working actions, so only the layout differs.

| Option      | Idea                                                                                                      | Best for                                        |
| ----------- | --------------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| A. Inbox    | One ranked list (overdue, today, coming up) with a side rail for visits and leads that need a next action | Everyone                                        |
| B. Focus    | One card at a time with a progress bar                                                                    | Clearing a backlog, newer staff, mobile         |
| C. Table    | Dense table with tick-boxes and bulk done, snooze and hand-over                                           | Managers and power users                        |
| D. Tiles    | Today's Overview cards made actionable, with headline numbers                                             | Least change from today                         |
| E. Day plan | The day by the hour; drop backlog items into free hours                                                   | People with many visits (needs a real calendar) |

Shared interaction rules shown in every option: one primary action per row with the rest in a single "more" menu; every action confirms itself and can be undone; finishing an action offers the next step in place; call and email from the row; recording an appraisal outcome in a side panel.

## Owner choice and merge (2026-10-16)

The owner liked A (Inbox) and E (Day plan) and asked to merge them. **F. Inbox + day plan** is that merge: a ranked inbox on the left, the day by the hour on the right, and a **Plan** button on every row that drops the work into a free hour. It also carries a module tag and filter chips, with a few sample items from later modules (viewings, pre-tenancy, maintenance) mixed in to show one page can hold work from the whole product.

## Direction for later modules

The Overview is a **personal, cross-module "My day"** page, not a landlord-lead page. Every module contributes work items to the same inbox and day plan, tagged with its module. Each module also gets its own **role dashboard** reached from the navigation (for example the lead pipeline for managers, move-in progress for coordinators, portfolio and compliance for property managers, an agency overview for owners). Building this properly needs a **shared work-item model** (roadmap SHARED-01, Tasks and activity): a common shape for an action (what, due, owner, linked record, source module, status) that each module registers its own action types and allowed quick actions against. Today only landlord-lead next actions exist (the enquiry_tasks table), so the first real build should keep that table but read it through a thin work-item layer, not a one-off.

## Round 2 drafts (one layout each, not yet reviewed)

- **Manager pipeline** (branch managers): leads as a board, problems (no owner, no next action, stuck) lifted above it, assign, advance and close-as-lost with reason on each card, team workload.
- **Move-in progress** (lettings coordinator, roadmap Phase 3): blocked moves first, chase action beside each blocker. Step names are placeholders; the real referencing, agreement and payment steps are to be specified separately and must not be invented from this draft.

Property-management (compliance, maintenance, tenancy endings, rent) and an agency overview for owners are not drafted yet; both depend on modules that do not exist (roadmap Phases 4 and reporting).

## Next steps

1. Owner picks a favourite Overview layout (or a mix) and says what to change.
2. Build that layout for real on the workspace Overview using the existing services (`getEnquiryNeedsAttention`, task completion, reassignment, appraisal outcome). Several actions need a small service addition first: snooze (change due date), reassign a next action, and "complete and set the next action" as one step.
3. Repeat the options round for the role dashboards the owner wants first.

## Notes

- The design lab logs Content Security Policy messages about inline styles in development. The real new-lead form logs a similar number, so this is existing library behaviour, not specific to these pages.
- Dark mode, phone width and keyboard use were checked in a browser for the Overview options.
