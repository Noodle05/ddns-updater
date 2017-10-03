var bunyan = require('bunyan');

const request = require('request-promise');
const NoIP = require('no-ip');
const eventToPromise = require('event-to-promise');

const FREQUENCY = parseInt(process.env.FREQUENCY || '21');
const DETECT_FREQUENCY = parseInt(process.env.DETECT_FREQUENCY || '5');
const USER_NAME = process.env.USER_NAME;
const USER_PASSWD = process.env.USER_PASSWD;
const USER_EPASSWD = process.env.USER_EPASSWD;
const IPv6 = process.env.IPv6;
const DOMAIN = process.env.DOMAIN;

var passwd = USER_PASSWD || Buffer.from(USER_EPASSWD, 'base64').toString('ascii');
var updateInterval = FREQUENCY * 60 * 60 * 1000;
var detectInterval = DETECT_FREQUENCY * 60 * 1000;

var previousIp = undefined;

const ident_ipv4_url = 'https://v4.ident.me';
const ident_ipv6_url = 'https://v6.ident.me';
const noip_url = 'https://dynupdate.no-ip.com/nic/update';

const logger = bunyan.createLogger({
    name: 'noip-updater',
    level: 'trace'
});

logger.info('Update no-ip on ' + (IPv6 ? 'IPv6' : 'IPv4') + 
    ' at frequency of ' + FREQUENCY + ' days' + ' detect ip change frequency ' + DETECT_FREQUENCY + ' minutes');

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
    logger.debug('uri', options['uri']);

    return request(options).then(ip => {
        logger.trace('Get ip address', ip);
        return Promise.resolve(ip.address);
    });
}

function updateIpAddress(host, ip, user, passwd) {
    logger.debug('Update IP address');
    logger.trace('hostname: ' + host + ', ip: ' + ip + ', user: ' + user);
    var noip = new NoIP({
        hostname: host,
        user: user,
        pass: passwd,
    });

    noip.update(ip);

    return eventToPromise.multi(
        noip,
        [ 'success' ],
        [ 'error' ]);

}

function updateIp(force) {
    logger.trace('Update IP address', (force ? 'Force' : ''));
    return getIpAddress(IPv6).then(ip => {
        if (force || previousIp !== ip) {
            logger.trace('Going to update IP to:', ip);
            return updateIpAddress(DOMAIN, ip, USER_NAME, passwd).then(v => {
                previousIp = ip;
                return Promise.resolve(v);
            });
        } else {
            logger.trace('No need to update');
            return Promise.resolve([false, ip]);
        }
    }).then(values => logger.info('Changed', values[0], 'New ip', values[1]))
        .catch(err => logger.error(err));
}

setInterval(updateIp, updateInterval, true);
setInterval(updateIp, detectInterval);

updateIp(true);
