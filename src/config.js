import url from 'url';
import config from '../config.json';

export const DEBUG = !!(process.env.DEBUG || config.DEBUG || false);
export const B_BITCOM_ADDRESS = '19HxigV4QyBv3tHpQVcUEQyq1pzZVdoAut';
export const MAP_BITCOM_ADDRESS = '1PuQa7K62MiKCtssSLKy1kh56WWU7MtUR5';
export const AIP_BITCOM_ADDRESS = '15PciHG22SNLQJXMoSUaWVi7WSqc7hCfva';
export const BAP_BITCOM_ADDRESS = '1BAPSuaPnfGnSBM3GLV9yhxUdYe4vGbdMT';
export const TOKEN = process.env.BSOCIAL_PLANARIA_TOKEN
  || process.env.PLANARIA_TOKEN
  || config.token;
if (!TOKEN) {
  console.error('No Planaria token defined in config.json (https://token.planaria.network/)');
  process.exit(-1);
}
export const mongoUrl = process.env.BSOCIAL_MONGO_URL || process.env.MONGO_URL || config.mongoUrl;
if (!mongoUrl) {
  console.error('No MongoDB connection defined in ENV or config.json');
  process.exit(-1);
}
const parsedMongoUrl = url.parse(mongoUrl);
export const dbName = parsedMongoUrl.pathname.replace(/\//g, '');
export const bapApiUrl = process.env.BAP_API_URL || config.bapApiUrl || 'http://localhost:3000/v1';
