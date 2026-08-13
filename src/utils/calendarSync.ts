import { APP_STRINGS } from '../constants/strings'
import type { Prospect } from '../types/api'

/** Mensaje UX según el resultado de sync con Google Calendar. */
export function calendarSyncFeedback(updated: Prospect): string {
  if (updated.calendar_sync_status === 'synced') {
    return APP_STRINGS.prospects.calendarSynced
  }
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
