const axios = require('axios');
const configurator = require('./config.js');

let platformAxios;
function getPlatformAxios(prefix = '') {
    return new Promise((res, rej) => {
        if (platformAxios)
            return res(platformAxios);

        const config = configurator.load();
        platformAxios = axios.create({
            baseURL: config.platform + prefix,
            maxContentLength: 1024 * 1024 * 50,
        });
        res(platformAxios);
    });
}

module.exports = async function upload(file) {

}
