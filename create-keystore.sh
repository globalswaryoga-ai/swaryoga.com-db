#!/bin/bash

# Create Android Keystore for Swar Yoga App
# This script generates a keystore file for signing the APK

echo "🔐 Creating Swar Yoga Android Keystore..."
echo ""
echo "You will be asked for a password. Make it STRONG and REMEMBER IT!"
echo "Example: Swar@Yoga#2025!Secure"
echo ""

keytool -genkey -v \
  -keystore ~/.android/swar-yoga-release.keystore \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000 \
  -alias swar-yoga-key \
  -dname "CN=Mohan Kalburgi, OU=Upamnyu International Education, O=Upamnyu International Education, L=Bangalore, ST=Karnataka, C=IN"

echo ""
echo "✅ Keystore created successfully!"
echo "📍 Location: ~/.android/swar-yoga-release.keystore"
echo ""
echo "⚠️  SAVE YOUR PASSWORD SOMEWHERE SAFE!"
echo "You will need it for STEP 2 (building the APK)"
