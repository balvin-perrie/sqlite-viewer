'use strict';

class TableView extends HTMLElement {
  constructor() {
    super();
    this.config = {
      patch: 60 // number of entries on each step request
    };
    const shadow = this.attachShadow({
      mode: 'closed'
    });
    shadow.innerHTML = `
      <link rel="stylesheet" href="/data/viewer/prism/prism.css">
      <style>
        :host {
          --bg-white: #fff;
          --bg-dark: #f3f3f3;
          --bg-darker: #f5f5f5;
          --bg-selected: #007ff0;
          --fg-selected: #fff;
          --bg-hover: #f2fafe;
          --border: #cdcdcd;
          --error: red;
          --search-height: 32px;

          font-family: inherit;
          font-size: inherit;
          background-color: var(--bg-dark);
          display: flex;
          flex-direction: column;
        }
        #table {
          overflow: auto;
          flex: 1;
          outline: none;
          background-color: var(--bg-white);
        }
        table {
          min-width: 100%;
          table-layout: fixed;
          border-collapse: collapse;
        }
        th {
          background-color: var(--bg-white);
          border-bottom: solid 1px var(--border);
          position: sticky;
          top: 0;
        }
        th:not(:first-child),
        td:not(:first-child) {
          border-left: solid 1px var(--border);
        }
        tr td {
          background-color: var(--bg-white);
        }
        tr:nth-child(odd) td {
          background-color: var(--bg-darker);
        }
        tr:hover td {
          background-color: var(--bg-hover);
        }
        tr.selected td {
          color: var(--fg-selected);
          background-color: var(--bg-selected);
        }
        th,
        td {
          padding: 5px;
        }
        .warning,
        .error {
          padding: 5px 10px;
          display: block;
        }
        .error {
          color: var(--error);
        }
        .warning {
          font-style: italic;
        }
        #search {
          position: relative;
          background-color: var(--bg-white);
          border-top: solid 1px var(--border);
          height: var(--search-height);
        }
        #search div,
        #search input {
          padding: 0 5px;
          position: absolute;
          top: 0;
          left: 0;
          height: 100%;
          font-size: 13px;
          font-family: Arial;
        }
        #search div {
          pointer-events: none;
          line-height: var(--search-height);
          white-space: pre;
        }
        #search input {
          width: 100%;
          border: none;
          outline: none;
          background-color: transparent;
          color: black;
          -webkit-text-fill-color: transparent;
        }
        #search[data-overflow=true] input {
          -webkit-text-fill-color: black;
        }
        #search[data-overflow=true] div {
          opacity: 0;
        }
      </style>
      <div id="table" tabindex="-1">
        <table>
          <thead>
            <tr id="thead"></tr>
          </thead>
          <tbody id="tbody"></tbody>
        </table>
      </div>
      <form id="search" title="Ctrl + E or Command + E">
        <input type="search" value="Test">
        <div>Testing</div>
      </form>
    `;
    // elements
    this.elements = {
      table: shadow.getElementById('table'),
      thead: shadow.getElementById('thead'),
      tbody: shadow.getElementById('tbody'),
      search: shadow.getElementById('search')
    };
  }
  header(row) {
    const keys = Object.keys(row);

    const tr = this.elements.thead;
    tr.textContent = '';

    const f = document.createDocumentFragment();
    keys.forEach((key, index) => {
      const th = document.createElement('th');
      th.textContent = key;
      th.index = index;
      f.appendChild(th);
    });
    tr.appendChild(f);
  }
  body(o) {
    const f = document.createDocumentFragment();
    o.results.forEach((result, index) => {
      const tr = document.createElement('tr');
      tr.index = index;
      Object.values(result).forEach((value, index) => {
        const td = document.createElement('td');
        td.textContent = value;
        td.index = index;
        tr.appendChild(td);
      });
      f.appendChild(tr);
      this.observer.observe(tr);
    });
    this.elements.tbody.appendChild(f);
    if (o.done) {
      this.done = true;
    }
  }
  message(e, type = 'warning') {
    const span = document.createElement('span');
    span.textContent = e.message;
    span.classList.add(type);
    if (type === 'error') {
      console.error(e);
    }
    this.elements.tbody.appendChild(span);
  }
  async next() {
    if (this.done) {
      return;
    }
    const o = await this.stmt.step(0, this.config.patch);
    this.body(o);
  }
  async from(db = this.db, statement, params) {
    this.db = db;
    if (this.stmt) {
      this.stmt.delete();
    }
    this.done = false;
    this.elements.tbody.textContent = '';
    this.print(statement, true);
    if (statement) {
      try {
        this.stmt = await db.prepare(statement, params);
        const o = await this.stmt.step(0, this.config.patch);
        if (o.results.length) {
          this.header(o.results[0]);
          this.body(o);
        }
        else {
          this.elements.thead.textContent = '';
          this.message({
            message: 'No Result!'
          });
        }
      }
      catch (e) {
        this.message(e, 'error');
      }
    }
    else {
      this.message({
        message: 'Empty View'
      });
    }
  }
  keypress(e) {
    const meta = e.metaKey || e.ctrlKey;
    if (e.code === 'Escape') {
      e.preventDefault();
      this.click();
    }
    else if (e.code === 'KeyE' && meta) {
      this.elements.search.click();
      this.elements.search.focus();
      this.elements.search.select();
      e.preventDefault();
    }
  }
  print(statement, mirror = false) {
    const Prism = window.Prism;
    const parent = this.elements.search;
    const code = Prism.highlight(statement, Prism.languages.sql, 'sql');
    const div = parent.querySelector('div');
    div.innerHTML = code;
    if (mirror) {
      this.elements.search.querySelector('input').value = statement;
    }
    parent.dataset.overflow = div.offsetWidth >= parent.offsetWidth - 40;
  }
  click() {
    this.elements.table.focus();
  }
  connectedCallback() {
    this.setAttribute('tabindex', '-1');
    this.addEventListener('keydown', this.keypress);
    // observe
    const observe = entries => {
      for (const e of entries) {
        if (e.isIntersecting && !e.target.nextElementSibling) {
          this.next();
        }
      }
    };
    this.observer = new IntersectionObserver(observe, {
      root: this.elements.table
    });
    // focus
    this.parentElement.addEventListener('click', e => {
      if (e.isTrusted === false) {
        this.click();
      }
    });
    // prism
    this.elements.search.querySelector('input').addEventListener('input', e => {
      this.print(e.target.value);
    });
    // search
    this.elements.search.addEventListener('submit', e => {
      e.preventDefault();
      this.from(undefined, this.elements.search.querySelector('input').value);
      this.click();
    });
    // highlight
    this.elements.table.addEventListener('click', ({target}) => {
      if (target.tagName === 'TD') {
        const tr = target.parentElement;
        tr.classList[tr.classList.contains('selected') ? 'remove' : 'add']('selected');
      }
    });
  }
}
window.customElements.define('table-view', TableView);
