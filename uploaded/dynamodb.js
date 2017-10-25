'use strict';

const AWS = require('aws-sdk'); // eslint-disable-line import/no-extraneous-dependencies

let region = process.env.AWS_REGION || 'us-east-1'
let options = { region: region };

// connect to local DB if running offline
// if (process.env.IS_OFFLINE) {
//   options = {
//     region: 'localhost',
//     endpoint: 'http://localhost:8000',
//   };
// }

const client = new AWS.DynamoDB.DocumentClient(options);

module.exports = client;
