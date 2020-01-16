/* global SQL */
'use strict';

const s = new SQL();

class ManagerView extends HTMLElement {
  constructor() {
    super();
    const shadow = this.attachShadow({
      mode: 'open'
    });
    shadow.innerHTML = `
      <style>
        :host {
          --bg-white: #fff;
          --bg-dark: #f3f3f3;

          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          outline: none;
        }
        h1 {
          font-size: 18px;
        }
        button,
        input {
          border: none;
          background-color: var(--bg-dark);
          font-size: inherit;
          border-radius: 2px;
          cursor: pointer;
          height: 36px;
          padding: 0 10px;
        }
        select {
          background-color: var(--bg-dark);
          border: none;
          height: 36px;
          text-indent: 4px;
          align-self: start;
        }
        select:empty ~ button,
        select:empty {
          opacity: 0.5;
          pointer-events: none;
        }
        #methods {
          min-width: 50vw;
          max-width: 90vw;
          display: flex;
          flex-direction: column;
          outline: none;
        }
        #methods > * {
          margin-bottom: 10px;
        }
        #grid-1 {
          display: grid;
          grid-template-columns: 2fr 1fr;
          grid-column-gap: 10px;
        }
        #grid-2 {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          grid-column-gap: 10px;
        }
        label {
          align-self: center;
        }
      </style>
      <h1>Welcome to SQLite Reader</h1>
      <div id="methods" tabindex="-1">
        <button id="create" title="Ctrl + D or Command + D">Create new <u>D</u>atabase</button>
        <button id="open" title="Ctrl + O or Command + O"><u>O</u>pen existing Database</button>
        <form id="grid-1">
          <input type="search" id="href" placeholder="Open Link: https://..." title="Ctrl + L or Command + L">
          <button title="Ctrl + B or Command + B" id="sample">Sample Data<u>b</u>ase</button>
        </form>
        <div id="grid-2">
          <select id="dbs"></select>
          <button title="Ctrl + E or Command + E" id="duplicate">Op<u>e</u>n Tab</button>
          <button title="Ctrl + S or Command + S" id="save"><u>S</u>ave active Database</button>
        </div>
      </div>
    `;
    this.elements = {
      sample: shadow.getElementById('sample'),
      create: shadow.getElementById('create'),
      open: shadow.getElementById('open'),
      href: shadow.getElementById('href'),
      dbs: shadow.getElementById('dbs'),
      duplicate: shadow.getElementById('duplicate'),
      save: shadow.getElementById('save')
    };
    this.setAttribute('tabindex', '-1');
  }
  keypress(e) {
    const meta = e.metaKey || e.ctrlKey;
    if (e.code === 'KeyO' && meta) {
      e.preventDefault();
      this.elements.open.click();
    }
    else if (e.code === 'KeyD' && meta) {
      e.preventDefault();
      this.elements.create.click();
    }
    else if (e.code === 'KeyS' && meta) {
      e.preventDefault();
      this.elements.save.click();
    }
    else if (e.code === 'KeyE' && meta) {
      e.preventDefault();
      this.elements.duplicate.click();
    }
    else if (e.code === 'KeyL' && meta) {
      e.preventDefault();
      this.elements.href.focus();
    }
    else if (e.code === 'KeyB' && meta) {
      e.preventDefault();
      this.elements.sample.click();
    }
  }
  connectedCallback() {
    // focus
    this.parentElement.addEventListener('click', e => {
      if (e.isTrusted === false) {
        this.focus();
      }
    });
    // keys
    this.addEventListener('keydown', this.keypress);
    // click
    const open = async (o, db) => {
      try {
        const append = db === undefined;
        await s.ready();
        db = db || await s.open(o);
        const div = document.createElement('div');
        div.title = o.name;
        const view = document.createElement('table-view');
        div.appendChild(view);
        let statement = 'PRAGMA page_size';
        const tables = await db.tables();
        if (tables.length) {
          const table = window.prompt('Select a table:\n\n' + tables.join(', '), tables[0]);
          if (table) {
            statement = `select * from ${table}`;
          }
          else {
            return;
          }
        }
        document.querySelector('tabs-view').appendChild(div);
        await view.from(db, statement);
        view.scrollIntoView();
        if (append) {
          const option = document.createElement('option');
          option.db = db;
          option.value = option.textContent = o.name;
          this.elements.dbs.appendChild(option);
        }
      }
      catch (e) {
        console.error(e);
        alert(e.message);
      }
    };
    this.elements.create.addEventListener('click', () => {
      open({
        name: 'New Database'
      });
    });
    this.elements.href.form.addEventListener('submit', e => {
      e.preventDefault();
      const {value} = this.elements.href;
      if (value) {
        open({
          name: value,
          href: value
        });
      }
    });
    this.elements.open.addEventListener('click', () => {
      const input = document.createElement('input');
      input.type = 'file';
      input.onchange = () => {
        const file = input.files[0];
        console.log(file);
        open({
          name: file.name,
          file
        });
      };
      input.click();
    });
    this.elements.duplicate.addEventListener('click', () => {
      const db = this.elements.dbs.selectedOptions[0].db;
      open({
        name: this.elements.dbs.value
      }, db);
    });
    this.elements.save.addEventListener('click', async () => {
      const db = this.elements.dbs.selectedOptions[0].db;
      const buffer = await db.buffer();
      const blob = new Blob([buffer], {
        type: 'application/x-sqlite3'
      });
      const href = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = href;
      a.download = this.elements.dbs.value;
      a.click();
      window.setTimeout(() => URL.revokeObjectURL(href), 1000);
    });
    this.elements.sample.addEventListener('click', () => {
      this.elements.href.value = '/test.db';
      window.setTimeout(() => this.elements.href.form().submit(), 100);
    });
  }
}
window.customElements.define('manager-view', ManagerView);
