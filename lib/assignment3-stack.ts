import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import {Construct} from 'constructs';

export class Assignment3Stack extends cdk.Stack {
    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        // S3 Bucket for image processing
        const bucket = new s3.Bucket(this, 'ImageProcessingBucket', {
            bucketName: 'vps27-assignment3',
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            autoDeleteObjects: true,
            blockPublicAccess: new s3.BlockPublicAccess({
                blockPublicAcls: false,
                blockPublicPolicy: false,
                ignorePublicAcls: false,
                restrictPublicBuckets: false,
            }),
        });

        bucket.addToResourcePolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            principals: [new iam.AnyPrincipal()],
            actions: [
                's3:GetObject',
                's3:PutObject',
                's3:List*',
            ],
            resources: [
                bucket.bucketArn,
                `${bucket.bucketArn}/*`,
            ],
        }));

        // ECR Repositories for Lambda container images
        const resizeLambdaRepo = new ecr.Repository(this, 'ResizeLambdaRepo', {
            repositoryName: 'resize-lambda',
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            emptyOnDelete: true,
        });

        const greyscaleLambdaRepo = new ecr.Repository(this, 'GreyscaleLambdaRepo', {
            repositoryName: 'greyscale-lambda',
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            emptyOnDelete: true,
        });

        const exifLambdaRepo = new ecr.Repository(this, 'ExifLambdaRepo', {
            repositoryName: 'exif-lambda',
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            emptyOnDelete: true,
        });

        // Output the bucket name
        new cdk.CfnOutput(this, 'BucketName', {
            value: bucket.bucketName,
            description: 'S3 Bucket for image processing',
        });

        // Output ECR repository URIs
        new cdk.CfnOutput(this, 'ResizeLambdaRepoUri', {
            value: resizeLambdaRepo.repositoryUri,
            description: 'ECR Repository URI for resize-lambda',
        });

        new cdk.CfnOutput(this, 'GreyscaleLambdaRepoUri', {
            value: greyscaleLambdaRepo.repositoryUri,
            description: 'ECR Repository URI for greyscale-lambda',
        });

        new cdk.CfnOutput(this, 'ExifLambdaRepoUri', {
            value: exifLambdaRepo.repositoryUri,
            description: 'ECR Repository URI for exif-lambda',
        });
    }
}
