'use strict';

var async = require('async');
var JSFtp = require('jsftp');
var AWS = require('aws-sdk');

module.exports.ftpData = (event, context) => {
  var awsS3 = new AWS.S3();

  const time = new Date();
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
      context.fail(err);
    } else {
      var uploaded = 0;
      data.forEach(function (file) {
        console.log(`Processing file ${file.name}`); 
        var bucket = process.env.S3_BUCKET
        var key = `${process.env.S3_KEY_PREFIX}/${file.name}`;
        async.waterfall([
          function(cb) {
            console.log(`Obtaining socket for file ${file.name}`); 
            var Ftp = new JSFtp({
              host: process.env.FTP_HOST,
              user: process.env.FTP_USERNAME,
              pass: process.env.FTP_PASSWORD
            });
            Ftp.get(file.name,cb);
          },
          function upload(socket, cb) {
            console.log(`Uploading file ${file.name} to bucket ${bucket} key: ${key}`); 
            var awsS3 = new AWS.S3();
            awsS3.upload({
              Bucket: bucket,
              Key: key,
              Body: socket
            }, {partSize: 10 * 1024 * 1024, queueSize: 1}, cb);
          },
        ],
          function(err) {
            if (err) {
              console.log(`Error uploading file ${file.name} Error: ${err}`); 
            } else {
              console.log(`Uploaded file ${file.name}`); 
            }
            uploaded = uploaded + 1;
            console.log(`Uploaded ${uploaded} files out of ${data.length}`); 
            if (uploaded == data.length) {
              context.succeed('OK');
            }
          }
        )
      });
    }
  });
};
