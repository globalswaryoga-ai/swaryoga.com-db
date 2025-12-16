import crypto from 'crypto';

interface PaymentHashRequest {
  txnid: string;
  amount: number;
  productinfo: string;
  firstname: string;
  email: string;
}

export async function generatePayUHash(req: any, res: any) {
  try {
    const {
      txnid,
      amount,
      productinfo,
      firstname,
      email
    }: PaymentHashRequest = req.body;

    // Validate required fields
    if (!txnid || !amount || !productinfo || !firstname || !email) {
      return res.status(400).json({
        error: 'Missing required fields'
      });
    }

    const merchantKey = process.env.PAYU_MERCHANT_KEY;
    const salt = process.env.PAYU_SALT;

    if (!merchantKey || !salt) {
      console.error('PayU credentials not configured');
      return res.status(500).json({
        error: 'Payment gateway not configured'
      });
    }

    // PayU hash generation formula
    // hashString = merchantKey|txnid|amount|productinfo|firstname|email|||||||||salt
    const hashString = `${merchantKey}|${txnid}|${amount}|${productinfo}|${firstname}|${email}|||||||||${salt}`;

    const hash = crypto
      .createHash('sha512')
      .update(hashString)
      .digest('hex');

    res.json({
      hash,
      txnid,
      amount,
      merchantKey
    });
  } catch (error) {
    console.error('Hash generation error:', error);
    res.status(500).json({
      error: 'Failed to generate payment hash'
    });
  }
}

export async function verifyPayUPayment(req: any, res: any) {
  try {
    const { status, hash, txnid } = req.body;

    const salt = process.env.PAYU_SALT;

    if (!salt) {
      return res.status(500).json({
        error: 'Payment verification failed - salt not configured'
      });
    }

    // PayU verification hash = SHA512(salt|status|txnid)
    const verifyHashString = `${salt}|${status}|${txnid}`;
    const calculatedHash = crypto
      .createHash('sha512')
      .update(verifyHashString)
      .digest('hex')
      .toLowerCase();

    const paymentHash = hash.toLowerCase();

    if (calculatedHash === paymentHash) {
      res.json({
        verified: true,
        message: 'Payment verified successfully'
      });
    } else {
      res.json({
        verified: false,
        message: 'Payment verification failed'
      });
    }
  } catch (error) {
    console.error('Payment verification error:', error);
    res.status(500).json({
      error: 'Payment verification failed'
    });
  }
}
