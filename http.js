const axios = require('axios')
const Mixin = require('./mixin')


const backOff = () => {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve()
    }, 500)
  })
}

function _create_instance(CLIENT_CONFIG, useChinaServer, debug) {
  const instance = axios.create({
    baseURL: useChinaServer ? 'https://mixin-api.zeromesh.net' : 'https://api.mixin.one',
    headers: {
      'Content-Type': 'application/json;charset=UTF-8'
    }
  })
  instance.interceptors.request.use(config => {
    const { method, data } = config
    const uri = instance.getUri(config)
    const jwtToken = Mixin.prototype.getJwtToken(CLIENT_CONFIG, method, uri, data || '')
    config.headers.Authorization = 'Bearer ' + jwtToken
    return config
  })

  instance.interceptors.response.use(res => {
    let { data } = res
    if (debug) console.log(data)
    return data.data || data.error
  }, e => {
    await backOff()
    return await instance(e.config)
  })
  return instance
}


module.exports = _create_instance
