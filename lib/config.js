const fs = require('fs-extra');
const os = require('os');
const path = require('path');
const YAML = require('yaml');

const rcPath = path.resolve(os.homedir(), '.lcaprc');

const configurator = {
    config: undefined,
    rcPath,
    yaml: undefined,
    /**
     * 从用户目录下的 .lcaprc 加载配置
     * 如果已经加载，则会直接从缓存中读取
     * 如果不存在，则会创建一个默认的 .lcaprc 文件
     */
    load() {
        if (this.config)
            return this.config;

        if (!fs.existsSync(rcPath)) {
            fs.writeFileSync(rcPath, `platform: https://vusion.163yun.com
static: https://static-vusion.163yun.com
registries:
  npm: https://registry.npmjs.org
download_manager: npm
publish_manager: npm
user_name: admin
password: Admin@123456
`);
        }

        this.yaml = fs.readFileSync(rcPath, 'utf8');

        this.config = YAML.parse(this.yaml);
        return this.config;
    },
    /**
     * 保存配置
     */
    save() {
        fs.writeFileSync(rcPath, YAML.stringify(this.config), 'utf8');
    },
    /**
     * 获取相关配置
     */
    get(key) {
        const config = this.load();
        if (!key) {
            return config;
        }
        return config[key];
    },
    /**
     * 快速获取下载源地址
     */
    getDownloadRegistry() {
        const config = this.load();
        return config.registries[config.download_manager] || 'https://registry.npmjs.org';
    },
    /**
     * 快速获取安装命令
     */
    getInstallCommand(packagesName, save) {
        const config = this.load();
        if (!packagesName) {
            if (config.download_manager === 'yarn')
                return 'yarn';
            else
                return `${config.download_manager} install`;
        } else {
            if (config.download_manager === 'yarn')
                return `yarn add ${packagesName}${save === false || save === true ? '' : ' --' + save}`;
            else
                // eslint-disable-next-line no-nested-ternary
                return `${config.download_manager} install ${packagesName}${save === false ? '' : (save === true ? ' --save' : ' --save-' + save)}`;
        }
    },
};

module.exports = configurator;
