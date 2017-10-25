'use strict';

var async = require('async');
var JSFtp = require('jsftp');
var AWS = require('aws-sdk');
const uuid = require('uuid');
const dynamodb = require('./dynamodb');

const proponojsConfig = {
  accessKeyId: process.env.PROPONOJS_AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.PROPONOJS_AWS_SECRET_KEY,
  region: process.env.PROPONOJS_QUEUE_REGION,
};
console.log(proponojsConfig);
const proponojs = require('proponojs')(proponojsConfig);

module.exports.ftpData = (event, context) => {
  var awsS3 = new AWS.S3();

  const time = new Date();
  const timestamp = new Date().getTime();
  console.log(`Your cron function "${context.functionName}" ran at ${time}`);

  console.log(`Connecting to ftp host "${process.env.FTP_HOST}"`);
  var Ftp = new JSFtp({
    host: process.env.FTP_HOST,
    user: process.env.FTP_USERNAME,
    pass: process.env.FTP_PASSWORD
  });

  Ftp.ls("*", function(err, data) {
    if (err) {
      console.error(err);
      if (context.hasOwnProperty('fail')) {
        context.fail(err);
      }
    } else {
      async.eachOfSeries(
        data,
        function iterate(file,key,callback) {
          console.log(`Processing file ${file.name}`); 

          var params = {
            TableName: process.env.DYNAMODB_TABLE_UPLOADED,
            ProjectionExpression: "filename",
            FilterExpression: "#fn = :filename",
            ExpressionAttributeNames: {
              "#fn": "filename",
            },
            ExpressionAttributeValues: {
              ":filename": file.name
            }
          };

          // This is a scan. Don't do this for real!
          dynamodb.scan(params, function onScan(err, data) {
            if (err) {
              console.error(err);
              callback(err);
            } else {
              var count = data['Count'];
              if (count > 0) {
                console.log(`Already uploaded file ${file.name}`); 
                callback();
              } else {
                console.log(`File ${file.name} not previously uploaded`); 
                var bucket = process.env.S3_BUCKET
                var key = `${process.env.S3_KEY_PREFIX}/${file.name}`;
                async.waterfall([
                  function getFtpSocket(cb) {
                    console.log(`Obtaining socket for file ${file.name}`); 
                    var Ftp = new JSFtp({
                      host: process.env.FTP_HOST,
                      user: process.env.FTP_USERNAME,
                      pass: process.env.FTP_PASSWORD
                    });
                    Ftp.get(file.name,cb);
                  },
                  function uploadToS3(socket, cb) {
                    console.log(`Uploading file ${file.name} to bucket ${bucket} key: ${key}`); 
                    var awsS3 = new AWS.S3();
                    awsS3.upload({
                      Bucket: bucket,
                      Key: key,
                      Body: socket
                    }, {partSize: 10 * 1024 * 1024, queueSize: 1}, cb);
                  },
                  function recordUploadedFilename(something,cb) {
                    console.log(`File ${file.name} uploaded. Writing filename to uploaded table...`); 
      
                    const params = {
                      TableName: process.env.DYNAMODB_TABLE_UPLOADED,
                      Item: {
                        id: uuid.v1(),
                        filename: file.name,
                        checked: false,
                        createdAt: timestamp,
                        updatedAt: timestamp,
                      }
                    };
                  
                    // write the todo to the database
                    dynamodb.put(params, (error) => {
                      // handle potential errors
                      if (error) {
                        console.log(`File ${file.name} uploaded BUT NOT WRITTEN TO DATABASE!`); 
                        console.log(`Error ${error}`); 
                        cb(error);
                      } else {
                        console.log(`Filename ${file.name} written to database`); 
                        cb(null);
                      }
                    });
                  },
                  function publish(cb) {
                    console.log(`Publishing ${file.name} uploaded.`); 
                    const message = {
                      'event': 'upload',
                      'filename': file.name
                    };
                    proponojs.publish('ml-test-ftp-data-upload', message, (err, data) => {
                      if (err) {
                        cb(err);
                      } else {
                        cb(null);
                      }
                    });
                  },
                ],
                  function(err) {
                    if (err) {
                      console.log(`Error uploading file ${file.name} Error: ${err}`); 
                      callback(err);
                    } else {
                      console.log(`Processing file ${file.name} completed`); 
                      callback();
                    }
                  }
                );
              }
            }
          });

        },
        function complete(err) {
          if (err) {
            console.log(`Error uploading file. Error: ${err}`); 
            if (context.hasOwnProperty('fail')) {
              context.fail(err);
            }
          } else {
            console.log(`Uploaded files`); 
            // TODO: Why is this happening?
            // TypeError: context.succeed is not a function
            if (context.hasOwnProperty('succeed')) {
              context.succeed('OK');
            }
          }
        }
      );
    }
  });
};
