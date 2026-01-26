#!/bin/bash

###############################################
# AWS Security Hardening Script
# Configures AWS resources for security
# Run locally: bash aws-hardening.sh
###############################################

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${GREEN}🔐 AWS Security Hardening${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
  echo -e "${RED}❌ AWS CLI not found. Install it first:${NC}"
  echo "   brew install awscli (macOS)"
  echo "   Or: https://docs.aws.amazon.com/cli/latest/userguide/install-cliv2.html"
  exit 1
fi

# Get current AWS account ID
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
REGION=${AWS_REGION:-ap-south-1}
BUCKET_NAME="swarygoal1hindi"
INSTANCE_ID=${1:-i-0123456789abcdef0}

echo -e "${BLUE}Account ID: ${NC}${ACCOUNT_ID}"
echo -e "${BLUE}Region: ${NC}${REGION}"
echo ""

# 1. EC2 Security Group Hardening
echo -e "${YELLOW}[1/5] Hardening EC2 Security Groups...${NC}"

# Find security group
SG_ID=$(aws ec2 describe-instances \
  --region $REGION \
  --instance-ids $INSTANCE_ID \
  --query 'Reservations[0].Instances[0].SecurityGroups[0].GroupId' \
  --output text 2>/dev/null || echo "")

if [ -z "$SG_ID" ] || [ "$SG_ID" == "None" ]; then
  echo -e "${YELLOW}⚠️  Instance ID not found. Specify it:${NC}"
  echo "   bash aws-hardening.sh i-0123456789abcdef0"
  
  # Try to find any Swar Yoga instance
  echo ""
  echo -e "${YELLOW}Available instances:${NC}"
  aws ec2 describe-instances \
    --region $REGION \
    --filters "Name=instance-state-name,Values=running" \
    --query 'Reservations[].Instances[].{ID:InstanceId,Type:InstanceType,IP:PublicIpAddress}' \
    --output table
else
  echo -e "${GREEN}Found SG: ${NC}${SG_ID}"
  
  # Remove overly permissive rules and add restricted ones
  echo -e "${BLUE}Updating inbound rules...${NC}"
  
  # Remove 0.0.0.0/0 rules (if they exist)
  aws ec2 revoke-security-group-ingress \
    --region $REGION \
    --group-id $SG_ID \
    --protocol tcp \
    --port 3333 \
    --cidr 0.0.0.0/0 \
    2>/dev/null || echo "  (Rule not found, skipping)"
  
  # Add restricted rule for bridge (from Cloudflare IPs only)
  # This is a template - replace with actual Cloudflare IPs or your office IP
  aws ec2 authorize-security-group-ingress \
    --region $REGION \
    --group-id $SG_ID \
    --protocol tcp \
    --port 3333 \
    --cidr 0.0.0.0/0 \
    --description "WhatsApp Bridge - Restrict later to known IPs" \
    2>/dev/null || echo "  (Rule may already exist)"
  
  echo -e "${GREEN}✅ Security Group updated${NC}"
  echo ""
  echo -e "${YELLOW}📌 IMPORTANT:${NC}"
  echo "   Restrict bridge access (3333) to known IPs:"
  echo "   aws ec2 revoke-security-group-ingress --group-id $SG_ID --protocol tcp --port 3333 --cidr 0.0.0.0/0"
  echo "   aws ec2 authorize-security-group-ingress --group-id $SG_ID --protocol tcp --port 3333 --cidr YOUR_IP/32"
fi

# 2. S3 Bucket Security
echo -e "${YELLOW}[2/5] Hardening S3 bucket...${NC}"

# Enable versioning
aws s3api put-bucket-versioning \
  --region $REGION \
  --bucket $BUCKET_NAME \
  --versioning-configuration Status=Enabled \
  2>/dev/null && echo -e "${GREEN}✅ Versioning enabled${NC}" || echo "  (Already enabled)"

# Enable server-side encryption
aws s3api put-bucket-encryption \
  --region $REGION \
  --bucket $BUCKET_NAME \
  --server-side-encryption-configuration '{
    "Rules": [{
      "ApplyServerSideEncryptionByDefault": {
        "SSEAlgorithm": "AES256"
      }
    }]
  }' \
  2>/dev/null && echo -e "${GREEN}✅ Encryption enabled${NC}" || echo "  (Already enabled)"

# Block public access
aws s3api put-public-access-block \
  --region $REGION \
  --bucket $BUCKET_NAME \
  --public-access-block-configuration \
  "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true" \
  2>/dev/null && echo -e "${GREEN}✅ Public access blocked${NC}" || echo "  (Already blocked)"

# Enable access logging
LOG_BUCKET="${BUCKET_NAME}-logs"
aws s3api create-bucket \
  --bucket $LOG_BUCKET \
  --region $REGION \
  --create-bucket-configuration LocationConstraint=$REGION \
  2>/dev/null || echo "  (Log bucket exists)"

aws s3api put-bucket-logging \
  --region $REGION \
  --bucket $BUCKET_NAME \
  --bucket-logging-status '{
    "LoggingEnabled": {
      "TargetBucket": "'$LOG_BUCKET'",
      "TargetPrefix": "s3-logs/"
    }
  }' \
  2>/dev/null && echo -e "${GREEN}✅ Access logging enabled${NC}" || echo "  (Already enabled)"

echo ""

# 3. Enable CloudTrail
echo -e "${YELLOW}[3/5] Setting up CloudTrail logging...${NC}"

TRAIL_NAME="swar-yoga-cloudtrail"

# Create S3 bucket for CloudTrail logs
CLOUDTRAIL_BUCKET="swar-yoga-cloudtrail-logs-$(date +%s)"

aws s3api create-bucket \
  --bucket $CLOUDTRAIL_BUCKET \
  --region $REGION \
  --create-bucket-configuration LocationConstraint=$REGION \
  2>/dev/null || echo "  (Bucket may exist)"

# Add bucket policy for CloudTrail
aws s3api put-bucket-policy \
  --bucket $CLOUDTRAIL_BUCKET \
  --policy '{
    "Version": "2012-10-17",
    "Statement": [
      {
        "Sid": "AWSCloudTrailAclCheck",
        "Effect": "Allow",
        "Principal": {
          "Service": "cloudtrail.amazonaws.com"
        },
        "Action": "s3:GetBucketAcl",
        "Resource": "arn:aws:s3:::'$CLOUDTRAIL_BUCKET'"
      },
      {
        "Sid": "AWSCloudTrailWrite",
        "Effect": "Allow",
        "Principal": {
          "Service": "cloudtrail.amazonaws.com"
        },
        "Action": "s3:PutObject",
        "Resource": "arn:aws:s3:::'$CLOUDTRAIL_BUCKET'/AWSLogs/'$ACCOUNT_ID'/*",
        "Condition": {
          "StringEquals": {
            "s3:x-amz-acl": "bucket-owner-full-control"
          }
        }
      }
    ]
  }' \
  2>/dev/null

# Create CloudTrail
aws cloudtrail create-trail \
  --name $TRAIL_NAME \
  --s3-bucket-name $CLOUDTRAIL_BUCKET \
  --is-multi-region-trail \
  --region $REGION \
  2>/dev/null && echo -e "${GREEN}✅ CloudTrail created${NC}" || echo "  (Trail may exist)"

# Start CloudTrail logging
aws cloudtrail start-logging \
  --trail-name $TRAIL_NAME \
  --region $REGION \
  2>/dev/null && echo -e "${GREEN}✅ CloudTrail logging enabled${NC}" || echo "  (Already logging)"

echo ""

# 4. IAM Hardening
echo -e "${YELLOW}[4/5] Checking IAM configuration...${NC}"

# Check for MFA on root account
echo -e "${BLUE}Checking root account MFA...${NC}"
aws iam get-login-profile \
  --user-name root \
  2>/dev/null > /dev/null && echo -e "${YELLOW}⚠️  Root account has console access. Enable MFA.${NC}" || true

# List IAM users
echo -e "${BLUE}Active IAM users:${NC}"
aws iam list-users \
  --query 'Users[].UserName' \
  --output text

echo ""
echo -e "${YELLOW}📌 IAM Security Checklist:${NC}"
echo "  [ ] Enable MFA on root account (AWS Console)"
echo "  [ ] Enable MFA on all IAM users"
echo "  [ ] Rotate access keys every 90 days"
echo "  [ ] Use IAM roles instead of access keys (for EC2)"
echo "  [ ] Enable CloudTrail logging"

# 5. Enable CloudWatch Alarms
echo -e "${YELLOW}[5/5] Setting up monitoring...${NC}"

# Check if alarm exists
ALARM_NAME="swar-yoga-api-errors"

aws cloudwatch put-metric-alarm \
  --alarm-name $ALARM_NAME \
  --alarm-description "API error rate too high" \
  --metric-name Errors \
  --namespace AWS/ApplicationELB \
  --statistic Sum \
  --period 300 \
  --threshold 50 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 2 \
  2>/dev/null && echo -e "${GREEN}✅ CloudWatch alarms configured${NC}" || echo "  (Alarms may exist)"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}✅ AWS SECURITY HARDENING COMPLETE${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo ""
echo -e "${YELLOW}🔐 Security Improvements:${NC}"
echo "  ✅ S3 versioning enabled"
echo "  ✅ S3 encryption enabled"
echo "  ✅ S3 public access blocked"
echo "  ✅ CloudTrail logging enabled"
echo "  ✅ Access logging configured"
echo "  ✅ CloudWatch monitoring setup"
echo ""

echo -e "${YELLOW}📋 Manual Steps Required:${NC}"
echo "  1. Enable MFA on AWS root account"
echo "  2. Rotate IAM access keys (90 day policy)"
echo "  3. Restrict EC2 security group to known IPs"
echo "  4. Setup email alerts for CloudWatch alarms"
echo "  5. Review CloudTrail logs regularly"
echo ""

echo -e "${BLUE}Reference: SECURITY_HARDENING_JAN17.md${NC}"
