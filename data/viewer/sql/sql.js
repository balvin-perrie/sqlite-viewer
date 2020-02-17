'use strict';

class SQL {
  constructor() {
    this.msgs = {};
  }
  ready() {
    return new Promise(resolve => {
      const worker = new Worker('sql/worker.js');

      this.post = (o, progress) => {
        return new Promise((resolve, reject) => {
          o.mid = 'rqst:' + Math.random();
          this.msgs[o.mid] = {
            resolve,
            reject,
            progress
          };
          worker.postMessage(o);
        });
      };
      worker.onmessage = ({data}) => {
        if (data.ready) {
          this.ready = () => Promise.resolve();
          resolve();
        }
        else if (data.mid) {
          const o = this.msgs[data.mid];
          if (o) {
            if (data.progress) {
              if (o.progress) {
                o.progress(data.progress);
              }
              return;
            }
            else {
              if (data.error) {
                o.reject(Error(data.error));
              }
              else {
                o.resolve(data);
              }
              delete this.msgs[data.mid];
            }
          }
        }
      };
    });
  }
  open(o) {
    return this.post({
      request: 'open',
      href: o.href,
      file: o.file
    }, o.progress).then(o => {
      const id = o.id;
      return {
        prepare: (statement, params) => {
          return this.post({
            request: 'prepare',
            id,
            statement,
            params
          }).then(o => {
            const id = o.id;
            return {
              step: (start = 0, end = 1) => { // to execute without recording set start > end
                return this.post({
                  request: 'step',
                  id,
                  start,
                  end
                });
              },
              delete: () => {
                return this.post({
                  request: 'delete',
                  id
                });
              }
            };
          });
        },
        tables: () => {
          return this.post({
            request: 'exec',
            id,
            statement: `
              SELECT name FROM sqlite_master
                WHERE type IN ('table','view') AND name NOT LIKE 'sqlite_%'
                ORDER BY 1`
          }).then(o => o.results.length && o.results[0].values.flat());
        },
        buffer: () => {
          return this.post({
            request: 'buffer',
            id
          }).then(o => o.buffer);
        }
      };
    });
  }
}
