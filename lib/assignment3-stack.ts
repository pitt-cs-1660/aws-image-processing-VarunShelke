import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as sns_subscriptions from 'aws-cdk-lib/aws-sns-subscriptions';
import * as s3n from 'aws-cdk-lib/aws-s3-notifications';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import {Construct} from 'constructs';

export interface Assignment3StackProps extends cdk.StackProps {
    resizeRepo: ecr.IRepository;
    greyscaleRepo: ecr.IRepository;
    exifRepo: ecr.IRepository;
}

export class Assignment3Stack extends cdk.Stack {
    constructor(scope: Construct, id: string, props: Assignment3StackProps) {
        super(scope, id, props);

        const bucket = new s3.Bucket(this, 'ImageProcessingBucket', {
            bucketName: 'vps27-assignment3',
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            autoDeleteObjects: true,
            objectOwnership: s3.ObjectOwnership.BUCKET_OWNER_ENFORCED,
            blockPublicAccess: new s3.BlockPublicAccess({
                blockPublicAcls: false,
                blockPublicPolicy: false,
                ignorePublicAcls: false,
                restrictPublicBuckets: false,
            }),
        });

        bucket.addToResourcePolicy(new iam.PolicyStatement({
            sid: 'PublicReadWriteAccess',
            effect: iam.Effect.ALLOW,
            principals: [new iam.AnyPrincipal()],
            actions: [
                's3:GetObject',
                's3:PutObject',
            ],
            resources: [`${bucket.bucketArn}/*`],
        }));

        bucket.addToResourcePolicy(new iam.PolicyStatement({
            sid: 'PublicListBucket',
            effect: iam.Effect.ALLOW,
            principals: [new iam.AnyPrincipal()],
            actions: ['s3:ListBucket'],
            resources: [bucket.bucketArn],
        }));

        const lambdaExecutionRole = new iam.Role(this, 'LambdaExecutionRole', {
            roleName: 'lambda-image-processing-role',
            assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
            description: 'Execution role for Lambda image processing functions',
        });

        lambdaExecutionRole.addManagedPolicy(
            iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole')
        );

        lambdaExecutionRole.addToPolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
                's3:GetObject',
                's3:PutObject',
            ],
            resources: [`${bucket.bucketArn}/*`],
        }));

        const imageProcessingTopic = new sns.Topic(this, 'ImageProcessingTopic', {
            topicName: 'image-processing-topic',
            displayName: 'Image Processing Topic',
        });

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

        const resizeLambdaLogGroup = new logs.LogGroup(this, 'ResizeLambdaLogGroup', {
            logGroupName: '/aws/lambda/resize-lambda',
            retention: logs.RetentionDays.ONE_WEEK,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
        });
        const resizeLambda = new lambda.DockerImageFunction(this, 'ResizeLambda', {
            functionName: 'resize-lambda',
            code: lambda.DockerImageCode.fromEcr(props.resizeRepo, {
                tagOrDigest: 'latest',
            }),
            timeout: cdk.Duration.seconds(30),
            memorySize: 512,
            role: lambdaExecutionRole,
            logGroup: resizeLambdaLogGroup,
            description: 'Resizes images uploaded to S3',
        });

        const greyscaleLambdaLogGroup = new logs.LogGroup(this, 'GreyscaleLambdaLogGroup', {
            logGroupName: '/aws/lambda/greyscale-lambda',
            retention: logs.RetentionDays.ONE_WEEK,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
        });
        const greyscaleLambda = new lambda.DockerImageFunction(this, 'GreyscaleLambda', {
            functionName: 'greyscale-lambda',
            code: lambda.DockerImageCode.fromEcr(props.greyscaleRepo, {
                tagOrDigest: 'latest',
            }),
            timeout: cdk.Duration.seconds(30),
            memorySize: 512,
            role: lambdaExecutionRole,
            logGroup: greyscaleLambdaLogGroup,
            description: 'Converts images to greyscale',
        });

        const exifLambdaLogGroup = new logs.LogGroup(this, 'ExifLambdaLogGroup', {
            logGroupName: '/aws/lambda/exif-lambda',
            retention: logs.RetentionDays.ONE_WEEK,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
        });
        const exifLambda = new lambda.DockerImageFunction(this, 'ExifLambda', {
            functionName: 'exif-lambda',
            code: lambda.DockerImageCode.fromEcr(props.exifRepo, {
                tagOrDigest: 'latest',
            }),
            timeout: cdk.Duration.seconds(30),
            memorySize: 512,
            role: lambdaExecutionRole,
            logGroup: exifLambdaLogGroup,
            description: 'Extracts EXIF data from images',
        });

        imageProcessingTopic.addSubscription(
            new sns_subscriptions.LambdaSubscription(resizeLambda, {
                filterPolicyWithMessageBody: {
                    Records: sns.FilterOrPolicy.policy({
                        s3: sns.FilterOrPolicy.policy({
                            object: sns.FilterOrPolicy.policy({
                                key: sns.FilterOrPolicy.filter(sns.SubscriptionFilter.stringFilter({
                                    matchPrefixes: ['resize/']
                                }))
                            })
                        })
                    })
                }
            })
        );

        imageProcessingTopic.addSubscription(
            new sns_subscriptions.LambdaSubscription(greyscaleLambda, {
                filterPolicyWithMessageBody: {
                    Records: sns.FilterOrPolicy.policy({
                        s3: sns.FilterOrPolicy.policy({
                            object: sns.FilterOrPolicy.policy({
                                key: sns.FilterOrPolicy.filter(sns.SubscriptionFilter.stringFilter({
                                    matchPrefixes: ['greyscale/']
                                }))
                            })
                        })
                    })
                }
            })
        );

        imageProcessingTopic.addSubscription(
            new sns_subscriptions.LambdaSubscription(exifLambda, {
                filterPolicyWithMessageBody: {
                    Records: sns.FilterOrPolicy.policy({
                        s3: sns.FilterOrPolicy.policy({
                            object: sns.FilterOrPolicy.policy({
                                key: sns.FilterOrPolicy.filter(sns.SubscriptionFilter.stringFilter({
                                    matchPrefixes: ['exif/']
                                }))
                            })
                        })
                    })
                }
            })
        );

        new cdk.CfnOutput(this, 'BucketName', {
            value: bucket.bucketName,
            description: 'S3 Bucket for image processing',
        });

        new cdk.CfnOutput(this, 'SnsTopicArn', {
            value: imageProcessingTopic.topicArn,
            description: 'SNS Topic ARN for image processing',
        });

        new cdk.CfnOutput(this, 'ResizeLambdaArn', {
            value: resizeLambda.functionArn,
            description: 'ARN of resize Lambda function',
        });

        new cdk.CfnOutput(this, 'GreyscaleLambdaArn', {
            value: greyscaleLambda.functionArn,
            description: 'ARN of greyscale Lambda function',
        });

        new cdk.CfnOutput(this, 'ExifLambdaArn', {
            value: exifLambda.functionArn,
            description: 'ARN of exif Lambda function',
        });
    }
}
