const axios = require('axios')
const Mixin = require('./mixin')

const zeromeshUrl = "https://mixin-api.zeromesh.net"
const oneUrl = "https://api.mixin.one"

const backOff = () => {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve()
    }, 500)
  })
}

function _create_instance(CLIENT_CONFIG, useChinaServer, debug) {
  const instance = axios.create({
    baseURL: useChinaServer ? zeromeshUrl : oneUrl,
    headers: {
      'Content-Type': 'application/json;charset=UTF-8'
    },
    timeout: 3000
  })
  instance.interceptors.request.use(config => {
    const { method, data } = config
    const uri = instance.getUri(config)
    const jwtToken = Mixin.prototype.getJwtToken(CLIENT_CONFIG, method, uri, data || '')
    !config.headers.Authorization && (config.headers.Authorization = 'Bearer ' + jwtToken)
    return config
  })

  instance.interceptors.response.use(res => {
    let { data } = res
    if (debug) console.log(data)
    return data.data || data.error
  }, async e => {
    if (["ETIMEDOUT", "ECONNABORTED"].includes(e.code))
      instance.defaults.baseURL = e.config.baseURL = e.config.baseURL === zeromeshUrl ? oneUrl : zeromeshUrl
    await backOff()
    return await instance(e.config)
  })
  return instance
}

module.exports = _create_instance
