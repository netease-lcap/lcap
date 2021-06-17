const fs = require('fs');
const mime = require('mime-types');
const FormData = require('form-data');
const vusion = require('vusion-api');
const utils = require('./utils');
const cli = vusion.cli;

module.exports = async function upload(formFiles = []) {
    const authorization = await utils.getAuthorization();
    const staticUrl = await utils.getPlatformStatic();

    const pfAxios = await utils.getPlatformAxios();
    await Promise.all(formFiles.map(async (formFile) => {
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
    }));
};
