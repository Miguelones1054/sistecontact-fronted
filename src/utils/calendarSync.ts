import type { Prospect } from '../types/api'
import { APP_STRINGS } from '../constants/strings'

/** Aviso solo si la sync de Calendar falló o se omitió. */
export function calendarSyncFeedback(updated: Prospect): string {
  if (updated.calendar_sync_status === 'skipped' && updated.calendar_sync_error) {
    return APP_STRINGS.prospects.calendarSyncSkipped
  }
  if (updated.calendar_sync_status === 'error') {
    return APP_STRINGS.prospects.calendarSyncError(
      updated.calendar_sync_error || 'error desconocido',
    )
  }
  return ''
}
