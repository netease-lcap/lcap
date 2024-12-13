const path = require('path');
const fs = require('fs-extra');
const shell = require('shelljs');
const glob = require('glob');
const axios = require('axios');
const cryptoJS = require('crypto-js');
const configurator = require('./config.js');
const pwd = process.cwd();

let configRecord;

const utils = {
    getFileName(name) {
        return name.includes('/') ? name.split('/')[1] : name;
    },
    getDest(dir) {
        return path.resolve(pwd, dir);
    },
    async removeWithoutNodeModules(dir) {
        await new Promise((res, rej) => {
            glob('**', {
                ignore: ['node_modules/**'],
                cwd: dir,
                dot: true,
            }, (err, files) => {
                if (err) {
                    rej(err);
                } else {
                    files.forEach((file) => {
                        fs.removeSync(path.join(dir, file));
                    });
                    res();
                }
            });
        });
    },
    isDir(file) {
        return fs.statSync(file).isDirectory();
    },
    isEmpty(dir) {
        if (fs.existsSync(dir)) {
            return !shell.ls('-lA', dir).length;
        }
        return true;
    },
    isVusionProject(dir) {
        const pkgPath = path.join(dir, 'package.json');
        if (!fs.existsSync(pkgPath)) {
            return false;
        }
        const vusion = require(pkgPath).vusion || {};
        return vusion.type === 'repository';
    },
    isInVusionProject(dir) {
        const pkgPath = path.join(dir, '../../package.json');
        if (!fs.existsSync(pkgPath)) {
            return false;
        }
        const vusion = require(pkgPath).vusion || {};
        return vusion.type === 'repository';
    },
    /**
     * 平台请求
     */
    getPlatformAxios(platform) {
        if (!platform) {
            platform = configurator.get('platform');
        }
        return new Promise((res, rej) => {
            res(axios.create({
                baseURL: platform,
                maxContentLength: 1024 * 1024 * 500, // 放大最大内容到500MB
            }));
        });
    },
    /**
     * 获取平台 env config
     */
    async getPlatformConfig(platform) {
        if (!platform) {
            platform = configurator.get('platform');
        }
        const currentTime = new Date().getTime();
        // 1 分钟之内复用已有配置
        if (configRecord && currentTime - configRecord.time <= 60 * 1000) {
            return configRecord.data;
        }
        const pfAxios = await this.getPlatformAxios(platform);
        const res = await pfAxios.get('/api/v1/env/config') || {};
        const { data = {} } = res;
        configRecord = {
            data: data.result || {},
            time: currentTime,
        };
        return configRecord.data;
    },
    /**
     * 获取平台有效 authorization
     */
    async getAuthorization(
        platform = configurator.get('platform'),
        username = configurator.get('username'),
        password = configurator.get('password'),
        loginType = configurator.get('login_type') || 'Normal',
        authorization = configurator.get('authorization')
    ) {
        if (!authorization) {
            try {
                const TenantName = configurator.get('tenant_name') || platform.match(/^https?:\/\/([^.]+)./)[1];
                const pfAxios = await this.getPlatformAxios(platform);
                const loginRes = await pfAxios.post('/proxy/nuims/gateway/nuims/nuims?Action=Login&Version=2020-06-01', {
                    DomainName: 'Nuims',
                    LoginType: loginType,
                    UserName: username,
                    Password: String(configurator.get('encrypt')) === 'false' ? password : this.aesEcbEncrypt(password),
                    TenantName,
                }) || {};
                const { headers = {} } = loginRes;
                authorization = headers.authorization;
            } catch (error) {
                console.error('getAuthorization error :', error);
            }
        }
        return authorization;
    },
    /**
     * 获取平台 静态资源配置
     */
    async getPlatformStatic(platform) {
        if (!platform) {
            platform = configurator.get('platform');
        }
        const { STATIC_URL } = await this.getPlatformConfig();
        const protocol = platform.match(/^(http:|https:|rtsp:)\/\/([^/:?#]+)(?:[/:?#]|$)/i)[1];
        return `${protocol}${STATIC_URL}`;
    },
    /**
     * 认证信息加密
     */
    aesEcbEncrypt(message, key = ';Z#^$;8+yhO!AhGo') {
        // utf8字符串—>WordArray对象，WordArray是一个保存32位整数的数组，相当于转成了二进制
        const keyHex = cryptoJS.enc.Utf8.parse(key);
        const messageHex = cryptoJS.enc.Utf8.parse(message);
        const encrypted = cryptoJS.AES.encrypt(messageHex, keyHex, {
            mode: cryptoJS.mode.ECB,
            padding: cryptoJS.pad.Pkcs7,
        });
        return encrypted.toString(); // base64结果
    },
};
module.exports = utils;
