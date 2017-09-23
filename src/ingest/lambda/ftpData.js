'use strict';

var JSFtp = require('jsftp');

module.exports.ftpData = (event, context) => {
  const time = new Date();
  console.log(`Your cron function "${context.functionName}" ran at ${time}`);

  var host = process.env.FTP_HOST;
  var username = process.env.FTP_USERNAME;
  var password = process.env.FTP_PASSWORD;
  console.log(`Connecting to ftp host "${process.env.FTP_HOST}"`);

  var Ftp = new JSFtp({
    host: host,
    user: username,
    pass: password
  });

  Ftp.ls("*", function(err, data) {
    if (err) {
      console.error(err);
      context.fail(err);
    } else {
      data.forEach(function (file) {
        console.log(file.name); 
      });
      context.succeed('OK');
    }
  });
};

