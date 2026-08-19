import { supabase } from '../supabaseClient'

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

export async function getTopicBySlug(subjectId, slug) {
  const { data, error } = await supabase
    .from('topics')
    .select('*')
    .eq('subject_id', subjectId)
    .eq('slug', slug)
    .single()
  if (error) throw error
  return data
}

export async function getLessonsByTopic(topicId) {
  const { data, error } = await supabase
    .from('lessons')
    .select('id, topic_id, title, slug, preview_html, sort_order, status')
    .eq('topic_id', topicId)
    .eq('status', 'published')
    .order('sort_order', { ascending: true })
  if (error) throw error
  return data
}

export async function getLessonBySlug(topicId, slug) {
  const { data, error } = await supabase
    .from('lessons')
    .select('*')
    .eq('topic_id', topicId)
    .eq('slug', slug)
    .single()
  if (error) throw error
  return data
}

export async function hasPurchasedSubject(userId, subjectId) {
  if (!userId) return false
  const { data, error } = await supabase
    .from('purchases')
    .select('id')
    .eq('user_id', userId)
    .eq('subject_id', subjectId)
    .eq('status', 'completed')
    .maybeSingle()
  if (error) throw error
  return !!data
}

// ---- Admin write operations ----

export async function createSubject(subject) {
  const { data, error } = await supabase.from('subjects').insert(subject).select().single()
  if (error) throw error
  return data
}

export async function createTopic(topic) {
  const { data, error } = await supabase.from('topics').insert(topic).select().single()
  if (error) throw error
  return data
}

export async function upsertLesson(lesson) {
  const { data, error } = await supabase
    .from('lessons')
    .upsert(lesson)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function uploadLessonImage(file, lessonSlug) {
  const path = `${lessonSlug}/${Date.now()}-${file.name}`
  const { error } = await supabase.storage.from('lesson-images').upload(path, file)
  if (error) throw error
  const { data } = supabase.storage.from('lesson-images').getPublicUrl(path)
  return data.publicUrl
}
