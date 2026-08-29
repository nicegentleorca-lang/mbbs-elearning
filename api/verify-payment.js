import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY

const supabasePublic = createClient(supabaseUrl, supabaseAnonKey)
const supabaseAdmin = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY)

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    // 1. Authenticate user JWT token
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid Authorization header.' })
    }

    const token = authHeader.split(' ')[1]
    const { data: { user }, error: authError } = await supabasePublic.auth.getUser(token)
    
    if (authError || !user) {
      return res.status(401).json({ error: 'Unauthorized: Invalid or expired session token.' })
    }

    const userId = user.id
    const { reference } = req.body

    if (!reference) {
      return res.status(400).json({ error: 'Missing required parameter: reference.' })
    }

    // 2. Prevent duplicate reference processing
    const { data: existingPurchase } = await supabaseAdmin
      .from('purchases')
      .select('*')
      .eq('paystack_reference', reference)
      .maybeSingle()

    if (existingPurchase) {
      if (existingPurchase.user_id === userId) {
        return res.status(200).json({
          success: true,
          message: 'Payment already verified.',
          purchase: existingPurchase
        })
      }
      return res.status(400).json({ error: 'Transaction reference already claimed.' })
    }

    const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY
    if (!paystackSecretKey) {
      return res.status(500).json({ error: 'Paystack secret key missing from server environment.' })
    }

    // 3. Verify transaction directly with Paystack
    const paystackRes = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${paystackSecretKey}`,
        'Content-Type': 'application/json'
      }
    })

    const paystackData = await paystackRes.json()

    if (!paystackData.status || paystackData.data.status !== 'success') {
      return res.status(400).json({
        error: 'Payment verification failed or transaction was not successful.',
        details: paystackData.message
      })
    }

    const transaction = paystackData.data

    // 4. Flat platform-wide subscription price check (₦5,000)
    const MONTHLY_SUBSCRIPTION_NGN = 5000 
    const expectedKobo = MONTHLY_SUBSCRIPTION_NGN * 100

    if (transaction.amount < expectedKobo) {
      return res.status(400).json({ error: 'Paid amount is lower than subscription price.' })
    }

    if (transaction.currency !== 'NGN') {
      return res.status(400).json({ error: 'Unexpected transaction currency.' })
    }

    // 5. Smart Expiration Calculation (Extends existing subscription if user renews early)
    const nowIso = new Date().toISOString()
    const { data: currentActiveSub } = await supabaseAdmin
      .from('purchases')
      .select('expires_at')
      .eq('user_id', userId)
      .eq('status', 'completed')
      .eq('plan_type', 'platform_pass')
      .gt('expires_at', nowIso)
      .order('expires_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    let baseDate = new Date()
    if (currentActiveSub && new Date(currentActiveSub.expires_at) > baseDate) {
      baseDate = new Date(currentActiveSub.expires_at)
    }

    const expiresAt = new Date(baseDate)
    expiresAt.setDate(expiresAt.getDate() + 30)

    // 6. Record platform-wide subscription
    const { data: purchase, error: purchaseError } = await supabaseAdmin
      .from('purchases')
      .upsert(
        {
          user_id: userId,
          subject_id: null,
          plan_type: 'platform_pass',
          amount_ngn: MONTHLY_SUBSCRIPTION_NGN,
          paystack_reference: reference,
          status: 'completed',
          expires_at: expiresAt.toISOString()
        },
        { onConflict: 'paystack_reference' }
      )
      .select()
      .single()

    if (purchaseError) {
      if (purchaseError.code === '23505') {
        const { data: racedPurchase } = await supabaseAdmin
          .from('purchases')
          .select('*')
          .eq('paystack_reference', reference)
          .maybeSingle()

        if (racedPurchase) {
          return res.status(200).json({
            success: true,
            message: 'Payment already verified.',
            purchase: racedPurchase
          })
        }
      }
      throw purchaseError
    }

    return res.status(200).json({
      success: true,
      message: 'Payment verified! 30 days platform-wide access granted.',
      purchase
    })
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Server error verifying payment.' })
  }
}
