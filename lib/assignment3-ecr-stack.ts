import * as cdk from 'aws-cdk-lib';
import {Construct} from 'constructs';
import * as ecr from 'aws-cdk-lib/aws-ecr';

export class Assignment3ECRStack extends cdk.Stack {
    public readonly resizeRepo: ecr.Repository;
    public readonly greyscaleRepo: ecr.Repository;
    public readonly exifRepo: ecr.Repository;

    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        this.resizeRepo = new ecr.Repository(this, 'ResizeRepo', {
            repositoryName: 'resize-lambda',
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            emptyOnDelete: true,
        });

        this.greyscaleRepo = new ecr.Repository(this, 'GreyscaleRepo', {
            repositoryName: 'greyscale-lambda',
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            emptyOnDelete: true,
        });

        this.exifRepo = new ecr.Repository(this, 'ExifRepo', {
            repositoryName: 'exif-lambda',
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            emptyOnDelete: true,
        });

        new cdk.CfnOutput(this, 'ResizeEcrRepoUri', {
            value: this.resizeRepo.repositoryUri,
            description: 'ECR Repository URI for resize Lambda',
        });

        new cdk.CfnOutput(this, 'GreyscaleEcrRepoUri', {
            value: this.greyscaleRepo.repositoryUri,
            description: 'ECR Repository URI for greyscale Lambda',
        });

        new cdk.CfnOutput(this, 'ExifEcrRepoUri', {
            value: this.exifRepo.repositoryUri,
            description: 'ECR Repository URI for exif Lambda',
        });
    }
}