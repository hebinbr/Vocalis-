package br.com.vocalis.app

import android.Manifest
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat

class ReminderAlarmReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        ensureNotificationChannel(context)

        val reminderId = intent.getIntExtra(ReminderScheduler.EXTRA_REMINDER_ID, 0)
        val title = intent.getStringExtra(ReminderScheduler.EXTRA_TITLE) ?: "Exercício Vocal"
        val category = intent.getStringExtra(ReminderScheduler.EXTRA_CATEGORY) ?: "exercicio"
        val timeStr = intent.getStringExtra(ReminderScheduler.EXTRA_TIME_STR) ?: ""
        val exerciseId = intent.getStringExtra(ReminderScheduler.EXTRA_EXERCISE_ID) ?: ""

        val categoryLabel = when (category) {
            "aquecimento" -> "Aquecimento Vocal"
            "hidratacao" -> "Hidratação Laríngea"
            "desaquecimento" -> "Desaquecimento Vocal"
            else -> "Exercício Terapêutico"
        }

        val openIntent = Intent(context, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or
                Intent.FLAG_ACTIVITY_CLEAR_TOP or
                Intent.FLAG_ACTIVITY_SINGLE_TOP
            putExtra(ReminderScheduler.EXTRA_REMINDER_ID, reminderId)
            putExtra(ReminderScheduler.EXTRA_EXERCISE_ID, exerciseId)
        }

        val pendingIntent = PendingIntent.getActivity(
            context,
            reminderId,
            openIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val channelId = context.getString(R.string.notification_channel_id)
        val body = if (timeStr.isNotBlank()) {
            "⏰ Horário de $categoryLabel ($timeStr). Toque para praticar com segurança."
        } else {
            "⏰ Horário de $categoryLabel. Toque para iniciar seu treino."
        }

        val notification = NotificationCompat.Builder(context, channelId)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentTitle("Vocalis: $title")
            .setContentText(body)
            .setStyle(NotificationCompat.BigTextStyle().bigText(body))
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setCategory(NotificationCompat.CATEGORY_REMINDER)
            .setAutoCancel(true)
            .setContentIntent(pendingIntent)
            .build()

        val canNotify = Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU ||
            ContextCompat.checkSelfPermission(
                context,
                Manifest.permission.POST_NOTIFICATIONS
            ) == PackageManager.PERMISSION_GRANTED

        if (canNotify) {
            NotificationManagerCompat.from(context).notify(
                if (reminderId > 0) reminderId else (System.currentTimeMillis() % Int.MAX_VALUE).toInt(),
                notification
            )
        }

        // Reagenda automaticamente a próxima ocorrência semanal/diária
        ReminderScheduler.scheduleAllFromPrefs(context)
    }

    private fun ensureNotificationChannel(context: Context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channelId = context.getString(R.string.notification_channel_id)
            val name = context.getString(R.string.notification_channel_name)
            val channel = NotificationChannel(
                channelId,
                name,
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Lembretes diários de exercícios e higiene vocal do Vocalis"
                enableVibration(true)
            }
            val manager = context.getSystemService(NotificationManager::class.java)
            manager?.createNotificationChannel(channel)
        }
    }
}
