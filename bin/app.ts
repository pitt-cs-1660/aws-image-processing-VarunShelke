#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import {Assignment3Stack} from '../lib/assignment3-stack';

const app = new cdk.App();
new Assignment3Stack(app, 'Assignment3Stack', {
    env: {
        account: process.env.CDK_DEFAULT_ACCOUNT,
        region: 'us-east-1',
    },
});