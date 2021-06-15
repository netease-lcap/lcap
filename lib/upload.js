const fs = require('fs');
const mime = require('mime-types');
const FormData = require('form-data');
const axios = require('axios');
const configurator = require('./config.js');
const vusion = require('vusion-api');
const cli = vusion.cli;

/**
 * 平台请求
 */
let platformAxios;
function getPlatformAxios() {
    return new Promise((res, rej) => {
        if (platformAxios)
            return res(platformAxios);

        platformAxios = axios.create({
            baseURL: configurator.get('platform'),
            maxContentLength: 1024 * 1024 * 50,
        });
        res(platformAxios);
    });
}

/**
 * 用户认证与权限中心请求
 */
let userAxios;
function getUserAxios(baseURL) {
    return new Promise((res, rej) => {
        if (userAxios)
            return res(userAxios);

        userAxios = axios.create({
            baseURL,
            maxContentLength: 1024 * 1024 * 50,
        });
        res(userAxios);
    });
}

async function getAuthorization() {
    let authorization;
    try {
        const pfAxios = await getPlatformAxios();
        const res = await pfAxios.get('/api/v1/env/config') || {};
        const { data = {} } = res;
        const { nuimsDomain } = data.result || {};
        if (!nuimsDomain) {
            console.error('platform need set nuimsDomain config!');
            return;
        }

        const platform = configurator.get('platform');
        const UserName = configurator.get('user_name');
        const Password = configurator.get('password');
        const LoginType = configurator.get('login_type') || 'Normal';
        const TenantName = platform.match(/^https?:\/\/([^.]+)./)[1];
        const protocol = platform.match(/^(http:|https:|rtsp:)\/\/([^/:?#]+)(?:[/:?#]|$)/i)[1];

        const userBaseURL = `${protocol}//${TenantName}.${nuimsDomain}`.replace(/\/$/, '');
        const userAxios = await getUserAxios(userBaseURL);
        const loginRes = await userAxios.post('/nuims?Action=Login&Version=2020-06-01', {
            DomainName: 'low-code',
            LoginType,
            UserName,
            Password,
            TenantName,
        }) || {};
        const { headers = {} } = loginRes;
        authorization = headers.authorization;
    } catch (error) {
        console.error('getAuthorization error :', error);
    }
    return authorization;
}

module.exports = async function upload(formFiles = []) {
    const authorization = await getAuthorization();
    const staticUrl = configurator.get('static');

    const pfAxios = await getPlatformAxios();
    formFiles.forEach(async (formFile) => {
        const { name, path } = formFile;
        const contentType = mime.lookup(name) || '';
        const formData = new FormData();
        formData.append('file', fs.createReadStream(path), {
            filepath: name, // filepath 在 Form 提交的时候是 name
        });
        try {
            const res = await pfAxios.post(`/api/v1/vusion/upload?fileKey=${name}&contentType=${contentType}`, formData, {
                headers: {
                    ...formData.getHeaders(),
                    Cookie: `authorization=${authorization}`,
                },
            }) || {};
            const { data = {} } = res;
            if (data.code === 200) {
                cli.done(`Successfully deployed files '${name}' to NOS static bucket. Try to access: ${`${staticUrl}/${name}`}`);
            } else {
                console.error(`Failed upload! '${name}', responseData: `, data);
            }
        } catch (error) {
            console.error(`Failed upload! '${name}', error: `, error);
        }
    });
};
