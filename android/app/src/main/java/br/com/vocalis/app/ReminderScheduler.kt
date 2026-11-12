package br.com.vocalis.app

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import org.json.JSONArray
import java.util.Calendar

object ReminderScheduler {
    private const val PREFS_NAME = "vocalis_alarms"
    private const val KEY_REMINDERS_JSON = "reminders_json"
    private const val KEY_SCHEDULED_IDS = "scheduled_ids"

    const val EXTRA_REMINDER_ID = "extra_reminder_id"
    const val EXTRA_TITLE = "extra_title"
    const val EXTRA_CATEGORY = "extra_category"
    const val EXTRA_TIME_STR = "extra_time_str"
    const val EXTRA_EXERCISE_ID = "extra_exercise_id"

    private val DAY_TO_CALENDAR = mapOf(
        "dom" to Calendar.SUNDAY,
        "seg" to Calendar.MONDAY,
        "ter" to Calendar.TUESDAY,
        "qua" to Calendar.WEDNESDAY,
        "qui" to Calendar.THURSDAY,
        "sex" to Calendar.FRIDAY,
        "sab" to Calendar.SATURDAY
    )

    fun saveAndSchedule(context: Context, remindersJson: String) {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        prefs.edit().putString(KEY_REMINDERS_JSON, remindersJson).apply()
        scheduleAllFromPrefs(context)
    }

    fun scheduleAllFromPrefs(context: Context) {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val raw = prefs.getString(KEY_REMINDERS_JSON, null) ?: return
        val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as? AlarmManager ?: return

        // Cancela alarmes previamente agendados
        val prevIds = prefs.getStringSet(KEY_SCHEDULED_IDS, emptySet()) ?: emptySet()
        for (idStr in prevIds) {
            val id = idStr.toIntOrNull() ?: continue
            val cancelIntent = Intent(context, ReminderAlarmReceiver::class.java)
            val pi = PendingIntent.getBroadcast(
                context,
                id,
                cancelIntent,
                PendingIntent.FLAG_NO_CREATE or PendingIntent.FLAG_IMMUTABLE
            )
            if (pi != null) {
                alarmManager.cancel(pi)
                pi.cancel()
            }
        }

        val nextIds = mutableSetOf<String>()
        try {
            val arr = JSONArray(raw)
            val nowMs = System.currentTimeMillis()

            for (i in 0 until arr.length()) {
                val obj = arr.optJSONObject(i) ?: continue
                if (!obj.optBoolean("is_active", true)) continue

                val id = obj.optInt("id", i + 100)
                val title = obj.optString("title", "Exercício Vocal").ifBlank { "Exercício Vocal" }
                val timeStr = obj.optString("time_str", "09:00")
                val category = obj.optString("category", "exercicio")
                val exerciseId = obj.optString("exercise_id", "")

                val daysArr = obj.optJSONArray("days_mask")
                val targetCalendarDays = mutableSetOf<Int>()
                if (daysArr != null) {
                    for (dIdx in 0 until daysArr.length()) {
                        val code = daysArr.optString(dIdx)
                        DAY_TO_CALENDAR[code]?.let { targetCalendarDays.add(it) }
                    }
                }
                if (targetCalendarDays.isEmpty()) {
                    targetCalendarDays.addAll(DAY_TO_CALENDAR.values)
                }

                val triggerAtMs = computeNextTriggerMs(timeStr, targetCalendarDays, nowMs) ?: continue

                val intent = Intent(context, ReminderAlarmReceiver::class.java).apply {
                    putExtra(EXTRA_REMINDER_ID, id)
                    putExtra(EXTRA_TITLE, title)
                    putExtra(EXTRA_CATEGORY, category)
                    putExtra(EXTRA_TIME_STR, timeStr)
                    putExtra(EXTRA_EXERCISE_ID, exerciseId)
                }

                val pendingIntent = PendingIntent.getBroadcast(
                    context,
                    id,
                    intent,
                    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                )

                scheduleSingleAlarm(alarmManager, triggerAtMs, pendingIntent)
                nextIds.add(id.toString())
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }

        prefs.edit().putStringSet(KEY_SCHEDULED_IDS, nextIds).apply()
    }

    private fun scheduleSingleAlarm(
        alarmManager: AlarmManager,
        triggerAtMs: Long,
        pendingIntent: PendingIntent
    ) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                if (alarmManager.canScheduleExactAlarms()) {
                    alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAtMs, pendingIntent)
                } else {
                    alarmManager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAtMs, pendingIntent)
                }
            } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAtMs, pendingIntent)
            } else {
                alarmManager.setExact(AlarmManager.RTC_WAKEUP, triggerAtMs, pendingIntent)
            }
        } catch (_: SecurityException) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                alarmManager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAtMs, pendingIntent)
            } else {
                alarmManager.set(AlarmManager.RTC_WAKEUP, triggerAtMs, pendingIntent)
            }
        }
    }

    private fun computeNextTriggerMs(
        timeStr: String,
        targetCalendarDays: Set<Int>,
        nowMs: Long
    ): Long? {
        val parts = timeStr.split(":")
        if (parts.size != 2) return null
        val hour = parts[0].toIntOrNull() ?: return null
        val minute = parts[1].toIntOrNull() ?: return null

        val base = Calendar.getInstance().apply {
            timeInMillis = nowMs
            set(Calendar.HOUR_OF_DAY, hour.coerceIn(0, 23))
            set(Calendar.MINUTE, minute.coerceIn(0, 59))
            set(Calendar.SECOND, 0)
            set(Calendar.MILLISECOND, 0)
        }

        for (offset in 0..7) {
            val candidate = (base.clone() as Calendar).apply {
                add(Calendar.DAY_OF_YEAR, offset)
            }
            if (targetCalendarDays.contains(candidate.get(Calendar.DAY_OF_WEEK)) &&
                candidate.timeInMillis > nowMs + 5_000L
            ) {
                return candidate.timeInMillis
            }
        }
        return null
    }
}
