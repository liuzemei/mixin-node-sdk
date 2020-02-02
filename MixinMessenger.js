const axios = require('axios')
const MixinMessenger = function () {

}

MixinMessenger.prototype = {
    async query_me() {
        return await this._request.get('/me')
    },
    async update_perference({ receive_message_source, accept_conversation_source }) {
        const params = { receive_message_source, accept_conversation_source }
        return await this._request.post('/me/preferences', params)
    },
    async update_profile({ full_name, avatar_base64 }) {
        const params = { full_name, avatar_base64 }
        return await this._request.post('/me', params)
    },
    async rotate_qr_code() {
        return await this._request.get('/me/code')
    },
    async query_user_fetch(users) {
        users = Array.isArray(users) ? users : [users]
        return await this._request.post('/users/fetch', users)
    },
    async search_user({ mixin_number }) {
        return await this._request.get('/search/' + mixin_number)
    },
    async query_friends() {
        return await this._request.get('/friends')
    },
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
        console.log('Upload Success: ')
        console.log({ attachment_id, view_url })
        return { attachment_id, view_url }
    },
    async get_attachment() {
        return await this._request.post('/attachments')
    },
    async query_contacts() {
        return await this._request.get('/contacts')
    },
    async query_conversations({ conversation_id }) {
        return await this._request.get('/conversations/' + conversation_id)
    },
    async send_text({ recipient_id, data }) {
        return await this._request.post('/messages', await this._create_message(data, recipient_id, 'PLAIN_TEXT'))
    },
    async send_image({ recipient_id, data }) {
        !Array.isArray(data) && (data = [data])
        return await this._request.post('/messages', await this._create_message(data, recipient_id, 'PLAIN_IMAGE'))
    },
    async send_video({ recipient_id, data }) {
        return await this._request.post('/messages', await this._create_message(data, recipient_id, 'PLAIN_VIDEO'))
    },
    async send_live({ recipient_id, data }) {
        return await this._request.post('/messages', await this._create_message(data, recipient_id, 'PLAIN_LIVE'))
    },
    async send_file({ recipient_id, data }) {
        return await this._request.post('/messages', await this._create_message(data, recipient_id, 'PLAIN_DATA'))
    },
    async send_sticker({ recipient_id, data }) {
        return await this._request.post('/messages', await this._create_message(data, recipient_id, 'PLAIN_STICKER'))
    },
    async send_contact({ recipient_id, data }) {
        return await this._request.post('/messages', await this._create_message(data, recipient_id, 'PLAIN_CONTACT'))
    },
    async send_buttons({ recipient_id, data }) {
        return await this._request.post('/messages', await this._create_message(data, recipient_id, 'APP_BUTTON_GROUP'))
    },
    async send_app({ recipient_id, data }) {
        return await this._request.post('/messages', await this._create_message(data, recipient_id, 'APP_CARD'))
    },
    async _create_message(data, recipient_id, category) {
        let { conversation_id } = await this._create_conversation(recipient_id)
        data = typeof data === 'object' ? JSON.stringify(data) : data.toString()
        return {
            conversation_id,
            category,
            message_id: this.getUUID(),
            data: Buffer.from(data).toString('base64')
        }
    },

    async send_message({ recipient_id, data, category, _conversation_id }) {
        category === 'APP_BUTTON_GROUP' && !Array.isArray(data) && (data = [data])
        if (_conversation_id) conversation_id = _conversation_id
        else {
            let res = await this._create_conversation(recipient_id)
            conversation_id = res.conversation_id
        }
        const params = {
            conversation_id, category,
            message_id: this.getUUID(),
            data: Buffer.from(JSON.stringify(data)).toString('base64'),
        }
        return await this._request.post('/messages', params)
    },

    async _create_conversation(recipient_id) {
        const params = {
            category: 'CONTACT',
            conversation_id: this.getConversationId(recipient_id),
            participants: [{ action: 'ADD', role: '', user_id: recipient_id }]
        }
        return await this._request.post('/conversations', params)
    },
}

module.exports = MixinMessenger
