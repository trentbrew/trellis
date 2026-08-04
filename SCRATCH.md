# TML

```html
<!-- 1. Authored shell (desk owns structure) -->
<template id="shell-issue-card" data-trellis-shell="issue.card">
  <button type="button"
    class="issue-card"
    data-trellis-shell="card"
    data-kind="issue"
    tml-attr-data-entity-id="issue.id"
    tml-attr-data-status="issue.status">
    <div class="issue-card-head">
      <div class="issue-id" tml-text="issue.id"></div>
      <!-- chrome decoration; density via CSS / --ui-vantage -->
      <span class="progress-spin" aria-hidden="true" title="In progress">…</span>
    </div>
    <div class="issue-title" tml-text="issue.title"></div>
    <div class="issue-meta">
      <span
        tml-text="issue.priority"
        tml-attr-class="'priority-badge ' + (issue.priority || 'low')"></span>
      <span class="lane-badge"
        tml-if="issue.laneIds"
        tml-text="issue.laneIds"></span>
    </div>
  </button>
</template>

<!-- 2. Projection host: query + each + slot (shell id is still hardcoded today) -->
<div
  tml-query="find ?e where type = 'Issue' and not (status = 'in_progress' or …)"
  tml-each="issue of issues"
  tml-live
  tml-ref="col-backlog">
  <div data-shell-slot="issue.card"></div>
</div>
```

# DSL

```tml
shell issue.card
  kind: issue
  density: card                    # theme/vantage role — not the registry id

  root button
    entity @issue.id
    status @issue.status

    slot id
      text @issue.id

    slot title
      text @issue.title

    slot meta
      text @issue.priority
        when @issue.priority       # optional presence
      text @issue.laneIds
        when @issue.laneIds

# Host (not part of the shell body)
project kanban.backlog
  query: find ?e where type = Issue and status != in_progress …
  each issue in issues
  live
  use shell issue.card
```

```
shell lane.card
  kind: lane
  density: card

  root article
    entity @lane.id
    status @lane.status

    slot id
      text @lane.id

    slot meta
      text ("agent:" + @lane.agentId)
      text ("ops " + @lane.opCount)

    action promote
      op promote(@lane.id)
      label "Promote"
```

```tml
shell issue.card (kind: issue, density: card) {
  button[entity=@issue.id, status=@issue.status] {
    #id      { @issue.id }
    #title   { @issue.title }
    #meta {
      @issue.priority?
      @issue.laneIds?
    }
  }
}
```

```
# Combined authoring view (same as shells/ + projects/)

shell todo.row (kind: todo, density: row)
  label[entity=@todo.id]
    #done @todo.done
    #title @todo.title

  action remove
    op remove(@todo.id)
    label "Remove"

project todo.list
  query: find ?e where type = 'Todo'
  each todo in todos
  live
  ref todos
  use todo.row
```

# LIT

```ts
import {LitElement, css, html} from 'lit';
import {customElement, property} from 'lit/decorators.js';

@customElement('simple-greeting')
export class SimpleGreeting extends LitElement {
  // Define scoped styles right with your component, in plain CSS
  static styles = css`
    :host {
      color: blue;
    }
  `;

  // Declare reactive properties
  @property()
  name?: string = 'World';

  // Render the UI as a function of component state
  render() {
    return html`<p>Hello, ${this.name}!</p>`;
  }
}

```