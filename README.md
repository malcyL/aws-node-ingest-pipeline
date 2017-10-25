<!--
title: AWS Serverless Ingest Pipeline, REST API and offline support example in NodeJS
description: This example demonstrates how to run a service locally, using the 'serverless-offline' plugin. It ingests files from an FTP server, uploading them to S3 and provides a REST API to uploaded filenames stored in DynamoDB.
layout: Doc
-->
# Serverless Ingest Pipeline, REST API with DynamoDB and offline support

This example demonstrates how to run a service locally, using the
[serverless-offline](https://github.com/dherault/serverless-offline) plugin. 
It uses [serverless-offline-scheduler]() plugin to run a cronned lambda which checks an FTP server and ingests any new files. New files are uploaded to S3.
It provides a REST API to view uploaded files stored in a DynamoDB.

## Use-case

Test your service locally, without having to deploy it first.

## Setup

```bash
npm install
serverless offline start
serverless dynamodb migrate (this imports schema)
```

## Run service offline

```bash
serverless offline start
```

## Usage

Every minute the cronned lambda will check for new files on the configured FTP server.
Any new files are uploaded to the configured S3 bucket. Their filename is stored in
DynamoDB. Using the ProponoJS Pub/Sub library a message is then published to any 
subscriber to say that the file is in S3 and is ready for futher processing.

ProponoJS is a Pub/Sub library which uses SNS/SQS. 

### List all Uploaded files

```bash
curl -H "Content-Type:application/json" http://localhost:3000/uploaded
```

Example output:
```bash
[
    {
        "checked": false,
        "createdAt": 1508062380200,
        "filename": "data.txt",
        "id": "6c87e8b0-b191-11e7-8db2-ff5a90d5acd0",
        "updatedAt": 1508062380200
    },  
    {
        "checked": false,
        "createdAt": 1508185380207,
        "filename": "data8.txt",
        "id": "d06a2e50-b2af-11e7-bf8d-db93d920fff7",
        "updatedAt": 1508185380207
    },  
    {
        "checked": false,
        "createdAt": 1508929740057,
        "filename": "data42.txt",
        "id": "e7783850-b974-11e7-a299-4500011a154c",
        "updatedAt": 1508929740057
    }   
]

```

