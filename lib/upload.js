const fs = require('fs');
const mime = require('mime-types');
const FormData = require('form-data');
const vusion = require('vusion-api');
const utils = require('./utils');
const cli = vusion.cli;

module.exports = async function upload(formFiles = [], platform) {
    const authorization = await utils.getAuthorization(platform);

    const pfAxios = await utils.getPlatformAxios(platform);
    await Promise.all(formFiles.map(async (formFile) => {
        const { name, path } = formFile;
        const contentType = mime.lookup(name) || '';
        const formData = new FormData();
        formData.append('file', fs.createReadStream(path), {
            filepath: name, // filepath 在 Form 提交的时候是 name
        });
        formData.append('fileKey', name);
        formData.append('contentType', contentType);
        try {
            const res = await pfAxios.post(`/api/v1/vusion/upload`, formData, {
                headers: {
                    ...formData.getHeaders(),
                    Cookie: `authorization=${authorization}`,
                },
            }) || {};
            const { data = {} } = res;
            if (data.code === 200) {
                console.info(`Successfully deployed files '${name}', responseData: `, data);
                cli.done(`Successfully deployed files '${name}' to NOS static bucket. Try to access: ${data.result}`);
            } else {
                console.error(`Failed upload! '${name}', responseData: `, data);
            }
        } catch (error) {
            console.error(`Failed upload! '${name}', error: `, error);
        }
    }));
};
