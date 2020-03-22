const axios = require('axios')
const Mixin = require('./mixin')

function _create_instance(CLIENT_CONFIG, { useChinaServer, debug, jwtBaseUrl }) {
  const instance = axios.create({
    baseURL: useChinaServer ? 'https://mixin-api.zeromesh.net' : 'https://api.mixin.one',
    headers: {
      'Content-Type': 'application/json;charset=UTF-8'
    }
  })
  instance.interceptors.request.use(config => {
    const { method, url, data } = config
    const jwtUrl = typeof jwtBaseUrl === 'string' ? jwtBaseUrl : typeof jwtBaseUrl === 'function' ? jwtBaseUrl(url) : url
    const jwtToken = Mixin.prototype.getJwtToken(CLIENT_CONFIG, method, jwtUrl, data || '')
    config.headers.Authorization = 'Bearer ' + jwtToken
    return config
  })

  instance.interceptors.response.use(res => {
    let { data } = res
    if (debug) console.log(data)
    return data.data || data.error
  })
  return instance
}


module.exports = _create_instance
