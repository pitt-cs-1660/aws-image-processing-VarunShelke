import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as s3n from 'aws-cdk-lib/aws-s3-notifications';
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

        // Lambda Execution Role
        const lambdaExecutionRole = new iam.Role(this, 'LambdaExecutionRole', {
            roleName: 'lambda-image-processing-role',
            assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
            description: 'Execution role for Lambda image processing functions',
        });

        // Attach AWS managed policy for CloudWatch Logs
        lambdaExecutionRole.addManagedPolicy(
            iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole')
        );

        // Add inline policy for S3 access
        lambdaExecutionRole.addToPolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
                's3:GetObject',
                's3:PutObject',
            ],
            resources: [`${bucket.bucketArn}/*`],
        }));

        // SNS Topic for image processing notifications
        const imageProcessingTopic = new sns.Topic(this, 'ImageProcessingTopic', {
            topicName: 'image-processing-topic',
            displayName: 'Image Processing Topic',
        });

        // Grant S3 permission to publish to SNS topic
        imageProcessingTopic.addToResourcePolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            principals: [new iam.ServicePrincipal('s3.amazonaws.com')],
            actions: ['SNS:Publish'],
            resources: [imageProcessingTopic.topicArn],
            conditions: {
                StringEquals: {
                    'aws:SourceAccount': this.account,
                },
                ArnLike: {
                    'aws:SourceArn': bucket.bucketArn,
                },
            },
        }));

        // Add S3 event notifications to SNS for each prefix
        bucket.addEventNotification(
            s3.EventType.OBJECT_CREATED,
            new s3n.SnsDestination(imageProcessingTopic),
            {prefix: 'resize/'}
        );

        bucket.addEventNotification(
            s3.EventType.OBJECT_CREATED,
            new s3n.SnsDestination(imageProcessingTopic),
            {prefix: 'greyscale/'}
        );

        bucket.addEventNotification(
            s3.EventType.OBJECT_CREATED,
            new s3n.SnsDestination(imageProcessingTopic),
            {prefix: 'exif/'}
        );

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

        // Output Lambda execution role ARN for GitHub Actions
        new cdk.CfnOutput(this, 'LambdaExecutionRoleArn', {
            value: lambdaExecutionRole.roleArn,
            description: 'IAM Role ARN for Lambda execution',
        });

        // Output SNS Topic ARN
        new cdk.CfnOutput(this, 'SnsTopicArn', {
            value: imageProcessingTopic.topicArn,
            description: 'SNS Topic ARN for image processing',
        });
    }
}
