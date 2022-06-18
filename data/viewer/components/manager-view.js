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
          position: relative;
        }
        :host([data-ready="false"])::before {
          content: 'Loading. Please wait...';
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          color: var(--bg-white);
          background-color: rgba(0, 0, 0, 0.6);
          z-index: 1;
          padding: 10px;
        }
        h1 {
          font-size: 20px;
          font-weight: 300;
          margin-bottom: 20px;
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
        a {
          text-decoration: none;
          color: #0074cc;
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
        #open-container {
          display: grid;
          grid-template-columns: 2fr 1fr;
          grid-column-gap: 10px;
        }
        #grid-1 {
          display: grid;
          grid-template-columns: 2fr 1fr;
          grid-column-gap: 10px;
        }
        #href {
          width: 100%;
        }
        #progress {
          position: relative;
        }
        #progress::after {
          content: '';
          top: calc(100% - 2px);
          left: 0;
          position: absolute;
          width: var(--width, 0);
          height: 2px;
          background: red;
        }
        #grid-2 {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          grid-column-gap: 10px;
        }
        label {
          align-self: center;
        }
        #rate.highlight {
          color: #c65b00;
        }
      </style>
      <h1>Welcome to <a href="${chrome.runtime.getManifest().homepage_url}" target=_blank>${chrome.runtime.getManifest().name}</a></h1>
      <div id="methods" tabindex="-1">
        <button id="create" title="Ctrl + D or Command + D">Create new <u>D</u>atabase</button>
        <div id="open-container">
          <button id="open" title="Ctrl + O or Command + O"><u>O</u>pen existing Database</button>
          <button id="rate" title="Rate Me">Rate Me</button>
        </div>
        <form id="grid-1">
          <div id="progress">
            <input type="search" id="href" placeholder="Open Link: https://..." title="Ctrl + L or Command + L">
          </div>
          <button type="button" title="Ctrl + B or Command + B" id="sample">Sample Data<u>b</u>ase</button>
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
      progress: shadow.getElementById('progress'),
      href: shadow.getElementById('href'),
      dbs: shadow.getElementById('dbs'),
      duplicate: shadow.getElementById('duplicate'),
      save: shadow.getElementById('save'),
      rate: shadow.getElementById('rate')
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
        this.dataset.ready = false;
        await s.ready();
        db = db || await s.open(o);
        const div = document.createElement('div');
        div.title = o.name;
        const view = document.createElement('table-view');
        div.appendChild(view);
        let statement = `SELECT name FROM sqlite_master WHERE type IN ('table','view') AND name NOT LIKE 'sqlite_%' ORDER BY 1`;
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
        const tabs = document.querySelector('tabs-view');
        tabs.appendChild(div);
        await view.from(db, statement);
        this.dataset.ready = true;
        tabs.active(div);
        if (append) {
          const option = document.createElement('option');
          option.db = db;
          option.value = option.textContent = o.name;
          this.elements.dbs.appendChild(option);
        }
        tabs.navigate(div, 'panel', false);
      }
      catch (e) {
        this.dataset.ready = true;
        alert(e.message);
        console.error(e);
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
        chrome.permissions.request({
          origins: [value]
        }, () => {
          open({
            name: value,
            href: value,
            progress: e => {
              const width = e.loaded === e.total ? 0 : e.loaded / e.total * 100 + '%';
              this.elements.progress.style.setProperty('--width', width);
            }
          });
        });
      }
      return false;
    });
    this.elements.open.addEventListener('click', () => {
      const input = document.createElement('input');
      input.type = 'file';
      input.onchange = () => {
        const file = input.files[0];
        open({
          name: file.name,
          file
        });
      };
      input.click();
    });

    if (Math.random() > 0.5) {
      chrome.storage.local.get({
        rate: true
      }, prefs => {
        if (prefs.rate) {
          this.elements.rate.classList.add('highlight');
        }
      });
    }
    this.elements.rate.addEventListener('click', () => {
      let url = 'https://chrome.google.com/webstore/detail/sqlite-viewer/golagekponhmgfoofmlepfobdmhpajia/reviews';
      if (/Edg/.test(navigator.userAgent)) {
        url = 'https://microsoftedge.microsoft.com/addons/detail/gljmogcmgknikhkbejpiapnakflhnnfe';
      }
      else if (/Firefox/.test(navigator.userAgent)) {
        url = 'https://addons.mozilla.org/firefox/addon/sqlite-viewer/reviews/';
      }

      chrome.storage.local.set({
        rate: false
      }, () => chrome.tabs.create({
        url
      }));
    });

    window.addEventListener('dragover', e => e.preventDefault());
    window.addEventListener('drop', e => {
      e.preventDefault();
      if (e.dataTransfer.files.length) {
        const file = e.dataTransfer.files[0];
        open({
          name: file.name,
          file
        });
      }
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
      const href = chrome.runtime.getURL('/data/viewer/test.db');
      open({
        name: 'Test Database',
        href
      });
    });
  }
}
window.customElements.define('manager-view', ManagerView);
