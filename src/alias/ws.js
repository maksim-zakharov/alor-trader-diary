class UpWS extends WebSocket{
    setMaxListeners = (val) => {}
    on = (type) => {
        switch (type){
            case 'error': return this.onerror
            case 'open': return this.onopen;
            case 'close': return this.onclose;
        }
    }
}

export {UpWS as WebSocket};

// module.exports = {WebSocket: UpWS};