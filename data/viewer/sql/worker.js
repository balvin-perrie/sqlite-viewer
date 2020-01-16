/* global importScripts, initSqlJs */
'use strict';

importScripts('sql-wasm.js');

const dbs = {};
const statements = {};

initSqlJs().then(SQL => {
  postMessage({
    ready: true
  });
  onmessage = ({data}) => {
    const post = o => postMessage(Object.assign(data, o));
    if (data.request === 'open') {
      const id = 'sql:' + Math.random();
      if (data.href) {
        fetch(data.href).then(r => r.arrayBuffer()).then(ab => {
          dbs[id] = new SQL.Database(new Uint8Array(ab));
          post({id});
        }).catch(e => {
          console.error(e);
          post({error: e.message});
        });
      }
      else if (data.file) {
        const reader = new FileReader();
        reader.onload = () => {
          dbs[id] = new SQL.Database(new Uint8Array(reader.result));
          post({id});
        };
        reader.onerror = e => {
          console.error(e);
          post({error: e.message});
        };
        reader.readAsArrayBuffer(data.file);
      }
      else {
        dbs[id] = new SQL.Database();
        post({id});
      }
    }
    else if (data.request === 'prepare') {
      const id = 'stmt:' + Math.random();
      try {
        statements[id] = dbs[data.id].prepare(data.statement, data.params);
        post({id});
      }
      catch (e) {
        post({
          error: e.message
        });
      }
    }
    else if (data.request === 'step') {
      const stmt = statements[data.id];
      const r = {
        done: false,
        results: []
      };

      // By doing a query with a offset of N, all previous N records are processed.
      for (let i = 0; i < data.end; i += 1) {
        const valid = stmt.step();
        if (valid) {
          if (i >= data.start) {
            r.results.push(stmt.getAsObject());
          }
        }
        else {
          delete statements[data.id];
          r.done = true;
          break;
        }
      }
      post(r);
    }
    else if (data.request === 'delete') {
      delete statements[data.id];
      post({});
    }
    else if (data.request === 'exec') {
      try {
        post({
          results: dbs[data.id].exec(data.statement, data.params)
        });
      }
      catch (e) {
        post({
          error: e.message
        });
      }
    }
    else if (data.request === 'buffer') {
      post({
        buffer: dbs[data.id].export()
      });
    }
  };
});
