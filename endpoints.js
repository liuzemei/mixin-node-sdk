const _request = require('./http')
const Mixin = require('./mixin')
const axios = require('axios')

class MixinBase extends Mixin {
  constructor(config, useChinaServer, debug) {
    super(config);
    this.CLIENT_CONFIG = config
    this._request = _request(config, useChinaServer, debug)
  }

  async authenticate({ code }) {
    let { client_id, client_secret } = this.CLIENT_CONFIG
    let params = { code, client_id, client_secret }
    return await this._request.post('/oauth/token', params)
  }

  async pin_update({ old_pin, pin }) {
    const params = {
      // reference: https://developers.mixin.one/api/alpha-mixin-network/create-pin/
      old_pin: old_pin ? this.signPin(old_pin) : '',
      pin: this.signPin(pin)
    }
    return await this._request.post('/pin/update', params)
  }
  async pin_verify({ pin }) {
    const params = {
      pin: this.signPin(pin)
    }
    return await this._request.post('/pin/verify', params)
  }
  async query_assets({ asset_id } = {}) {
    let uri = asset_id ? '/assets/' + asset_id : '/assets'
    return await this._request.get(uri)
  }
  async query_asset_fee({ asset_id }) {
    return await this._request.get('/assets/' + asset_id + '/fee')
  }
  async create_address({ asset_id, destination, tag, label }) {
    const params = {
      asset_id, label, destination,
      pin: this.signPin(),
      tag: tag || ''
    }
    return await this._request.post('/addresses', params)
  }
  async query_address({ address_id }) {
    return await this._request.get('/addresses/' + address_id)
  }
  async withdrawal({ address_id, amount, memo }) {
    const params = {
      address_id, amount, memo,
      pin: this.signPin(),
      trace_id: this.getUUID()
    }
    return await this._request.post('/withdrawals', params)
  }
  async delete_address({ address_id }) {
    const params = { pin: this.signPin() }
    return await this._request.post('/addresses/' + address_id + '/delete', params)
  }
  async query_my_addresses_by_assetid({ asset_id }) {
    return await this._request.get('/assets/' + asset_id + '/addresses')
  }
  async verify_payment({ asset_id, opponent_id, amount, trace_id }) {
    const params = { asset_id, opponent_id, amount, trace_id }
    return await this._request.post('/payments', params)
  }
  async transfer({ amount, asset_id, opponent_id, memo }) {
    if (typeof amount !== 'string') amount = String(amount)
    const params = {
      amount, asset_id, opponent_id,
      pin: this.signPin(),
      trace_id: this.getUUID(),
      memo: memo || ''
    }
    return await this._request.post('/transfers', params)
  }
  async query_transfer({ trace_id }) {
    return await this._request.get('/transfers/trace/' + trace_id)
  }
  async query_snapshot({ limit, offset, asset } = {}) {
    let params = { limit, offset, asset }
    return await this._request.get('/snapshots', { params })
  }
  async query_fiats() {
    return await this._request.get('/fiats')
  }
  async query_network_top_assets() {
    return await this._request.get('/network/assets/top')
  }
  async query_network_asset({ asset_id }) {
    return await this._request.get('/network/assets/' + asset_id)
  }
  async query_network_snapshots({ snapshot_id, ...params }) {
    const uri = snapshot_id ? '/network/snapshots/' + snapshot_id : '/network/snapshots'
    return await this._request.get(uri, { params })
  }
  async query_external_transactions({ destination, tag, limit, offset, asset }) {
    const params = { destination, tag, limit, offset, asset }
    let uri = '/external/transactions?'
    for (let key in params) {
      if (params[key]) uri += key + '=' + params[key] + '&'
    }
    uri = uri.slice(0, -1)
    return await this._request.get(uri)
  }
  async query_network_asset_by_symbol({ symbol }) {
    return await this._request.get('/network/assets/search/' + symbol)
  }
  async create_user({ full_name, session_secret }) {
    const params = { full_name, session_secret }
    return await this._request.post('/users', params)
  }
  async query_me() {
    return await this._request.get('/me')
  }
  async update_preference({ receive_message_source, accept_conversation_source }) {
    const params = { receive_message_source, accept_conversation_source }
    return await this._request.post('/me/preferences', params)
  }
  async update_profile({ full_name, avatar_base64 }) {
    const params = { full_name, avatar_base64 }
    return await this._request.post('/me', params)
  }
  async rotate_qr_code() {
    return await this._request.get('/me/code')
  }
  async query_user_by_id({ user_id }) {
    return await this._request.get('/users/' + user_id)
  }
  async query_user_by_number({ mixin_number }) {
    return await this.search_user({ mixin_number })
  }
  async query_user_fetch(users) {
    users = Array.isArray(users) ? users : [users]
    return await this._request.post('/users/fetch', users)
  }
  async search_user({ mixin_number }) {
    return await this._request.get('/search/' + mixin_number)
  }
  async query_friends() {
    return await this._request.get('/friends')
  }
  async upload_file({ file }) {
    const { upload_url, attachment_id, view_url } = await this.get_attachment()
    const instant = axios.create()
    let a = await instant({
      url: upload_url,
      method: 'PUT',
      headers: {
        'x-amz-acl': 'public-read',
        'Content-Type': 'application/octet-stream'
      },
      maxContentLength: 2147483648,
      data: file
    })
    return { attachment_id, view_url }
  }
  async get_attachment() {
    return await this._request.post('/attachments')
  }
  async query_contacts() {
    return await this._request.get('/contacts')
  }
  async create_conversation({ category, conversation_id, participants, action, role, user_id }) {
    return await this._request.post('/conversations', { category, conversation_id, participants, action, role, user_id })
  }
  async rotate_conversation({ conversation_id, name, announcement }) {
    return await this._request.post('/conversations/' + conversation_id + '/rotate', { name, announcement })
  }
  async update_conversation({ conversation_id, name, announcement }) {
    return await this._request.post('/conversations/' + conversation_id, { name, announcement })
  }
  async query_conversations({ conversation_id }) {
    return await this._request.get('/conversations/' + conversation_id)
  }
  async participants_actions({ conversation_id, action, participants }) {
    return await this._request.post(`/conversations/${conversation_id}/participants/${action}`, participants)
  }
  async create_acknowledgements(message_list) {
    return await this._request.post('/acknowledgements', message_list)
  }
  async create_messages(params) {
    return await this.messages(params)
  }
  async send_text({ recipient_id, data }) {
    return await this._request.post('/messages', await this._create_message(data, recipient_id, 'PLAIN_TEXT'))
  }
  async send_image({ recipient_id, data }) {
    return await this._request.post('/messages', await this._create_message(data, recipient_id, 'PLAIN_IMAGE'))
  }
  async send_video({ recipient_id, data }) {
    return await this._request.post('/messages', await this._create_message(data, recipient_id, 'PLAIN_VIDEO'))
  }
  async send_live({ recipient_id, data }) {
    return await this._request.post('/messages', await this._create_message(data, recipient_id, 'PLAIN_LIVE'))
  }
  async send_file({ recipient_id, data }) {
    return await this._request.post('/messages', await this._create_message(data, recipient_id, 'PLAIN_DATA'))
  }
  async send_sticker({ recipient_id, data }) {
    return await this._request.post('/messages', await this._create_message(data, recipient_id, 'PLAIN_STICKER'))
  }
  async send_contact({ recipient_id, data }) {
    return await this._request.post('/messages', await this._create_message(data, recipient_id, 'PLAIN_CONTACT'))
  }
  async send_buttons({ recipient_id, data }) {
    !Array.isArray(data) && (data = [data])
    return await this._request.post('/messages', await this._create_message(data, recipient_id, 'APP_BUTTON_GROUP'))
  }
  async send_app({ recipient_id, data }) {
    return await this._request.post('/messages', await this._create_message(data, recipient_id, 'APP_CARD'))
  }


  _create_group_message(data, recipient_id, category) {
    let conversation_id = this.getConversationId(recipient_id)
    data = typeof data === 'object' ? JSON.stringify(data) : data.toString()
    return {
      conversation_id,
      category,
      message_id: this.getUUID(),
      data: Buffer.from(data).toString('base64')
    }
  }
  _create_message(data, recipient_id, category) {
    let result = this._create_group_message(data, recipient_id, category)
    result.recipient_id = recipient_id
    return result
  }

  _create_group_message_specific(data, recipient_id, category, conversation_id) {
    let result = this._create_message(data, recipient_id, category)
    result.conversation_id = conversation_id
    return result
  }

  async send_message({ recipient_id, data, category, _conversation_id }) {
    category === 'APP_BUTTON_GROUP' && !Array.isArray(data) && (data = [data])
    let conversation_id = _conversation_id || this.getConversationId(recipient_id)
    if (typeof data === 'object') data = JSON.stringify(data)
    const params = {
      conversation_id, category,
      message_id: this.getUUID(),
      data: Buffer.from(data).toString('base64'),
    }
    return await this._request.post('/messages', params)
  }

  async messages(params) {
    return await this._request.post('/messages', params)
  }


  async _create_conversation(recipient_id) {
    const params = {
      category: 'CONTACT',
      conversation_id: this.getConversationId(recipient_id),
      participants: [{ action: 'ADD', role: '', user_id: recipient_id }]
    }
    return await this._request.post('/conversations', params)
  }
}

module.exports = MixinBase
