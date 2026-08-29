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
    // 1. Authenticate JWT token
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
    const { reference, subject_id } = req.body

    if (!reference || !subject_id) {
      return res.status(400).json({ error: 'Missing required parameters: reference and subject_id.' })
    }

    // 2. Prevent reference reuse
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

    // 3. Verify transaction directly with Paystack API
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

    // 4. Verify transaction metadata binds to THIS exact subject — MANDATORY
    const metadataSubjectId = transaction.metadata?.subject_id
    if (!metadataSubjectId || String(metadataSubjectId) !== String(subject_id)) {
      return res.status(400).json({ error: 'Payment reference is missing or invalid subject binding.' })
    }

    // 5. Verify price matches DB price
    const { data: subject, error: subError } = await supabaseAdmin
      .from('subjects')
      .select('id, price_ngn')
      .eq('id', subject_id)
      .single()

    if (subError || !subject) {
      return res.status(404).json({ error: 'Subject not found.' })
    }

    const expectedKobo = Math.round(Number(subject.price_ngn) * 100)
    if (transaction.amount < expectedKobo) {
      return res.status(400).json({ error: 'Paid amount is lower than required price.' })
    }

    // 6. Verify currency matches expected (NGN)
    if (transaction.currency !== 'NGN') {
      return res.status(400).json({ error: 'Unexpected transaction currency.' })
    }

    // 7. Calculate 30-day expiration timestamp for monthly access
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 30)

    // 8. Record purchase with 30-day expiration date
    const { data: purchase, error: purchaseError } = await supabaseAdmin
      .from('purchases')
      .upsert(
        {
          user_id: userId,
          subject_id,
          amount_ngn: Number(subject.price_ngn),
          paystack_reference: reference,
          status: 'completed',
          expires_at: expiresAt.toISOString()
        },
        { onConflict: 'paystack_reference' }
      )
      .select()
      .single()

    if (purchaseError) {
      // Handle race condition: unique constraint violation means another
      // concurrent request already inserted this reference first
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
      message: 'Payment verified! 30 days access granted.',
      purchase
    })
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Server error verifying payment.' })
  }
}
