class UpWS extends WebSocket {
  ws;

  constructor(...args) {
    super(...args);

    this.ws = this;
  }
  setMaxListeners = (val) => {};
  on = (type, handler) => {
    switch (type) {
      case 'error':
        return this.addEventListener('error', handler);
      case 'open':
        return this.addEventListener('open', handler);
      case 'message':
        return this.addEventListener('message', (event) => {
          handler(event.data);
        });
      case 'close':
        return this.addEventListener('close', handler);
    }
  };
  off = (type, handler) => {
    switch (type) {
      case 'error':
        return this.removeEventListener('error', handler);
      case 'open':
        return this.removeEventListener('open', handler);
      case 'message':
        return this.removeEventListener('message', handler);
      case 'close':
        return this.removeEventListener('close', handler);
    }
  };

  emit = (type, handler) => {
    switch (type) {
      case 'open':
        this.ws = new UpWS(this.url);
    }
  };

  listeners = (val) => [];
}

export { UpWS as WebSocket };
