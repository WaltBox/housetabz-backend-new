// src/services/s3Service.js
const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { fromEnv } = require("@aws-sdk/credential-providers");
require('dotenv').config();

class S3Service {
  constructor() {
    console.log('Initializing S3 Service...');
    console.log('Using region:', process.env.AWS_REGION);
    console.log('Using bucket:', process.env.AWS_S3_BUCKET);
    
    this.client = new S3Client({
      region: process.env.AWS_REGION,
      credentials: fromEnv(),
      maxAttempts: 3
    });
    
    this.bucket = process.env.AWS_S3_BUCKET;
  }

  async uploadFile(file, folder = 'partner-images') {
    if (!file) throw new Error('No file provided');

    const fileExtension = file.originalname.split('.').pop();
    const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExtension}`;

    const params = {
      Bucket: this.bucket,
      Key: fileName,
      Body: file.buffer,
      ContentType: file.mimetype
      // Removed ACL setting since bucket doesn't allow it
    };

    try {
      console.log('Starting S3 upload with params:', {
        Bucket: params.Bucket,
        Key: params.Key,
        ContentType: params.ContentType
      });

      const command = new PutObjectCommand(params);
      const result = await this.client.send(command);
      
      // Construct the URL
      const url = `https://${this.bucket}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileName}`;
      console.log('File uploaded successfully:', url);
      
      return {
        url,
        key: fileName,
        etag: result.ETag
      };
    } catch (error) {
      console.error('Detailed S3 upload error:', {
        message: error.message,
        code: error.code,
        requestId: error.$metadata?.requestId,
        statusCode: error.$metadata?.httpStatusCode
      });
      throw new Error(`Failed to upload file to S3: ${error.message}`);
    }
  }

  async deleteFile(key) {
    if (!key) return;

    const params = {
      Bucket: this.bucket,
      Key: key
    };

    try {
      console.log('Attempting to delete file from S3:', key);
      const command = new DeleteObjectCommand(params);
      await this.client.send(command);
      console.log('File deleted successfully:', key);
    } catch (error) {
      console.error('S3 delete error:', error);
      // Don't throw on delete errors, just log them
      console.warn(`Failed to delete file from S3: ${key}`);
    }
  }
}

module.exports = new S3Service();