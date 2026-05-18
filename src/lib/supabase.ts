import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  'https://irruapjouzvzyizsucgu.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlycnVhcGpvdXp2enlpenN1Y2d1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkxMTI0NTYsImV4cCI6MjA5NDY4ODQ1Nn0.QmTeCnDEfZEs7OeE80cAHy5i4MnnL-TMIXI-yD3AD-Q',
) as any
