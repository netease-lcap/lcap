const fs = require('fs');
const mime = require('mime-types');
const FormData = require('form-data');
const utils = require('./utils');
const logger = require('./logger.js');
const configurator = require('./config.js');

async function parallel(todos, count, callback) {
    await Promise.all(
        new Array(Math.min(todos.length, count)).fill('').map(async () => {
            while (todos.length > 0) {
                const todo = todos.shift();
                await callback(todo);
            }
        }),
    );

    return true;
}

module.exports = async function upload(formFiles = [], config) {
    const { platform, bucket = configurator.get('bucket'), username, password } = config;
    const authorization = await utils.getAuthorization(platform, username, password);

    const pfAxios = await utils.getPlatformAxios(platform);
    await parallel([...formFiles], 20, async (formFile) => {
        const { name, path } = formFile;
        const contentType = mime.lookup(name) || '';
        const formData = new FormData();
        formData.append('file', fs.createReadStream(path), {
            filepath: name, // filepath 在 Form 提交的时候是 name
        });
        formData.append('fileKey', name);
        formData.append('contentType', contentType);
        try {
            const params = {};
            // bucket 兼容 config 配置和命令行 --bucket 配置
            if (bucket)
                params.bucketName = bucket;
            const res = await pfAxios.post(`/api/v1/vusion/upload`, formData, {
                headers: {
                    ...formData.getHeaders(),
                    Cookie: `authorization=${authorization}`,
                },
                params,
            }) || {};
            const { data = {} } = res;
            if (data.code === 200) {
                logger.done(`Successfully deployed files '${name}' to NOS static bucket. Try to access: ${data.result}`);
            } else {
                console.error(`Failed upload! '${name}', responseData: `, data);
            }
        } catch (error) {
            console.error(`Failed upload! '${name}', error: `, error);
        }
    });
};
