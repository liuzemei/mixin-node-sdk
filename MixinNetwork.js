const MixinNetwork = function () {

}

MixinNetwork.prototype = {
    async pin_update({ old_pin, pin }) {
        const params = {
            // reference: https://developers.mixin.one/api/alpha-mixin-network/create-pin/
            old_pin: old_pin ? this.signPin(old_pin) : '',
            pin: this.signPin(pin)
        }
        return await this._request.post('/pin/update', params)
    },
    async pin_verify({ pin }) {
        const params = {
            pin: this.signPin(pin)
        }
        return await this._request.post('/pin/verify', params)
    },
    async query_assets({ asset_id }) {
        let uri = asset_id ? '/assets/' + asset_id : '/assets'
        return await this._request.get(uri)
    },
    async create_address({ asset_id, destination, tag, label }) {
        const params = {
            asset_id, label, destination,
            pin: this.signPin(),
            tag: tag || ''
        }
        return await this._request.post('/addresses', params)
    },
    async query_address({ address_id }) {
        return await this._request.get('/addresses/' + address_id)
    },
    async withdrawal({ address_id, amount, memo }) {
        const params = {
            address_id, amount, memo,
            pin: this.signPin(),
            trace_id: this.getUUID()
        }
        return await this._request.post('/withdrawals', params)
    },
    async delete_address({ address_id }) {
        const params = { pin: this.signPin() }
        return await this._request.post('/addresses/' + address_id + '/delete', params)
    },
    async query_my_addresses_by_assetid({ asset_id }) {
        return await this._request.get('/assets/' + asset_id + '/addresses')
    },
    async verify_payment({ asset_id, opponent_id, amount, trace_id }) {
        const params = { asset_id, opponent_id, amount, trace_id }
        return await this._request.post('/payments', params)
    },
    async transfer({ amount, asset_id, opponent_id, memo }) {
        const params = {
            amount, asset_id, opponent_id,
            pin: this.signPin(),
            trace_id: this.getUUID(),
            memo: memo || ''
        }
        return await this._request.post('/transfers', params)
    },
    async query_transfer({ trace_id }) {
        return await this._request.get('/transfers/trace/' + trace_id)
    },
    async query_network_top_assets() {
        return await this._request.get('/network/assets/top')
    },
    async query_network_asset({ asset_id }) {
        return await this._request.get('/network/assets/' + asset_id)
    },
    async query_network_snapshots({ snapshot_id }) {
        const uri = snapshot_id ? '/network/snapshots/' + snapshot_id : '/network/snapshots'
        return await this._request.get(uri)
    },
    async query_external_transactions({ destination, tag, limit, offset, asset }) {
        const params = {
            destination, tag, limit, offset, asset
        }
        let uri = '/external/transactions?'
        for (let key in params) {
            if (params[key]) uri += key + '=' + params[key] + '&'
        }
        uri = uri.slice(0, -1)
        return await this._request.get(uri)
    },
    async query_network_asset_by_symbol({ symbol }) {
        return await this._request.get('/network/assets/search/' + symbol)
    },
    async create_user({ full_name, session_secret }) {
        const params = { full_name, session_secret }
        return await this._request.post('/users', params)
    }
}

module.exports = MixinNetwork
