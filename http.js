const axios = require('axios')
const Mixin = require('./mixin')

function _create_instance(CLIENT_CONFIG) {
    const instance = axios.create({
        baseURL: 'https://api.mixin.one',
        headers: {
            'Content-Type': 'application/json;charset=UTF-8'
        }
    })
    instance.interceptors.request.use(config => {
        const { method, url, data } = config
        const jwtToken = Mixin.prototype.getJwtToken(CLIENT_CONFIG, method, url, data || '')
        config.headers = {
            Authorization: 'Bearer ' + jwtToken,
        }
        return config
    })

    instance.interceptors.response.use(res => {
        let { data } = res
        return data.data || data.error
    })
    return instance
}


module.exports = _create_instance
