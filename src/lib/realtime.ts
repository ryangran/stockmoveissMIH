import { useEffect, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from './supabase'

export function useRealtimeSales(onNewSale?: (sale: { seller_name: string; total: number }) => void) {
  const qc = useQueryClient()

  const handleNew = useCallback((payload: any) => {
    qc.invalidateQueries({ queryKey: ['salesToday'] })
    qc.invalidateQueries({ queryKey: ['salesMonth'] })
    qc.invalidateQueries({ queryKey: ['chart7days'] })
    qc.invalidateQueries({ queryKey: ['recentSales'] })
    onNewSale?.(payload.new)
  }, [qc, onNewSale])

  useEffect(() => {
    const channel = supabase
      .channel('realtime-sales')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'sales' }, handleNew)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [handleNew])
}
