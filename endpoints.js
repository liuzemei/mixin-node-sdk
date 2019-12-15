const _request = require('./http')
const Mixin = require('./mixin')
const MixinNetwork = require('./MixinNetwork')
const MixinMessenger = require('./MixinMessenger')

class MixinBase extends Mixin {
    constructor(config) {
        super(config);
        this.CLIENT_CONFIG = config
        this._request = _request(config)
        _extend(this, MixinNetwork)
        _extend(this, MixinMessenger)
    }
}

function _extend(source, target) {
    for (let key in target.prototype) {
        source[key] = target.prototype[key]
    }
}

module.exports = MixinBase
