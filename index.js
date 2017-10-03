var bunyan = require('bunyan');

const request = require('request-promise');
const Promise = require('bluebird');

const FREQUENCY = parseInt(process.env.FREQUENCY || '21');
const DETECT_FREQUENCY = parseInt(process.env.DETECT_FREQUENCY || '5');
const UPDATE_TOKEN = process.env.UPDATE_TOKEN;
const DOMAIN = process.env.DOMAIN;

var updateInterval = FREQUENCY * 60 * 60 * 1000;
var detectInterval = DETECT_FREQUENCY * 60 * 1000;

var previousIPv4 = undefined;
var previousIPv6 = undefined;

const ident_ipv4_url = 'https://v4.ident.me';
const ident_ipv6_url = 'https://v6.ident.me';
const provider_url = 'https://dynv6.com/api/update';

const logger = bunyan.createLogger({
    name: 'ddns-updater',
    level: 'trace'
});

logger.info('Update DDNS ',
    ' at frequency of ', FREQUENCY, ' days,',
    ' detect ip change frequency ', DETECT_FREQUENCY, ' minutes');

var ident_options = {
    method: 'GET',
    json: true,
    timeout: 3000
};

function getIpAddress(v6) {
    logger.trace('Getting ' + (v6 ? 'IPv6' : 'IPv4') + ' address');
    var options = {};
    Object.assign(options, ident_options);
    options['uri'] = (v6 ? ident_ipv6_url : ident_ipv4_url) + '/.json';
    logger.trace('uri', options['uri']);

    return request(options).then(ip => {
        logger.debug('Get ip address', ip);
        return Promise.resolve(ip.address);
    }).catch(err => {
        logger.error('Get ip address failed');
        return Promise.resolve(undefined);
    });;
}

function updateIpAddress(host, ipv4, ipv6, token) {
    logger.debug('Update IP address');
    logger.trace('hostname:', host, ', IPv4:', ipv4, ', IPv6:', ipv6);

    var options = {
        uri: provider_url + '?hostname=' + host
                + '&token=' + token + '&ipv4=' + ipv4
                + (ipv6 ? '&ipv6=' + ipv6 : ''),
        method: 'GET',
        timeout: 3000,
    };

    return request(options);
}

function updateIp(force) {
    logger.trace((force ? 'Force update' : 'Update'), 'IP address');

    return Promise.join(getIpAddress(), getIpAddress(true),
        function(ipv4, ipv6) {
            if (force || ipv4 !== previousIPv4 || ipv6 !== previousIPv6) {
                logger.trace('Update IP addresses');
                return updateIpAddress(DOMAIN, ipv4, ipv6, UPDATE_TOKEN)
                    .then(v => {
                        logger.debug('Update IP address success, set previous IP address to new value.');
                        previousIPv4 = ipv4;
                        previousIPv6 = ipv6;
                        return Promise.resolve(v);
                    });
            } else {
                logger.trace('No need to update IP addresses');
                return Promise.resolve('Not changed');
            }
        }).then(v=> logger.info(v))
        .catch(err => logger.error(err));
}

setInterval(updateIp, updateInterval, true);
setInterval(updateIp, detectInterval);

updateIp(true);
