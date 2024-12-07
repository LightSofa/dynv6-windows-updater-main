import express from 'express';
import Helmet from 'helmet';
import IP from 'ip';
import Morgan from 'morgan';
import cron from 'node-cron';
import fetch from 'node-fetch';
import env from './env.js';

const server = express();
const port = env.PORT || 8000;

server.use(Helmet());
server.use(express.json());
server.use(Morgan('dev'));
server.disable('etag');
server.set('json spaces', 4);

server.get('/', (req, res) =>
	res.status(200).json({
		message: `dynv6-windows-updater is running`,
	})
);
server.listen(port, () =>
	console.log(`dynv6-windows-updater started on port ${port}`)
);

const updateDynv6 = async (IPv6: string, IPv4: string) => {
	console.log('Updating dynv6.com...');
	const updateURL = `http://dynv6.com/api/update?hostname=${env.DYNV6_HOST_NAME}&ipv6=${IPv6}&ipv4=${IPv4}&token=${env.DYNV6_TOKEN}`;
	const response = await fetch(updateURL, {
		method: 'get',
	});
	console.log(await response.text())
	if (response.status === 200) {
		console.log('IP records UPDATE SUCCESS');
		return response;
	} else {
		throw new Error('IP records UPDATE FAILED');
	}
};

let lastIPv4Address = '', lastIPv6Address = '';

const getExternalIPv6 = async () => {
	console.log('Fetching external IPv6 address...');
	const response = await fetch("https://6.ipw.cn/api/ip/myip?json", {
		"headers": {
			"accept": "application/json, text/plain, */*",
			"sec-fetch-mode": "cors",
			"Referer": "https://ipw.cn/",
			"Referrer-Policy": "strict-origin-when-cross-origin"
		},
		"method": "GET"
	});
	const fetchedExternalIPv6 = await response.json().then((data) => data.IP);
	console.log('External IPv6: ', fetchedExternalIPv6);
	return response.status === 200 && IP.isV6Format(fetchedExternalIPv6)
		? fetchedExternalIPv6
		: '';
};

const getExternalIPv4 = async () => {
	console.log('Fetching external IPv4 address...');
	const response = await fetch("https://4.ipw.cn/api/ip/myip?json", {
		"headers": {
			"accept": "application/json, text/plain, */*",
			"sec-fetch-mode": "cors",
			"Referer": "https://ipw.cn/",
			"Referrer-Policy": "strict-origin-when-cross-origin"
		},
		"method": "GET"
	});
	const fetchedExternalIPv4 = await response.json().then((data) => data.IP);
	console.log('External IPv4: ', fetchedExternalIPv4);
	return response.status === 200 && IP.isV4Format(fetchedExternalIPv4)
		? fetchedExternalIPv4
		: '';
};


const app = async () => {
	let IPv4Address = await getExternalIPv4(), IPv6Address = await getExternalIPv6();
	if (IPv4Address === lastIPv4Address && IPv6Address === lastIPv6Address) {
		return
	} else {
		updateDynv6(IPv4Address, IPv6Address).then(() => {
			lastIPv4Address = IPv4Address;
			lastIPv6Address = IPv6Address;
		}).catch((err) => {
			console.warn(err.message);
		})
	}
};

app()
cron.schedule('*/10 * * * *', () => app()).start()
