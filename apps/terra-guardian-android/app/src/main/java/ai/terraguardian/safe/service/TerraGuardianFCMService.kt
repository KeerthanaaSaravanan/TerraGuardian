package ai.terraguardian.safe.service

import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.os.IBinder
import androidx.core.app.NotificationCompat
import ai.terraguardian.safe.TerraGuardianApp
import ai.terraguardian.safe.model.AlertNotificationPayload
import ai.terraguardian.safe.model.WarningLevel
import ai.terraguardian.safe.ui.MainActivity
import org.json.JSONObject

/**
 * Service to handle incoming Firebase Cloud Messaging push notifications
 * and display high-priority Android alerts across channels.
 */
class TerraGuardianFCMService : Service() {

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (intent != null && intent.hasExtra("payload_json")) {
            val jsonStr = intent.getStringExtra("payload_json") ?: "{}"
            try {
                val json = JSONObject(jsonStr)
                val payload = AlertNotificationPayload.fromJson(json)
                showPushNotification(payload)
            } catch (e: Exception) {
                // Ignore parse errors
            }
        }
        return START_NOT_STICKY
    }

    private fun showPushNotification(payload: AlertNotificationPayload) {
        val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

        // Intent to launch MainActivity when notification clicked
        val openIntent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            putExtra("alert_id", payload.alertId)
            putExtra("is_emergency", payload.warningLevel == WarningLevel.EMERGENCY)
        }
        val pendingOpen = PendingIntent.getActivity(
            this,
            0,
            openIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        // Action Intent for I AM SAFE
        val safeIntent = Intent(this, MainActivity::class.java).apply {
            action = "ACTION_I_AM_SAFE"
            putExtra("alert_id", payload.alertId)
        }
        val pendingSafe = PendingIntent.getActivity(
            this,
            1,
            safeIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val channelId = when (payload.warningLevel) {
            WarningLevel.EMERGENCY -> TerraGuardianApp.CHANNEL_EMERGENCY
            WarningLevel.WARNING, WarningLevel.SEVERE_WARNING -> TerraGuardianApp.CHANNEL_WARNING
            WarningLevel.ADVISORY, WarningLevel.WATCH -> TerraGuardianApp.CHANNEL_ADVISORY
            WarningLevel.NORMAL -> TerraGuardianApp.CHANNEL_SYSTEM
        }

        val notification = NotificationCompat.Builder(this, channelId)
            .setSmallIcon(android.R.drawable.ic_dialog_alert)
            .setContentTitle("⚠ " + payload.headline)
            .setContentText(payload.message)
            .setStyle(NotificationCompat.BigTextStyle().bigText("${payload.message}\n\nACTION: ${payload.actionRequired}"))
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .setAutoCancel(true)
            .setContentIntent(pendingOpen)
            .addAction(android.R.drawable.checkbox_on_background, "I AM SAFE", pendingSafe)
            .build()

        notificationManager.notify(payload.alertId.hashCode(), notification)
    }
}
