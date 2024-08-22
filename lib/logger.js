const chalk = require('chalk');

const format = (label, msg) => msg.split('\n').map((line, i) => {
    if (i === 0)
        return `${label} ${line}`;
    else
        return (line || '').padStart(chalk.reset(label).length);
}).join('\n');

const chalkTag = (msg) => chalk.bgBlackBright.white.dim(` ${msg} `);

/**
 * 打印普通日志
 * @param msg 日志信息
 * @param tag 添加一个灰色标签
 */
function log (msg, tag) {
    tag ? console.info(format(chalkTag(tag), msg)) : console.info(msg);
};

/**
 * 打印信息日志
 * @param msg 日志信息
 * @param tag 添加一个灰色标签
 */
function info (msg, tag) {
    console.info(format(chalk.bgBlue.black(' INFO ') + (tag ? chalkTag(tag) : ''), msg));
};

/**
 * 打印普通日志
 * @param msg 日志信息
 * @param tag 添加一个灰色标签
 */
function done (msg, tag) {
    console.info(format(chalk.bgGreen.black(' DONE ') + (tag ? chalkTag(tag) : ''), msg));
};

/**
 * 打印警告日志
 * @param msg 日志信息
 * @param tag 添加一个灰色标签
 */
function warn (msg, tag) {
    console.warn(format(chalk.bgYellow.black(' WARN ') + (tag ? chalkTag(tag) : ''), chalk.yellow(msg)));
};

/**
 * 打印错误日志
 * @param msg 日志信息，可以为一个 Error 对象
 * @param tag 添加一个灰色标签
 */
function error (msg, tag) {
    console.error(format(chalk.bgRed(' ERROR ') + (tag ? chalkTag(tag) : ''), chalk.red(String(msg))));
    if (msg instanceof Error) {
        console.error(msg.stack);
    }
};

module.exports = {
    log,
    info,
    done,
    warn,
    error,
};