import { supabase } from '../supabaseClient'

// ---- Public & Student Reads ----

export async function getSubjects() {
  const { data, error } = await supabase
    .from('subjects')
    .select('*')
    .order('sort_order', { ascending: true })
  if (error) throw error
  return data
}

export async function getSubjectBySlug(slug) {
  const { data, error } = await supabase
    .from('subjects')
    .select('*')
    .eq('slug', slug)
    .single()
  if (error) throw error
  return data
}

export async function getTopicsBySubject(subjectId) {
  const { data, error } = await supabase
    .from('topics')
    .select('*')
    .eq('subject_id', subjectId)
    .order('sort_order', { ascending: true })
  if (error) throw error
  return data
}

export async function getTopicBySlug(subjectId, topicSlug) {
  const { data, error } = await supabase
    .from('topics')
    .select('*')
    .eq('subject_id', subjectId)
    .eq('slug', topicSlug)
    .single()
  if (error) throw error
  return data
}

export async function getLessonsByTopic(topicId) {
  const { data, error } = await supabase
    .from('lessons')
    .select('id, topic_id, title, slug, preview_html, status, sort_order')
    .eq('topic_id', topicId)
    .eq('status', 'published')
    .order('sort_order', { ascending: true })
  if (error) throw error
  return data
}

export async function getLessonBySlug(topicId, lessonSlug) {
  const { data, error } = await supabase
    .from('lessons')
    .select('*')
    .eq('topic_id', topicId)
    .eq('slug', lessonSlug)
    .single()
  if (error) throw error
  return data
}

// ---- SaaS App-Wide Pass Entitlements ----

export async function hasActiveSubscription(userId, isAdmin = false) {
  if (isAdmin) return true
  if (!userId) return false

  const now = new Date().toISOString()
  const { data, error } = await supabase
    .from('purchases')
    .select('id')
    .eq('user_id', userId)
    .eq('status', 'completed')
    .eq('plan_type', 'platform_pass')
    .gt('expires_at', now)
    .order('expires_at', { ascending: false })
    .limit(1)

  if (error) throw error
  return Boolean(data && data.length > 0)
}

// Alias maintained for backward compatibility with existing UI components
export async function hasPurchasedSubject(userId, _subjectId, isAdmin = false) {
  return hasActiveSubscription(userId, isAdmin)
}

// Returns all subject IDs if user has active subscription, or empty array if expired
export async function getUserPurchases(userId) {
  if (!userId) return []
  
  const hasAccess = await hasActiveSubscription(userId)
  if (!hasAccess) return []

  // If active, return all subject IDs so client checks like userPurchases.includes(id) pass
  const { data, error } = await supabase
    .from('subjects')
    .select('id')

  if (error) throw error
  return data ? data.map(s => s.id) : []
}

// NOTE: createPurchase() was intentionally removed.
// Purchases are now written server-side via /api/verify-payment.js
// using the Service Role Key after Paystack verification.

// ---- Admin: Create ----

export async function createSubject(subject) {
  const { data, error } = await supabase
    .from('subjects')
    .insert(subject)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function createTopic(topic) {
  const { data, error } = await supabase
    .from('topics')
    .insert(topic)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function createLesson(lesson) {
  const { data, error } = await supabase
    .from('lessons')
    .insert(lesson)
    .select()
    .single()
  if (error) throw error
  return data
}

// ---- Admin: Storage ----

export async function uploadLessonImage(file, lessonSlug) {
  const path = `${lessonSlug}/${Date.now()}-${file.name}`
  const { error } = await supabase.storage.from('lesson-images').upload(path, file)
  if (error) throw error
  const { data } = supabase.storage.from('lesson-images').getPublicUrl(path)
  return data.publicUrl
}

// ---- Admin: Read single records for editing ----

export async function getSubjectById(id) {
  const { data, error } = await supabase.from('subjects').select('*').eq('id', id).single()
  if (error) throw error
  return data
}

export async function getTopicById(id) {
  const { data, error } = await supabase.from('topics').select('*').eq('id', id).single()
  if (error) throw error
  return data
}

export async function getLessonById(id) {
  const { data, error } = await supabase.from('lessons').select('*').eq('id', id).single()
  if (error) throw error
  return data
}

export async function getAllLessonsByTopicAdmin(topicId) {
  const { data, error } = await supabase
    .from('lessons')
    .select('id, topic_id, title, slug, status, sort_order')
    .eq('topic_id', topicId)
    .order('sort_order', { ascending: true })
  if (error) throw error
  return data
}

// ---- Admin: Update ----

export async function updateSubject(id, fields) {
  const { data, error } = await supabase.from('subjects').update(fields).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function updateTopic(id, fields) {
  const { data, error } = await supabase.from('topics').update(fields).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function updateLesson(id, fields) {
  const { data, error } = await supabase.from('lessons').update(fields).eq('id', id).select().single()
  if (error) throw error
  return data
}

// ---- Admin: Delete ----

export async function deleteSubject(id) {
  const { error } = await supabase.from('subjects').delete().eq('id', id)
  if (error) throw error
}

export async function deleteTopic(id) {
  const { error } = await supabase.from('topics').delete().eq('id', id)
  if (error) throw error
}

export async function deleteLesson(id) {
  const { error } = await supabase.from('lessons').delete().eq('id', id)
  if (error) throw error
}
  
