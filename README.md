# AMBeR BRIDGE – Member workspace (prototype)

A clickable prototype of the **member layer** of the AMBeR platform: a shared workspace where the
partners of the Interreg South Baltic project AMBeR BRIDGE share documents, plans and ideas.
It is made for collecting feedback in a partner workshop. It looks and behaves like a product,
but it has **no backend**: all content is example data and every change stays in your own browser.

The visual style (colours, Open Sans, cards) follows the open AMBeR platform
([ehealth-implementation](https://github.com/IoU-Angelhaven/ehealth-implementation)).

## Run, build and deploy

Requires Node.js 22 or newer.

```bash
npm install
```

```bash
npm run dev
```

Opens the prototype at http://localhost:5173.

```bash
npm run build
```

Checks the TypeScript code and writes the static site to `dist/`.

```bash
npm run preview
```

Shows the built site locally.

**Deploy to GitHub Pages:** the workflow `.github/workflows/deploy.yml` builds and publishes the site on
every push to `main`. One setting is needed once: *Settings → Pages → Build and deployment → Source:
"GitHub Actions"*. The site uses relative paths and hash routing (`…/#/initiatives`), so it works in a
sub-folder, on a custom domain, and deep links can be shared.

## How to use the prototype

- **View as** (top right) switches between the four roles. Each role is shown as one example person:

  | Role | Example person | Access |
  |---|---|---|
  | Administrator | Project coordinator, Zealand University Hospital | Everything, including Administration |
  | Member | Physiotherapist, Ängelholm Hospital | All modules except Administration |
  | Associated partner | Clinic manager at an example healthcare provider | Home, approved documents, "Ask the network", open meetings, Network, Academy and courses |
  | Visitor (not logged in) | – | A mock login screen |

- **Reset demo data** (top right) removes everything you added or changed.
- The prototype uses a fixed **demo date, 15 November 2027**, so that "upcoming" and "overdue" always
  look right. Change it in `src/lib/format.ts` (`DEMO_TODAY`).
- Filters and search are kept in the address (for example `#/documents?status=review`), so a filtered
  list can be shared as a link.

## Project structure

```
src/
  data/          Example data, one JSON file per type of content
  types.ts       The data model (TypeScript types)
  store/
    store.ts     Reads the JSON files, keeps changes in localStorage
    actions.ts   Every change to the data (create, move, comment …)
    session.ts   The "View as" role (mock login)
  lib/
    permissions.ts  What each role may see and do (one table)
    visibility.ts   Which documents, meetings and discussions a role sees
    reference.ts    Work packages, phases, option lists for filters
    format.ts       Dates and the demo date
  i18n/en.ts     All text of the user interface
  components/    Layout, filter bar, comments, dialogs and other shared parts
  pages/         One file per module
```

**Text and languages.** All user-interface text is in `src/i18n/en.ts`. To add a language, copy the file,
translate the values and choose it in the `t` export.

**Replacing the mock data with a backend.** Pages read data only through `useDb()` and change it only
through the functions in `src/store/actions.ts`. A developer replaces these two files with calls to an
API; the pages can stay as they are. Permissions are checked in the browser only (`lib/permissions.ts`);
a real backend must check them again on the server.

## Data model

Defined in `src/types.ts`. Items refer to each other by id.

| Type | File in `src/data/` | Main fields | Links to |
|---|---|---|---|
| Organisation | `organisations.json` | name, country, type (partner / healthcare provider / patient advocacy group), role, expertise | contact person |
| Person | `people.json` | name, title, role, status, last active | organisation |
| Work package, Phase | `workPackages.json`, `phases.json` | WP1–WP4; the five AMBeR phases with their activities (used as checklists) | – |
| Initiative | `initiatives.json` | title, problem, hypothesis, board column, status, next step, "what we learned" | owner, organisation, partners, phase, WP, documents, discussion thread |
| Comment | `comments.json` | text, date | author; an initiative or a document |
| Document | `documents.json` | title, type, WP, country, status (Draft / For review / Approved), version history. **Details only, no file** | owner, reviewer |
| Template | `templates.json` | title, type, description | – |
| Thread | `threads.json` | title, kind (WP / initiative / topic / Ask the network), language, posts, followers | WP or initiative |
| Meeting | `meetings.json` | type (partner meeting, workshop, study visit, training, deadline), date, agenda, notes, decisions, actions (owner, due date) | WP, documents |
| Guide | `guides.json` | checklist items done per phase, notes | one partner organisation |
| Courses, facilitator material, experiences, submitted needs and ideas | `learning.json` | – | – |
| Proposals for the open layer, pinned messages, activity list, notification settings | `misc.json` | – | initiative, author |

Documents are linked from initiatives and meetings (`documentIds`), so each link is stored in one place.
The status of a phase in a local guide is worked out from its checklist (none done = Not started,
all done = Completed, otherwise In progress).

## Example data

The ten partner organisations and the four work packages are real. **Everything else is invented**: all
people, the five associated partners (marked "Example organisation"), initiatives, documents,
meetings and discussions. The roles and expertise shown for the partners are illustrations, not agreed facts.

## What is mocked

| In the prototype | Needed in a production version |
|---|---|
| "View as" switcher and a login screen without checks | Real login (for example the organisations' own accounts), invitations by email, permissions enforced on the server |
| Data from JSON files, changes saved in the browser (localStorage) | Database and API; changes shared between all users |
| "Upload" saves details only; preview and download are placeholders | File storage, virus scanning, preview of Word/PDF/PowerPoint, real version files |
| Notification settings are saved, but nothing is sent | Email service for the weekly summary, mentions and invitations |
| @mentions and "Waiting for me" are worked out in the browser | Notifications per user on the server |
| "Suggest for the open layer" creates a list entry for the coordinator | A publishing flow to the open platform |
| "Submitted needs and ideas" is example content | A form on the open platform that sends to this inbox, and replies by email |
| Search looks through the example data in the browser | Search on the server, including the text inside documents |
| Statistics are counted from the example data | Usage logging and reports |
| Academy and course buttons show a message | Links or single sign-on to the Academy and e-learning tools |
| English only (text collected in one file) | Translations, if the partners want them |

Also to decide for production: hosting within the EU, a data processing agreement, how long content is
kept, backup, and an accessibility statement.

## Out of scope (by design)

Real-time editing of documents together, separate rooms for working groups (use the WP filters and tags),
financial documents and first level control (FLC) material.

## Accessibility

Built for WCAG 2.1 AA: text contrast, visible focus, keyboard use, labels on all fields, a "Skip to main
content" link, and a "Move to" menu on every card as an alternative to drag and drop. All pages were
checked automatically with axe-core in all four roles. An automatic check does not replace testing with users.
