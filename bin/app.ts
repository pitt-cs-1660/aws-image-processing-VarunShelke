#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import {Assignment3Stack} from '../lib/assignment3-stack';
import {Assignment3ECRStack} from "../lib/assignment3-ecr-stack";

const app = new cdk.App();
const env = {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: 'us-east-1',
};

const assignment3EcrStack = new Assignment3ECRStack(app, 'Assignment3ECRStack', {
    env,
});

new Assignment3Stack(app, 'Assignment3Stack', {
    env,
    resizeRepo: assignment3EcrStack.resizeRepo,
    greyscaleRepo: assignment3EcrStack.greyscaleRepo,
    exifRepo: assignment3EcrStack.exifRepo,
});